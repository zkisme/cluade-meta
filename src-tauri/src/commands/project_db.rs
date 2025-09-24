use crate::db::get_database_connection;
use crate::models::{Project, CreateProjectRequest, UpdateProjectRequest};
use chrono::Utc;
use rusqlite::{Connection, Result, OptionalExtension};
use serde_json;
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub fn create_project(app: AppHandle, request: CreateProjectRequest) -> Result<Project, String> {
    let conn = get_database_connection(&app)
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    let frameworks_json = serde_json::to_string(&request.frameworks)
        .map_err(|e| format!("Failed to serialize frameworks: {}", e))?;
    
    let description_value = request.description.clone().unwrap_or_default();
    
    conn.execute(
        "INSERT INTO projects (id, name, path, category, frameworks, project_type, description, scan_time, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        [
            &id,
            &request.name,
            &request.path,
            &request.category,
            &frameworks_json,
            &request.project_type,
            &description_value,
            &now,
            &now,
            &now,
        ],
    ).map_err(|e| format!("Failed to create project: {}", e))?;
    
    Ok(Project {
        id,
        name: request.name,
        path: request.path,
        category: request.category,
        frameworks: request.frameworks,
        project_type: request.project_type,
        description: request.description,
        scan_time: now.clone(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let conn = get_database_connection(&app)
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let mut stmt = conn
        .prepare("SELECT id, name, path, category, frameworks, project_type, description, scan_time, created_at, updated_at FROM projects ORDER BY name")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;
    
    let projects = stmt.query_map([], |row| {
        let frameworks_json: String = row.get(4)?;
        let frameworks: Vec<String> = serde_json::from_str(&frameworks_json)
            .unwrap_or_default();
        
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            category: row.get(3)?,
            frameworks,
            project_type: row.get(5)?,
            description: row.get(6)?,
            scan_time: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }).map_err(|e| format!("Failed to query projects: {}", e))?;
    
    let mut result = Vec::new();
    for project in projects {
        result.push(project.map_err(|e| format!("Failed to parse project: {}", e))?);
    }
    
    Ok(result)
}

#[tauri::command]
pub fn get_project_by_id(app: AppHandle, id: String) -> Result<Option<Project>, String> {
    get_project_by_id_internal(&app, &id)
}

fn get_project_by_id_internal(app: &AppHandle, id: &str) -> Result<Option<Project>, String> {
    let conn = get_database_connection(app)
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let mut stmt = conn
        .prepare("SELECT id, name, path, category, frameworks, project_type, description, scan_time, created_at, updated_at FROM projects WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;
    
    let project = stmt.query_row([id], |row| {
        let frameworks_json: String = row.get(4)?;
        let frameworks: Vec<String> = serde_json::from_str(&frameworks_json)
            .unwrap_or_default();
        
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            category: row.get(3)?,
            frameworks,
            project_type: row.get(5)?,
            description: row.get(6)?,
            scan_time: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }).optional().map_err(|e| format!("Failed to query project: {}", e))?;
    
    Ok(project)
}

#[tauri::command]
pub fn update_project(app: AppHandle, id: String, request: UpdateProjectRequest) -> Result<Option<Project>, String> {
    let conn = get_database_connection(&app)
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let existing_project = get_project_by_id_internal(&app, &id)?;
    if existing_project.is_none() {
        return Ok(None);
    }
    
    let project = existing_project.unwrap();
    let now = Utc::now().to_rfc3339();
    
    let name = request.name.unwrap_or(project.name);
    let path = request.path.unwrap_or(project.path);
    let category = request.category.unwrap_or(project.category);
    let frameworks = request.frameworks.unwrap_or(project.frameworks);
    let project_type = request.project_type.unwrap_or(project.project_type);
    let description = request.description.unwrap_or(project.description.unwrap_or_default());
    
    let frameworks_json = serde_json::to_string(&frameworks)
        .map_err(|e| format!("Failed to serialize frameworks: {}", e))?;
    
    let description_value = description.clone();
    
    conn.execute(
        "UPDATE projects SET name = ?1, path = ?2, category = ?3, frameworks = ?4, project_type = ?5, description = ?6, updated_at = ?7 WHERE id = ?8",
        [
            &name,
            &path,
            &category,
            &frameworks_json,
            &project_type,
            &description_value,
            &now,
            &id,
        ],
    ).map_err(|e| format!("Failed to update project: {}", e))?;
    
    Ok(Some(Project {
        id: id.to_string(),
        name,
        path,
        category,
        frameworks,
        project_type,
        description: Some(description),
        scan_time: project.scan_time,
        created_at: project.created_at,
        updated_at: now,
    }))
}

#[tauri::command]
pub fn delete_project(app: AppHandle, id: String) -> Result<bool, String> {
    let conn = get_database_connection(&app)
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let affected = conn.execute("DELETE FROM projects WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete project: {}", e))?;
    
    Ok(affected > 0)
}

#[tauri::command]
pub fn get_projects_by_category(app: AppHandle, category: String) -> Result<Vec<Project>, String> {
    let conn = get_database_connection(&app)
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let mut stmt = conn
        .prepare("SELECT id, name, path, category, frameworks, project_type, description, scan_time, created_at, updated_at FROM projects WHERE category = ?1 ORDER BY name")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;
    
    let projects = stmt.query_map([category], |row| {
        let frameworks_json: String = row.get(4)?;
        let frameworks: Vec<String> = serde_json::from_str(&frameworks_json)
            .unwrap_or_default();
        
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            category: row.get(3)?,
            frameworks,
            project_type: row.get(5)?,
            description: row.get(6)?,
            scan_time: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }).map_err(|e| format!("Failed to query projects: {}", e))?;
    
    let mut result = Vec::new();
    for project in projects {
        result.push(project.map_err(|e| format!("Failed to parse project: {}", e))?);
    }
    
    Ok(result)
}

pub fn bulk_create_projects(app: AppHandle, projects: Vec<CreateProjectRequest>) -> Result<Vec<Project>, String> {
    let mut conn = get_database_connection(&app)
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let tx = conn.transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    let mut result = Vec::new();
    let now = Utc::now().to_rfc3339();
    
    for request in projects {
        let id = Uuid::new_v4().to_string();
        let frameworks_json = serde_json::to_string(&request.frameworks)
            .map_err(|e| format!("Failed to serialize frameworks: {}", e))?;
        
        let description_value = request.description.clone().unwrap_or_default();
        
        tx.execute(
            "INSERT INTO projects (id, name, path, category, frameworks, project_type, description, scan_time, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                &id,
                &request.name,
                &request.path,
                &request.category,
                &frameworks_json,
                &request.project_type,
                &description_value,
                &now,
                &now,
                &now,
            ],
        ).map_err(|e| format!("Failed to create project: {}", e))?;
        
        result.push(Project {
            id,
            name: request.name,
            path: request.path,
            category: request.category,
            frameworks: request.frameworks,
            project_type: request.project_type,
            description: request.description,
            scan_time: now.clone(),
            created_at: now.clone(),
            updated_at: now.clone(),
        });
    }
    
    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    Ok(result)
}

#[tauri::command]
pub fn clear_all_projects(app: AppHandle) -> Result<usize, String> {
    let conn = get_database_connection(&app)
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let affected = conn.execute("DELETE FROM projects", [])
        .map_err(|e| format!("Failed to clear projects: {}", e))?;
    
    Ok(affected)
}