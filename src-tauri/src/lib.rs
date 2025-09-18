#![allow(unused_imports)]
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod db;
mod models;
mod commands;
use crate::commands::api_keys;
use crate::commands::project;
use crate::commands::config_path;
use crate::commands::config;
use crate::commands::backup;
use crate::commands::router;
use crate::commands::route_config;
use crate::commands::utils;
use crate::commands::ide;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            utils::greet,
            api_keys::create_api_key,
            api_keys::get_api_keys,
            api_keys::get_api_keys_config,
            api_keys::update_api_key,
            api_keys::delete_api_key,
            api_keys::toggle_api_key_active,
            route_config::create_route_config,
            route_config::get_route_configs,
            route_config::get_route_configs_config,
            route_config::update_route_config,
            route_config::delete_route_config,
            config::get_config_file_content,
            config::save_config_file_content,
            config::read_config_file,
            config::write_config_file,
            config::get_claude_settings,
            config::save_claude_settings,
            utils::open_file_dialog,
            backup::backup_config_file,
            backup::get_backup_files,
            backup::restore_config_file,
            backup::delete_backup_file,
            backup::get_backup_content,
            config_path::create_config_path,
            config_path::get_config_paths,
            config_path::update_config_path,
            config_path::delete_config_path,
            config_path::save_config_path,
            config_path::get_config_path,
            config::update_config_env,
            router::get_router_config,
            router::update_router_config,
            router::create_router_config,
            router::get_raw_router_config,
            router::get_router_config_path_command,
            router::backup_router_config,
            router::get_router_backup_files,
            router::restore_router_config_from_file,
            router::get_router_backup_content,
            router::delete_router_backup,
            router::select_router_config_path,
            router::save_raw_router_config,
            utils::check_feature_status,
            utils::install_feature,
            project::scan_projects,
            utils::open_in_explorer,
            utils::open_in_terminal,
            ide::open_with_ide,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}