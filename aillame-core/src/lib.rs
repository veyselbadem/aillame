#[macro_use]
extern crate napi_derive;

mod model;
mod tokenizer;
mod trainer;
mod memory;
mod pro;

use napi::bindgen_prelude::*;
use candle_core::{Device, Tensor, IndexOp};
use candle_nn::{VarMap};
use std::path::Path;
use std::sync::{Arc, Mutex};
use rand::distributions::{Distribution, WeightedIndex};
use rand::thread_rng;

#[napi]
 pub struct AillameEngine {
    tokenizer: Arc<Mutex<tokenizer::AillameTokenizer>>,
    varmap: Arc<Mutex<VarMap>>,
    trainer: Arc<Mutex<Option<trainer::AillameTrainer>>>,
    memory: Arc<Mutex<memory::AillameMemory>>,
    device: Device,
}

#[napi]
impl AillameEngine {
    #[napi(constructor)]
    pub fn new() -> Self {
        let device = Device::Cpu;
        let varmap = Arc::new(Mutex::new(VarMap::new()));
        Self {
            tokenizer: Arc::new(Mutex::new(tokenizer::AillameTokenizer::new())),
            varmap,
            trainer: Arc::new(Mutex::new(None)),
            memory: Arc::new(Mutex::new(memory::AillameMemory::new())),
            device,
        }
    }

    #[napi]
    pub fn init_trainer(&self, vocab_size: u32, n_embd: u32, n_layer: u32, lr: f64) -> Result<()> {
        let varmap_inner = self.varmap.lock().unwrap();
        let trainer = trainer::AillameTrainer::new(
            varmap_inner.clone(),
            vocab_size as usize,
            n_embd as usize,
            n_layer as usize,
            lr
        ).map_err(|e| Error::from_reason(format!("Trainer Init Error: {}", e)))?;
        
        let mut t = self.trainer.lock().unwrap();
        *t = Some(trainer);
        Ok(())
    }

    #[napi]
    pub fn train_tokenizer(&self, text: String) -> Result<()> {
        let mut t = self.tokenizer.lock().unwrap();
        t.train(&text);
        Ok(())
    }

    #[napi]
    pub fn get_vocab_size(&self) -> Result<u32> {
        let t = self.tokenizer.lock().unwrap();
        Ok(t.vocab_size as u32)
    }

    #[napi]
    pub async fn train_batch(&self, input_data: Uint32Array, target_data: Uint32Array, batch_size: u32, seq_len: u32) -> Result<f64> {
        let device = self.device.clone();
        let trainer_arc = self.trainer.clone();
        
        // Convert TypedArrays to Vecs
        let input_vec: Vec<u32> = input_data.to_vec();
        let target_vec: Vec<u32> = target_data.to_vec();
        
        tokio::task::spawn_blocking(move || {
            let mut trainer_lock = trainer_arc.lock().unwrap();
            if let Some(trainer) = &mut *trainer_lock {
                let input = Tensor::from_vec(input_vec, (batch_size as usize, seq_len as usize), &device)
                    .map_err(|e| Error::from_reason(e.to_string()))?;
                let targets = Tensor::from_vec(target_vec, (batch_size as usize, seq_len as usize), &device)
                    .map_err(|e| Error::from_reason(e.to_string()))?;
                
                let loss = trainer.train_step(&input, &targets)
                    .map_err(|e| Error::from_reason(format!("Train Step Error: {}", e)))?;
                
                Ok(loss as f64)
            } else {
                Err(Error::from_reason("Trainer not initialized."))
            }
        }).await.map_err(|e| Error::from_reason(format!("Task Join Error: {}", e)))?
    }

    // --- MEMORY FUNCTIONS (Faz 2.1) ---

    #[napi]
    pub fn add_to_memory(&self, content: String, vector_data: Float32Array) -> Result<()> {
        let device = self.device.clone();
        let vec: Vec<f32> = vector_data.to_vec();
        let vector = Tensor::from_vec(vec.clone(), (vec.len(),), &device)
            .map_err(|e| Error::from_reason(e.to_string()))?;
        
        let mut mem = self.memory.lock().unwrap();
        mem.add(content, vector);
        Ok(())
    }

    #[napi]
    pub fn search_memory(&self, query_vector_data: Float32Array, top_k: u32) -> Result<Vec<String>> {
        let device = self.device.clone();
        let vec: Vec<f32> = query_vector_data.to_vec();
        let vector = Tensor::from_vec(vec.clone(), (vec.len(),), &device)
            .map_err(|e| Error::from_reason(e.to_string()))?;
        
        let mem = self.memory.lock().unwrap();
        let results = mem.search(&vector, top_k as usize)
            .map_err(|e| Error::from_reason(e.to_string()))?;
        
        Ok(results.into_iter().map(|r| r.1).collect())
    }

    #[napi]
    pub fn save_checkpoint(&self, path: String) -> Result<()> {
        let varmap = self.varmap.lock().unwrap();
        varmap.save(Path::new(&path))
            .map_err(|e| Error::from_reason(format!("Save Checkpoint Error: {}", e)))?;
        Ok(())
    }

    #[napi]
    pub fn load_checkpoint(&self, path: String) -> Result<()> {
        let mut varmap = self.varmap.lock().unwrap();
        varmap.load(Path::new(&path))
            .map_err(|e| Error::from_reason(format!("Load Checkpoint Error: {}", e)))?;
        Ok(())
    }

    #[napi]
    pub fn get_embeddings(&self, input_ids: Uint32Array) -> Result<Float32Array> {
        let device = self.device.clone();
        let trainer_lock = self.trainer.lock().unwrap();
        
        if let Some(trainer) = &*trainer_lock {
            let seq_len = input_ids.len();
            let input = Tensor::from_vec(input_ids.to_vec(), (1, seq_len), &device)
                .map_err(|e| Error::from_reason(e.to_string()))?;
            
            let embeddings = trainer.model.get_embeddings(&input)
                .map_err(|e| Error::from_reason(e.to_string()))?;
            
            // Mean pool across sequence [1, seq_len, n_embd] -> [n_embd]
            let mean_embeddings = embeddings.mean(1)
                .map_err(|e| Error::from_reason(e.to_string()))?
                .reshape(embeddings.dims()[2])
                .map_err(|e| Error::from_reason(e.to_string()))?;
            
            let data: Vec<f32> = mean_embeddings.to_vec1()
                .map_err(|e| Error::from_reason(e.to_string()))?;
            
            Ok(Float32Array::from(data))
        } else {
            Err(Error::from_reason("Trainer or Model not initialized".to_string()))
        }
    }

    #[napi]
    pub fn generate(&self, input_ids: Uint32Array, max_len: u32, temperature: Option<f64>) -> Result<Vec<u32>> {
        let device = self.device.clone();
        let trainer_lock = self.trainer.lock().unwrap();
        let temp = temperature.unwrap_or(1.0);
        
        if let Some(trainer) = &*trainer_lock {
            let mut current_ids: Vec<u32> = input_ids.to_vec();
            let mut rng = thread_rng();
            
            for _ in 0..max_len {
                let seq_len = current_ids.len();
                let input = Tensor::from_vec(current_ids.clone(), (1, seq_len), &device)
                    .map_err(|e| Error::from_reason(e.to_string()))?;
                
                let logits = trainer.model.forward(&input)
                    .map_err(|e| Error::from_reason(format!("Forward error at step: {}", e)))?;
                
                // Last logit
                let logits = logits.i((0, seq_len - 1))
                    .map_err(|e| Error::from_reason(format!("Index error: {}", e)))?
                    .to_dtype(candle_core::DType::F32)
                    .map_err(|e| Error::from_reason(format!("DType error: {}", e)))?;

                let next_id = if temp <= 0.0 {
                    // Argmax
                    logits.argmax(candle_core::D::Minus1)
                        .map_err(|e| Error::from_reason(format!("Argmax error: {}", e)))?
                        .to_scalar::<u32>()
                        .map_err(|e| Error::from_reason(format!("ToScalar error: {}", e)))?
                } else {
                    // Temperature Sampling
                    let scaled_logits = (&logits / temp)
                        .map_err(|e| Error::from_reason(format!("Scale error: {}", e)))?;
                    let probs = candle_nn::ops::softmax(&scaled_logits, candle_core::D::Minus1)
                        .map_err(|e| Error::from_reason(format!("Softmax error: {}", e)))?;
                    
                    let probs_vec: Vec<f32> = probs.to_vec1()
                        .map_err(|e| Error::from_reason(format!("ToVec error: {}", e)))?;
                    
                    let dist = WeightedIndex::new(&probs_vec)
                        .map_err(|e| Error::from_reason(format!("Sampling failed (probs len: {}): {}", probs_vec.len(), e)))?;
                    dist.sample(&mut rng) as u32
                };
                
                current_ids.push(next_id);
            }
            
            Ok(current_ids)
        } else {
            Err(Error::from_reason("Trainer/Model not initialized for inference."))
        }
    }
}
