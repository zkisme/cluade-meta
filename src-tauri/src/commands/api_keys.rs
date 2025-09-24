use tauri::AppHandle;
use crate::db;
use crate::models::{ApiKey, CreateApiKeyRequest, UpdateApiKeyRequest, ConfigItem, ApiKeyData};
use rusqlite::OptionalExtension;
use chrono;
use uuid;

#[tauri::command]
pub async fn create_api_key(
    app: AppHandle,
    request: CreateApiKeyRequest,
) -> Result<ApiKey, String> {
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    let api_key = ApiKey {
        id: uuid::Uuid::new_v4().to_string(),
        name: request.name,
        anthropic_api_key: request.anthropic_api_key,
        description: request.description,
        anthropic_base_url: request.anthropic_base_url,
        is_active: true,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO api_keys (id, name, ANTHROPIC_API_KEY, description, ANTHROPIC_BASE_URL, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (&api_key.id, &api_key.name, &api_key.anthropic_api_key, &api_key.description, &api_key.anthropic_base_url, &api_key.is_active, &api_key.created_at, &api_key.updated_at),
    ).map_err(|e| e.to_string())?;

    Ok(api_key)
}

#[tauri::command]
pub async fn get_api_keys(app: AppHandle) -> Result<Vec<ApiKey>, String> {
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, ANTHROPIC_API_KEY, description, ANTHROPIC_BASE_URL, is_active, created_at, updated_at FROM api_keys ORDER BY is_active DESC, created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let api_keys = stmt.query_map([], |row| {
        Ok(ApiKey {
            id: row.get(0)?,
            name: row.get(1)?,
            anthropic_api_key: row.get(2)?,
            description: row.get(3)?,
            anthropic_base_url: row.get(4)?,
            is_active: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for api_key in api_keys {
        result.push(api_key.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
pub async fn get_api_keys_config(app: AppHandle) -> Result<Vec<ConfigItem<ApiKeyData>>, String> {
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, ANTHROPIC_API_KEY, description, ANTHROPIC_BASE_URL, is_active, created_at, updated_at FROM api_keys ORDER BY is_active DESC, created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let api_keys = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let anthropic_api_key: String = row.get(2)?;
        let description: Option<String> = row.get(3)?;
        let anthropic_base_url: Option<String> = row.get(4)?;
        let is_active: bool = row.get(5)?;
        let created_at: String = row.get(6)?;
        let updated_at: String = row.get(7)?;
        
        Ok(ConfigItem {
            id,
            name,
            data: ApiKeyData {
                anthropic_api_key: anthropic_api_key,
                anthropic_base_url: anthropic_base_url,
            },
            description,
            is_active: Some(is_active),
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
pub async fn update_api_key(
    app: AppHandle,
    id: String,
    request: UpdateApiKeyRequest,
) -> Result<ApiKey, String> {
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;

    // Check if the API key exists
    let existing_key: Option<ApiKey> = conn.query_row(
        "SELECT id, name, ANTHROPIC_API_KEY, description, ANTHROPIC_BASE_URL, is_active, created_at, updated_at FROM api_keys WHERE id = ?1",
        [&id],
        |row| {
            Ok(ApiKey {
                id: row.get(0)?,
                name: row.get(1)?,
                anthropic_api_key: row.get(2)?,
                description: row.get(3)?,
                anthropic_base_url: row.get(4)?,
                is_active: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    ).optional().map_err(|e| e.to_string())?;

    let mut api_key = existing_key.ok_or("API key not found")?;

    if let Some(name) = request.name {
        api_key.name = name;
    }
    if let Some(anthropic_api_key) = request.anthropic_api_key {
        api_key.anthropic_api_key = anthropic_api_key;
    }
    if let Some(description) = request.description {
        api_key.description = Some(description);
    }
    if let Some(anthropic_base_url) = request.anthropic_base_url {
        api_key.anthropic_base_url = Some(anthropic_base_url);
    }
    api_key.updated_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE api_keys SET name = ?1, ANTHROPIC_API_KEY = ?2, description = ?3, ANTHROPIC_BASE_URL = ?4, is_active = ?5, updated_at = ?6 WHERE id = ?7",
        (&api_key.name, &api_key.anthropic_api_key, &api_key.description, &api_key.anthropic_base_url, &api_key.is_active, &api_key.updated_at, &id),
    ).map_err(|e| e.to_string())?;

    Ok(api_key)
}

#[tauri::command]
pub async fn delete_api_key(app: AppHandle, id: String) -> Result<bool, String> {
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;

    let affected_rows = conn.execute(
        "DELETE FROM api_keys WHERE id = ?1",
        [&id],
    ).map_err(|e| e.to_string())?;

    Ok(affected_rows > 0)
}

#[tauri::command]
pub async fn toggle_api_key_active(app: AppHandle, id: String) -> Result<bool, String> {
    let conn = db::get_database_connection(&app).map_err(|e| e.to_string())?;

    let affected_rows = conn.execute(
        "UPDATE api_keys SET is_active = NOT is_active, updated_at = ?1 WHERE id = ?2",
        (chrono::Utc::now().to_rfc3339(), &id),
    ).map_err(|e| e.to_string())?;

    Ok(affected_rows > 0)
}
