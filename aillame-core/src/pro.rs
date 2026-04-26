use napi::bindgen_prelude::*;
use std::sync::{Arc, Mutex};
use hf_hub::api::sync::Api;

// Tensör ve Matematiksel İşlemler
use candle_core::{Device, Tensor};
use candle_core::quantized::ggml_file;
use candle_transformers::models::quantized_llama::ModelWeights;
use candle_transformers::generation::LogitsProcessor;
use tokenizers::Tokenizer;
use std::fs::File;

struct ProState {
    model: Option<ModelWeights>,
    tokenizer: Option<Tokenizer>,
    path: String,
}

#[napi]
pub struct AillameProEngine {
    state: Arc<Mutex<ProState>>,
}

#[napi]
impl AillameProEngine {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(ProState {
                model: None,
                tokenizer: None,
                path: String::new(),
            })),
        }
    }

    #[napi]
    pub async fn load_model(&self, repo_id: String, filename: String) -> Result<bool> {
        let state_arc = self.state.clone();

        println!("⏳ [Aillame PRO] İndiriliyor veya okunuyor: {}/{}", repo_id, filename);
        
        let api = Api::new().map_err(|e| Error::from_reason(format!("HF API Hatası: {}", e)))?;
        let repo = api.model(repo_id.clone());
        
        // GGUF Dosyası
        let local_path = repo.get(&filename).map_err(|e| Error::from_reason(format!("GGUF indirme hatası: {}", e)))?;
        // Tokenizer Dosyası (GGUF depolarında genelde tokenizer.json olmaz, bu yüzden ana depodan çekiyoruz)
        let base_repo_id = repo_id.replace("-GGUF", ""); 
        let tokenizer_api = api.model(base_repo_id);
        let tokenizer_path = tokenizer_api.get("tokenizer.json").map_err(|e| Error::from_reason(format!("Tokenizer indirme hatası: {}", e)))?;
        
        println!("🧠 [Aillame PRO] Dosyalar hazır. RAM'e yükleniyor...");

        // GGUF bridge for legacy local text-only models. Qwen3-VL runs through
        // the Transformers multimodal server path because it is a Safetensors VL model.
        let mut file = File::open(&local_path).map_err(|e| Error::from_reason(e.to_string()))?;
        let content = ggml_file::Content::read(&mut file, &Device::Cpu).map_err(|e| Error::from_reason(e.to_string()))?;
        
        // 1 sayısı Grouped Query Attention çarpanıdır
        let model = ModelWeights::from_ggml(content, 1).map_err(|e| Error::from_reason(e.to_string()))?;
        let tokenizer = Tokenizer::from_file(&tokenizer_path).map_err(|e| Error::from_reason(e.to_string()))?;
        
        let mut state = state_arc.lock().unwrap();
        state.model = Some(model);
        state.tokenizer = Some(tokenizer);
        state.path = local_path.to_string_lossy().to_string();
        
        println!("✅ [Aillame PRO] Legacy GGUF text model loaded.");
        Ok(true)
    }

    #[napi]
    pub async fn generate_text(&self, prompt: String, max_tokens: u32, temperature: f64) -> Result<String> {
        let mut guard = self.state.lock().unwrap();
        let state = &mut *guard;
        
        let model = state.model.as_mut().ok_or_else(|| Error::from_reason("Model yüklenmedi"))?;
        let tokenizer = state.tokenizer.as_ref().ok_or_else(|| Error::from_reason("Tokenizer yüklenmedi"))?;

        // Chat formatting for legacy GGUF text models.
        let system_prompt = "<|im_start|>system\nSen Aillame Pro'sun. Gelişmiş bir yapay zekasın.<|im_end|>\n<|im_start|>user\n";
        let full_prompt = format!("{}{}<|im_end|>\n<|im_start|>assistant\n", system_prompt, prompt);

        // Encoding
        let tokens = tokenizer.encode(full_prompt, true).map_err(|e| Error::from_reason(e.to_string()))?;
        let mut tokens = tokens.get_ids().to_vec();
        
        let mut logits_processor = LogitsProcessor::new(299792458, Some(temperature), None);
        let mut generated_text = String::new();
        let device = Device::Cpu;

        let mut index_pos = 0;
        
        // Tensör Inference Döngüsü
        for index in 0..max_tokens {
            let context_size = if index == 0 { tokens.len() } else { 1 };
            let start_pos = tokens.len() - context_size;
            let input = Tensor::new(&tokens[start_pos..], &device).map_err(|e| Error::from_reason(e.to_string()))?.unsqueeze(0).map_err(|e| Error::from_reason(e.to_string()))?;

            let logits = model.forward(&input, index_pos).map_err(|e| Error::from_reason(e.to_string()))?;
            
            // Son logitleri al
            let logits = logits.squeeze(0).map_err(|e| Error::from_reason(e.to_string()))?;
            let next_token = logits_processor.sample(&logits).map_err(|e| Error::from_reason(e.to_string()))?;
            
            tokens.push(next_token);
            index_pos += context_size;
            
            // Stop on common chat end/EOS tokens.
            if next_token == 151645 || next_token == 151643 {
                break;
            }

            if let Some(text) = tokenizer.id_to_token(next_token) {
                let clean_text = text.replace("Ġ", " ").replace("<0x0A>", "\n");
                generated_text.push_str(&clean_text);
            }
        }

        Ok(generated_text.trim().to_string())
    }
}
