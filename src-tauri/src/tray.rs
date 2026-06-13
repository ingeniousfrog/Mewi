use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Emitter, Manager, Runtime, Wry};

const DEFAULT_BREED: &str = "blue-longhair";
const BREEDS: &[(&str, &str)] = &[
    ("blue-longhair", "Blue Longhair"),
    ("garfield", "Garfield"),
    ("british-shorthair", "British Shorthair"),
];

pub struct TrayState {
    blue_longhair: CheckMenuItem<Wry>,
    garfield: CheckMenuItem<Wry>,
    british_shorthair: CheckMenuItem<Wry>,
}

pub fn build_tray(app: &App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let bring_back = MenuItem::with_id(app, "bring-back", "Bring Mewi Back", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let blue_longhair = breed_item(app, "blue-longhair", "Blue Longhair", true)?;
    let garfield = breed_item(app, "garfield", "Garfield", false)?;
    let british_shorthair = breed_item(app, "british-shorthair", "British Shorthair", false)?;
    let breed_menu = Submenu::with_items(
        app,
        "Breed",
        true,
        &[&blue_longhair, &garfield, &british_shorthair],
    )?;
    let menu = Menu::with_items(app, &[&show, &hide, &bring_back, &breed_menu, &quit])?;
    let icon = Image::new_owned(vec![248, 200, 111, 255], 1, 1);

    app.manage(TrayState {
        blue_longhair: blue_longhair.clone(),
        garfield: garfield.clone(),
        british_shorthair: british_shorthair.clone(),
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
