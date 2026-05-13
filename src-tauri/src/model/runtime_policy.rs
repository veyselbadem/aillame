use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeProcessState {
    NotStarted,
    Starting,
    RuntimeReady,
    PreparingLoad,
    Loading,
    Loaded,
    Unloading,
    Stopping,
    Cancelling,
    Stopped,
    Crashed,
    Failed,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcEnvelope<T> {
    pub protocol_version: String,
    pub request_id: String,
    pub model_id: Option<String>,
    pub message_type: String,
    pub payload: T,
}

use crate::model::model_load_contract::{ModelLoadOptions, ModelResourceEstimate, ModelLoadDevicePreference};

use crate::model::inference_contract::{InferenceOptions, InferenceResponse};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "action", content = "data", rename_all = "snake_case")]
pub enum MainToSidecarMessage {
    RuntimeInit { device_preference: String },
    LoadPrepare { options: ModelLoadOptions },
    LoadStart,
    LoadCancel,
    Unload,
    Shutdown,
    Heartbeat,
    InferOnce { prompt: String, options: InferenceOptions },
    InferStream { prompt: String, options: InferenceOptions },
    InferenceCancel,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "event", content = "data", rename_all = "snake_case")]
pub enum SidecarToMainMessage {
    RuntimeHello { version: String },
    RuntimeReady,
    Heartbeat { status: String },
    LoadPrepared { estimate: ModelResourceEstimate },
    LoadProgress { percent: f32, stage: String },
    LoadLoaded,
    LoadFailed { error_code: String, message: Option<String> },
    LoadCancelled,
    Unloaded,
    UnloadFailed { error_code: String },
    InferenceCompleted { response: InferenceResponse },
    InferenceFailed { error_code: String, message: Option<String> },
    StreamStarted { request_id: String },
    StreamToken { delta: String },
    StreamCompleted { response: InferenceResponse },
    StreamFailed { error_code: String, message: Option<String> },
    StreamCancelled,
    RuntimeWarning { warning_code: String },
    RuntimeCrashed { exit_code: Option<i32> },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSessionState {
    pub session_id: String,
    pub process_state: RuntimeProcessState,
    pub active_model_id: Option<String>,
    pub pending_model_id: Option<String>,
    pub runtime_label: String,
    pub last_error_code: Option<String>,
    pub started_at: Option<u64>,
    pub last_heartbeat_at: Option<u64>,
    pub is_inferring: bool,
}

/// Sanitizer helper skeleton to redact path-like patterns from logs.
pub fn sanitize_runtime_log(line: &str) -> String {
    // Basic string checks to avoid adding regex dependency in this phase.
    if line.contains(":\\") 
        || line.contains("/Users/") 
        || line.contains("/home/") 
        || line.contains("file://")
        || line.contains(".aillame")
        || line.contains(".aillame-data")
    {
        "[REDACTED PATH]".to_string()
    } else {
        line.to_string()
    }
}

/// Non-serializable context for internal path management.
pub struct PrivateLaunchContext {
    pub internal_model_path: std::path::PathBuf,
}

impl fmt::Debug for PrivateLaunchContext {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("PrivateLaunchContext")
            .field("internal_model_path", &"[HIDDEN]")
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ipc_envelope_serialization() {
        let envelope = IpcEnvelope {
            protocol_version: "1.0".to_string(),
            request_id: "req-123".to_string(),
            model_id: Some("model-abc".to_string()),
            message_type: "test".to_string(),
            payload: "hello".to_string(),
        };
        let serialized = serde_json::to_string(&envelope).unwrap();
        assert!(serialized.contains("\"protocolVersion\":\"1.0\""));
        assert!(serialized.contains("\"requestId\":\"req-123\""));
        assert!(serialized.contains("\"modelId\":\"model-abc\""));
    }

    #[test]
    fn test_private_launch_context_redaction() {
        let context = PrivateLaunchContext {
            internal_model_path: std::path::PathBuf::from("C:\\Users\\secret\\model.gguf"),
        };
        let debug_output = format!("{:?}", context);
        assert!(!debug_output.contains("secret"));
        assert!(debug_output.contains("[HIDDEN]"));
    }

    #[test]
    fn test_sanitize_runtime_log() {
        assert_eq!(sanitize_runtime_log("normal log"), "normal log");
        assert_eq!(sanitize_runtime_log("Error at C:\\Users\\veyse\\model.gguf"), "[REDACTED PATH]");
        assert_eq!(sanitize_runtime_log("Failed to load /Users/veyse/model.gguf"), "[REDACTED PATH]");
        assert_eq!(sanitize_runtime_log("Check /home/user/data"), "[REDACTED PATH]");
        assert_eq!(sanitize_runtime_log("URL: file:///C:/Users/user/model.gguf"), "[REDACTED PATH]");
        assert_eq!(sanitize_runtime_log("Writing to .aillame-data/log.txt"), "[REDACTED PATH]");
        assert_eq!(sanitize_runtime_log("Config in .aillame/config.json"), "[REDACTED PATH]");
    }

    #[test]
    fn test_main_to_sidecar_serialization() {
        let msg = MainToSidecarMessage::LoadPrepare { 
            options: ModelLoadOptions {
                device_preference: ModelLoadDevicePreference::Gpu,
                context_length: 4096,
                max_memory_mb: None,
                threads: None,
                gpu_layers: Some(32),
            }
        };
        let serialized = serde_json::to_string(&msg).unwrap();
        assert!(serialized.contains("\"action\":\"load_prepare\""));
        assert!(serialized.contains("\"devicePreference\":\"gpu\""));
    }

    #[test]
    fn test_runtime_session_state_serialization() {
        let state = RuntimeSessionState {
            session_id: "sess-123".to_string(),
            process_state: RuntimeProcessState::RuntimeReady,
            active_model_id: None,
            pending_model_id: None,
            runtime_label: "Aillame".to_string(),
            last_error_code: None,
            started_at: Some(123456789),
            last_heartbeat_at: Some(123456790),
            is_inferring: false,
        };
        let serialized = serde_json::to_string(&state).unwrap();
        assert!(serialized.contains("\"sessionId\":\"sess-123\""));
        assert!(serialized.contains("\"startedAt\":123456789"));
        assert!(serialized.contains("\"lastHeartbeatAt\":123456790"));
    }
}
