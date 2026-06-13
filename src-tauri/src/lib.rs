mod environment;
mod tray;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            environment::scan_desktop_environment,
            tray::set_tray_breed
        ])
        .setup(|app| {
            tray::build_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run Mewi");
}
