use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;

/// Get the root notes directory
fn notes_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Cannot find home directory");
    home.join("SaolaBrain").join("notes")
}

/// HTTP response helper
fn respond(stream: &mut std::net::TcpStream, status: u16, body: &str) {
    let status_text = match status {
        200 => "OK",
        201 => "Created",
        204 => "No Content",
        400 => "Bad Request",
        404 => "Not Found",
        405 => "Method Not Allowed",
        500 => "Internal Server Error",
        _ => "Unknown",
    };

    let response = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: {}\r\n\r\n{}",
        status, status_text, body.len(), body
    );
    let _ = stream.write_all(response.as_bytes());
}

/// Parse HTTP request into method, path, and body
fn parse_request(request: &str) -> (String, String, String) {
    let lines: Vec<&str> = request.lines().collect();
    if lines.is_empty() {
        return (String::new(), String::new(), String::new());
    }

    let first_line: Vec<&str> = lines[0].split_whitespace().collect();
    let method = first_line.first().unwrap_or(&"").to_string();
    let path = first_line.get(1).unwrap_or(&"/").to_string();

    // Find body after empty line
    let body = if let Some(pos) = request.find("\r\n\r\n") {
        request[pos + 4..].to_string()
    } else {
        String::new()
    };

    (method, path, body)
}

#[derive(Deserialize)]
struct NoteBody {
    path: Option<String>,
    content: Option<String>,
}

#[derive(Serialize)]
struct NoteItem {
    name: String,
    path: String,
    is_dir: bool,
}

/// Recursively list all notes as flat list
fn list_notes_flat(dir: &PathBuf, base: &PathBuf) -> Vec<NoteItem> {
    let mut items = Vec::new();
    let Ok(read_dir) = fs::read_dir(dir) else {
        return items;
    };

    for entry in read_dir.filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        let rel = path
            .strip_prefix(base)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        if path.is_dir() {
            items.push(NoteItem {
                name: name.clone(),
                path: rel.clone(),
                is_dir: true,
            });
            items.extend(list_notes_flat(&path, base));
        } else if name.ends_with(".md") {
            items.push(NoteItem {
                name,
                path: rel,
                is_dir: false,
            });
        }
    }

    items
}

/// Handle a single HTTP request
fn handle_request(stream: &mut std::net::TcpStream) {
    let mut buffer = [0u8; 8192];
    let n = match stream.read(&mut buffer) {
        Ok(n) => n,
        Err(_) => return,
    };

    let request = String::from_utf8_lossy(&buffer[..n]).to_string();
    let (method, path, body) = parse_request(&request);
    let dir = notes_dir();

    // Handle CORS preflight
    if method == "OPTIONS" {
        respond(stream, 204, "");
        return;
    }

    match (method.as_str(), path.as_str()) {
        // List all notes
        ("GET", "/notes") => {
            let items = list_notes_flat(&dir, &dir);
            let json = serde_json::to_string(&items).unwrap_or_default();
            respond(stream, 200, &json);
        }

        // Read a note: GET /notes/<path>
        ("GET", p) if p.starts_with("/notes/") => {
            let note_path = &p[7..]; // strip "/notes/"
            let full = dir.join(note_path);
            match fs::read_to_string(&full) {
                Ok(content) => {
                    let json = serde_json::json!({ "path": note_path, "content": content });
                    respond(stream, 200, &json.to_string());
                }
                Err(_) => respond(stream, 404, r#"{"error":"Note not found"}"#),
            }
        }

        // Create a note: POST /notes
        ("POST", "/notes") => {
            let Ok(data) = serde_json::from_str::<NoteBody>(&body) else {
                respond(stream, 400, r#"{"error":"Invalid JSON body"}"#);
                return;
            };
            let Some(path) = data.path else {
                respond(stream, 400, r#"{"error":"Missing path"}"#);
                return;
            };
            let content = data.content.unwrap_or_default();
            let full = dir.join(&path);

            if let Some(parent) = full.parent() {
                let _ = fs::create_dir_all(parent);
            }

            match fs::write(&full, &content) {
                Ok(_) => respond(stream, 201, &format!(r#"{{"path":"{}","created":true}}"#, path)),
                Err(e) => respond(stream, 500, &format!(r#"{{"error":"{}"}}"#, e)),
            }
        }

        // Update a note: PUT /notes/<path>
        ("PUT", p) if p.starts_with("/notes/") => {
            let note_path = &p[7..];
            let full = dir.join(note_path);

            let Ok(data) = serde_json::from_str::<NoteBody>(&body) else {
                respond(stream, 400, r#"{"error":"Invalid JSON body"}"#);
                return;
            };
            let content = data.content.unwrap_or_default();

            match fs::write(&full, &content) {
                Ok(_) => respond(stream, 200, &format!(r#"{{"path":"{}","updated":true}}"#, note_path)),
                Err(e) => respond(stream, 500, &format!(r#"{{"error":"{}"}}"#, e)),
            }
        }

        // Delete a note: DELETE /notes/<path>
        ("DELETE", p) if p.starts_with("/notes/") => {
            let note_path = &p[7..];
            let full = dir.join(note_path);

            let result = if full.is_dir() {
                fs::remove_dir_all(&full)
            } else {
                fs::remove_file(&full)
            };

            match result {
                Ok(_) => respond(stream, 200, r#"{"deleted":true}"#),
                Err(e) => respond(stream, 500, &format!(r#"{{"error":"{}"}}"#, e)),
            }
        }

        // Search: GET /search?q=keyword
        ("GET", p) if p.starts_with("/search") => {
            let query = p
                .split('?')
                .nth(1)
                .and_then(|qs| {
                    qs.split('&')
                        .find(|p| p.starts_with("q="))
                        .map(|p| p[2..].to_string())
                })
                .unwrap_or_default();

            let query = urlencoding::decode(&query).unwrap_or_default().to_lowercase();
            let all = list_notes_flat(&dir, &dir);
            let mut results: Vec<serde_json::Value> = Vec::new();

            for item in all {
                if item.is_dir {
                    continue;
                }
                let full = dir.join(&item.path);
                if let Ok(content) = fs::read_to_string(&full) {
                    let lower = content.to_lowercase();
                    if lower.contains(&query) || item.name.to_lowercase().contains(&query) {
                        results.push(serde_json::json!({
                            "path": item.path,
                            "name": item.name,
                            "snippet": content.chars().take(200).collect::<String>(),
                        }));
                    }
                }
            }

            let json = serde_json::to_string(&results).unwrap_or_default();
            respond(stream, 200, &json);
        }

        _ => {
            respond(stream, 405, r#"{"error":"Method not allowed"}"#);
        }
    }
}

/// Shared state for the HTTP server port
pub struct HttpServerState {
    pub port: u16,
}

/// Start the HTTP server on a random available port
pub fn start_server() -> Arc<Mutex<HttpServerState>> {
    let listener = TcpListener::bind("127.0.0.1:0").expect("Cannot bind HTTP server");
    let port = listener.local_addr().unwrap().port();

    let state = Arc::new(Mutex::new(HttpServerState { port }));

    thread::spawn(move || {
        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                thread::spawn(move || {
                    handle_request(&mut stream);
                });
            }
        }
    });

    state
}

/// Get the current HTTP server port
#[tauri::command]
pub fn http_server_port(state: tauri::State<'_, Arc<Mutex<HttpServerState>>>) -> Result<u16, String> {
    let s = state.lock().map_err(|e| e.to_string())?;
    Ok(s.port)
}
