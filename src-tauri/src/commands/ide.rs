use tauri::{command, AppHandle, Manager, Runtime};

#[command]
pub async fn open_with_ide<R: Runtime>(_app: AppHandle<R>, path: String, ide: String) -> Result<(), String> {
    let os = std::env::consts::OS;

    let command = match (os, ide.as_str()) {
        ("macos", "vscode") => Some("code"),
        ("macos", "cursor") => Some("cursor"),
        ("macos", "webstorm") => Some("webstorm"),
        ("macos", "typora") => Some("typora"),
        ("macos", "sublime") => Some("subl"),
        ("macos", "atom") => Some("atom"),
        ("windows", "vscode") => Some("code"),
        ("windows", "cursor") => Some("cursor"),
        ("windows", "webstorm") => Some("webstorm"),
        ("windows", "typora") => Some("typora"),
        ("windows", "sublime") => Some("sublime_text"),
        ("windows", "atom") => Some("atom"),
        ("linux", "vscode") => Some("code"),
        ("linux", "cursor") => Some("cursor"),
        ("linux", "webstorm") => Some("webstorm"),
        ("linux", "typora") => Some("typora"),
        ("linux", "sublime") => Some("subl"),
        ("linux", "atom") => Some("atom"),
        _ => None,
    };

    if let Some(cmd) = command {
        let mut cmd_args = vec![path.clone()];
        if ide == "vscode" || ide == "cursor" {
            cmd_args.push("--folder-uri".to_string());
            cmd_args.push(format!("file://{}", path));
        }

        let output = std::process::Command::new(cmd)
            .args(&cmd_args)
            .output();

        match output {
            Ok(output) => {
                if output.status.success() {
                    Ok(())
                } else {
                    Err(format!("Failed to open with {}: {}", ide, String::from_utf8_lossy(&output.stderr)))
                }
            }
            Err(e) => Err(format!("Failed to execute command for {}: {}", ide, e)),
        }
    } else {
        Err(format!("Unsupported IDE: {} on {}", ide, os))
    }
}
