use serde::Serialize;
#[cfg(target_os = "macos")]
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Serialize)]
pub struct DesktopBounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Debug, Serialize)]
pub struct DesktopObject {
    id: String,
    kind: String,
    label: String,
    bounds: DesktopBounds,
}

const ICON_WIDTH: f64 = 72.0;
const ICON_HEIGHT: f64 = 72.0;

#[tauri::command]
pub fn scan_desktop_environment(app: AppHandle) -> Vec<DesktopObject> {
    scan_desktop_items_with_origin(&app)
        .into_iter()
        .chain(scan_terminal_windows(&app))
        .collect()
}

pub fn scan_desktop_items_with_origin(app: &AppHandle) -> Vec<DesktopObject> {
    let (origin_x, origin_y) = monitor_origin(app);
    scan_desktop_items(origin_x, origin_y)
}

fn monitor_origin(app: &AppHandle) -> (f64, f64) {
    if let Some(bounds) = crate::screen::usable_bounds_for_window(app) {
        return (bounds.x, bounds.y);
    }

    app.get_webview_window("main")
        .and_then(|window| window.current_monitor().ok().flatten())
        .map(|monitor| {
            let position = monitor.position();
            (position.x as f64, position.y as f64)
        })
        .unwrap_or((0.0, 0.0))
}

#[cfg(target_os = "macos")]
fn scan_desktop_items(origin_x: f64, origin_y: f64) -> Vec<DesktopObject> {
    let script = r#"
      tell application "Finder"
        set output to ""
        repeat with anItem in items of desktop
          set itemName to name of anItem
          set itemKind to kind of anItem
          set itemClass to class of anItem as string
          set itemPosition to desktop position of anItem
          set output to output & itemName & tab & itemClass & tab & itemKind & tab & ((item 1 of itemPosition) as text) & tab & ((item 2 of itemPosition) as text) & linefeed
        end repeat
        return output
      end tell
    "#;

    run_osascript(script)
        .map(|output| {
            output
                .lines()
                .filter_map(|line| parse_desktop_item(line, origin_x, origin_y))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

#[cfg(not(target_os = "macos"))]
fn scan_desktop_items(_origin_x: f64, _origin_y: f64) -> Vec<DesktopObject> {
    Vec::new()
}

#[cfg(target_os = "macos")]
fn scan_terminal_windows(app: &AppHandle) -> Vec<DesktopObject> {
    let (origin_x, origin_y) = monitor_origin(app);
    let script = r#"
      tell application "System Events"
        set output to ""
        repeat with procName in {"Terminal", "iTerm2"}
          if exists process procName then
            tell process procName
              repeat with aWindow in windows
                set windowPosition to position of aWindow
                set windowSize to size of aWindow
                set output to output & (procName as text) & tab & ((item 1 of windowPosition) as text) & tab & ((item 2 of windowPosition) as text) & tab & ((item 1 of windowSize) as text) & tab & ((item 2 of windowSize) as text) & linefeed
              end repeat
            end tell
          end if
        end repeat
        return output
      end tell
    "#;

    run_osascript(script)
        .map(|output| {
            output
                .lines()
                .enumerate()
                .filter_map(|entry| parse_terminal_window(entry, origin_x, origin_y))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

#[cfg(not(target_os = "macos"))]
fn scan_terminal_windows(_app: &AppHandle) -> Vec<DesktopObject> {
    Vec::new()
}

#[cfg(target_os = "macos")]
fn run_osascript(script: &str) -> Option<String> {
    let output = Command::new("/usr/bin/osascript")
        .arg("-e")
        .arg(script)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    String::from_utf8(output.stdout).ok()
}

fn parse_desktop_item(line: &str, origin_x: f64, origin_y: f64) -> Option<DesktopObject> {
    let fields: Vec<&str> = line.split('\t').collect();

    if fields.len() < 5 {
        return None;
    }

    let label = fields[0].trim();
    let class_name = fields[1].trim().to_lowercase();
    let kind_name = fields[2].trim().to_lowercase();
    let x = parse_number(fields[3])?;
    let y = parse_number(fields[4])?;
    let kind = if class_name.contains("folder") || kind_name.contains("folder") {
        "folder"
    } else if looks_like_image(label, &kind_name) {
        "image"
    } else {
        return None;
    };

    Some(DesktopObject {
        id: format!("{kind}:{label}"),
        kind: kind.to_string(),
        label: label.to_string(),
        bounds: DesktopBounds {
            x: origin_x + x - ICON_WIDTH / 2.0,
            y: origin_y + y - ICON_HEIGHT / 2.0,
            width: ICON_WIDTH,
            height: ICON_HEIGHT,
        },
    })
}

fn parse_terminal_window(
    (index, line): (usize, &str),
    origin_x: f64,
    origin_y: f64,
) -> Option<DesktopObject> {
    let fields: Vec<&str> = line.split('\t').collect();

    if fields.len() < 5 {
        return None;
    }

    let label = fields[0].trim();

    Some(DesktopObject {
        id: format!("terminal:{label}:{index}"),
        kind: "terminal".to_string(),
        label: label.to_string(),
        bounds: DesktopBounds {
            x: origin_x + parse_number(fields[1])?,
            y: origin_y + parse_number(fields[2])?,
            width: parse_number(fields[3])?,
            height: parse_number(fields[4])?,
        },
    })
}

fn looks_like_image(label: &str, kind: &str) -> bool {
    let label = label.to_lowercase();

    kind.contains("image")
        || kind.contains("png")
        || kind.contains("jpeg")
        || kind.contains("jpg")
        || label.ends_with(".png")
        || label.ends_with(".jpg")
        || label.ends_with(".jpeg")
        || label.ends_with(".gif")
        || label.ends_with(".webp")
}

fn parse_number(value: &str) -> Option<f64> {
    value.trim().parse::<f64>().ok()
}

#[cfg(target_os = "macos")]
pub fn start_desktop_watcher(app: AppHandle) -> tauri::Result<()> {
    use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
    use std::path::PathBuf;
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant};

    let desktop = dirs::home_dir()
        .map(|path| path.join("Desktop"))
        .unwrap_or_else(|| PathBuf::from("/Users/Shared/Desktop"));
    let app_handle = app.clone();
    let last_emit = Arc::new(Mutex::new(Instant::now() - Duration::from_secs(10)));

    std::thread::spawn(move || {
        use notify::Event;

        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = match RecommendedWatcher::new(
            move |result: notify::Result<Event>| {
                if result.is_ok() {
                    let _ = tx.send(());
                }
            },
            Config::default(),
        ) {
            Ok(watcher) => watcher,
            Err(_) => return,
        };

        if watcher.watch(&desktop, RecursiveMode::NonRecursive).is_err() {
            return;
        }

        let ds_store = desktop.join(".DS_Store");

        if ds_store.exists() {
            let _ = watcher.watch(&ds_store, RecursiveMode::NonRecursive);
        }

        while rx.recv().is_ok() {
            let should_emit = {
                let mut last = match last_emit.lock() {
                    Ok(value) => value,
                    Err(_) => continue,
                };

                if last.elapsed() >= Duration::from_millis(200) {
                    *last = Instant::now();
                    true
                } else {
                    false
                }
            };

            if should_emit {
                let _ = app_handle.emit("desktop-changed", ());
            }
        }
    });

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn start_desktop_watcher(_app: AppHandle) -> tauri::Result<()> {
    Ok(())
}
