use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Emitter, Manager, Runtime, Wry};

const DEFAULT_BREED: &str = "blue-longhair";
const DEFAULT_ACTIVITY: &str = "lively";
const BREEDS: &[(&str, &str)] = &[
    ("blue-longhair", "Blue Longhair"),
    ("garfield", "Garfield"),
    ("british-shorthair", "British Shorthair"),
];
const ACTIVITIES: &[(&str, &str)] = &[
    ("quiet", "Quiet"),
    ("lively", "Lively"),
    ("hyper", "Hyper"),
];

pub struct TrayState {
    blue_longhair: CheckMenuItem<Wry>,
    garfield: CheckMenuItem<Wry>,
    british_shorthair: CheckMenuItem<Wry>,
    quiet: CheckMenuItem<Wry>,
    lively: CheckMenuItem<Wry>,
    hyper: CheckMenuItem<Wry>,
    mute_sounds: CheckMenuItem<Wry>,
}

pub fn build_tray(app: &App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let bring_back = MenuItem::with_id(app, "bring-back", "Bring Mewi Back", true, None::<&str>)?;
    let mute_sounds = CheckMenuItem::with_id(app, "mute-sounds", "Mute Sounds", true, false, None::<&str>)?;
    let blue_longhair = breed_item(app, "blue-longhair", "Blue Longhair", true)?;
    let garfield = breed_item(app, "garfield", "Garfield", false)?;
    let british_shorthair = breed_item(app, "british-shorthair", "British Shorthair", false)?;
    let quiet = activity_item(app, "quiet", "Quiet", false)?;
    let lively = activity_item(app, "lively", "Lively", true)?;
    let hyper = activity_item(app, "hyper", "Hyper", false)?;
    let breed_menu = Submenu::with_items(
        app,
        "Breed",
        true,
        &[&blue_longhair, &garfield, &british_shorthair],
    )?;
    let activity_menu = Submenu::with_items(
        app,
        "Activity",
        true,
        &[&quiet, &lively, &hyper],
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &show,
            &hide,
            &bring_back,
            &breed_menu,
            &activity_menu,
            &mute_sounds,
            &quit,
        ],
    )?;
    let icon = Image::new_owned(vec![248, 200, 111, 255], 1, 1);

    app.manage(TrayState {
        blue_longhair: blue_longhair.clone(),
        garfield: garfield.clone(),
        british_shorthair: british_shorthair.clone(),
        quiet: quiet.clone(),
        lively: lively.clone(),
        hyper: hyper.clone(),
        mute_sounds: mute_sounds.clone(),
    });

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("Mewi")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "bring-back" => {
                let _ = app.emit("mewi-bring-back", ());
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            id if id.starts_with("breed:") => {
                let breed = id.trim_start_matches("breed:");
                let _ = set_checked_breed(app, breed);
                let _ = app.emit("mewi-breed-change", breed);
            }
            id if id.starts_with("activity:") => {
                let activity = id.trim_start_matches("activity:");
                let _ = set_checked_activity(app, activity);
                let _ = app.emit("mewi-activity-change", activity);
            }
            "mute-sounds" => {
                let state = app.state::<TrayState>();
                let muted = state.mute_sounds.is_checked().unwrap_or(false);
                let _ = app.emit("mewi-mute-change", muted);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

#[tauri::command]
pub fn set_tray_breed(app: AppHandle, breed: String) -> tauri::Result<()> {
    set_checked_breed(&app, &breed)
}

#[tauri::command]
pub fn set_tray_activity(app: AppHandle, activity: String) -> tauri::Result<()> {
    set_checked_activity(&app, &activity)
}

#[tauri::command]
pub fn set_tray_mute(app: AppHandle, muted: bool) -> tauri::Result<()> {
    let state = app.state::<TrayState>();
    state.mute_sounds.set_checked(muted)?;
    Ok(())
}

fn breed_item<R: Runtime>(
    manager: &impl Manager<R>,
    id: &str,
    label: &str,
    checked: bool,
) -> tauri::Result<CheckMenuItem<R>> {
    CheckMenuItem::with_id(
        manager,
        format!("breed:{id}"),
        label,
        true,
        checked,
        None::<&str>,
    )
}

fn activity_item<R: Runtime>(
    manager: &impl Manager<R>,
    id: &str,
    label: &str,
    checked: bool,
) -> tauri::Result<CheckMenuItem<R>> {
    CheckMenuItem::with_id(
        manager,
        format!("activity:{id}"),
        label,
        true,
        checked,
        None::<&str>,
    )
}

fn set_checked_breed<R: Runtime>(app: &AppHandle<R>, breed: &str) -> tauri::Result<()> {
    let selected_breed = if BREEDS.iter().any(|(id, _)| id == &breed) {
        breed
    } else {
        DEFAULT_BREED
    };
    let state = app.state::<TrayState>();

    state
        .blue_longhair
        .set_checked(selected_breed == "blue-longhair")?;
    state.garfield.set_checked(selected_breed == "garfield")?;
    state
        .british_shorthair
        .set_checked(selected_breed == "british-shorthair")?;

    Ok(())
}

fn set_checked_activity<R: Runtime>(app: &AppHandle<R>, activity: &str) -> tauri::Result<()> {
    let selected_activity = if ACTIVITIES.iter().any(|(id, _)| id == &activity) {
        activity
    } else {
        DEFAULT_ACTIVITY
    };
    let state = app.state::<TrayState>();

    state.quiet.set_checked(selected_activity == "quiet")?;
    state.lively.set_checked(selected_activity == "lively")?;
    state.hyper.set_checked(selected_activity == "hyper")?;

    Ok(())
}
