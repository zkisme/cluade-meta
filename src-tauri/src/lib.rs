// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use rusqlite::{Connection, Result, OptionalExtension};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiKey {
    pub id: String,
    pub name: String,
    pub key: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub key: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: Option<String>,
    pub key: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeSettings {
    pub api_key: Option<String>,
    pub api_url: Option<String>,
    pub model: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f64>,
    pub top_p: Option<f64>,
    pub timeout: Option<u64>,
    pub proxy_url: Option<String>,
    pub verbose: Option<bool>,
    pub stream: Option<bool>,
    pub unsafe_html: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigPath {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateConfigPathRequest {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateConfigPathRequest {
    pub name: Option<String>,
    pub path: Option<String>,
    pub description: Option<String>,
}

fn get_database_connection(app: &tauri::AppHandle) -> Result<Connection> {
    let api_dir = app.path().app_data_dir().unwrap().join("api_keys");
    fs::create_dir_all(&api_dir).map_err(|_e| rusqlite::Error::InvalidColumnType(0, "Failed to create directory".to_string(), rusqlite::types::Type::Null))?;
    
    let db_path = api_dir.join("claude_keys.db");
    let conn = Connection::open(db_path)?;
    
    // Create the api_keys table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;

    // Create the config_paths table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS config_paths (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;
    
    Ok(conn)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn create_api_key(
    app: tauri::AppHandle,
    request: CreateApiKeyRequest,
) -> Result<ApiKey, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    let api_key = ApiKey {
        id: uuid::Uuid::new_v4().to_string(),
        name: request.name,
        key: request.key,
        description: request.description,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO api_keys (id, name, key, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&api_key.id, &api_key.name, &api_key.key, &api_key.description, &api_key.created_at, &api_key.updated_at),
    ).map_err(|e| e.to_string())?;

    Ok(api_key)
}

#[tauri::command]
async fn get_api_keys(app: tauri::AppHandle) -> Result<Vec<ApiKey>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, key, description, created_at, updated_at FROM api_keys ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let api_keys = stmt.query_map([], |row| {
        Ok(ApiKey {
            id: row.get(0)?,
            name: row.get(1)?,
            key: row.get(2)?,
            description: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for api_key in api_keys {
        result.push(api_key.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
async fn update_api_key(
    app: tauri::AppHandle,
    id: String,
    request: UpdateApiKeyRequest,
) -> Result<ApiKey, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    // Check if the API key exists
    let existing_key: Option<ApiKey> = conn.query_row(
        "SELECT id, name, key, description, created_at, updated_at FROM api_keys WHERE id = ?1",
        [&id],
        |row| {
            Ok(ApiKey {
                id: row.get(0)?,
                name: row.get(1)?,
                key: row.get(2)?,
                description: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    ).optional().map_err(|e| e.to_string())?;

    let mut api_key = existing_key.ok_or("API key not found")?;

    if let Some(name) = request.name {
        api_key.name = name;
    }
    if let Some(key) = request.key {
        api_key.key = key;
    }
    if let Some(description) = request.description {
        api_key.description = Some(description);
    }
    api_key.updated_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE api_keys SET name = ?1, key = ?2, description = ?3, updated_at = ?4 WHERE id = ?5",
        (&api_key.name, &api_key.key, &api_key.description, &api_key.updated_at, &id),
    ).map_err(|e| e.to_string())?;

    Ok(api_key)
}

#[tauri::command]
async fn delete_api_key(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let affected_rows = conn.execute(
        "DELETE FROM api_keys WHERE id = ?1",
        [&id],
    ).map_err(|e| e.to_string())?;

    Ok(affected_rows > 0)
}

#[tauri::command]
async fn get_config_file_content() -> Result<String, String> {
    
    // Get home directory
    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
    let claude_dir = home_dir.join(".claude");
    let settings_file = claude_dir.join("settings.json");

    if !settings_file.exists() {
        fs::create_dir_all(&claude_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
        let empty_content = "{}";
        fs::write(&settings_file, empty_content).map_err(|e| format!("Failed to write file: {}", e))?;
        return Ok(empty_content.to_string());
    }

    fs::read_to_string(&settings_file).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn save_config_file_content(content: String) -> Result<bool, String> {
    
    // Get home directory
    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
    let claude_dir = home_dir.join(".claude");
    let settings_file = claude_dir.join("settings.json");
    
    fs::create_dir_all(&claude_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    // 验证JSON格式
    serde_json::from_str::<serde_json::Value>(&content).map_err(|e| format!("无效的JSON格式: {}", e))?;
    
    fs::write(&settings_file, content).map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(true)
}

#[tauri::command]
async fn get_claude_settings(path: String) -> Result<String, String> {
    
    // Expand the ~ to home directory
    let expanded_path = if path.starts_with("~/") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&path[2..])
    } else {
        std::path::PathBuf::from(path)
    };
    
    let settings_file = expanded_path;

    if !settings_file.exists() {
        // Create directory if it doesn't exist
        if let Some(parent) = settings_file.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        
        // Create default settings
        let default_settings = ClaudeSettings {
            api_key: None,
            api_url: Some("https://api.anthropic.com".to_string()),
            model: Some("claude-3-5-sonnet-20241022".to_string()),
            max_tokens: Some(4096),
            temperature: Some(0.7),
            top_p: Some(0.9),
            timeout: Some(30000),
            proxy_url: None,
            verbose: Some(false),
            stream: Some(true),
            unsafe_html: Some(false),
        };
        
        let content = serde_json::to_string_pretty(&default_settings)
            .map_err(|e| format!("Failed to serialize default settings: {}", e))?;
        fs::write(&settings_file, content).map_err(|e| format!("Failed to write file: {}", e))?;
        
        return Ok(serde_json::to_string_pretty(&default_settings).unwrap());
    }

    fs::read_to_string(&settings_file).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn save_claude_settings(path: String, settings: ClaudeSettings) -> Result<bool, String> {
    
    // Expand the ~ to home directory
    let expanded_path = if path.starts_with("~/") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&path[2..])
    } else {
        std::path::PathBuf::from(path)
    };
    
    let settings_file = expanded_path;
    
    // Create directory if it doesn't exist
    if let Some(parent) = settings_file.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(&settings_file, content).map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(true)
}

#[tauri::command]
async fn open_file_dialog(app: tauri::AppHandle) -> Result<String, String> {
    use std::sync::mpsc;
    
    let (tx, rx) = mpsc::channel();
    
    app.dialog().file()
        .set_title("选择配置文件")
        .add_filter("JSON文件", &["json"])
        .add_filter("所有文件", &["*"])
        .pick_file(move |result| {
            let _ = tx.send(result);
        });
    
    match rx.recv().unwrap() {
        Some(path) => {
            let path_str = path.to_string();
            Ok(path_str)
        }
        None => Err("用户取消了选择".to_string()),
    }
}

#[tauri::command]
async fn backup_config_file(backup_filename: String) -> Result<bool, String> {
    use std::fs;
    
    println!("Backup function called with filename: {}", backup_filename);
    
    // Get home directory
    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
    let claude_dir = home_dir.join(".claude");
    let settings_file = claude_dir.join("settings.json");
    
    println!("Settings file path: {:?}", settings_file);
    
    if !settings_file.exists() {
        return Err("配置文件不存在".to_string());
    }
    
    // Read original file content
    let content = fs::read_to_string(&settings_file)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // Create backup directory if it doesn't exist
    let backup_dir = claude_dir.join("back");
    fs::create_dir_all(&backup_dir).map_err(|e| format!("Failed to create backup directory: {}", e))?;
    
    // Create backup file path
    let backup_file = backup_dir.join(backup_filename);
    println!("Backup file path: {:?}", backup_file);
    
    // Write backup file
    fs::write(&backup_file, content)
        .map_err(|e| format!("Failed to write backup file: {}", e))?;
    
    println!("Backup completed successfully");
    Ok(true)
}

#[tauri::command]
async fn create_config_path(
    app: tauri::AppHandle,
    request: CreateConfigPathRequest,
) -> Result<ConfigPath, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    let config_path = ConfigPath {
        id: uuid::Uuid::new_v4().to_string(),
        name: request.name,
        path: request.path,
        description: request.description,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO config_paths (id, name, path, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&config_path.id, &config_path.name, &config_path.path, &config_path.description, &config_path.created_at, &config_path.updated_at),
    ).map_err(|e| e.to_string())?;

    Ok(config_path)
}

#[tauri::command]
async fn get_config_paths(app: tauri::AppHandle) -> Result<Vec<ConfigPath>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, path, description, created_at, updated_at FROM config_paths ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let config_paths = stmt.query_map([], |row| {
        Ok(ConfigPath {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            description: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for config_path in config_paths {
        result.push(config_path.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
async fn update_config_path(
    app: tauri::AppHandle,
    id: String,
    request: UpdateConfigPathRequest,
) -> Result<ConfigPath, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    // Check if the config path exists
    let existing_path: Option<ConfigPath> = conn.query_row(
        "SELECT id, name, path, description, created_at, updated_at FROM config_paths WHERE id = ?1",
        [&id],
        |row| {
            Ok(ConfigPath {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                description: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    ).optional().map_err(|e| e.to_string())?;

    let mut config_path = existing_path.ok_or("Config path not found")?;

    if let Some(name) = request.name {
        config_path.name = name;
    }
    if let Some(path) = request.path {
        config_path.path = path;
    }
    if let Some(description) = request.description {
        config_path.description = Some(description);
    }
    config_path.updated_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE config_paths SET name = ?1, path = ?2, description = ?3, updated_at = ?4 WHERE id = ?5",
        (&config_path.name, &config_path.path, &config_path.description, &config_path.updated_at, &id),
    ).map_err(|e| e.to_string())?;

    Ok(config_path)
}

#[tauri::command]
async fn delete_config_path(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let affected_rows = conn.execute(
        "DELETE FROM config_paths WHERE id = ?1",
        [&id],
    ).map_err(|e| e.to_string())?;

    Ok(affected_rows > 0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_api_key,
            get_api_keys,
            update_api_key,
            delete_api_key,
            get_config_file_content,
            save_config_file_content,
            get_claude_settings,
            save_claude_settings,
            open_file_dialog,
            backup_config_file,
            create_config_path,
            get_config_paths,
            update_config_path,
            delete_config_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
