// src-tauri/src/commands/utils.rs

use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tokio::sync::oneshot;
use std::process::Command;
use serde::{Deserialize, Serialize};
use std::fs;
use dirs;
use std::path::PathBuf;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub async fn open_file_dialog(app: tauri::AppHandle) -> Result<String, String> {
    println!("=== open_file_dialog 开始 ===");

    let (tx, rx) = oneshot::channel();

    println!("创建文件对话框...");
    app.dialog().file()
        .set_title("选择配置文件")
        .add_filter("JSON文件", &["json"])
        .add_filter("所有文件", &["*"])
        .pick_file(move |result| {
            println!("文件对话框回调结果: {:?}", result);
            let _ = tx.send(result);
        });

    println!("等待对话框结果...");
    match rx.await {
        Ok(Some(path_buf)) => {
            let std_path_buf = path_buf.into_path().map_err(|e| e.to_string())?;
            let path_str = std_path_buf.to_str().map_or_else(|| "invalid path".to_string(), |s| s.to_string());
            println!("用户选择了文件: {}", path_str);
            println!("=== open_file_dialog 成功结束 ===");
            Ok(path_str)
        }
        Ok(None) => {
            println!("用户取消了选择");
            println!("=== open_file_dialog 取消结束 ===");
            Err("用户取消了选择".to_string())
        }
        Err(e) => {
            println!("文件选择失败: {:?}", e);
            println!("=== open_file_dialog 错误结束 ===");
            Err("文件选择失败".to_string())
        }
    }
}

// Feature Detection
#[derive(Debug, Serialize, Deserialize)]
pub struct FeatureStatus {
    pub feature_id: String,
    pub is_installed: bool,
    pub installation_path: Option<String>,
    pub description: String,
    pub can_install: bool,
}

#[tauri::command]
pub async fn check_feature_status() -> Result<Vec<FeatureStatus>, String> {
    let mut features = Vec::new();
    
    // Check Claude Code
    let claude_path = dirs::home_dir()
        .ok_or("Failed to get home directory")?
        .join(".claude")
        .join("settings.json");
    
    features.push(FeatureStatus {
        feature_id: "claude-code".to_string(),
        is_installed: claude_path.exists(),
        installation_path: Some(claude_path.to_string_lossy().to_string()),
        description: "Claude Code CLI tool configuration".to_string(),
        can_install: true,
    });
    
    // Check Claude Code Router
    let router_path = dirs::home_dir()
        .ok_or("Failed to get home directory")?
        .join(".claude-code-router")
        .join("config.json");
    
    features.push(FeatureStatus {
        feature_id: "claude-router".to_string(),
        is_installed: router_path.exists(),
        installation_path: Some(router_path.to_string_lossy().to_string()),
        description: "Claude Code Router configuration".to_string(),
        can_install: true,
    });
    
    Ok(features)
}

#[tauri::command]
pub async fn install_feature(feature_id: String) -> Result<bool, String> {
    match feature_id.as_str() {
        "claude-code" => {
            // Install Claude Code configuration
            let claude_dir = dirs::home_dir()
                .ok_or("Failed to get home directory")?
                .join(".claude");
            
            let settings_file = claude_dir.join("settings.json");
            
            // Create directory if it doesn't exist
            fs::create_dir_all(&claude_dir)
                .map_err(|e| format!("Failed to create Claude directory: {}", e))?;
            
            // Create default settings file
            let default_settings = serde_json::json!({
                "env": {
                    "ANTHROPIC_BASE_URL": "https://api.anthropic.com"
                },
                "permissions": {
                    "allow": [],
                    "deny": []
                }
            });
            
            let content = serde_json::to_string_pretty(&default_settings)
                .map_err(|e| format!("Failed to serialize default settings: {}", e))?;
            
            fs::write(&settings_file, content)
                .map_err(|e| format!("Failed to create settings file: {}", e))?;
            
            Ok(true)
        }
        "claude-router" => {
            // Install Claude Code Router configuration
            let router_dir = dirs::home_dir()
                .ok_or("Failed to get home directory")?
                .join(".claude-code-router");
            
            let config_file = router_dir.join("config.json");
            
            // Create directory if it doesn't exist
            fs::create_dir_all(&router_dir)
                .map_err(|e| format!("Failed to create router directory: {}", e))?;
            
            // Create default router configuration
            let default_config = serde_json::json!({
                "anthropic_api_key": null,
                "proxy_url": null,
                "log": false,
                "host": "localhost",
                "non_interactive_mode": false,
                "api_timeout_ms": 600000,
                "custom_router_path": null,
                "providers": [],
                "router": {
                    "default": null,
                    "background": null,
                    "think": null,
                    "long_context": null,
                    "long_context_threshold": 60000,
                    "web_search": null
                },
                "transformers": null
            });
            
            let content = serde_json::to_string_pretty(&default_config)
                .map_err(|e| format!("Failed to serialize default config: {}", e))?;
            
            fs::write(&config_file, content)
                .map_err(|e| format!("Failed to create config file: {}", e))?;
            
            Ok(true)
        }
        _ => Err(format!("Unknown feature: {}", feature_id))
    }
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_in_terminal(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/C", "start", "cmd", "/K", &format!("cd /D {}", path)])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(&["-a", "Terminal", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        // This is a common case, but might need adjustment
        // depending on the user's default terminal
        Command::new("x-terminal-emulator")
            .arg("--working-directory")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}