use candle_core::{Result, Tensor, Device};
use candle_nn::{Optimizer, AdamW, ParamsAdamW, VarMap};
use crate::model::AillameNano;

pub struct AillameTrainer {
    pub model: AillameNano,
    optimizer: AdamW,
}

impl AillameTrainer {
    pub fn new(varmap: VarMap, vocab_size: usize, n_embd: usize, n_layer: usize, lr: f64) -> Result<Self> {
        let vb = VarBuilder::from_varmap(&varmap, candle_core::DType::F32, &Device::Cpu);
        let model = AillameNano::new(vb, vocab_size, n_embd, n_layer)?;
        
        // AdamW optimizer parameters
        let params = ParamsAdamW {
            lr,
            ..Default::default()
        };
        let optimizer = AdamW::new(varmap.all_vars(), params)?;
        
        Ok(Self { model, optimizer })
    }

    pub fn train_step(&mut self, input: &Tensor, targets: &Tensor) -> Result<f32> {
        // 1. Forward pass
        let logits = self.model.forward(input)?;
        
        // 2. Compute Loss (Cross Entropy)
        // input: [batch, seq_len], targets: [batch, seq_len]
        // logits: [batch, seq_len, vocab_size]
        let (batch, seq_len, vocab_size) = logits.dims3()?;
        let logits = logits.reshape((batch * seq_len, vocab_size))?;
        let targets = targets.reshape(batch * seq_len)?;
        
        let loss = candle_nn::loss::cross_entropy(&logits, &targets)?;
        
        // 3. Backward pass & Step
        self.optimizer.backward_step(&loss)?;
        
        loss.to_scalar::<f32>()
    }
}

// Re-importing necessary candle stuff for convenience
use candle_nn::VarBuilder;
