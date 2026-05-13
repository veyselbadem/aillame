pub mod model;
pub mod commands;
use tauri::State;
use std::sync::Mutex;
use serde::Serialize;
use std::fs::File;
use std::io::{BufRead, BufReader};

#[derive(Default)]
pub struct AppState {
    _active_jobs_count: Mutex<usize>,
    pub runtime_session: Mutex<Option<crate::model::runtime_policy::RuntimeSessionState>>,
    pub runtime_sender: Mutex<Option<tokio::sync::mpsc::Sender<crate::model::runtime_policy::MainToSidecarMessage>>>,
}

#[derive(Serialize)]
struct JobStatusResponse {
    status: String,
    progress: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    output_asset_ids: Option<Vec<String>>,
}

// Görsel üretim durumunu gerçek dosyadan kontrol eden Rust komutu
#[tauri::command]
async fn get_image_job_status(job_id: String, _state: State<'_, AppState>) -> Result<JobStatusResponse, String> {
    let assets_path = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join(".aillame-data")
        .join("image-assets.jsonl");

    // 1. Dosya var mı kontrol et
    if !assets_path.exists() {
        return Err("Asset file not found, falling back to API".to_string());
    }

    // 2. Dosyayı satır satır oku ve jobId ara
    let file = File::open(assets_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);

    for line in reader.lines() {
        if let Ok(content) = line {
            // Basit bir string araması (JSON parse'dan daha hızlı)
            if content.contains(&job_id) {
                // Asset ID'yi bulmaya çalışalım (Örn: "assetId":"...")
                let asset_id = content.split("\"assetId\":\"")
                    .nth(1)
                    .and_then(|s| s.split("\"").next())
                    .map(|s| s.to_string());

                if let Some(id) = asset_id {
                    return Ok(JobStatusResponse {
                        status: "completed".to_string(),
                        progress: 100,
                        output_asset_ids: Some(vec![id]),
                    });
                }
            }
        }
    }

    // 3. Eğer bulamadıysak, hata dönerek Frontend'in HTTP API'sine sormasını sağlayalım
    Err("pending".to_string())
}

fn main() {
  tauri::Builder::default()
    .manage(AppState::default())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
        get_image_job_status,
        commands::runtime_start::start_runtime,
        commands::runtime_start::stop_runtime,
        commands::models::get_safe_runtime_session,
        commands::models::safe_model_load,
        commands::models::safe_model_unload,
        commands::models::safe_model_cancel_load,
        commands::models::safe_model_infer,
        commands::models::safe_model_infer_stream,
        commands::models::safe_model_cancel_infer_stream
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
