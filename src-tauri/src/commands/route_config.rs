use crate::db::get_database_connection;
use crate::models::{RouteConfig, CreateRouteConfigRequest, RouteConfigData, ConfigItem};
use rusqlite::OptionalExtension;

#[tauri::command]
pub async fn create_route_config(
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
pub async fn get_route_configs(app: tauri::AppHandle) -> Result<Vec<RouteConfig>, String> {
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

#[tauri::command]
pub async fn get_route_configs_config(app: tauri::AppHandle) -> Result<Vec<ConfigItem<RouteConfigData>>, String> {
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
            is_active: None, // Route configs don't have is_active field
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
pub async fn update_route_config(
    app: tauri::AppHandle,
    route_config: RouteConfig,
) -> Result<RouteConfig, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "UPDATE route_configs SET name = ?1, path = ?2, method = ?3, handler = ?4, middleware = ?5, auth_required = ?6, description = ?7, updated_at = ?8 WHERE id = ?9",
        (&route_config.name, &route_config.path, &route_config.method, &route_config.handler, &route_config.to_db_middleware(), &route_config.auth_required, &route_config.description, &now, &route_config.id),
    ).map_err(|e| e.to_string())?;

    Ok(route_config)
}

#[tauri::command]
pub async fn delete_route_config(
    app: tauri::AppHandle,
    id: String,
) -> Result<bool, String> {
    let conn = get_database_connection(&app).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM route_configs WHERE id = ?1",
        (&id,),
    ).map_err(|e| e.to_string())?;

    Ok(true)
}