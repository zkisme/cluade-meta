use rusqlite::{Connection, Result, OptionalExtension};
use std::fs;
use tauri::Manager;

pub fn get_database_connection(app: &tauri::AppHandle) -> Result<Connection> {
    let api_dir = app.path().app_data_dir().unwrap().join("api_keys");
    fs::create_dir_all(&api_dir).map_err(|_e| rusqlite::Error::InvalidColumnType(0, "Failed to create directory".to_string(), rusqlite::types::Type::Null))?;
    
    let db_path = api_dir.join("claude_keys.db");
    let conn = Connection::open(db_path)?;
    
    // Create the api_keys table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            ANTHROPIC_API_KEY TEXT NOT NULL,
            description TEXT,
            ANTHROPIC_BASE_URL TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;

    // Check if we need to migrate from old schema (key column to ANTHROPIC_API_KEY)
    let has_key_column: Result<bool, rusqlite::Error> = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('api_keys') WHERE name = 'key'",
        [],
        |row| row.get(0),
    );

    if let Ok(true) = has_key_column {
        // Migration needed: rename key column to ANTHROPIC_API_KEY
        conn.execute(
            "ALTER TABLE api_keys RENAME COLUMN key TO ANTHROPIC_API_KEY",
            (),
        ).map_err(|e| rusqlite::Error::InvalidColumnType(0, format!("Failed to migrate database schema: {}", e), rusqlite::types::Type::Null))?;
    }

    // Check if we need to migrate from lowercase to uppercase column names
    let has_lowercase_columns: Result<i64, rusqlite::Error> = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('api_keys') WHERE name IN ('anthropic_api_key', 'anthropic_base_url')",
        [],
        |row| row.get(0),
    );

    if let Ok(count) = has_lowercase_columns {
        if count > 0 {
            // Migration needed: rename lowercase columns to uppercase
            if count >= 1 {
                conn.execute(
                    "ALTER TABLE api_keys RENAME COLUMN anthropic_api_key TO ANTHROPIC_API_KEY",
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

    // Check if we need to migrate from ANTHROPIC_AUTH_TOKEN to ANTHROPIC_API_KEY
    let has_auth_token_column: Result<bool, rusqlite::Error> = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('api_keys') WHERE name = 'ANTHROPIC_AUTH_TOKEN'",
        [],
        |row| row.get(0),
    );

    if let Ok(true) = has_auth_token_column {
        // Migration needed: rename ANTHROPIC_AUTH_TOKEN column to ANTHROPIC_API_KEY
        conn.execute(
            "ALTER TABLE api_keys RENAME COLUMN ANTHROPIC_AUTH_TOKEN TO ANTHROPIC_API_KEY",
            (),
        ).map_err(|e| rusqlite::Error::InvalidColumnType(0, format!("Failed to migrate database schema from ANTHROPIC_AUTH_TOKEN to ANTHROPIC_API_KEY: {}", e), rusqlite::types::Type::Null))?;
    }

    // Check if CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC column exists and remove it
    let has_disable_traffic_column: Result<bool, rusqlite::Error> = conn.query_row(
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

    // Check if is_active column exists, add it if it doesn't
    let has_is_active_column: Result<bool, rusqlite::Error> = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('api_keys') WHERE name = 'is_active'",
        [],
        |row| row.get(0),
    );

    if let Ok(false) = has_is_active_column {
        // Add the is_active column with default value 1 (true)
        conn.execute(
            "ALTER TABLE api_keys ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
            (),
        ).map_err(|e| rusqlite::Error::InvalidColumnType(0, format!("Failed to add is_active column: {}", e), rusqlite::types::Type::Null))?;
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

    // Create the current_router_config_path table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS current_router_config_path (
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

    // Create the providers table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            api_base_url TEXT NOT NULL,
            api_key TEXT NOT NULL,
            models TEXT,
            transformer TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;

    // Create the router_configs table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS router_configs (
            id TEXT PRIMARY KEY,
            config_key TEXT NOT NULL UNIQUE,
            config_value TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;

    // Create the projects table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            frameworks TEXT,
            project_type TEXT NOT NULL,
            description TEXT,
            scan_time TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;

    // Create the project_categories table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS project_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        (),
    )?;
    
    Ok(conn)
}
