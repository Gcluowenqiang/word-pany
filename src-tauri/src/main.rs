// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;
mod utils;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, MenuBuilder, SubmenuBuilder},
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
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            commands::open_url,
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
            
            // 创建原生应用菜单
            // 应用菜单 - 小驴单词薄
            let about_app = MenuItem::with_id(app, "about", "关于小驴单词薄", true, None::<&str>)?;
            let preferences = MenuItem::with_id(app, "preferences", "偏好设置...", true, Some("CmdOrCtrl+Comma"))?;
            let quit_app = MenuItem::with_id(app, "quit_app", "退出小驴单词薄", true, Some("CmdOrCtrl+Q"))?;
            
            let app_menu = SubmenuBuilder::new(app, "小驴单词薄")
                .item(&about_app)
                .separator()
                .item(&preferences)
                .separator()
                .item(&quit_app)
                .build()?;
            
            // 学习菜单
            let next_word = MenuItem::with_id(app, "next_word", "下一个单词", true, Some("CmdOrCtrl+Right"))?;
            let prev_word = MenuItem::with_id(app, "prev_word", "上一个单词", true, Some("CmdOrCtrl+Left"))?;
            let auto_switch = MenuItem::with_id(app, "auto_switch", "自动切换", true, Some("Space"))?;
            let refresh_words = MenuItem::with_id(app, "refresh_words", "刷新单词库", true, Some("CmdOrCtrl+R"))?;
            
            let learning_menu = SubmenuBuilder::new(app, "学习")
                .item(&next_word)
                .item(&prev_word)
                .separator()
                .item(&auto_switch)
                .separator()
                .item(&refresh_words)
                .build()?;
            
            // 工具菜单
            let open_settings = MenuItem::with_id(app, "open_settings", "设置", true, Some("CmdOrCtrl+Comma"))?;
            let toggle_stats = MenuItem::with_id(app, "toggle_stats", "学习统计", true, Some("CmdOrCtrl+S"))?;
            let theme_menu = MenuItem::with_id(app, "theme_menu", "主题切换", true, None::<&str>)?;
            
            let tools_menu = SubmenuBuilder::new(app, "工具")
                .item(&open_settings)
                .item(&toggle_stats)
                .separator()
                .item(&theme_menu)
                .build()?;
            
            // 构建完整的应用菜单
            let main_menu = MenuBuilder::new(app)
                .items(&[&app_menu, &learning_menu, &tools_menu])
                .build()?;
            
            // 设置为应用菜单
            app.set_menu(main_menu)?;
            
            // 添加菜单事件处理
            app.on_menu_event(move |app_handle, event| {
                match event.id().as_ref() {
                    "about" => {
                        // TODO: 显示关于对话框
                        println!("显示关于对话框");
                    }
                    "preferences" | "open_settings" => {
                        let windows = app_handle.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.show();
                            let _ = window.set_focus();
                            // 发送事件到前端打开设置面板
                            let _ = window.emit("open-settings", ());
                        }
                    }
                    "quit_app" => {
                        app_handle.exit(0);
                    }
                    "next_word" => {
                        let windows = app_handle.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.emit("menu-next-word", ());
                        }
                    }
                    "prev_word" => {
                        let windows = app_handle.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.emit("menu-prev-word", ());
                        }
                    }
                    "auto_switch" => {
                        let windows = app_handle.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.emit("menu-auto-switch", ());
                        }
                    }
                    "refresh_words" => {
                        let windows = app_handle.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.emit("menu-refresh-words", ());
                        }
                    }
                    "toggle_stats" => {
                        let windows = app_handle.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.emit("menu-toggle-stats", ());
                        }
                    }
                    "theme_menu" => {
                        let windows = app_handle.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.emit("menu-theme-switch", ());
                        }
                    }
                    _ => {
                        println!("未处理的菜单事件: {}", event.id().as_ref());
                    }
                }
            });
            
            // 创建托盘菜单（独立于应用菜单）
            let quit = MenuItem::with_id(app, "tray_quit", "退出", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "tray_show", "显示", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "tray_hide", "隐藏", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "tray_settings", "设置", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;

            let tray_menu = Menu::with_items(app, &[&show, &hide, &separator, &settings, &separator, &quit])?;
            
            // 设置系统托盘
            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("小驴单词薄")
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "tray_quit" => {
                        app.exit(0);
                    }
                    "tray_show" => {
                        let windows = app.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.show();
                        }
                    }
                    "tray_hide" => {
                        let windows = app.webview_windows();
                        if let Some(window) = windows.values().next() {
                            let _ = window.hide();
                        }
                    }
                    "tray_settings" => {
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