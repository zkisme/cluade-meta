use tauri::AppHandle;
use std::fs;
use std::path::PathBuf;
use crate::db;
use crate::models::{ClaudeSettings, EnvConfig, PermissionsConfig, ConfigFileFormat};
use serde_json;
use dirs;

#[tauri::command]
pub async fn get_config_file_content(app: AppHandle) -> Result<String, String> {
    // Get the configured config path or use default
    let config_path = super::config_path::get_config_path(app.clone()).await?;
    
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
pub async fn read_config_file(config_path: String) -> Result<String, String> {
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
pub async fn write_config_file(config_path: String, content: String) -> Result<bool, String> {
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
pub async fn save_config_file_content(app: AppHandle, content: String) -> Result<bool, String> {
    // Get the configured config path or use default
    let config_path = super::config_path::get_config_path(app.clone()).await?;
    
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
pub async fn get_claude_settings(path: String) -> Result<String, String> {
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
            anthropic_api_key: None,
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
pub async fn save_claude_settings(path: String, settings: ClaudeSettings) -> Result<bool, String> {
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
pub async fn update_config_env(config_path: String, api_key: String, base_url: Option<String>) -> Result<bool, String> {
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
            "ANTHROPIC_API_KEY": "",
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
            // Update both ANTHROPIC_API_KEY and ANTHROPIC_AUTH_TOKEN fields
            if api_key.is_empty() {
                env_map.remove("ANTHROPIC_API_KEY");
                env_map.remove("ANTHROPIC_AUTH_TOKEN");
            } else {
                env_map.insert("ANTHROPIC_API_KEY".to_string(), serde_json::Value::String(api_key.clone()));
                env_map.insert("ANTHROPIC_AUTH_TOKEN".to_string(), serde_json::Value::String(api_key.clone()));
            }
            
            // Update ANTHROPIC_BASE_URL if provided
            if let Some(url) = base_url {
                if !url.is_empty() {
                    env_map.insert("ANTHROPIC_BASE_URL".to_string(), serde_json::Value::String(url));
                }
            }
            
            // Always ensure CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set to 1
            env_map.insert("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC".to_string(), serde_json::Value::Number(serde_json::Number::from(1)));
        }
    } else {
        // If env doesn't exist, create it
        let mut env_map = serde_json::Map::new();
        
        if !api_key.is_empty() {
            env_map.insert("ANTHROPIC_API_KEY".to_string(), serde_json::Value::String(api_key.clone()));
            env_map.insert("ANTHROPIC_AUTH_TOKEN".to_string(), serde_json::Value::String(api_key.clone()));
        }
        
        if let Some(url) = base_url.as_ref() {
            if !url.is_empty() {
                env_map.insert("ANTHROPIC_BASE_URL".to_string(), serde_json::Value::String(url.clone()));
            }
        }
        
        env_map.insert("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC".to_string(), serde_json::Value::Number(serde_json::Number::from(1)));
        
        config_obj.as_object_mut().unwrap().insert("env".to_string(), serde_json::Value::Object(env_map));
    }
    
    // Update apiKeyHelper to match the API key and clean up old field
    config_obj.as_object_mut().unwrap().remove("api_key_helper"); // Remove old field name
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
