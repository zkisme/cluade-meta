use tauri::{command, State, Manager};
use rusqlite::Connection;
use crate::models::CustomCategory;
use uuid::Uuid;
use chrono::{Utc, DateTime};
use crate::db;

pub struct CustomCategoryStore {
    // 保持结构以兼容现有代码，但实际使用数据库存储
}

impl Default for CustomCategoryStore {
    fn default() -> Self {
        Self {
            // 不再需要内存存储，使用数据库
        }
    }
}

impl CustomCategoryStore {
    pub fn init(&self, app: &tauri::AppHandle) -> Result<(), String> {
        // 初始化数据库连接，确保表存在
        let _conn = db::get_database_connection(app).map_err(|e| format!("Database connection failed: {}", e))?;
                Ok(())
    }
}

#[command]
pub async fn add_custom_category(
    name: String,
    app: tauri::AppHandle,
) -> Result<CustomCategory, String> {
        
    let conn = db::get_database_connection(&app).map_err(|e| format!("Database connection failed: {}", e))?;
    
    // 检查是否已存在同名分类
    let existing_category: Result<CustomCategory, rusqlite::Error> = conn.query_row(
        "SELECT id, name, created_at, updated_at FROM project_categories WHERE name = ?",
        [&name],
        |row| {
            Ok(CustomCategory {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        },
    );
    
    if existing_category.is_ok() {
                return Err(format!("Category with name '{}' already exists.", name));
    }

    let now: DateTime<Utc> = Utc::now();
    let new_category = CustomCategory {
        id: Uuid::new_v4().to_string(),
        name: name.clone(),
        created_at: now.to_rfc3339(),
        updated_at: now.to_rfc3339(),
    };
    
    // 插入到数据库
    conn.execute(
        "INSERT INTO project_categories (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [&new_category.id, &new_category.name, &new_category.created_at, &new_category.updated_at],
    ).map_err(|e| format!("Failed to insert category into database: {}", e))?;
    
        
    Ok(new_category)
}

#[command]
pub async fn get_custom_categories(
    app: tauri::AppHandle,
) -> Result<Vec<CustomCategory>, String> {
        
    let conn = db::get_database_connection(&app).map_err(|e| format!("Database connection failed: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, name, created_at, updated_at FROM project_categories ORDER BY name")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let categories = stmt.query_map([], |row| {
        Ok(CustomCategory {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        })
    }).map_err(|e| format!("Failed to query categories: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect categories: {}", e))?;
    
    let category_names: Vec<_> = categories.iter().map(|c| &c.name).collect();
        
    Ok(categories)
}

#[command]
pub async fn delete_custom_category(
    name: String,
    app: tauri::AppHandle,
) -> Result<bool, String> {
        
    let conn = db::get_database_connection(&app).map_err(|e| format!("Database connection failed: {}", e))?;
    
    // 检查分类是否存在
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM project_categories WHERE name = ?)",
        [&name],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to check if category exists: {}", e))?;
    
    if exists {
        // 删除分类
        let rows_affected = conn.execute(
            "DELETE FROM project_categories WHERE name = ?",
            [&name],
        ).map_err(|e| format!("Failed to delete category from database: {}", e))?;
        
        if rows_affected > 0 {
                        Ok(true)
        } else {
            Err(format!("Category '{}' not found.", name))
        }
    } else {
        Err(format!("Category '{}' not found.", name))
    }
}

