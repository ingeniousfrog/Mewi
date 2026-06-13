mod tray;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            tray::build_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run Mewi");
}
