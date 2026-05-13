use tauri::{command, AppHandle, Runtime, State};
use crate::AppState;
use crate::model::load_state::{LoadStatus, LoadErrorCode, SafeModelLoadResponse};
use crate::model::model_load_contract::{ModelLoadRequest, ModelLoadOptions};
use crate::model::runtime_policy::{RuntimeProcessState, MainToSidecarMessage, RuntimeSessionState};
use crate::model::inference_contract::{InferenceRequest, InferenceResponse};
use std::path::PathBuf;

#[command]
pub async fn get_safe_runtime_session(
    state: State<'_, AppState>
) -> Result<Option<RuntimeSessionState>, String> {
    let session = state.runtime_session.lock().unwrap();
    Ok(session.clone())
}

/// Internal Model Resolver (Guard)
/// ID -> Path resolution is strictly internal.
fn resolve_model_path(model_id: &str) -> Result<PathBuf, LoadErrorCode> {
    // Basic sanitization: no path separators allowed in ID
    if model_id.contains('/') || model_id.contains('\\') || model_id.contains("..") {
        return Err(LoadErrorCode::ModelLoadAccessDenied);
    }

    // Example resolution logic:
    // In a real app, this would query a database or local config.
    // For Phase 11B, we assume models are in .aillame-data/models/
    let mut path = std::env::current_dir().unwrap_or_default();
    path.push(".aillame-data");
    path.push("models");
    path.push(format!("{}.gguf", model_id));

    if path.exists() {
        Ok(path)
    } else {
        // Fallback for mock/placeholder if needed, but strictly gated
        Err(LoadErrorCode::ModelLoadModelNotFound)
    }
}

#[command]
pub async fn safe_model_load<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, AppState>,
    request: ModelLoadRequest
) -> Result<SafeModelLoadResponse, String> {
    // 1. Runtime State Check
    let (session_id, process_state, has_active_model) = {
        let session = state.runtime_session.lock().unwrap();
        match &*session {
            Some(s) => (Some(s.session_id.clone()), s.process_state, s.active_model_id.is_some()),
            None => (None, RuntimeProcessState::NotStarted, false),
        }
    };

    if process_state != RuntimeProcessState::RuntimeReady {
        let err_code = match process_state {
            RuntimeProcessState::NotStarted | RuntimeProcessState::Failed | RuntimeProcessState::Crashed => 
                LoadErrorCode::ModelLoadRuntimeNotAvailable,
            _ => LoadErrorCode::ModelLoadActiveModelBusy,
        };
        return Ok(SafeModelLoadResponse {
            id: request.model_id,
            display_name: "Model".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::LoadFailed,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: Some(err_code),
            can_proceed: false,
            runtime_session_id: session_id,
        });
    }

    if has_active_model {
        return Ok(SafeModelLoadResponse {
            id: request.model_id,
            display_name: "Model".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::LoadFailed,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: Some(LoadErrorCode::ModelLoadRequiresUnload),
            can_proceed: false,
            runtime_session_id: session_id,
        });
    }

    // 2. Model Guard / Path Resolution (Internal only)
    let _internal_path = match resolve_model_path(&request.model_id) {
        Ok(p) => p,
        Err(e) => {
            return Ok(SafeModelLoadResponse {
                id: request.model_id,
                display_name: "Model".to_string(),
                root_label: "Local".to_string(),
                load_status: LoadStatus::LoadFailed,
                runtime_label: "Aillame Sidecar".to_string(),
                memory_estimate: None,
                warnings: vec![],
                error_code: Some(e),
                can_proceed: false,
                runtime_session_id: session_id,
            });
        }
    };

    // 3. Confirm Policy
    if !request.confirm {
        return Ok(SafeModelLoadResponse {
            id: request.model_id.clone(),
            display_name: request.model_id.clone(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::Idle,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: Some(4096), // Mock estimate
            warnings: vec![],
            error_code: Some(LoadErrorCode::ModelLoadConfirmationRequired),
            can_proceed: true,
            runtime_session_id: session_id,
        });
    }

    // 4. Communication with Sidecar
    let sender = {
        let s = state.runtime_sender.lock().unwrap();
        s.clone()
    };

    if let Some(tx) = sender {
        // Send LoadPrepare first
        let _ = tx.send(MainToSidecarMessage::LoadPrepare { 
            options: request.options.clone() 
        }).await;

        // In a real implementation, we would wait for LoadPrepared event from the sidecar loop.
        // For Phase 11B, we set the pending state and return.
        {
            let mut session = state.runtime_session.lock().unwrap();
            if let Some(s) = session.as_mut() {
                s.pending_model_id = Some(request.model_id.clone());
                s.process_state = RuntimeProcessState::PreparingLoad;
            }
        }

        // Note: Real LoadStart would be sent after LoadPrepared is received in the background thread.
        // This command returns the "Preparing" status to the UI.
        Ok(SafeModelLoadResponse {
            id: request.model_id,
            display_name: "Loading Model...".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::PreparingLoad,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: None,
            can_proceed: false,
            runtime_session_id: session_id,
        })
    } else {
        Ok(SafeModelLoadResponse {
            id: request.model_id,
            display_name: "Error".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::LoadFailed,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: Some(LoadErrorCode::ModelLoadRuntimeNotAvailable),
            can_proceed: false,
            runtime_session_id: session_id,
        })
    }
}

#[command]
pub async fn safe_model_unload<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, AppState>
) -> Result<SafeModelLoadResponse, String> {
    let (session_id, active_model_id, process_state) = {
        let session = state.runtime_session.lock().unwrap();
        match &*session {
            Some(s) => (Some(s.session_id.clone()), s.active_model_id.clone(), s.process_state),
            None => (None, None, RuntimeProcessState::NotStarted),
        }
    };

    if active_model_id.is_none() {
        return Ok(SafeModelLoadResponse {
            id: "none".to_string(),
            display_name: "No active model".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::Idle,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: None,
            can_proceed: true,
            runtime_session_id: session_id,
        });
    }

    if process_state == RuntimeProcessState::Unloading {
        return Ok(SafeModelLoadResponse {
            id: active_model_id.unwrap_or_default(),
            display_name: "Already unloading...".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::Unloading,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: None,
            can_proceed: false,
            runtime_session_id: session_id,
        });
    }

    let sender = state.runtime_sender.lock().unwrap().clone();
    if let Some(tx) = sender {
        let _ = tx.send(MainToSidecarMessage::Unload).await;
        
        {
            let mut session = state.runtime_session.lock().unwrap();
            if let Some(s) = session.as_mut() {
                s.process_state = RuntimeProcessState::Unloading;
            }
        }

        Ok(SafeModelLoadResponse {
            id: active_model_id.unwrap_or_default(),
            display_name: "Unloading model...".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::Unloading,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: None,
            can_proceed: false,
            runtime_session_id: session_id,
        })
    } else {
        Ok(SafeModelLoadResponse {
            id: active_model_id.unwrap_or_default(),
            display_name: "Error".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::UnloadFailed,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: Some(LoadErrorCode::ModelLoadRuntimeNotAvailable),
            can_proceed: false,
            runtime_session_id: session_id,
        })
    }
}

#[command]
pub async fn safe_model_cancel_load<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, AppState>
) -> Result<SafeModelLoadResponse, String> {
    let (session_id, pending_model_id, process_state) = {
        let session = state.runtime_session.lock().unwrap();
        match &*session {
            Some(s) => (Some(s.session_id.clone()), s.pending_model_id.clone(), s.process_state),
            None => (None, None, RuntimeProcessState::NotStarted),
        }
    };

    if pending_model_id.is_none() || (process_state != RuntimeProcessState::PreparingLoad && process_state != RuntimeProcessState::Loading) {
        return Ok(SafeModelLoadResponse {
            id: "none".to_string(),
            display_name: "No pending load".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::Idle,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: None,
            can_proceed: true,
            runtime_session_id: session_id,
        });
    }

    let sender = state.runtime_sender.lock().unwrap().clone();
    if let Some(tx) = sender {
        let _ = tx.send(MainToSidecarMessage::LoadCancel).await;
        
        {
            let mut session = state.runtime_session.lock().unwrap();
            if let Some(s) = session.as_mut() {
                s.process_state = RuntimeProcessState::Cancelling;
            }
        }

        Ok(SafeModelLoadResponse {
            id: pending_model_id.unwrap_or_default(),
            display_name: "Cancelling load...".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::Cancelling,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: None,
            can_proceed: false,
            runtime_session_id: session_id,
        })
    } else {
        Ok(SafeModelLoadResponse {
            id: pending_model_id.unwrap_or_default(),
            display_name: "Error".to_string(),
            root_label: "Local".to_string(),
            load_status: LoadStatus::LoadFailed,
            runtime_label: "Aillame Sidecar".to_string(),
            memory_estimate: None,
            warnings: vec![],
            error_code: Some(LoadErrorCode::ModelLoadRuntimeNotAvailable),
            can_proceed: false,
            runtime_session_id: session_id,
        })
    }
}

#[command]
pub async fn safe_model_infer<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, AppState>,
    request: InferenceRequest
) -> Result<InferenceResponse, String> {
    let (active_model_id, process_state) = {
        let session = state.runtime_session.lock().unwrap();
        match &*session {
            Some(s) => (s.active_model_id.clone(), s.process_state),
            None => (None, RuntimeProcessState::NotStarted),
        }
    };

    if process_state != RuntimeProcessState::Loaded || active_model_id.is_none() {
        return Ok(InferenceResponse {
            request_id: request.request_id,
            model_id: active_model_id.unwrap_or_else(|| "none".to_string()),
            text: "".to_string(),
            finish_reason: "error".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: Some("MODEL_INFERENCE_MODEL_NOT_LOADED".to_string()),
        });
    }

    if request.prompt.trim().is_empty() {
        return Ok(InferenceResponse {
            request_id: request.request_id,
            model_id: active_model_id.unwrap_or_default(),
            text: "".to_string(),
            finish_reason: "error".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: Some("MODEL_INFERENCE_INVALID_PROMPT".to_string()),
        });
    }

    let sender = state.runtime_sender.lock().unwrap().clone();
    if let Some(tx) = sender {
        {
            let mut session = state.runtime_session.lock().unwrap();
            if let Some(s) = session.as_mut() {
                s.is_inferring = true;
            }
        }
        let _ = tx.send(MainToSidecarMessage::InferOnce { 
            prompt: request.prompt, 
            options: request.options 
        }).await;

        Ok(InferenceResponse {
            request_id: request.request_id,
            model_id: active_model_id.unwrap_or_default(),
            text: "".to_string(),
            finish_reason: "pending".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: None,
        })
    } else {
        Ok(InferenceResponse {
            request_id: request.request_id,
            model_id: active_model_id.unwrap_or_default(),
            text: "".to_string(),
            finish_reason: "error".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: Some("MODEL_LOAD_RUNTIME_NOT_AVAILABLE".to_string()),
        })
    }
}

#[command]
pub async fn safe_model_infer_stream<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, AppState>,
    request: InferenceRequest
) -> Result<InferenceResponse, String> {
    let (active_model_id, process_state, is_inferring) = {
        let session = state.runtime_session.lock().unwrap();
        match &*session {
            Some(s) => (s.active_model_id.clone(), s.process_state, s.is_inferring),
            None => (None, RuntimeProcessState::NotStarted, false),
        }
    };

    if process_state != RuntimeProcessState::Loaded || active_model_id.is_none() {
        return Ok(InferenceResponse {
            request_id: request.request_id,
            model_id: active_model_id.unwrap_or_else(|| "none".to_string()),
            text: "".to_string(),
            finish_reason: "error".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: Some("MODEL_INFERENCE_MODEL_NOT_LOADED".to_string()),
        });
    }

    if is_inferring {
        return Ok(InferenceResponse {
            request_id: request.request_id,
            model_id: active_model_id.unwrap_or_default(),
            text: "".to_string(),
            finish_reason: "error".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: Some("MODEL_INFERENCE_BUSY".to_string()),
        });
    }

    if request.prompt.trim().is_empty() {
        return Ok(InferenceResponse {
            request_id: request.request_id,
            model_id: active_model_id.unwrap_or_default(),
            text: "".to_string(),
            finish_reason: "error".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: Some("MODEL_INFERENCE_INVALID_PROMPT".to_string()),
        });
    }

    let sender = state.runtime_sender.lock().unwrap().clone();
    if let Some(tx) = sender {
        {
            let mut session = state.runtime_session.lock().unwrap();
            if let Some(s) = session.as_mut() {
                s.is_inferring = true;
            }
        }
        let _ = tx.send(MainToSidecarMessage::InferStream { 
            prompt: request.prompt, 
            options: request.options 
        }).await;

        Ok(InferenceResponse {
            request_id: request.request_id,
            model_id: active_model_id.unwrap_or_default(),
            text: "".to_string(),
            finish_reason: "streaming_started".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: None,
        })
    } else {
        Ok(InferenceResponse {
            request_id: request.request_id,
            model_id: active_model_id.unwrap_or_default(),
            text: "".to_string(),
            finish_reason: "error".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: Some("MODEL_LOAD_RUNTIME_NOT_AVAILABLE".to_string()),
        })
    }
}

#[command]
pub async fn safe_model_cancel_infer_stream<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, AppState>
) -> Result<InferenceResponse, String> {
    let (active_model_id, is_inferring) = {
        let session = state.runtime_session.lock().unwrap();
        match &*session {
            Some(s) => (s.active_model_id.clone(), s.is_inferring),
            None => (None, false),
        }
    };

    if !is_inferring {
        return Ok(InferenceResponse {
            request_id: "cancel".to_string(),
            model_id: active_model_id.unwrap_or_else(|| "none".to_string()),
            text: "".to_string(),
            finish_reason: "no_active_stream".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: None,
        });
    }

    let sender = state.runtime_sender.lock().unwrap().clone();
    if let Some(tx) = sender {
        let _ = tx.send(MainToSidecarMessage::InferenceCancel).await;

        Ok(InferenceResponse {
            request_id: "cancel".to_string(),
            model_id: active_model_id.unwrap_or_else(|| "none".to_string()),
            text: "".to_string(),
            finish_reason: "cancel_requested".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: None,
        })
    } else {
        Ok(InferenceResponse {
            request_id: "cancel".to_string(),
            model_id: active_model_id.unwrap_or_else(|| "none".to_string()),
            text: "".to_string(),
            finish_reason: "error".to_string(),
            token_count: None,
            duration_ms: None,
            warnings: vec![],
            error_code: Some("MODEL_LOAD_RUNTIME_NOT_AVAILABLE".to_string()),
        })
    }
}
