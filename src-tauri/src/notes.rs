use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Get the root notes directory: ~/SaolaBrain/notes/
fn notes_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Cannot find home directory");
    let dir = home.join("SaolaBrain").join("notes");
    fs::create_dir_all(&dir).ok();
    dir
}

/// Represents a file or folder in the tree
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NoteEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<NoteEntry>>,
}

/// Recursively build the file tree
fn build_tree(dir: &PathBuf, base: &PathBuf) -> Vec<NoteEntry> {
    let mut entries: Vec<NoteEntry> = Vec::new();

    let Ok(read_dir) = fs::read_dir(dir) else {
        return entries;
    };

    let mut items: Vec<_> = read_dir.filter_map(|e| e.ok()).collect();
    items.sort_by_key(|e| e.file_name());

    for entry in items {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files
        if name.starts_with('.') {
            continue;
        }

        let rel_path = path
            .strip_prefix(base)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        if path.is_dir() {
            let children = build_tree(&path, base);
            entries.push(NoteEntry {
                name,
                path: rel_path,
                is_dir: true,
                children: Some(children),
            });
        } else if name.ends_with(".md") {
            entries.push(NoteEntry {
                name,
                path: rel_path,
                is_dir: false,
                children: None,
            });
        }
    }

    entries
}

/// List all notes as a tree structure
#[tauri::command]
pub fn notes_list() -> Result<Vec<NoteEntry>, String> {
    let dir = notes_dir();
    Ok(build_tree(&dir, &dir))
}

/// Read a note's content by relative path
#[tauri::command]
pub fn notes_read(path: String) -> Result<String, String> {
    let full_path = notes_dir().join(&path);
    fs::read_to_string(&full_path).map_err(|e| format!("Cannot read {path}: {e}"))
}

/// Create or update a note
#[tauri::command]
pub fn notes_write(path: String, content: String) -> Result<(), String> {
    let full_path = notes_dir().join(&path);

    // Ensure parent directory exists
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Cannot create directory: {e}"))?;
    }

    fs::write(&full_path, content).map_err(|e| format!("Cannot write {path}: {e}"))
}

/// Create a new folder
#[tauri::command]
pub fn notes_create_folder(path: String) -> Result<(), String> {
    let full_path = notes_dir().join(&path);
    fs::create_dir_all(&full_path).map_err(|e| format!("Cannot create folder: {e}"))
}

/// Delete a note or folder
#[tauri::command]
pub fn notes_delete(path: String) -> Result<(), String> {
    let full_path = notes_dir().join(&path);

    if full_path.is_dir() {
        fs::remove_dir_all(&full_path).map_err(|e| format!("Cannot delete folder: {e}"))
    } else {
        fs::remove_file(&full_path).map_err(|e| format!("Cannot delete file: {e}"))
    }
}

/// Rename a note or folder
#[tauri::command]
pub fn notes_rename(old_path: String, new_path: String) -> Result<(), String> {
    let old = notes_dir().join(&old_path);
    let new = notes_dir().join(&new_path);

    // Ensure parent of new path exists
    if let Some(parent) = new.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Cannot create directory: {e}"))?;
    }

    fs::rename(&old, &new).map_err(|e| format!("Cannot rename: {e}"))
}
