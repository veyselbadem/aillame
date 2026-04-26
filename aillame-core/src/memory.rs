use candle_core::{Result, Tensor, Device};
use std::collections::HashMap;

pub struct MemoryEntry {
    pub content: String,
    pub vector: Tensor,
}

pub struct AillameMemory {
    entries: Vec<MemoryEntry>,
}

impl AillameMemory {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    pub fn add(&mut self, content: String, vector: Tensor) {
        self.entries.push(MemoryEntry { content, vector });
    }

    pub fn search(&self, query_vector: &Tensor, top_k: usize) -> Result<Vec<(f32, String)>> {
        let mut results = Vec::new();

        for entry in &self.entries {
            // Cosine Similarity: (A dot B) / (||A|| * ||B||)
            // For simplicity, assuming normalized vectors or just simple dot product for now
            let dot_product = (query_vector * &entry.vector)?.sum_all()?.to_scalar::<f32>()?;
            results.push((dot_product, entry.content.clone()));
        }

        // Sort by dot product descending
        results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(results.into_iter().take(top_k).collect())
    }
}
