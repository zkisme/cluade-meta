
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// 数据结构：用于项目扫描
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub category: String,
    pub frameworks: Vec<String>,
    #[serde(rename = "projectType")]
    pub project_type: String,
    pub description: Option<String>,
    pub scan_time: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanOptions {
    pub marker_files: Vec<String>,
    pub ignore_patterns: Vec<String>,
    pub max_depth: u32,
}

// Claude Code Router 相关数据结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transformer {
    #[serde(rename = "use")]
    pub use_transformers: Vec<serde_json::Value>,
    #[serde(flatten)]
    pub model_specific: HashMap<String, HashMap<String, Vec<serde_json::Value>>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Provider {
    pub name: String,
    pub api_base_url: String,
    pub api_key: String,
    pub models: Vec<String>,
    pub transformer: Option<Transformer>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RouterConfig {
    pub default: Option<String>,
    pub background: Option<String>,
    pub think: Option<String>,
    #[serde(rename = "longContext")]
    pub long_context: Option<String>,
    #[serde(rename = "longContextThreshold")]
    pub long_context_threshold: Option<u32>,
    #[serde(rename = "webSearch")]
    pub web_search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomTransformer {
    pub path: String,
    pub options: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeCodeRouterConfig {
    #[serde(rename = "ANTHROPIC_API_KEY", skip_serializing_if = "Option::is_none")]
    pub anthropic_api_key: Option<String>,
    #[serde(rename = "PROXY_URL", skip_serializing_if = "Option::is_none")]
    pub proxy_url: Option<String>,
    #[serde(rename = "LOG", skip_serializing_if = "Option::is_none")]
    pub log: Option<bool>,
    #[serde(rename = "HOST", skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(rename = "NON_INTERACTIVE_MODE", skip_serializing_if = "Option::is_none")]
    pub non_interactive_mode: Option<bool>,
    #[serde(rename = "API_TIMEOUT_MS", skip_serializing_if = "Option::is_none")]
    pub api_timeout_ms: Option<u32>,
    #[serde(rename = "CUSTOM_ROUTER_PATH", skip_serializing_if = "Option::is_none")]
    pub custom_router_path: Option<String>,
    #[serde(rename = "Providers")]
    pub providers: Vec<Provider>,
    #[serde(rename = "Router")]
    pub router: RouterConfig,
    pub transformers: Option<Vec<CustomTransformer>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiKey {
    pub id: String,
    pub name: String,
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub anthropic_api_key: String,
    pub description: Option<String>,
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub anthropic_base_url: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RouteConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub method: String,
    pub handler: String,
    pub middleware: Option<Vec<String>>,
    pub auth_required: bool,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl RouteConfig {
    pub fn to_db_middleware(&self) -> Option<String> {
        self.middleware.as_ref().map(|m| serde_json::to_string(m).unwrap_or_else(|_| "[]".to_string()))
    }
    
    pub fn from_db_middleware(middleware_json: Option<String>) -> Option<Vec<String>> {
        middleware_json.and_then(|json| serde_json::from_str(&json).ok())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRouteConfigRequest {
    pub name: String,
    pub path: String,
    pub method: String,
    pub handler: String,
    pub middleware: Option<Vec<String>>,
    pub auth_required: bool,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRouteConfigRequest {
    pub name: Option<String>,
    pub path: Option<String>,
    pub method: Option<String>,
    pub handler: Option<String>,
    pub middleware: Option<Vec<String>>,
    pub auth_required: Option<bool>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub anthropic_api_key: String,
    pub description: Option<String>,
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub anthropic_base_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: Option<String>,
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub anthropic_api_key: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub anthropic_base_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeSettings {
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub anthropic_api_key: Option<String>,
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub anthropic_base_url: Option<String>,
    pub model: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f64>,
    pub top_p: Option<f64>,
    pub timeout: Option<u64>,
    pub proxy_url: Option<String>,
    pub verbose: Option<bool>,
    pub stream: Option<bool>,
    pub unsafe_html: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvConfig {
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub anthropic_api_key: Option<String>,
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub anthropic_base_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PermissionsConfig {
    pub allow: Option<Vec<String>>,
    pub deny: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigFileFormat {
    pub env: EnvConfig,
    pub permissions: PermissionsConfig,
    #[serde(rename = "apiKeyHelper")]
    pub api_key_helper: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigPath {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateConfigPathRequest {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateConfigPathRequest {
    pub name: Option<String>,
    pub path: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigItem<T> {
    pub id: String,
    pub name: String,
    pub data: T,
    pub description: Option<String>,
    pub is_active: Option<bool>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomCategory {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiKeyData {
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub anthropic_api_key: String,
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub anthropic_base_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupFile {
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouterBackupFile {
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouteConfigData {
    pub path: String,
    pub method: String,
    pub handler: String,
    pub middleware: Option<Vec<String>>,
    pub auth_required: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub path: String,
    pub category: String,
    pub frameworks: Vec<String>,
    #[serde(rename = "projectType")]
    pub project_type: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub path: Option<String>,
    pub category: Option<String>,
    pub frameworks: Option<Vec<String>>,
    #[serde(rename = "projectType")]
    pub project_type: Option<String>,
    pub description: Option<String>,
}
