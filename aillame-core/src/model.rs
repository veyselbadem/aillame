use candle_core::{Result, Tensor};
use candle_nn::{LayerNorm, LayerNormConfig, Linear, Module, VarBuilder, embedding, layer_norm, linear};

pub struct TransformerBlock {
    ln1: LayerNorm,
    attn: Linear, // Simplified attention for v1
    ln2: LayerNorm,
    mlp: Vec<Linear>,
}

impl TransformerBlock {
    pub fn new(vb: VarBuilder, n_embd: usize) -> Result<Self> {
        let ln1 = layer_norm(n_embd, LayerNormConfig::default(), vb.pp("ln1"))?;
        let attn = linear(n_embd, n_embd, vb.pp("attn"))?;
        let ln2 = layer_norm(n_embd, LayerNormConfig::default(), vb.pp("ln2"))?;
        let mlp_fc = linear(n_embd, 4 * n_embd, vb.pp("mlp_fc"))?;
        let mlp_proj = linear(4 * n_embd, n_embd, vb.pp("mlp_proj"))?;
        
        Ok(Self {
            ln1,
            attn,
            ln2,
            mlp: vec![mlp_fc, mlp_proj],
        })
    }

    pub fn forward(&self, x: &Tensor) -> Result<Tensor> {
        // x: [batch, seq_len, n_embd]
        let ln1_out = self.ln1.forward(x)?;
        let x = (x + &self.attn.forward(&ln1_out)?)?;
        
        let ln2_out = self.ln2.forward(&x)?;
        let mlp_fc = self.mlp[0].forward(&ln2_out)?.relu()?;
        let mlp_out = self.mlp[1].forward(&mlp_fc)?;
        
        (&x + &mlp_out)
    }
}

pub struct AillameNano {
    wte: candle_nn::Embedding,
    blocks: Vec<TransformerBlock>,
    ln_f: LayerNorm,
    lm_head: Linear,
}

impl AillameNano {
    pub fn new(vb: VarBuilder, vocab_size: usize, n_embd: usize, n_layer: usize) -> Result<Self> {
        let wte = embedding(vocab_size, n_embd, vb.pp("wte"))?;
        let mut blocks = Vec::new();
        for i in 0..n_layer {
            blocks.push(TransformerBlock::new(vb.pp(&format!("block_{}", i)), n_embd)?);
        }
        let ln_f = layer_norm(n_embd, LayerNormConfig::default(), vb.pp("ln_f"))?;
        let lm_head = linear(n_embd, vocab_size, vb.pp("lm_head"))?;

        Ok(Self {
            wte,
            blocks,
            ln_f,
            lm_head,
        })
    }

    pub fn forward(&self, x: &Tensor) -> Result<Tensor> {
        let x = self.get_embeddings(x)?;
        self.lm_head.forward(&x)
    }

    pub fn get_embeddings(&self, x: &Tensor) -> Result<Tensor> {
        let mut x = self.wte.forward(x)?;
        for block in &self.blocks {
            x = block.forward(&x)?;
        }
        self.ln_f.forward(&x)
    }
}
