mod environment;
mod input_monitor;
mod screen;
mod tray;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            environment::scan_desktop_environment,
            screen::get_usable_bounds,
            input_monitor::check_permissions,
            input_monitor::request_desktop_access,
            input_monitor::request_input_access,
            tray::set_tray_breed,
            tray::set_tray_activity,
            tray::set_tray_mute
        ])
        .setup(|app| {
            tray::build_tray(app)?;
            environment::start_desktop_watcher(app.handle().clone())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run Mewi");
}
