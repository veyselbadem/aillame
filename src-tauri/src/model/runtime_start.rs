use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeStartStatus {
    NotStarted,
    Starting,
    HandshakeInProgress,
    Ready,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStartOptions {
    #[serde(default = "default_device_preference")]
    pub device_preference: String,
    #[serde(default = "default_timeout_ms")]
    pub start_timeout_ms: u64,
    #[serde(default = "default_timeout_ms")]
    pub handshake_timeout_ms: u64,
    #[serde(default = "default_shutdown_timeout_ms")]
    pub shutdown_timeout_ms: u64,
}

fn default_device_preference() -> String {
    "auto".to_string()
}

fn default_timeout_ms() -> u64 {
    30000
}

fn default_shutdown_timeout_ms() -> u64 {
    10000
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStartRequest {
    #[serde(default = "default_device_preference")]
    pub device_preference: String,
    #[serde(default)]
    pub options: RuntimeStartOptions,
}

impl Default for RuntimeStartOptions {
    fn default() -> Self {
        Self {
            device_preference: default_device_preference(),
            start_timeout_ms: default_timeout_ms(),
            handshake_timeout_ms: default_timeout_ms(),
            shutdown_timeout_ms: default_shutdown_timeout_ms(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStartResponse {
    pub success: bool,
    pub session_id: Option<String>,
    pub process_state: String,
    pub runtime_label: String,
    pub can_start: bool,
    pub warnings: Vec<String>,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct RuntimeHandshakeHello {
    pub protocol_version: String,
    pub runtime_label: String,
    pub runtime_session_id: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct RuntimeHandshakeReady {
    pub protocol_version: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeTimeoutConfig {
    pub start_timeout_ms: u64,
    pub hello_timeout_ms: u64,
    pub shutdown_timeout_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeStartError {
    BinaryNotFound,
    AccessDenied,
    ExecutionFailed,
    HandshakeTimeout,
    StartupTimeout,
    ProtocolMismatch,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeStartWarning {
    pub code: String,
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_runtime_start_response_serialization() {
        let resp = RuntimeStartResponse {
            success: true,
            session_id: Some("opaque-session-123".to_string()),
            process_state: "starting".to_string(),
            runtime_label: "Aillame Sidecar".to_string(),
            can_start: true,
            warnings: vec![],
            error_code: None,
        };
        let serialized = serde_json::to_string(&resp).unwrap();
        // Forbidden fields check
        assert!(!serialized.contains("full_path"));
        assert!(!serialized.contains("pid"));
        assert!(!serialized.contains("process_id"));
        assert!(serialized.contains("\"sessionId\":\"opaque-session-123\""));
    }

    #[test]
    fn test_runtime_handshake_hello_serialization() {
        let hello = RuntimeHandshakeHello {
            protocol_version: "1.0".to_string(),
            runtime_label: "Aillame Sidecar".to_string(),
            runtime_session_id: Some("session-abc".to_string()),
            status: "ready".to_string(),
        };
        let serialized = serde_json::to_string(&hello).unwrap();
        assert!(!serialized.contains("path"));
        assert!(serialized.contains("\"protocol_version\":\"1.0\""));
    }
}
