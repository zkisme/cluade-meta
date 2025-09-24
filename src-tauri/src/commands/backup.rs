use rusqlite::OptionalExtension;
// src-tauri/src/commands/backup.rs

use serde::{Deserialize, Serialize};
use tauri::Manager;
use std::fs;
use dirs;
use crate::db;
use crate::commands::config_path::get_config_path; // Import get_config_path

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupFile {
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
}

#[tauri::command]
pub async fn backup_config_file(app: tauri::AppHandle, backup_filename: String) -> Result<bool, String> {
    println!("Backup function called with filename: {}", backup_filename);
    
    // Get the configured config path
    let config_path = get_config_path(app.clone()).await?;
    
    // Expand the ~ to home directory if needed
    let settings_file = if config_path.starts_with("~") {
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
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;
    
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

#[tauri::command]
pub async fn get_backup_files(app: tauri::AppHandle) -> Result<Vec<BackupFile>, String> {
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;
    
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
pub async fn restore_config_file(app: tauri::AppHandle, backup_filename: String) -> Result<bool, String> {
    println!("Restore function called with filename: {}", backup_filename);
    
    // Get the configured config path
    let config_path = get_config_path(app.clone()).await?;
    
    // Expand the ~ to home directory if needed
    let settings_file = if config_path.starts_with("~") {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        home_dir.join(&config_path[2..])
    } else {
        std::path::PathBuf::from(config_path)
    };
    
    // Get database connection
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;
    
    // Get backup content from database
    let content: Option<String> = conn.query_row(
        "SELECT content FROM backups WHERE filename = ?1 ORDER BY created_at DESC LIMIT 1",
        &[&backup_filename],
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
pub async fn delete_backup_file(app: tauri::AppHandle, backup_filename: String) -> Result<bool, String> {
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;
    
    let affected_rows = conn.execute(
        "DELETE FROM backups WHERE filename = ?1",
        &[&backup_filename],
    ).map_err(|e| e.to_string())?;
    
    Ok(affected_rows > 0)
}

#[tauri::command]
pub async fn get_backup_content(app: tauri::AppHandle, backup_filename: String) -> Result<String, String> {
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;
    
    let content: Option<String> = conn.query_row(
        "SELECT content FROM backups WHERE filename = ?1 ORDER BY created_at DESC LIMIT 1",
        &[&backup_filename],
        |row| row.get(0),
    ).optional().map_err(|e| e.to_string())?;
    
    let content = content.ok_or("备份文件不存在".to_string())?;
    
    Ok(content)
}