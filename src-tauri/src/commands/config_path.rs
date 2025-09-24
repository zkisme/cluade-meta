use crate::db::get_database_connection;
use crate::models::{ConfigPath, CreateConfigPathRequest, UpdateConfigPathRequest};
use rusqlite::OptionalExtension;
use std::fs;

#[tauri::command]
pub async fn create_config_path(
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
pub async fn get_config_paths(app: tauri::AppHandle) -> Result<Vec<ConfigPath>, String> {
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
pub async fn update_config_path(
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
pub async fn delete_config_path(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let affected_rows = conn.execute(
        "DELETE FROM config_paths WHERE id = ?1",
        [&id],
    ).map_err(|e| e.to_string())?;

    Ok(affected_rows > 0)
}

#[tauri::command]
pub async fn save_config_path(app: tauri::AppHandle, path: String) -> Result<bool, String> {
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
pub async fn get_config_path(app: tauri::AppHandle) -> Result<String, String> {
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
