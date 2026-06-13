use serde::Serialize;
#[cfg(target_os = "macos")]
use std::process::Command;

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

#[tauri::command]
pub fn scan_desktop_environment() -> Vec<DesktopObject> {
    scan_desktop_items()
        .into_iter()
        .chain(scan_terminal_windows())
        .collect()
}

#[cfg(target_os = "macos")]
fn scan_desktop_items() -> Vec<DesktopObject> {
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
                .filter_map(parse_desktop_item)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

#[cfg(not(target_os = "macos"))]
fn scan_desktop_items() -> Vec<DesktopObject> {
    Vec::new()
}

#[cfg(target_os = "macos")]
fn scan_terminal_windows() -> Vec<DesktopObject> {
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
                .filter_map(parse_terminal_window)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

#[cfg(not(target_os = "macos"))]
fn scan_terminal_windows() -> Vec<DesktopObject> {
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

fn parse_desktop_item(line: &str) -> Option<DesktopObject> {
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
            x: x - 36.0,
            y: y - 36.0,
            width: 72.0,
            height: 72.0,
        },
    })
}

fn parse_terminal_window((index, line): (usize, &str)) -> Option<DesktopObject> {
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
            x: parse_number(fields[1])?,
            y: parse_number(fields[2])?,
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
