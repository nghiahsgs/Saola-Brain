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

/// Get assets directory: ~/SaolaBrain/assets/
fn assets_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Cannot find home directory");
    let dir = home.join("SaolaBrain").join("assets");
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

/// Save a base64-encoded image to assets dir, return relative path
#[tauri::command]
pub fn notes_save_image(data: String, filename: String) -> Result<String, String> {
    use std::time::{SystemTime, UNIX_EPOCH};

    // Generate unique filename with timestamp
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let ext = filename
        .rsplit('.')
        .next()
        .unwrap_or("png");
    let name = format!("{ts}.{ext}");

    let dir = assets_dir();
    let full_path = dir.join(&name);

    // Strip data URL prefix if present (e.g. "data:image/png;base64,...")
    let b64 = if let Some(pos) = data.find(",") {
        &data[pos + 1..]
    } else {
        &data
    };

    // Decode and save
    use std::io::Write;
    let bytes = base64_decode(b64).map_err(|e| format!("Invalid base64: {e}"))?;
    let mut file = fs::File::create(&full_path).map_err(|e| format!("Cannot create file: {e}"))?;
    file.write_all(&bytes).map_err(|e| format!("Cannot write: {e}"))?;

    // Return absolute path for Tauri asset protocol
    Ok(full_path.to_string_lossy().to_string())
}

/// Simple base64 decoder
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    let table: Vec<u8> = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        .to_vec();
    let mut output = Vec::new();
    let mut buf: u32 = 0;
    let mut bits: u32 = 0;

    for &byte in input.as_bytes() {
        if byte == b'=' || byte == b'\n' || byte == b'\r' || byte == b' ' {
            continue;
        }
        let val = table
            .iter()
            .position(|&b| b == byte)
            .ok_or_else(|| format!("Invalid base64 char: {}", byte as char))? as u32;
        buf = (buf << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }
    Ok(output)
}
