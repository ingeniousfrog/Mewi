use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

static INPUT_MONITOR_STARTED: AtomicBool = AtomicBool::new(false);
static INPUT_MONITOR_READY: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionStatus {
    desktop: bool,
    input: bool,
    desktop_item_count: usize,
    message: Option<String>,
}

#[tauri::command]
pub fn check_permissions(app: AppHandle) -> PermissionStatus {
    let desktop_items = crate::environment::scan_desktop_items_with_origin(&app);
    let desktop = !desktop_items.is_empty();
    PermissionStatus {
        desktop,
        input: INPUT_MONITOR_READY.load(Ordering::Relaxed),
        desktop_item_count: desktop_items.len(),
        message: if desktop {
            None
        } else {
            Some(
                "还没读到桌面文件夹。请在弹出的系统对话框里允许 Mewi 控制 Finder，或确认桌面上有文件夹/图片。"
                    .to_string(),
            )
        },
    }
}

#[tauri::command]
pub fn request_desktop_access(app: AppHandle) -> PermissionStatus {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("/usr/bin/osascript")
            .arg("-e")
            .arg("tell application \"Finder\" to get name of every item of desktop")
            .output();
    }

    poll_permissions(app, |status| status.desktop, Duration::from_secs(8))
}

#[tauri::command]
pub fn request_input_access(app: AppHandle) -> PermissionStatus {
    start_input_monitor(app.clone());

    let mut status = poll_permissions(app.clone(), |status| status.input, Duration::from_secs(8));
    if !status.input {
        status.message = Some(
            "还没开启打字/点击镜像。请在弹出的系统对话框里允许 Mewi 的辅助功能权限。"
                .to_string(),
        );
    }

    status
}

fn poll_permissions<F>(app: AppHandle, is_ready: F, timeout: Duration) -> PermissionStatus
where
    F: Fn(&PermissionStatus) -> bool,
{
    let started = std::time::Instant::now();
    loop {
        let status = check_permissions(app.clone());
        if is_ready(&status) {
            return status;
        }

        if started.elapsed() >= timeout {
            return status;
        }

        std::thread::sleep(Duration::from_millis(400));
    }
}

pub fn start_input_monitor(app: AppHandle) {
    if INPUT_MONITOR_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        use rdev::{listen, EventType};

        let app_handle = app.clone();
        let result = listen(move |event| match event.event_type {
            EventType::KeyPress(_) => {
                let _ = app_handle.emit("user-key-activity", ());
            }
            EventType::ButtonPress(_) => {
                let _ = app_handle.emit("user-click-activity", ());
            }
            _ => {}
        });

        if result.is_ok() {
            INPUT_MONITOR_READY.store(true, Ordering::SeqCst);
        } else {
            INPUT_MONITOR_STARTED.store(false, Ordering::SeqCst);
            let _ = app.emit("input-monitor-failed", ());
        }
    });
}
