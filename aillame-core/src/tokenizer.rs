use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct AillameTokenizer {
    pub chars: Vec<char>,
    pub stoi: HashMap<char, usize>,
    pub itos: HashMap<usize, char>,
    pub vocab_size: usize,
}

impl AillameTokenizer {
    pub fn new() -> Self {
        Self {
            chars: Vec::new(),
            stoi: HashMap::new(),
            itos: HashMap::new(),
            vocab_size: 0,
        }
    }

    pub fn train(&mut self, text: &str) {
        let mut unique_chars: Vec<char> = text.chars().collect();
        unique_chars.sort();
        unique_chars.dedup();
        
        self.chars = unique_chars.clone();
        self.vocab_size = unique_chars.len();
        
        self.stoi.clear();
        self.itos.clear();
        
        for (i, &c) in unique_chars.iter().enumerate() {
            self.stoi.insert(c, i);
            self.itos.insert(i, c);
        }
    }

    pub fn encode(&self, text: &str) -> Vec<u32> {
        text.chars()
            .map(|c| *self.stoi.get(&c).unwrap_or(&0) as u32)
            .collect()
    }

    pub fn decode(&self, tokens: &[u32]) -> String {
        tokens.iter()
            .map(|&t| *self.itos.get(&(t as usize)).unwrap_or(&' '))
            .collect()
    }
}
