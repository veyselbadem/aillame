use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceOptions {
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub stop: Option<Vec<String>>,
    pub seed: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceRequest {
    pub prompt: String,
    pub model_id: String,
    pub request_id: String,
    pub options: InferenceOptions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceResponse {
    pub request_id: String,
    pub model_id: String,
    pub text: String,
    pub finish_reason: String,
    pub token_count: Option<u32>,
    pub duration_ms: Option<u64>,
    pub warnings: Vec<String>,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum InferenceStreamEvent {
    Started { request_id: String },
    Token { request_id: String, delta: String },
    Completed { request_id: String, response: InferenceResponse },
    Failed { request_id: String, error_code: String, message: Option<String> },
    Cancelled { request_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InferenceErrorCode {
    ModelInferenceModelNotLoaded,
    ModelInferenceTimeout,
    ModelInferenceFailed,
    ModelInferenceCancelled,
    ModelInferenceInvalidPrompt,
    ModelInferenceInvalidOptions,
    ModelInferenceBusy,
    ModelInferenceStreamProtocolError,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inference_request_serialization() {
        let req = InferenceRequest {
            prompt: "Hello".to_string(),
            model_id: "llama-3".to_string(),
            request_id: "req-1".to_string(),
            options: InferenceOptions {
                max_tokens: Some(100),
                temperature: Some(0.7),
                top_p: None,
                stop: None,
                seed: None,
            },
        };
        let serialized = serde_json::to_string(&req).unwrap();
        assert!(serialized.contains("\"prompt\":\"Hello\""));
        assert!(!serialized.contains("path"));
    }
}
