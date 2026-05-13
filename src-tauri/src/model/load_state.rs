use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LoadErrorCode {
    ModelLoadModelNotFound,
    ModelLoadAccessDenied,
    ModelLoadUnsupportedFormat,
    ModelLoadUnsupportedQuantization,
    ModelLoadInsufficientMemory,
    ModelLoadRuntimeNotAvailable,
    ModelLoadTimeout,
    ModelLoadCancelled,
    ModelLoadFailed,
    ModelUnloadFailed,
    UnknownModelLoadError,
    ModelLoadConfirmationRequired,
    ModelLoadInvalidOptions,
    // Faz 8.23/8.34 New Codes
    ModelLoadRequiresUnload,
    ModelLoadActiveModelBusy,
    ModelRuntimeStartFailed,
    ModelRuntimeCrashed,
    ModelRuntimeProtocolError,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LoadStatus {
    Idle,
    PreparingLoad,
    LoadReady,
    Loading,
    Loaded,
    LoadFailed,
    Cancelling,
    Cancelled,
    Unloading,
    Unloaded,
    UnloadFailed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SafeModelLoadResponse {
    pub id: String,
    pub display_name: String,
    pub root_label: String,
    pub load_status: LoadStatus,
    pub runtime_label: String,
    pub memory_estimate: Option<u64>,
    pub warnings: Vec<String>,
    pub error_code: Option<LoadErrorCode>,
    pub can_proceed: bool,
    // Faz 8.34 Opaque Session ID
    pub runtime_session_id: Option<String>,
}
