mod http_server;
mod notes;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Fix PATH for GUI apps on macOS
    if let Err(e) = fix_path_env::fix() {
        eprintln!("fix_path_env warning: {e}");
    }

    // Start HTTP server for AI interaction
    let server_state = http_server::start_server();
    let port = server_state.lock().unwrap().port;
    println!("Saola Brain HTTP API running on http://127.0.0.1:{port}");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(server_state)
        .invoke_handler(tauri::generate_handler![
            notes::notes_list,
            notes::notes_read,
            notes::notes_write,
            notes::notes_create_folder,
            notes::notes_delete,
            notes::notes_rename,
            notes::notes_save_image,
            http_server::http_server_port,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
