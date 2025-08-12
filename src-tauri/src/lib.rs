// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use rusqlite::{Connection, Result, OptionalExtension};
use serde_json;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiKey {
    pub id: String,
    pub name: String,
    pub ANTHROPIC_AUTH_TOKEN: String,
    pub description: Option<String>,
    pub ANTHROPIC_BASE_URL: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvironmentVariable {
    pub id: String,
    pub name: String,
    pub key: String,
    pub value: String,
    pub scope: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEnvironmentVariableRequest {
    pub name: String,
    pub key: String,
    pub value: String,
    pub scope: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEnvironmentVariableRequest {
    pub name: Option<String>,
    pub key: Option<String>,
    pub value: Option<String>,
    pub scope: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RouteConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub method: String,
    pub handler: String,
    pub middleware: Option<Vec<String>>,
    pub auth_required: bool,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl RouteConfig {
    fn to_db_middleware(&self) -> Option<String> {
        self.middleware.as_ref().map(|m| serde_json::to_string(m).unwrap_or_else(|_| "[]".to_string()))
    }
    
    fn from_db_middleware(middleware_json: Option<String>) -> Option<Vec<String>> {
        middleware_json.and_then(|json| serde_json::from_str(&json).ok())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRouteConfigRequest {
    pub name: String,
    pub path: String,
    pub method: String,
    pub handler: String,
    pub middleware: Option<Vec<String>>,
    pub auth_required: bool,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRouteConfigRequest {
    pub name: Option<String>,
    pub path: Option<String>,
    pub method: Option<String>,
    pub handler: Option<String>,
    pub middleware: Option<Vec<String>>,
    pub auth_required: Option<bool>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub ANTHROPIC_AUTH_TOKEN: String,
    pub description: Option<String>,
    pub ANTHROPIC_BASE_URL: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: Option<String>,
    pub ANTHROPIC_AUTH_TOKEN: Option<String>,
    pub description: Option<String>,
    pub ANTHROPIC_BASE_URL: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeSettings {
    pub ANTHROPIC_AUTH_TOKEN: Option<String>,
    pub ANTHROPIC_BASE_URL: Option<String>,
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
pub struct EnvConfig {
    pub ANTHROPIC_AUTH_TOKEN: Option<String>,
    pub ANTHROPIC_BASE_URL: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PermissionsConfig {
    pub allow: Option<Vec<String>>,
    pub deny: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigFileFormat {
    pub env: EnvConfig,
    pub permissions: PermissionsConfig,
    pub api_key_helper: Option<String>,
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
            ANTHROPIC_AUTH_TOKEN TEXT NOT NULL,
            description TEXT,
            ANTHROPIC_BASE_URL TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;

    // Check if we need to migrate from old schema (key column to ANTHROPIC_AUTH_TOKEN)
    let has_key_column: Result<bool> = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('api_keys') WHERE name = 'key'",
        [],
        |row| row.get(0),
    );

    if let Ok(true) = has_key_column {
        // Migration needed: rename key column to ANTHROPIC_AUTH_TOKEN
        conn.execute(
            "ALTER TABLE api_keys RENAME COLUMN key TO ANTHROPIC_AUTH_TOKEN",
            (),
        ).map_err(|e| rusqlite::Error::InvalidColumnType(0, format!("Failed to migrate database schema: {}", e), rusqlite::types::Type::Null))?;
    }

    // Check if we need to migrate from lowercase to uppercase column names
    let has_lowercase_columns: Result<i64> = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('api_keys') WHERE name IN ('anthropic_auth_token', 'anthropic_base_url')",
        [],
        |row| row.get(0),
    );

    if let Ok(count) = has_lowercase_columns {
        if count > 0 {
            // Migration needed: rename lowercase columns to uppercase
            if count >= 1 {
                conn.execute(
                    "ALTER TABLE api_keys RENAME COLUMN anthropic_auth_token TO ANTHROPIC_AUTH_TOKEN",
                    (),
                ).map_err(|e| rusqlite::Error::InvalidColumnType(0, format!("Failed to migrate database schema: {}", e), rusqlite::types::Type::Null))?;
            }
            if count >= 2 {
                conn.execute(
                    "ALTER TABLE api_keys RENAME COLUMN anthropic_base_url TO ANTHROPIC_BASE_URL",
                    (),
                ).map_err(|e| rusqlite::Error::InvalidColumnType(0, format!("Failed to migrate database schema: {}", e), rusqlite::types::Type::Null))?;
            }
        }
    }

    // Check if CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC column exists and remove it
    let has_disable_traffic_column: Result<bool> = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('api_keys') WHERE name = 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'",
        [],
        |row| row.get(0),
    );

    if let Ok(true) = has_disable_traffic_column {
        // Remove the CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC column
        conn.execute(
            "ALTER TABLE api_keys DROP COLUMN CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
            (),
        ).map_err(|e| rusqlite::Error::InvalidColumnType(0, format!("Failed to migrate database schema: {}", e), rusqlite::types::Type::Null))?;
    }

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

    // Create the current_config_path table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS current_config_path (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;

    // Create the backups table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            size INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )",
        (),
    )?;

    // Create the environment_variables table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS environment_variables (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            scope TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;

    // Create the route_configs table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS route_configs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            method TEXT NOT NULL,
            handler TEXT NOT NULL,
            middleware TEXT,
            auth_required INTEGER NOT NULL,
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
        ANTHROPIC_AUTH_TOKEN: request.ANTHROPIC_AUTH_TOKEN,
        description: request.description,
        ANTHROPIC_BASE_URL: request.ANTHROPIC_BASE_URL,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO api_keys (id, name, ANTHROPIC_AUTH_TOKEN, description, ANTHROPIC_BASE_URL, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (&api_key.id, &api_key.name, &api_key.ANTHROPIC_AUTH_TOKEN, &api_key.description, &api_key.ANTHROPIC_BASE_URL, &api_key.created_at, &api_key.updated_at),
    ).map_err(|e| e.to_string())?;

    Ok(api_key)
}

#[tauri::command]
async fn get_api_keys(app: tauri::AppHandle) -> Result<Vec<ApiKey>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, ANTHROPIC_AUTH_TOKEN, description, ANTHROPIC_BASE_URL, created_at, updated_at FROM api_keys ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let api_keys = stmt.query_map([], |row| {
        Ok(ApiKey {
            id: row.get(0)?,
            name: row.get(1)?,
            ANTHROPIC_AUTH_TOKEN: row.get(2)?,
            description: row.get(3)?,
            ANTHROPIC_BASE_URL: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for api_key in api_keys {
        result.push(api_key.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigItem<T> {
    pub id: String,
    pub name: String,
    pub data: T,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiKeyData {
    pub ANTHROPIC_AUTH_TOKEN: String,
    pub ANTHROPIC_BASE_URL: Option<String>,
}

#[tauri::command]
async fn get_api_keys_config(app: tauri::AppHandle) -> Result<Vec<ConfigItem<ApiKeyData>>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, ANTHROPIC_AUTH_TOKEN, description, ANTHROPIC_BASE_URL, created_at, updated_at FROM api_keys ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let api_keys = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let ANTHROPIC_AUTH_TOKEN: String = row.get(2)?;
        let description: Option<String> = row.get(3)?;
        let ANTHROPIC_BASE_URL: Option<String> = row.get(4)?;
        let created_at: String = row.get(5)?;
        let updated_at: String = row.get(6)?;
        
        Ok(ConfigItem {
            id,
            name,
            data: ApiKeyData {
                ANTHROPIC_AUTH_TOKEN,
                ANTHROPIC_BASE_URL,
            },
            description,
            created_at,
            updated_at,
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
        "SELECT id, name, ANTHROPIC_AUTH_TOKEN, description, ANTHROPIC_BASE_URL, created_at, updated_at FROM api_keys WHERE id = ?1",
        [&id],
        |row| {
            Ok(ApiKey {
                id: row.get(0)?,
                name: row.get(1)?,
                ANTHROPIC_AUTH_TOKEN: row.get(2)?,
                description: row.get(3)?,
                ANTHROPIC_BASE_URL: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    ).optional().map_err(|e| e.to_string())?;

    let mut api_key = existing_key.ok_or("API key not found")?;

    if let Some(name) = request.name {
        api_key.name = name;
    }
    if let Some(ANTHROPIC_AUTH_TOKEN) = request.ANTHROPIC_AUTH_TOKEN {
        api_key.ANTHROPIC_AUTH_TOKEN = ANTHROPIC_AUTH_TOKEN;
    }
    if let Some(description) = request.description {
        api_key.description = Some(description);
    }
    if let Some(ANTHROPIC_BASE_URL) = request.ANTHROPIC_BASE_URL {
        api_key.ANTHROPIC_BASE_URL = Some(ANTHROPIC_BASE_URL);
    }
    api_key.updated_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE api_keys SET name = ?1, ANTHROPIC_AUTH_TOKEN = ?2, description = ?3, ANTHROPIC_BASE_URL = ?4, updated_at = ?5 WHERE id = ?6",
        (&api_key.name, &api_key.ANTHROPIC_AUTH_TOKEN, &api_key.description, &api_key.ANTHROPIC_BASE_URL, &api_key.updated_at, &id),
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
async fn get_config_file_content(app: tauri::AppHandle) -> Result<String, String> {
    
    // Get the configured config path or use default
    let config_path = get_config_path(app.clone()).await?;
    
    // Expand the ~ to home directory if needed
    let expanded_path = if config_path.starts_with("~/") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&config_path[2..])
    } else {
        std::path::PathBuf::from(config_path)
    };
    
    let settings_file = expanded_path;

    if !settings_file.exists() {
        if let Some(parent) = settings_file.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        let empty_content = "{}";
        fs::write(&settings_file, empty_content).map_err(|e| format!("Failed to write file: {}", e))?;
        return Ok(empty_content.to_string());
    }

    fs::read_to_string(&settings_file).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn read_config_file(config_path: String) -> Result<String, String> {
    // Expand the ~ to home directory if needed
    let expanded_path = if config_path.starts_with("~/") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&config_path[2..])
    } else {
        std::path::PathBuf::from(config_path)
    };
    
    let settings_file = expanded_path;

    if !settings_file.exists() {
        return Ok("".to_string());
    }

    fs::read_to_string(&settings_file).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn write_config_file(config_path: String, content: String) -> Result<bool, String> {
    // Expand the ~ to home directory if needed
    let expanded_path = if config_path.starts_with("~/") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&config_path[2..])
    } else {
        std::path::PathBuf::from(config_path)
    };
    
    let settings_file = expanded_path;
    
    // Create directory if it doesn't exist
    if let Some(parent) = settings_file.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    fs::write(&settings_file, content).map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(true)
}

#[tauri::command]
async fn save_config_file_content(app: tauri::AppHandle, content: String) -> Result<bool, String> {
    
    // Get the configured config path or use default
    let config_path = get_config_path(app.clone()).await?;
    
    // Expand the ~ to home directory if needed
    let expanded_path = if config_path.starts_with("~/") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&config_path[2..])
    } else {
        std::path::PathBuf::from(config_path)
    };
    
    let settings_file = expanded_path;
    
    // Create directory if it doesn't exist
    if let Some(parent) = settings_file.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
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
            ANTHROPIC_AUTH_TOKEN: None,
            ANTHROPIC_BASE_URL: Some("https://api.anthropic.com".to_string()),
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
    use tokio::sync::oneshot;
    
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
        Ok(Some(path)) => {
            let path_str = path.to_string();
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

#[tauri::command]
async fn backup_config_file(app: tauri::AppHandle, backup_filename: String) -> Result<bool, String> {
    use std::fs;
    
    println!("Backup function called with filename: {}", backup_filename);
    
    // Get the configured config path
    let config_path = get_config_path(app.clone()).await?;
    
    // Expand the ~ to home directory if needed
    let settings_file = if config_path.starts_with("~/") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&config_path[2..])
    } else {
        std::path::PathBuf::from(config_path)
    };
    
    println!("Settings file path: {:?}", settings_file);
    
    if !settings_file.exists() {
        return Err("配置文件不存在".to_string());
    }
    
    // Read original file content
    let content = fs::read_to_string(&settings_file)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // Get database connection
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;
    
    // Get current timestamp
    let now = chrono::Utc::now().to_rfc3339();
    let size = content.len() as i64;
    
    // Save backup to database
    conn.execute(
        "INSERT INTO backups (filename, content, size, created_at) VALUES (?1, ?2, ?3, ?4)",
        (&backup_filename, &content, &size, &now),
    ).map_err(|e| format!("Failed to save backup to database: {}", e))?;
    
    println!("Backup completed successfully");
    Ok(true)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupFile {
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
}

#[tauri::command]
async fn get_backup_files(app: tauri::AppHandle) -> Result<Vec<BackupFile>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT filename, size, created_at FROM backups ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let backup_files = stmt.query_map([], |row| {
        Ok(BackupFile {
            filename: row.get(0)?,
            path: format!("database://{}", row.get::<_, String>(0)?), // Virtual path for database storage
            size: row.get(1)?,
            created_at: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for backup_file in backup_files {
        result.push(backup_file.map_err(|e| e.to_string())?);
    }
    
    Ok(result)
}

#[tauri::command]
async fn restore_config_file(app: tauri::AppHandle, backup_filename: String) -> Result<bool, String> {
    use std::fs;
    
    println!("Restore function called with filename: {}", backup_filename);
    
    // Get the configured config path
    let config_path = get_config_path(app.clone()).await?;
    
    // Expand the ~ to home directory if needed
    let settings_file = if config_path.starts_with("~/") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&config_path[2..])
    } else {
        std::path::PathBuf::from(config_path)
    };
    
    // Get database connection
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;
    
    // Get backup content from database
    let content: Option<String> = conn.query_row(
        "SELECT content FROM backups WHERE filename = ?1 ORDER BY created_at DESC LIMIT 1",
        [&backup_filename],
        |row| row.get(0),
    ).optional().map_err(|e| e.to_string())?;
    
    let content = content.ok_or("备份文件不存在".to_string())?;
    
    println!("Settings file path: {:?}", settings_file);
    
    // Validate JSON format
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("备份文件格式无效: {}", e))?;
    
    // Create directory if it doesn't exist
    if let Some(parent) = settings_file.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Write to settings file
    fs::write(&settings_file, content)
        .map_err(|e| format!("Failed to restore settings file: {}", e))?;
    
    println!("Restore completed successfully");
    Ok(true)
}

#[tauri::command]
async fn delete_backup_file(app: tauri::AppHandle, backup_filename: String) -> Result<bool, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;
    
    let affected_rows = conn.execute(
        "DELETE FROM backups WHERE filename = ?1",
        [&backup_filename],
    ).map_err(|e| e.to_string())?;
    
    Ok(affected_rows > 0)
}

#[tauri::command]
async fn get_backup_content(app: tauri::AppHandle, backup_filename: String) -> Result<String, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;
    
    let content: Option<String> = conn.query_row(
        "SELECT content FROM backups WHERE filename = ?1 ORDER BY created_at DESC LIMIT 1",
        [&backup_filename],
        |row| row.get(0),
    ).optional().map_err(|e| e.to_string())?;
    
    let content = content.ok_or("备份文件不存在".to_string())?;
    
    Ok(content)
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

#[tauri::command]
async fn save_config_path(app: tauri::AppHandle, path: String) -> Result<bool, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;
    
    let now = chrono::Utc::now().to_rfc3339();
    
    println!("Saving config path: {}", path);
    
    // Delete any existing config path
    conn.execute("DELETE FROM current_config_path", ())
        .map_err(|e| e.to_string())?;
    
    // Insert the new config path
    conn.execute(
        "INSERT INTO current_config_path (path, updated_at) VALUES (?1, ?2)",
        (&path, &now),
    ).map_err(|e| e.to_string())?;
    
    println!("Config path saved successfully");
    Ok(true)
}

#[tauri::command]
async fn get_config_path(app: tauri::AppHandle) -> Result<String, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;
    
    let path: Option<String> = conn.query_row(
        "SELECT path FROM current_config_path ORDER BY updated_at DESC LIMIT 1",
        [],
        |row| row.get(0),
    ).optional().map_err(|e| e.to_string())?;
    
    let path_clone = path.clone();
    let result = path.unwrap_or_else(|| "~/.claude/settings.json".to_string());
    
    // Check if there are any records in the table
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM current_config_path",
        [],
        |row| row.get(0),
    ).unwrap_or(0);
    
    println!("Number of records in current_config_path: {}", count);
    println!("Retrieved config path: {:?}", path_clone);
    println!("Returning config path: {}", result);
    
    // If no records exist, insert the default path
    if count == 0 {
        println!("No config path found, inserting default path");
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO current_config_path (path, updated_at) VALUES (?1, ?2)",
            (&result, &now),
        ).map_err(|e| format!("Failed to insert default config path: {}", e))?;
    }
    
    Ok(result)
}


#[tauri::command]
async fn update_config_env(config_path: String, api_key: String, base_url: Option<String>) -> Result<bool, String> {
    // Expand the ~ to home directory if needed
    let expanded_path = if config_path.starts_with("~/") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&config_path[2..])
    } else {
        std::path::PathBuf::from(config_path)
    };
    
    let settings_file = expanded_path;
    
    println!("Updating config env with API key: {}", api_key);
    println!("Base URL: {:?}", base_url);
    println!("Settings file path: {:?}", settings_file);
    
    // Template configuration structure
    let template_config = serde_json::json!({
        "env": {
            "ANTHROPIC_AUTH_TOKEN": "",
            "ANTHROPIC_BASE_URL": "https://api.packycode.com",
            "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
        },
        "permissions": {
            "allow": [],
            "deny": []
        },
        "apiKeyHelper": "echo 'your-api-key-here'"
    });
    
    // Read existing config or use template
    let mut config_obj = if settings_file.exists() {
        let content = fs::read_to_string(&settings_file)
            .map_err(|e| format!("Failed to read settings file: {}", e))?;
        
        // Parse existing config to preserve structure
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings file: {}", e))?
    } else {
        // Create directory if it doesn't exist
        if let Some(parent) = settings_file.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        
        // Use template as base
        template_config.clone()
    };
    
    // Update only specific fields while preserving the structure
    if let Some(env_obj) = config_obj.get_mut("env") {
        if let Some(env_map) = env_obj.as_object_mut() {
            // Update ANTHROPIC_AUTH_TOKEN
            if api_key.is_empty() {
                env_map.remove("ANTHROPIC_AUTH_TOKEN");
            } else {
                env_map.insert("ANTHROPIC_AUTH_TOKEN".to_string(), serde_json::Value::String(api_key.clone()));
            }
            
            // Update ANTHROPIC_BASE_URL if provided
            if let Some(url) = base_url {
                env_map.insert("ANTHROPIC_BASE_URL".to_string(), serde_json::Value::String(url));
            }
            
            // Always ensure CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set to 1
            env_map.insert("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC".to_string(), serde_json::Value::Number(serde_json::Number::from(1)));
        }
    }
    
    // Update apiKeyHelper to match the API key
    if api_key.is_empty() {
        config_obj.as_object_mut().unwrap().remove("apiKeyHelper");
    } else {
        config_obj.as_object_mut().unwrap().insert("apiKeyHelper".to_string(), serde_json::Value::String(format!("echo '{}'", api_key)));
    }
    
    // Ensure permissions structure exists with correct array types
    if let Some(perm_obj) = config_obj.get_mut("permissions") {
        if let Some(perm_map) = perm_obj.as_object_mut() {
            // Ensure allow is an array
            if !perm_map.get("allow").map_or(false, |v| v.is_array()) {
                perm_map.insert("allow".to_string(), serde_json::json!([]));
            }
            // Ensure deny is an array
            if !perm_map.get("deny").map_or(false, |v| v.is_array()) {
                perm_map.insert("deny".to_string(), serde_json::json!([]));
            }
        }
    } else {
        config_obj.as_object_mut().unwrap().insert("permissions".to_string(), serde_json::json!({
            "allow": [],
            "deny": []
        }));
    }
    
    let content = serde_json::to_string_pretty(&config_obj)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(&settings_file, content)
        .map_err(|e| format!("Failed to write settings file: {}", e))?;
    
    println!("Config env updated successfully");
    Ok(true)
}

// Environment Variables CRUD operations
#[tauri::command]
async fn create_environment_variable(
    app: tauri::AppHandle,
    request: CreateEnvironmentVariableRequest,
) -> Result<EnvironmentVariable, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    let env_var = EnvironmentVariable {
        id: uuid::Uuid::new_v4().to_string(),
        name: request.name,
        key: request.key,
        value: request.value,
        scope: request.scope,
        description: request.description,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO environment_variables (id, name, key, value, scope, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (&env_var.id, &env_var.name, &env_var.key, &env_var.value, &env_var.scope, &env_var.description, &env_var.created_at, &env_var.updated_at),
    ).map_err(|e| e.to_string())?;

    Ok(env_var)
}

#[tauri::command]
async fn get_environment_variables(app: tauri::AppHandle) -> Result<Vec<EnvironmentVariable>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, key, value, scope, description, created_at, updated_at FROM environment_variables ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let env_vars = stmt.query_map([], |row| {
        Ok(EnvironmentVariable {
            id: row.get(0)?,
            name: row.get(1)?,
            key: row.get(2)?,
            value: row.get(3)?,
            scope: row.get(4)?,
            description: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for env_var in env_vars {
        result.push(env_var.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvironmentVariableData {
    pub key: String,
    pub value: String,
    pub scope: String,
}

#[tauri::command]
async fn get_environment_variables_config(app: tauri::AppHandle) -> Result<Vec<ConfigItem<EnvironmentVariableData>>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, key, value, scope, description, created_at, updated_at FROM environment_variables ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let env_vars = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let key: String = row.get(2)?;
        let value: String = row.get(3)?;
        let scope: String = row.get(4)?;
        let description: Option<String> = row.get(5)?;
        let created_at: String = row.get(6)?;
        let updated_at: String = row.get(7)?;
        
        Ok(ConfigItem {
            id,
            name,
            data: EnvironmentVariableData {
                key,
                value,
                scope,
            },
            description,
            created_at,
            updated_at,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for env_var in env_vars {
        result.push(env_var.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
async fn update_environment_variable(
    app: tauri::AppHandle,
    id: String,
    request: UpdateEnvironmentVariableRequest,
) -> Result<EnvironmentVariable, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let existing_var: Option<EnvironmentVariable> = conn.query_row(
        "SELECT id, name, key, value, scope, description, created_at, updated_at FROM environment_variables WHERE id = ?1",
        [&id],
        |row| {
            Ok(EnvironmentVariable {
                id: row.get(0)?,
                name: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                scope: row.get(4)?,
                description: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    ).optional().map_err(|e| e.to_string())?;

    let mut env_var = existing_var.ok_or("Environment variable not found")?;

    if let Some(name) = request.name {
        env_var.name = name;
    }
    if let Some(key) = request.key {
        env_var.key = key;
    }
    if let Some(value) = request.value {
        env_var.value = value;
    }
    if let Some(scope) = request.scope {
        env_var.scope = scope;
    }
    if let Some(description) = request.description {
        env_var.description = Some(description);
    }
    env_var.updated_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE environment_variables SET name = ?1, key = ?2, value = ?3, scope = ?4, description = ?5, updated_at = ?6 WHERE id = ?7",
        (&env_var.name, &env_var.key, &env_var.value, &env_var.scope, &env_var.description, &env_var.updated_at, &id),
    ).map_err(|e| e.to_string())?;

    Ok(env_var)
}

#[tauri::command]
async fn delete_environment_variable(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let affected_rows = conn.execute(
        "DELETE FROM environment_variables WHERE id = ?1",
        [&id],
    ).map_err(|e| e.to_string())?;

    Ok(affected_rows > 0)
}

// Route Config CRUD operations
#[tauri::command]
async fn create_route_config(
    app: tauri::AppHandle,
    request: CreateRouteConfigRequest,
) -> Result<RouteConfig, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    let route_config = RouteConfig {
        id: uuid::Uuid::new_v4().to_string(),
        name: request.name,
        path: request.path,
        method: request.method,
        handler: request.handler,
        middleware: request.middleware,
        auth_required: request.auth_required,
        description: request.description,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO route_configs (id, name, path, method, handler, middleware, auth_required, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (&route_config.id, &route_config.name, &route_config.path, &route_config.method, &route_config.handler, &route_config.to_db_middleware(), &route_config.auth_required, &route_config.description, &route_config.created_at, &route_config.updated_at),
    ).map_err(|e| e.to_string())?;

    Ok(route_config)
}

#[tauri::command]
async fn get_route_configs(app: tauri::AppHandle) -> Result<Vec<RouteConfig>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, path, method, handler, middleware, auth_required, description, created_at, updated_at FROM route_configs ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let route_configs = stmt.query_map([], |row| {
        let middleware_json: Option<String> = row.get(5)?;
        Ok(RouteConfig {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            method: row.get(3)?,
            handler: row.get(4)?,
            middleware: RouteConfig::from_db_middleware(middleware_json),
            auth_required: row.get(6)?,
            description: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for route_config in route_configs {
        result.push(route_config.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouteConfigData {
    pub path: String,
    pub method: String,
    pub handler: String,
    pub middleware: Option<Vec<String>>,
    pub auth_required: bool,
}

#[tauri::command]
async fn get_route_configs_config(app: tauri::AppHandle) -> Result<Vec<ConfigItem<RouteConfigData>>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, path, method, handler, middleware, auth_required, description, created_at, updated_at FROM route_configs ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let route_configs = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let path: String = row.get(2)?;
        let method: String = row.get(3)?;
        let handler: String = row.get(4)?;
        let middleware_json: Option<String> = row.get(5)?;
        let auth_required: bool = row.get(6)?;
        let description: Option<String> = row.get(7)?;
        let created_at: String = row.get(8)?;
        let updated_at: String = row.get(9)?;
        
        Ok(ConfigItem {
            id,
            name,
            data: RouteConfigData {
                path,
                method,
                handler,
                middleware: RouteConfig::from_db_middleware(middleware_json),
                auth_required,
            },
            description,
            created_at,
            updated_at,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for route_config in route_configs {
        result.push(route_config.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
async fn update_route_config(
    app: tauri::AppHandle,
    id: String,
    request: UpdateRouteConfigRequest,
) -> Result<RouteConfig, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let existing_config: Option<RouteConfig> = conn.query_row(
        "SELECT id, name, path, method, handler, middleware, auth_required, description, created_at, updated_at FROM route_configs WHERE id = ?1",
        [&id],
        |row| {
            let middleware_json: Option<String> = row.get(5)?;
            Ok(RouteConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                method: row.get(3)?,
                handler: row.get(4)?,
                middleware: RouteConfig::from_db_middleware(middleware_json),
                auth_required: row.get(6)?,
                description: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    ).optional().map_err(|e| e.to_string())?;

    let mut route_config = existing_config.ok_or("Route config not found")?;

    if let Some(name) = request.name {
        route_config.name = name;
    }
    if let Some(path) = request.path {
        route_config.path = path;
    }
    if let Some(method) = request.method {
        route_config.method = method;
    }
    if let Some(handler) = request.handler {
        route_config.handler = handler;
    }
    if let Some(middleware) = request.middleware {
        route_config.middleware = Some(middleware);
    }
    if let Some(auth_required) = request.auth_required {
        route_config.auth_required = auth_required;
    }
    if let Some(description) = request.description {
        route_config.description = Some(description);
    }
    route_config.updated_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE route_configs SET name = ?1, path = ?2, method = ?3, handler = ?4, middleware = ?5, auth_required = ?6, description = ?7, updated_at = ?8 WHERE id = ?9",
        (&route_config.name, &route_config.path, &route_config.method, &route_config.handler, &route_config.to_db_middleware(), &route_config.auth_required, &route_config.description, &route_config.updated_at, &id),
    ).map_err(|e| e.to_string())?;

    Ok(route_config)
}

#[tauri::command]
async fn delete_route_config(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let affected_rows = conn.execute(
        "DELETE FROM route_configs WHERE id = ?1",
        [&id],
    ).map_err(|e| e.to_string())?;

    Ok(affected_rows > 0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            create_api_key,
            get_api_keys,
            get_api_keys_config,
            update_api_key,
            delete_api_key,
            create_environment_variable,
            get_environment_variables,
            get_environment_variables_config,
            update_environment_variable,
            delete_environment_variable,
            create_route_config,
            get_route_configs,
            get_route_configs_config,
            update_route_config,
            delete_route_config,
            get_config_file_content,
            save_config_file_content,
            read_config_file,
            write_config_file,
            get_claude_settings,
            save_claude_settings,
            open_file_dialog,
            backup_config_file,
            get_backup_files,
            restore_config_file,
            delete_backup_file,
            get_backup_content,
            create_config_path,
            get_config_paths,
            update_config_path,
            delete_config_path,
            save_config_path,
            get_config_path,
            update_config_env
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
