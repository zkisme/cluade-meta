use std::collections::HashSet; // Added for uniqueness
use crate::models::{Project, ScanOptions, CreateProjectRequest};
use crate::commands::project_db::{bulk_create_projects, get_projects};
use crate::commands::category::{add_custom_category, get_custom_categories};
use std::collections::VecDeque;
use std::fs;
use std::path::PathBuf;
use serde_json::Value; // Added for parsing package.json
use chrono::Utc;
use tauri::{AppHandle, State, Manager};

// Helper function to detect frameworks from package.json
fn detect_frameworks_from_package_json(project_path: &PathBuf) -> Vec<String> {
    let package_json_path = project_path.join("package.json");
    let mut frameworks_set = HashSet::new();

    if package_json_path.exists() {
        if let Ok(content) = fs::read_to_string(&package_json_path) {
            if let Ok(json) = serde_json::from_str::<Value>(&content) {
                let deps = json["dependencies"]
                    .as_object()
                    .map(|m| m.keys().collect::<Vec<&String>>())
                    .unwrap_or_default();
                let dev_deps = json["devDependencies"]
                    .as_object()
                    .map(|m| m.keys().collect::<Vec<&String>>())
                    .unwrap_or_default();

                let all_deps: Vec<&String> = deps.into_iter().chain(dev_deps.into_iter()).collect();

                let known_frameworks = vec![
                    "react", "vue", "angular", "nextjs", "nuxtjs", "gatsby", "svelte", "solid",
                    "qwik", "tauri", "electron", "vite", "webpack", "rollup", "parcel", "esbuild",
                    "typescript", "tailwindcss", "bootstrap", "material-ui", "ant-design",
                    "chakra-ui", "shadcn/ui", "astro", // Added astro
                ];

                for framework in known_frameworks {
                    if all_deps.iter().any(|&dep| dep.contains(framework)) {
                        frameworks_set.insert(framework.to_string());
                    }
                }
            }
        }
    }
            frameworks_set.into_iter().filter(|s: &String| !s.is_empty()).collect()
    }// Tauri 命令：扫描项目并保存到数据库
#[tauri::command]
pub async fn scan_and_save_projects(app: AppHandle, path: String, options: ScanOptions) -> Result<Vec<Project>, String> {
    let root_path = PathBuf::from(&path);
    if !root_path.is_dir() {
        return Err(format!("Provided path is not a directory: {}", path));
    }

    let folder_name = root_path.file_name().unwrap_or_default().to_string_lossy().into_owned();
        
    // 检查是否已有同名的自定义分类
    let existing_categories = get_custom_categories(app.clone()).await?;
        
    let existing_category = existing_categories.iter().find(|c| c.name == folder_name);
    
    let category = if let Some(category) = existing_category {
        // 使用现有的自定义分类
                category.name.clone()
    } else {
        // 创建新的自定义分类
                match add_custom_category(folder_name.clone(), app.clone()).await {
            Ok(new_category) => {
                                new_category.name
            },
            Err(e) => {
                                folder_name // 即使创建失败，也使用文件夹名作为分类
            }
        }
    };
    
        let mut projects = Vec::new();
    let mut queue: VecDeque<(PathBuf, u32)> = VecDeque::new();
    queue.push_back((root_path.clone(), 0));

    while let Some((current_dir, depth)) = queue.pop_front() {
        if depth > options.max_depth {
            continue;
        }

        // 检查是否应忽略此目录
        if let Some(dir_name) = current_dir.file_name().and_then(|n| n.to_str()) {
            if options.ignore_patterns.iter().any(|p| dir_name.starts_with(p)) {
                continue;
            }
        }

        // New rule: check for 'docker' subdirectory
        let mut has_docker_subdir = false;
        if let Ok(entries) = fs::read_dir(&current_dir) {
            for entry in entries.filter_map(Result::ok) {
                if entry.path().is_dir() && entry.file_name() == "docker" {
                    has_docker_subdir = true;
                    break;
                }
            }
        }

        if has_docker_subdir {
            let mut frameworks_set: HashSet<String> = detect_frameworks_from_package_json(&current_dir).into_iter().collect();
            frameworks_set.insert("docker_group".to_string()); // Add docker_group, HashSet handles uniqueness
            let final_frameworks: Vec<String> = frameworks_set.into_iter().filter(|s: &String| !s.is_empty()).collect();

            projects.push(CreateProjectRequest {
                name: current_dir.file_name().unwrap_or_default().to_string_lossy().into_owned(),
                path: current_dir.to_string_lossy().into_owned(),
                category: category.clone(),
                frameworks: final_frameworks,
                project_type: "docker_group".to_string(),
                description: Some("Docker group project".to_string()),
            });
            // Don't scan subdirectories of this project
            continue;
        }

        let mut project_found = false;
        let mut project_type = "unknown".to_string();

        if let Ok(entries) = fs::read_dir(&current_dir) {
            for entry in entries.filter_map(Result::ok) {
                if let Some(file_name) = entry.file_name().to_str() {
                    if options.marker_files.contains(&file_name.to_string()) {
                        project_found = true;
                        project_type = match file_name {
                            "docker-compose.yml" | "Dockerfile" => "docker".to_string(),
                            "package.json" => "node".to_string(),
                            "index.html" => "web".to_string(),
                            "Cargo.toml" => "rust".to_string(),
                            _ => "general".to_string(),
                        };
                        break; 
                    }
                }
            }
        }

        if project_found {
            let mut frameworks_set: HashSet<String> = detect_frameworks_from_package_json(&current_dir).into_iter().collect();
            frameworks_set.insert(project_type.clone()); // Add project_type, HashSet handles uniqueness
            let final_frameworks: Vec<String> = frameworks_set.into_iter().filter(|s| !s.is_empty()).collect();



            let description = format!("{} project", project_type);
            projects.push(CreateProjectRequest {
                name: current_dir.file_name().unwrap_or_default().to_string_lossy().into_owned(),
                path: current_dir.to_string_lossy().into_owned(),
                category: category.clone(),
                frameworks: final_frameworks,
                project_type: project_type.clone(),
                description: Some(description),
            });
        } else {
            // 如果未找到项目，则将子目录添加到队列
            if let Ok(entries) = fs::read_dir(current_dir) {
                for entry in entries.filter_map(Result::ok) {
                    let path = entry.path();
                    if path.is_dir() {
                        queue.push_back((path, depth + 1));
                    }
                }
            }
        }
    }

    // Get existing projects to avoid duplicates
    let existing_projects = get_projects(app.clone())?;
    let existing_paths: std::collections::HashSet<String> = existing_projects
        .iter()
        .map(|p| p.path.clone())
        .collect();
    
    // Filter out projects that already exist
    let new_projects: Vec<CreateProjectRequest> = projects
        .into_iter()
        .filter(|p| !existing_paths.contains(&p.path))
        .collect();
    
    // Save only new projects
    let _saved_projects = if !new_projects.is_empty() {
        bulk_create_projects(app.clone(), new_projects)?
    } else {
        Vec::new()
    };
    
    // Return all projects (existing + new)
    let all_projects = get_projects(app.clone())?;
    Ok(all_projects)
}
