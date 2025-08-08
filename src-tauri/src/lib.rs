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
    pub anthropic_base_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub key: String,
    pub description: Option<String>,
    pub anthropic_base_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: Option<String>,
    pub key: Option<String>,
    pub description: Option<String>,
    pub anthropic_base_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeSettings {
    pub anthropic_auth_token: Option<String>,
    pub anthropic_base_url: Option<String>,
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
    pub CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: Option<u32>,
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
    pub apiKeyHelper: Option<String>,
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
            anthropic_base_url TEXT,
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
        anthropic_base_url: request.anthropic_base_url,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO api_keys (id, name, key, description, anthropic_base_url, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (&api_key.id, &api_key.name, &api_key.key, &api_key.description, &api_key.anthropic_base_url, &api_key.created_at, &api_key.updated_at),
    ).map_err(|e| e.to_string())?;

    Ok(api_key)
}

#[tauri::command]
async fn get_api_keys(app: tauri::AppHandle) -> Result<Vec<ApiKey>, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, key, description, anthropic_base_url, created_at, updated_at FROM api_keys ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let api_keys = stmt.query_map([], |row| {
        Ok(ApiKey {
            id: row.get(0)?,
            name: row.get(1)?,
            key: row.get(2)?,
            description: row.get(3)?,
            anthropic_base_url: row.get(4)?,
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

#[tauri::command]
async fn update_api_key(
    app: tauri::AppHandle,
    id: String,
    request: UpdateApiKeyRequest,
) -> Result<ApiKey, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    // Check if the API key exists
    let existing_key: Option<ApiKey> = conn.query_row(
        "SELECT id, name, key, description, anthropic_base_url, created_at, updated_at FROM api_keys WHERE id = ?1",
        [&id],
        |row| {
            Ok(ApiKey {
                id: row.get(0)?,
                name: row.get(1)?,
                key: row.get(2)?,
                description: row.get(3)?,
                anthropic_base_url: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
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
    if let Some(anthropic_base_url) = request.anthropic_base_url {
        api_key.anthropic_base_url = Some(anthropic_base_url);
    }
    api_key.updated_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE api_keys SET name = ?1, key = ?2, description = ?3, anthropic_base_url = ?4, updated_at = ?5 WHERE id = ?6",
        (&api_key.name, &api_key.key, &api_key.description, &api_key.anthropic_base_url, &api_key.updated_at, &id),
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
            anthropic_auth_token: None,
            anthropic_base_url: Some("https://api.anthropic.com".to_string()),
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
    
    Ok(result)
}

#[tauri::command]
async fn migrate_api_keys(app: tauri::AppHandle) -> Result<bool, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;
    
    // Check if anthropic_base_url column exists using a simple query
    let mut has_anthropic_base_url = false;
    let mut stmt = conn.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='api_keys'")
        .map_err(|e| e.to_string())?;
    
    let table_sql: Option<String> = stmt.query_row([], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?;
    
    if let Some(sql) = table_sql {
        has_anthropic_base_url = sql.contains("anthropic_base_url");
    }

    if !has_anthropic_base_url {
        println!("Adding anthropic_base_url column to api_keys table");
        conn.execute(
            "ALTER TABLE api_keys ADD COLUMN anthropic_base_url TEXT",
            (),
        ).map_err(|e| e.to_string())?;
        
        // Update existing records to have default anthropic_base_url
        let affected_rows = conn.execute(
            "UPDATE api_keys SET anthropic_base_url = 'https://api.anthropic.com' WHERE anthropic_base_url IS NULL",
            (),
        ).map_err(|e| e.to_string())?;
        
        println!("Migration completed: Added anthropic_base_url column and updated {} records", affected_rows);
        Ok(true)
    } else {
        println!("anthropic_base_url column already exists, no migration needed");
        Ok(false)
    }
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
    
    // Read existing config or create default with the correct format
    let mut config: ConfigFileFormat = if settings_file.exists() {
        let content = fs::read_to_string(&settings_file)
            .map_err(|e| format!("Failed to read settings file: {}", e))?;
        
        // Try to parse as the new format first
        if let Ok(new_format) = serde_json::from_str::<ConfigFileFormat>(&content) {
            new_format
        } else {
            // If it fails, try to parse as the old format and convert
            let old_settings: ClaudeSettings = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse settings file: {}", e))?;
            
            // Convert old format to new format
            let auth_token = old_settings.anthropic_auth_token.clone();
            ConfigFileFormat {
                env: EnvConfig {
                    ANTHROPIC_AUTH_TOKEN: auth_token.clone(),
                    ANTHROPIC_BASE_URL: old_settings.anthropic_base_url,
                    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: Some(1),
                },
                permissions: PermissionsConfig {
                    allow: Some(vec![]),
                    deny: Some(vec![]),
                },
                apiKeyHelper: auth_token
                    .map(|token| format!("echo '{}'", token)),
            }
        }
    } else {
        // Create directory if it doesn't exist
        if let Some(parent) = settings_file.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        
        // Create default settings with the correct format
        ConfigFileFormat {
            env: EnvConfig {
                ANTHROPIC_AUTH_TOKEN: None,
                ANTHROPIC_BASE_URL: Some("https://api.anthropic.com".to_string()),
                CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: Some(1),
            },
            permissions: PermissionsConfig {
                allow: Some(vec![]),
                deny: Some(vec![]),
            },
            apiKeyHelper: None,
        }
    };
    
    // Update only the ANTHROPIC_AUTH_TOKEN and ANTHROPIC_BASE_URL fields
    if api_key.is_empty() {
        config.env.ANTHROPIC_AUTH_TOKEN = None;
        config.apiKeyHelper = None;
    } else {
        config.env.ANTHROPIC_AUTH_TOKEN = Some(api_key.clone());
        config.apiKeyHelper = Some(format!("echo '{}'", api_key));
    }
    
    if let Some(url) = base_url {
        config.env.ANTHROPIC_BASE_URL = Some(url);
    }
    
    // Write back to file
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(&settings_file, content)
        .map_err(|e| format!("Failed to write settings file: {}", e))?;
    
    println!("Config env updated successfully");
    Ok(true)
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
            get_backup_files,
            restore_config_file,
            delete_backup_file,
            create_config_path,
            get_config_paths,
            update_config_path,
            delete_config_path,
            save_config_path,
            get_config_path,
            update_config_env,
            migrate_api_keys
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
