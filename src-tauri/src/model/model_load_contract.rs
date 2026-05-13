use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelLoadDevicePreference {
    Auto,
    Cpu,
    Gpu,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelLoadOptions {
    pub device_preference: ModelLoadDevicePreference,
    pub context_length: u32,
    pub max_memory_mb: Option<u64>,
    pub threads: Option<u32>,
    pub gpu_layers: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelLoadRequest {
    pub model_id: String,
    pub runtime_session_id: Option<String>,
    pub request_id: String,
    pub options: ModelLoadOptions,
    pub confirm: bool,
    pub prepare_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelResourceEstimate {
    pub estimated_ram_mb: u64,
    pub estimated_vram_mb: u64,
    pub parameter_count: Option<String>,
    pub quantization: Option<String>,
    pub estimate_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelLoadProgress {
    pub percent: f32,
    pub stage: String,
    pub message_code: Option<String>,
    pub warning_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ModelLoadWarning {
    ModelLoadMemoryEstimateUnavailable,
    ModelLoadGpuNotAvailableUsingCpu,
    ModelLoadContextReduced,
    ModelLoadQuantizationLimitedSupport,
    ModelLoadRuntimeLimitedSupport,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_load_request_serialization() {
        let req = ModelLoadRequest {
            model_id: "llama-3-8b".to_string(),
            runtime_session_id: Some("sess-123".to_string()),
            request_id: "req-456".to_string(),
            options: ModelLoadOptions {
                device_preference: ModelLoadDevicePreference::Auto,
                context_length: 2048,
                max_memory_mb: Some(8192),
                threads: Some(4),
                gpu_layers: None,
            },
            confirm: false,
            prepare_only: true,
        };
        let serialized = serde_json::to_string(&req).unwrap();
        assert!(!serialized.contains("path"));
        assert!(!serialized.contains("full_path"));
        assert!(serialized.contains("\"modelId\":\"llama-3-8b\""));
    }

    #[test]
    fn test_resource_estimate_serialization() {
        let estimate = ModelResourceEstimate {
            estimated_ram_mb: 4096,
            estimated_vram_mb: 0,
            parameter_count: Some("8B".to_string()),
            quantization: Some("Q4_K_M".to_string()),
            estimate_status: "verified".to_string(),
        };
        let serialized = serde_json::to_string(&estimate).unwrap();
        assert!(!serialized.contains("raw_hardware_dump"));
        assert!(serialized.contains("\"estimatedRamMb\":4096"));
    }
}
