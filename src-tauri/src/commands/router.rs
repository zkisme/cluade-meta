// src-tauri/src/commands/router.rs

use serde::{Deserialize, Serialize};
use tauri::Manager;
use std::fs;
use dirs;
use crate::db;
use std::path::PathBuf;
use tokio::sync::oneshot;
use rusqlite::OptionalExtension;
use tauri_plugin_dialog::DialogExt;

// Structs from lib.rs
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transformer {
    pub name: String,
    pub args: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Provider {
    pub name: String,
    pub api_base_url: String,
    pub api_key: String,
    pub models: Vec<String>,
    pub transformer: Option<Transformer>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RouterConfig {
    pub default: Option<String>,
    pub background: Option<String>,
    pub think: Option<String>,
    pub long_context: Option<String>,
    pub long_context_threshold: Option<u32>,
    pub web_search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeCodeRouterConfig {
    pub anthropic_api_key: Option<String>,
    pub proxy_url: Option<String>,
    pub log: Option<bool>,
    pub host: Option<String>,
    pub non_interactive_mode: Option<bool>,
    pub api_timeout_ms: Option<u32>,
    pub custom_router_path: Option<String>,
    pub providers: Vec<Provider>,
    pub router: RouterConfig,
    pub transformers: Option<Vec<Transformer>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouterBackupFile {
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
}

// Helper functions
fn get_router_config_path() -> std::path::PathBuf {
    let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    home_dir.join(".claude-code-router").join("config.json")
}

pub async fn get_router_config_path_with_custom(app: Option<&tauri::AppHandle>) -> Result<std::path::PathBuf, String> {
    if let Some(app_handle) = app {
        // 尝试从数据库获取自定义路径
        let conn = db::get_database_connection(app_handle).map_err(|e| e.to_string())?;
        if let Some(custom_path) = conn.query_row(
            "SELECT path FROM current_router_config_path ORDER BY updated_at DESC LIMIT 1",
            [],
            |row| row.get::<_, String>(0),
        ).optional().map_err(|e| e.to_string())? {
            return Ok(std::path::PathBuf::from(custom_path));
        }
    }

    // 如果没有自定义路径，使用默认路径
    Ok(get_router_config_path())
}

#[tauri::command]
pub async fn get_router_config(app: tauri::AppHandle) -> Result<ClaudeCodeRouterConfig, String> {
    println!("=== GET_ROUTER_CONFIG CALLED ===");
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;
    
    // 首先尝试从数据库读取配置
    let mut config = ClaudeCodeRouterConfig {
        anthropic_api_key: None,
        proxy_url: None,
        log: None,
        host: None,
        non_interactive_mode: None,
        api_timeout_ms: Some(600000),
        custom_router_path: None,
        providers: Vec::new(),
        router: RouterConfig {
            default: None,
            background: None,
            think: None,
            long_context: None,
            long_context_threshold: Some(60000),
            web_search: None,
        },
        transformers: None,
    };
    
    // 从数据库读取提供商
    let providers_result = {
        let mut stmt = conn.prepare("SELECT name, api_base_url, api_key, models, transformer FROM providers ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        
        let provider_rows = stmt.query_map([], |row| {
            let models_json: String = row.get(3)?;
            let transformer_json: Option<String> = row.get(4)?;
            
            let models: Vec<String> = serde_json::from_str(&models_json).unwrap_or_default();
            let transformer: Option<Transformer> = transformer_json
                .and_then(|json| serde_json::from_str(&json).ok());
            
            Ok(Provider {
                name: row.get(0)?,
                api_base_url: row.get(1)?,
                api_key: row.get(2)?,
                models,
                transformer,
            })
        }).map_err(|e| e.to_string())?;
        
        let mut providers = Vec::new();
        for provider_result in provider_rows {
            match provider_result {
                Ok(provider) => providers.push(provider),
                Err(e) => eprintln!("Error reading provider: {}", e),
            }
        }
        providers
    };
    
    config.providers = providers_result;
    println!("Loaded {} providers from database", config.providers.len());
    
    // 从数据库读取路由配置
    if let Ok(Some(router_json)) = conn.query_row(
        "SELECT config_value FROM router_configs WHERE config_key = 'router'",
        [],
        |row| row.get::<_, String>(0),
    ).optional() {
        if let Ok(router) = serde_json::from_str::<RouterConfig>(&router_json) {
            config.router = router;
        }
    }
    
    // 读取其他全局配置
    if let Ok(Some(api_key)) = conn.query_row(
        "SELECT config_value FROM router_configs WHERE config_key = 'anthropic_api_key'",
        [],
        |row| row.get::<_, String>(0),
    ).optional() {
        config.anthropic_api_key = Some(api_key);
    }
    
    if let Ok(Some(proxy_url)) = conn.query_row(
        "SELECT config_value FROM router_configs WHERE config_key = 'proxy_url'",
        [],
        |row| row.get::<_, String>(0),
    ).optional() {
        config.proxy_url = Some(proxy_url);
    }
    
    // 如果数据库中没有数据，尝试从文件读取并同步到数据库
    if config.providers.is_empty() {
        let config_path = get_router_config_path_with_custom(Some(&app)).await?;
        
        if config_path.exists() {
            let content = fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read config file: {}", e))?;
            
            if let Ok(file_config) = serde_json::from_str::<ClaudeCodeRouterConfig>(&content) {
                // 同步文件配置到数据库
                update_router_config(app, file_config.clone()).await?;
                return Ok(file_config);
            }
        }
    }
    
    Ok(config)
}

#[tauri::command] 
pub async fn update_router_config(app: tauri::AppHandle, config: ClaudeCodeRouterConfig) -> Result<bool, String> {
    println!("=== UPDATE_ROUTER_CONFIG CALLED ===");
    println!("Saving {} providers to database", config.providers.len());
    let config_path = get_router_config_path_with_custom(Some(&app)).await?;
    
    // 同时保存到数据库和文件
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    
    // 保存提供商到数据库
    // 先删除所有现有的提供商
    conn.execute("DELETE FROM providers", ()).map_err(|e| e.to_string())?;
    
    // 插入新的提供商
    for provider in &config.providers {
        let provider_id = uuid::Uuid::new_v4().to_string();
        let models_json = serde_json::to_string(&provider.models).unwrap_or_else(|_| "[]".to_string());
        let transformer_json = provider.transformer.as_ref()
            .map(|t| serde_json::to_string(t).unwrap_or_else(|_| "null".to_string()));
        
        conn.execute(
            "INSERT INTO providers (id, name, api_base_url, api_key, models, transformer, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            (&provider_id, &provider.name, &provider.api_base_url, &provider.api_key, &models_json, &transformer_json, &now, &now),
        ).map_err(|e| format!("Failed to save provider to database: {}", e))?;
    }
    
    // 保存路由配置到数据库
    let router_json = serde_json::to_string(&config.router).map_err(|e| e.to_string())?;
    
    // 删除旧的router配置，然后插入新的
    conn.execute("DELETE FROM router_configs WHERE config_key = 'router'", ()).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO router_configs (id, config_key, config_value, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (uuid::Uuid::new_v4().to_string(), "router", router_json, now.clone(), now.clone()),
    ).map_err(|e| format!("Failed to save router config to database: {}", e))?;
    
    // 保存其他全局配置
    if let Some(api_key) = &config.anthropic_api_key {
        conn.execute("DELETE FROM router_configs WHERE config_key = 'anthropic_api_key'", ()).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO router_configs (id, config_key, config_value, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            (uuid::Uuid::new_v4().to_string(), "anthropic_api_key", api_key, now.clone(), now.clone()),
        ).map_err(|e| format!("Failed to save anthropic_api_key to database: {}", e))?;
    } else {
        conn.execute("DELETE FROM router_configs WHERE config_key = 'anthropic_api_key'", ()).map_err(|e| e.to_string())?;
    }
    
    if let Some(proxy_url) = &config.proxy_url {
        conn.execute("DELETE FROM router_configs WHERE config_key = 'proxy_url'", ()).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO router_configs (id, config_key, config_value, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            (uuid::Uuid::new_v4().to_string(), "proxy_url", proxy_url, now.clone(), now.clone()),
        ).map_err(|e| format!("Failed to save proxy_url to database: {}", e))?;
    }
    
    // 创建目录（如果不存在）
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;
    
    Ok(true)
}

#[tauri::command]
pub async fn create_router_config(app: tauri::AppHandle, config: ClaudeCodeRouterConfig) -> Result<ClaudeCodeRouterConfig, String> {
    update_router_config(app, config.clone()).await?;
    Ok(config)
}

#[tauri::command]
pub async fn get_raw_router_config(app: tauri::AppHandle) -> Result<String, String> {
    let config_path = get_router_config_path_with_custom(Some(&app)).await?;
    
    if !config_path.exists() {
        // 创建默认配置文件
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }
        
        let default_config = ClaudeCodeRouterConfig {
            anthropic_api_key: None,
            proxy_url: None,
            log: None,
            host: None,
            non_interactive_mode: None,
            api_timeout_ms: Some(600000),
            custom_router_path: None,
            providers: Vec::new(),
            router: RouterConfig {
                default: None,
                background: None,
                think: None,
                long_context: None,
                long_context_threshold: Some(60000),
                web_search: None,
            },
            transformers: None,
        };
        
        let content = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("Failed to serialize default config: {}", e))?;
        
        fs::write(&config_path, &content)
            .map_err(|e| format!("Failed to create config file: {}", e))?;
        
        return Ok(content);
    }
    
    fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))
}

#[tauri::command]
pub async fn get_router_config_path_command(app: tauri::AppHandle) -> Result<String, String> {
    let config_path = get_router_config_path_with_custom(Some(&app)).await?;
    Ok(config_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn backup_router_config(app: tauri::AppHandle) -> Result<String, String> {
    let config_path = get_router_config_path_with_custom(Some(&app)).await?;
    
    if !config_path.exists() {
        return Err("配置文件不存在".to_string());
    }
    
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    
    // 创建备份文件名
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("claude_router_config_backup_{}.json", timestamp);
    
    // 获取备份目录
    let backup_dir = if let Some(parent) = config_path.parent() {
        parent.join("backups")
    } else {
        let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        home_dir.join(".claude-code-router").join("backups")
    };
    
    // 创建备份目录
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    
    let backup_path = backup_dir.join(&backup_filename);
    
    // 写入备份文件
    fs::write(&backup_path, &content)
        .map_err(|e| format!("Failed to create backup file: {}", e))?;
    
    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_router_backup_files(app: tauri::AppHandle) -> Result<Vec<RouterBackupFile>, String> {
    let config_path = get_router_config_path_with_custom(Some(&app)).await?;
    let backup_dir = if let Some(parent) = config_path.parent() {
        parent.join("backups")
    } else {
        let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        home_dir.join(".claude-code-router").join("backups")
    };
    
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut backup_files = Vec::new();
    
    for entry in fs::read_dir(&backup_dir).map_err(|e| format!("Failed to read backup directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        
        if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
            if let Some(filename) = path.file_name().and_then(|name| name.to_str()) {
                let metadata = entry.metadata().map_err(|e| format!("Failed to read file metadata: {}", e))?;
                let size = metadata.len();
                
                // 从文件名中提取时间戳
                let created_at = if let Some(timestamp_part) = filename.strip_prefix("claude_router_config_backup_").and_then(|s| s.strip_suffix(".json")) {
                    // 解析时间戳格式: YYYYMMDD_HHMMSS
                    if timestamp_part.len() == 15 {
                        let year = &timestamp_part[0..4];
                        let month = &timestamp_part[4..6];
                        let day = &timestamp_part[6..8];
                        let hour = &timestamp_part[9..11];
                        let minute = &timestamp_part[11..13];
                        let second = &timestamp_part[13..15];
                        format!("{}-{}-{}T{}:{}:{}Z", year, month, day, hour, minute, second)
                    } else {
                        // 如果时间戳格式不对，使用文件修改时间
                        metadata.modified()
                            .ok()
                            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|duration| {
                                chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0)
                                    .unwrap_or_default()
                                    .to_rfc3339()
                            })
                            .unwrap_or_else(|| "Unknown".to_string())
                    }
                } else {
                    // 使用文件修改时间作为后备
                    metadata.modified()
                        .ok()
                        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|duration| {
                            chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0)
                                .unwrap_or_default()
                                .to_rfc3339()
                        })
                        .unwrap_or_else(|| "Unknown".to_string())
                };
                
                backup_files.push(RouterBackupFile {
                    filename: filename.to_string(),
                    path: path.to_string_lossy().to_string(),
                    size,
                    created_at,
                });
            }
        }
    }
    
    // 按创建时间降序排序（最新的在前面）
    backup_files.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    Ok(backup_files)
}

#[tauri::command]
pub async fn restore_router_config_from_file(app: tauri::AppHandle, backup_filename: String) -> Result<bool, String> {
    let config_path = get_router_config_path_with_custom(Some(&app)).await?;
    let backup_dir = if let Some(parent) = config_path.parent() {
        parent.join("backups")
    } else {
        let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        home_dir.join(".claude-code-router").join("backups")
    };
    
    let backup_file = backup_dir.join(&backup_filename);
    
    if !backup_file.exists() {
        return Err("备份文件不存在".to_string());
    }
    
    // 读取备份内容
    let content = fs::read_to_string(&backup_file)
        .map_err(|e| format!("Failed to read backup file: {}", e))?;
    
    // 验证JSON格式
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("备份文件格式无效: {}", e))?;
    
    // 创建配置目录（如果不存在）
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    // 恢复配置文件
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to restore config file: {}", e))?;
    
    Ok(true)
}

#[tauri::command]
pub async fn get_router_backup_content(app: tauri::AppHandle, backup_filename: String) -> Result<String, String> {
    let config_path = get_router_config_path_with_custom(Some(&app)).await?;
    let backup_dir = if let Some(parent) = config_path.parent() {
        parent.join("backups")
    } else {
        let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        home_dir.join(".claude-code-router").join("backups")
    };
    
    let backup_file = backup_dir.join(&backup_filename);
    
    if !backup_file.exists() {
        return Err("备份文件不存在".to_string());
    }
    
    fs::read_to_string(&backup_file)
        .map_err(|e| format!("Failed to read backup file: {}", e))
}

#[tauri::command]
pub async fn delete_router_backup(app: tauri::AppHandle, backup_filename: String) -> Result<bool, String> {
    let config_path = get_router_config_path_with_custom(Some(&app)).await?;
    let backup_dir = if let Some(parent) = config_path.parent() {
        parent.join("backups")
    } else {
        let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        home_dir.join(".claude-code-router").join("backups")
    };
    
    let backup_file = backup_dir.join(&backup_filename);
    
    if !backup_file.exists() {
        return Ok(false);
    }
    
    fs::remove_file(&backup_file)
        .map_err(|e| format!("Failed to delete backup file: {}", e))?;
    
    Ok(true)
}

#[tauri::command]
pub async fn select_router_config_path(app: tauri::AppHandle) -> Result<String, String> {
    let (tx, rx) = oneshot::channel();
    
    app.dialog().file()
        .set_title("选择Claude Code Router配置文件路径")
        .add_filter("JSON文件", &["json"])
        .add_filter("所有文件", &["*"])
        .pick_file(move |result| {
            let _ = tx.send(result);
        });
    
    match rx.await {
        Ok(Some(path_buf)) => {
            let std_path_buf = path_buf.into_path().map_err(|e| e.to_string())?;
            let path_str = std_path_buf.to_str().map_or_else(|| "invalid path".to_string(), |s| s.to_string());
            
            // 保存配置文件路径到数据库
            let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;
            let now = chrono::Utc::now().to_rfc3339();
            
            // 删除现有的router配置路径
            conn.execute("DELETE FROM current_router_config_path", ())
                .map_err(|e| e.to_string())?;
            
            // 插入新的router配置路径
            conn.execute(
                "INSERT INTO current_router_config_path (path, updated_at) VALUES (?1, ?2)",
                (&path_str, &now),
            ).map_err(|e| format!("Failed to save router config path to database: {}", e))?;
            
            Ok(path_str)
        }
        Ok(None) => {
            Err("用户取消了选择".to_string())
        }
        Err(_) => {
            Err("文件选择失败".to_string())
        }
    }
}

#[tauri::command]
pub async fn save_raw_router_config(app: tauri::AppHandle, content: String) -> Result<bool, String> {
    let config_path = get_router_config_path_with_custom(Some(&app)).await?;
    
    // 验证JSON格式
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("无效的JSON格式: {}", e))?;
    
    // 创建目录（如果不存在）
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save config file: {}", e))?;
    
    Ok(true)
}