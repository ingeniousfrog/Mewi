use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize)]
pub struct ScreenBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[tauri::command]
pub fn get_usable_bounds(app: AppHandle) -> ScreenBounds {
    usable_bounds_for_window(&app).unwrap_or_else(|| fallback_bounds_with_insets(&app))
}

pub fn usable_bounds_for_window(_app: &AppHandle) -> Option<ScreenBounds> {
    #[cfg(target_os = "macos")]
    {
        return macos_visible_frame();
    }

    #[cfg(not(target_os = "macos"))]
    {
        None
    }
}

fn fallback_bounds_with_insets(app: &AppHandle) -> ScreenBounds {
    const MENU_BAR_INSET: f64 = 32.0;
    const DOCK_INSET: f64 = 78.0;

    app.get_webview_window("main")
        .and_then(|window| window.current_monitor().ok().flatten())
        .map(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            ScreenBounds {
                x: position.x as f64,
                y: position.y as f64 + MENU_BAR_INSET,
                width: size.width as f64,
                height: (size.height as f64 - MENU_BAR_INSET - DOCK_INSET).max(240.0),
            }
        })
        .unwrap_or(ScreenBounds {
            x: 0.0,
            y: MENU_BAR_INSET,
            width: 1280.0,
            height: 720.0,
        })
}

#[cfg(target_os = "macos")]
fn macos_visible_frame() -> Option<ScreenBounds> {
    use cocoa::appkit::NSScreen;
    use cocoa::base::{id, nil};

    unsafe {
        let screen: id = NSScreen::mainScreen(nil);
        if screen == nil {
            return None;
        }

        let full = NSScreen::frame(screen);
        let visible = NSScreen::visibleFrame(screen);

        Some(ScreenBounds {
            x: visible.origin.x,
            y: full.origin.y + full.size.height - visible.origin.y - visible.size.height,
            width: visible.size.width,
            height: visible.size.height,
        })
    }
}
