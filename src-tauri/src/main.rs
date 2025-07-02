// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;
mod utils;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, Emitter,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_store::Builder as StoreBuilder;

#[tokio::main]
async fn main() {
    // 初始化日志
    env_logger::init();

    tauri::Builder::default()
        .plugin(StoreBuilder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            let windows = app.webview_windows();
            windows
                .values()
                .next()
                .expect("sorry, no window labeled 'main' found")
                .set_focus()
                .expect("可以聚焦到现有窗口");
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_words,
            commands::get_word_by_id,
            commands::update_word_progress,
            commands::get_settings,
            commands::update_settings,
            commands::play_pronunciation,
            commands::get_learning_stats,
            commands::export_progress,
            commands::import_progress,
            commands::search_words,
            commands::reset_all_progress,
            commands::toggle_window_on_top,
            commands::minimize_to_tray,
            commands::clear_cache,
            commands::save_study_session,
            // 增量更新相关命令
            commands::get_app_version,
            commands::apply_incremental_patch,
            commands::verify_file_hash,
            commands::get_file_size,
            commands::check_disk_space,
            commands::create_file_backup,
            commands::restore_file_backup,
            commands::prepare_app_restart,
            commands::log_update_event,
        ])
        .setup(|app| {
            let _handle = app.handle().clone();
            
            
            // 创建托盘菜单
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "隐藏", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;

            let menu = Menu::with_items(app, &[&show, &hide, &separator, &settings, &separator, &quit])?;
            
            // 设置系统托盘
            let tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("小驴单词薄")
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        let windows = app.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.show();
                        }
                    }
                    "hide" => {
                        let windows = app.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.hide();
                        }
                    }
                    "settings" => {
                        let windows = app.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.show();
                            let _ = window.set_focus();
                            // 发送事件到前端打开设置面板
                            let _ = window.emit("open-settings", ());
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(webview_window) = app.get_webview_window("main") {
                            let _ = webview_window.show();
                            let _ = webview_window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 注册全局快捷键
            app.global_shortcut().register("CmdOrCtrl+Shift+W")?;
            app.global_shortcut().register("CmdOrCtrl+Right")?;
            app.global_shortcut().register("CmdOrCtrl+Left")?;
            app.global_shortcut().register("Space")?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 