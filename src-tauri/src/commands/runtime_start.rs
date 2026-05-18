use tauri::{command, AppHandle, Runtime, State, Manager, Emitter};
use crate::model::runtime_policy::{RuntimeProcessState, RuntimeSessionState, SidecarToMainMessage, MainToSidecarMessage};
use crate::model::runtime_start::{RuntimeStartRequest, RuntimeStartResponse};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use crate::AppState;
use tokio::sync::mpsc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[command]
pub async fn start_runtime<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    request: RuntimeStartRequest
) -> Result<RuntimeStartResponse, String> {
    eprintln!("[start_runtime] command received");
    eprintln!("[start_runtime] request: {:?}", request);
    // 1. Durum Kontrolü (Repeated Start Policy)
    {
        let session = state.runtime_session.lock().unwrap();
        if let Some(s) = &*session {
            match s.process_state {
                RuntimeProcessState::Starting | RuntimeProcessState::RuntimeReady | 
                RuntimeProcessState::PreparingLoad | RuntimeProcessState::Loading | RuntimeProcessState::Loaded => {
                    return Ok(RuntimeStartResponse {
                        success: true,
                        session_id: Some(s.session_id.clone()),
                        process_state: format!("{:?}", s.process_state),
                        runtime_label: s.runtime_label.clone(),
                        can_start: false,
                        warnings: vec!["Runtime is already active or starting".to_string()],
                        error_code: None,
                    });
                }
                RuntimeProcessState::Stopping => {
                    return Ok(RuntimeStartResponse {
                        success: false,
                        session_id: None,
                        process_state: "stopping".to_string(),
                        runtime_label: "Aillame Sidecar".to_string(),
                        can_start: false,
                        warnings: vec!["Runtime is currently stopping, please wait".to_string()],
                        error_code: Some("MODEL_LOAD_ACTIVE_MODEL_BUSY".to_string()),
                    });
                }
                _ => {} // Stopped, Failed, Crashed, NotStarted allow restart
            }
        }
    }

    // 2. Sidecar Yapılandırması ve Başlatma
    let (mut rx, mut child) = match app.shell().sidecar("aillame-runtime") {
        Ok(c) => match c.spawn() {
            Ok(res) => res,
            Err(_e) => {
                eprintln!("[start_runtime] sidecar spawn failed: {:?}", _e);
                return Ok(RuntimeStartResponse {
                    success: false,
                    session_id: None,
                    process_state: "failed".to_string(),
                    runtime_label: "Aillame Sidecar".to_string(),
                    can_start: true,
                    warnings: vec![],
                    error_code: Some("MODEL_RUNTIME_START_FAILED".to_string()),
                });
            }
        },
        Err(_) => {
            return Ok(RuntimeStartResponse {
                success: false,
                session_id: None,
                process_state: "failed".to_string(),
                runtime_label: "Aillame Sidecar".to_string(),
                can_start: true,
                warnings: vec![],
                error_code: Some("MODEL_RUNTIME_START_FAILED".to_string()),
            });
        }
    };

    // 3. İletişim Kanalı ve Session Oluşturma
    let (tx, mut msg_rx) = mpsc::channel::<MainToSidecarMessage>(32);
    let session_id = uuid::Uuid::new_v4().to_string();
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    
    {
        let mut session = state.runtime_session.lock().unwrap();
        *session = Some(RuntimeSessionState {
            session_id: session_id.clone(),
            process_state: RuntimeProcessState::Starting,
            active_model_id: None,
            pending_model_id: None,
            runtime_label: "Aillame Sidecar".to_string(),
            last_error_code: None,
            started_at: Some(now),
            last_heartbeat_at: Some(now),
            is_inferring: false,
        });
        
        let mut sender = state.runtime_sender.lock().unwrap();
        *sender = Some(tx);
    }

    // 4. Arka Plan Olay Döngüsü (Handshake ve Lifecycle)
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut handshake_complete = false;
        let start_time = std::time::Instant::now();
        let timeout = Duration::from_secs(30);

        loop {
            if !handshake_complete && start_time.elapsed() > timeout {
                let state = app_clone.state::<AppState>();
                let mut session = state.runtime_session.lock().unwrap();
                if let Some(s) = session.as_mut() {
                    s.process_state = RuntimeProcessState::Failed;
                    s.last_error_code = Some("MODEL_LOAD_TIMEOUT".to_string());
                    s.pending_model_id = None;
                }
                let _ = app_clone.emit("runtime_error", "Handshake timeout");
                break;
            }

            tokio::select! {
                Some(msg) = msg_rx.recv() => {
                    if let Ok(json) = serde_json::to_string(&msg) {
                        let mut payload = json.as_bytes().to_vec();
                        payload.push(b'\n');
                        let _ = child.write(&payload);
                    }
                }
                Some(event) = rx.recv() => {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let line_str = String::from_utf8_lossy(&line);
                            let mut should_send_start = false;
                            
                            if let Ok(msg) = serde_json::from_str::<SidecarToMainMessage>(&line_str) {
                                let state = app_clone.state::<AppState>();
                                {
                                    let mut session = state.runtime_session.lock().unwrap();
                                    if let Some(s) = session.as_mut() {
                                        match msg {
                                            SidecarToMainMessage::RuntimeReady => {
                                                s.process_state = RuntimeProcessState::RuntimeReady;
                                                handshake_complete = true;
                                                let _ = app_clone.emit("runtime_event", "ready");
                                            }
                                            SidecarToMainMessage::Heartbeat { status: _ } => {
                                                s.last_heartbeat_at = Some(SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs());
                                            }
                                            SidecarToMainMessage::LoadPrepared { estimate: _ } => {
                                                s.process_state = RuntimeProcessState::Loading;
                                                should_send_start = true;
                                            }
                                            SidecarToMainMessage::LoadProgress { percent, stage } => {
                                                let _ = app_clone.emit("load_progress", serde_json::json!({
                                                    "percent": percent,
                                                    "stage": stage
                                                }));
                                            }
                                            SidecarToMainMessage::LoadLoaded => {
                                                s.process_state = RuntimeProcessState::Loaded;
                                                s.active_model_id = s.pending_model_id.take();
                                                let _ = app_clone.emit("model_event", "loaded");
                                            }
                                            SidecarToMainMessage::LoadFailed { error_code, message: _ } => {
                                                s.process_state = RuntimeProcessState::Failed;
                                                s.last_error_code = Some(error_code);
                                                s.pending_model_id = None;
                                                let _ = app_clone.emit("model_event", "failed");
                                            }
                                            SidecarToMainMessage::LoadCancelled => {
                                                s.process_state = RuntimeProcessState::RuntimeReady;
                                                s.pending_model_id = None;
                                                let _ = app_clone.emit("model_event", "cancelled");
                                            }
                                            SidecarToMainMessage::Unloaded => {
                                                s.process_state = RuntimeProcessState::RuntimeReady;
                                                s.active_model_id = None;
                                                let _ = app_clone.emit("model_event", "unloaded");
                                            }
                                            SidecarToMainMessage::UnloadFailed { error_code } => {
                                                s.process_state = RuntimeProcessState::Loaded;
                                                s.last_error_code = Some(error_code);
                                                let _ = app_clone.emit("model_event", "unload_failed");
                                            }
                                            SidecarToMainMessage::InferenceCompleted { response } => {
                                                s.is_inferring = false;
                                                let _ = app_clone.emit("inference_event", serde_json::json!({
                                                    "event": "completed",
                                                    "data": response
                                                }));
                                            }
                                            SidecarToMainMessage::InferenceFailed { error_code, message: _ } => {
                                                s.is_inferring = false;
                                                let _ = app_clone.emit("inference_event", serde_json::json!({
                                                    "event": "failed",
                                                    "error_code": error_code
                                                }));
                                            }
                                            SidecarToMainMessage::StreamStarted { request_id } => {
                                                s.is_inferring = true;
                                                let _ = app_clone.emit("inference_event", serde_json::json!({
                                                    "event": "stream_started",
                                                    "request_id": request_id
                                                }));
                                            }
                                            SidecarToMainMessage::StreamToken { delta } => {
                                                let _ = app_clone.emit("inference_event", serde_json::json!({
                                                    "event": "token",
                                                    "delta": delta
                                                }));
                                            }
                                            SidecarToMainMessage::StreamCompleted { response } => {
                                                s.is_inferring = false;
                                                let _ = app_clone.emit("inference_event", serde_json::json!({
                                                    "event": "stream_completed",
                                                    "data": response
                                                }));
                                            }
                                            SidecarToMainMessage::StreamFailed { error_code, message: _ } => {
                                                s.is_inferring = false;
                                                let _ = app_clone.emit("inference_event", serde_json::json!({
                                                    "event": "stream_failed",
                                                    "error_code": error_code
                                                }));
                                            }
                                            SidecarToMainMessage::StreamCancelled => {
                                                s.is_inferring = false;
                                                let _ = app_clone.emit("inference_event", serde_json::json!({
                                                    "event": "stream_cancelled"
                                                }));
                                            }
                                            SidecarToMainMessage::RuntimeCrashed { exit_code } => {
                                                s.process_state = RuntimeProcessState::Crashed;
                                                s.last_error_code = Some(format!("Exit code: {:?}", exit_code));
                                                s.pending_model_id = None;
                                                s.active_model_id = None;
                                                break;
                                            }
                                            _ => {}
                                        }
                                    }
                                }
                                
                                if should_send_start {
                                    let sender_opt = state.runtime_sender.lock().unwrap().clone();
                                    if let Some(tx) = sender_opt {
                                        let _ = tx.send(MainToSidecarMessage::LoadStart).await;
                                    }
                                }
                            } else {
                                if !line_str.trim().is_empty() {
                                    let state = app_clone.state::<AppState>();
                                    let mut session = state.runtime_session.lock().unwrap();
                                    if let Some(s) = session.as_mut() {
                                        if !handshake_complete {
                                            s.process_state = RuntimeProcessState::Failed;
                                            s.last_error_code = Some("MODEL_RUNTIME_PROTOCOL_ERROR".to_string());
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        CommandEvent::Stderr(line) => {
                            let _line_str = String::from_utf8_lossy(&line);
                        }
                        CommandEvent::Terminated(payload) => {
                            let state = app_clone.state::<AppState>();
                            let mut session = state.runtime_session.lock().unwrap();
                            if let Some(s) = session.as_mut() {
                                s.process_state = RuntimeProcessState::Stopped;
                                s.last_error_code = Some(format!("Terminated: {:?}", payload.code));
                                s.pending_model_id = None;
                            }
                            let mut sender = state.runtime_sender.lock().unwrap();
                            *sender = None;
                            break;
                        }
                        _ => {}
                    }
                }
                else => break,
            }
        }
    });

    eprintln!("[start_runtime] runtime start requested successfully (starting session)");
    Ok(RuntimeStartResponse {
        success: true,
        session_id: Some(session_id),
        process_state: "starting".to_string(),
        runtime_label: "Aillame Sidecar".to_string(),
        can_start: true,
        warnings: vec![],
        error_code: None,
    })
}

#[command]
pub async fn stop_runtime(
    state: State<'_, AppState>
) -> Result<String, String> {
    let (sender, current_state) = {
        let s = state.runtime_session.lock().unwrap();
        let current_state = s.as_ref().map(|sess| sess.process_state).unwrap_or(RuntimeProcessState::NotStarted);
        let sender = state.runtime_sender.lock().unwrap().clone();
        (sender, current_state)
    };

    if current_state == RuntimeProcessState::Stopping {
        return Ok("Runtime is already stopping".to_string());
    }

    if let Some(tx) = sender {
        {
            let mut s = state.runtime_session.lock().unwrap();
            if let Some(sess) = s.as_mut() {
                sess.process_state = RuntimeProcessState::Stopping;
                sess.active_model_id = None;
                sess.pending_model_id = None;
            }
        }
        let _ = tx.send(MainToSidecarMessage::Shutdown).await;
        Ok("Runtime stop requested".to_string())
    } else {
        Ok("Runtime is not running".to_string())
    }
}
