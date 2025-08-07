// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

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

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn create_api_key(
    app: tauri::AppHandle,
    request: CreateApiKeyRequest,
) -> Result<ApiKey, String> {
    let api_dir = app.path().app_data_dir().unwrap().join("api_keys");
    fs::create_dir_all(&api_dir).map_err(|e| e.to_string())?;

    let api_keys_file = api_dir.join("claude_keys.json");
    let mut api_keys: HashMap<String, ApiKey> = if api_keys_file.exists() {
        let content = fs::read_to_string(&api_keys_file).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    } else {
        HashMap::new()
    };

    let now = chrono::Utc::now().to_rfc3339();
    let api_key = ApiKey {
        id: uuid::Uuid::new_v4().to_string(),
        name: request.name,
        key: request.key,
        description: request.description,
        created_at: now.clone(),
        updated_at: now,
    };

    api_keys.insert(api_key.id.clone(), api_key.clone());

    let content = serde_json::to_string_pretty(&api_keys).map_err(|e| e.to_string())?;
    fs::write(&api_keys_file, content).map_err(|e| e.to_string())?;

    Ok(api_key)
}

#[tauri::command]
async fn get_api_keys(app: tauri::AppHandle) -> Result<Vec<ApiKey>, String> {
    let api_dir = app.path().app_data_dir().unwrap().join("api_keys");
    let api_keys_file = api_dir.join("claude_keys.json");

    if !api_keys_file.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&api_keys_file).map_err(|e| e.to_string())?;
    let api_keys: HashMap<String, ApiKey> = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(api_keys.values().cloned().collect())
}

#[tauri::command]
async fn update_api_key(
    app: tauri::AppHandle,
    id: String,
    request: UpdateApiKeyRequest,
) -> Result<ApiKey, String> {
    let api_dir = app.path().app_data_dir().unwrap().join("api_keys");
    let api_keys_file = api_dir.join("claude_keys.json");

    if !api_keys_file.exists() {
        return Err("API key not found".to_string());
    }

    let content = fs::read_to_string(&api_keys_file).map_err(|e| e.to_string())?;
    let mut api_keys: HashMap<String, ApiKey> = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let mut api_key = api_keys.get(&id).ok_or("API key not found")?.clone();

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

    api_keys.insert(id.clone(), api_key.clone());

    let content = serde_json::to_string_pretty(&api_keys).map_err(|e| e.to_string())?;
    fs::write(&api_keys_file, content).map_err(|e| e.to_string())?;

    Ok(api_key)
}

#[tauri::command]
async fn delete_api_key(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    let api_dir = app.path().app_data_dir().unwrap().join("api_keys");
    let api_keys_file = api_dir.join("claude_keys.json");

    if !api_keys_file.exists() {
        return Ok(false);
    }

    let content = fs::read_to_string(&api_keys_file).map_err(|e| e.to_string())?;
    let mut api_keys: HashMap<String, ApiKey> = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let removed = api_keys.remove(&id).is_some();

    if removed {
        let content = serde_json::to_string_pretty(&api_keys).map_err(|e| e.to_string())?;
        fs::write(&api_keys_file, content).map_err(|e| e.to_string())?;
    }

    Ok(removed)
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
async fn backup_config_file(backupFilename: String) -> Result<bool, String> {
    use std::fs;
    
    println!("Backup function called with filename: {}", backupFilename);
    
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
    let backup_file = backup_dir.join(backupFilename);
    println!("Backup file path: {:?}", backup_file);
    
    // Write backup file
    fs::write(&backup_file, content)
        .map_err(|e| format!("Failed to write backup file: {}", e))?;
    
    println!("Backup completed successfully");
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
            backup_config_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
