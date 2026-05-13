import { NextRequest, NextResponse } from 'next/server';
import { getAillameEngine } from '@core/engine/rust-core';

// Singleton engine instance for the API process
let engine: any = null;

function ensureEngine() {
    if (!engine) {
        engine = getAillameEngine();
        if (engine && !engine.initialized) {
            // Initializing with default small dimensions
            try {
                if (typeof engine.init_trainer === 'function') {
                    engine.init_trainer(5000, 128, 4, 0.001);
                }
                engine.initialized = true;
            } catch (e) {
                console.error('Core Init Error:', e);
            }
        }
    }
    return engine;
}

// Simple deterministic pseudo-embedding for testing RAG without a heavy model
function generatePseudoEmbedding(text: string): number[] {
    const vector = new Array(128).fill(0);
    for (let i = 0; i < text.length; i++) {
        const idx = (text.charCodeAt(i) * (i + 1)) % 128;
        vector[idx] += 0.1;
    }
    // Normalize slightly
    const length = Math.sqrt(vector.reduce((a, b) => a + b * b, 0)) || 1;
    return vector.map(v => v / length);
}

// [NANO-F2] Hash tabanlı normalize kelime vektörü
// Not: Bu gerçek semantik embedding değildir.
// Pseudo embedding'den daha iyi hafıza eşleşmesi sağlar.
function generateHashSemanticVector(text: string): number[] { // [NANO-F2]
  const VECTOR_SIZE = 128; // [NANO-F2]
  const vector = new Array(VECTOR_SIZE).fill(0); // [NANO-F2]
 // [NANO-F2]
  const TR_EN_STOPWORDS = new Set([ // [NANO-F2]
    'bir', 've', 'ile', 'bu', 'da', 'de', 'için', 'mi', 'mu', // [NANO-F2]
    'the', 'and', 'is', 'in', 'it', 'of', 'to', 'a', 'that', // [NANO-F2]
  ]); // [NANO-F2]
 // [NANO-F2]
  const words = text // [NANO-F2]
    .toLowerCase() // [NANO-F2]
    .replace(/[^\wşğüöçıİ\s]/g, '') // [NANO-F2]
    .split(/\s+/) // [NANO-F2]
    .filter(w => w.length > 2 && !TR_EN_STOPWORDS.has(w)); // [NANO-F2]
 // [NANO-F2]
  words.forEach(word => { // [NANO-F2]
    let hash = 0; // [NANO-F2]
    for (let i = 0; i < word.length; i++) { // [NANO-F2]
      hash = ((hash << 5) - hash) + word.charCodeAt(i); // [NANO-F2]
      hash |= 0; // [NANO-F2]
    } // [NANO-F2]
    const idx = Math.abs(hash) % VECTOR_SIZE; // [NANO-F2]
    vector[idx] += 1 / (words.length || 1); // [NANO-F2]
  }); // [NANO-F2]
 // [NANO-F2]
  // L2 normalizasyon // [NANO-F2]
  const magnitude = Math.sqrt( // [NANO-F2]
    vector.reduce((sum, v) => sum + v * v, 0) // [NANO-F2]
  ) || 1; // [NANO-F2]
  return vector.map(v => v / magnitude); // [NANO-F2]
} // [NANO-F2]
 // [NANO-F2]
function cosineSimilarity(a: number[], b: number[]): number { // [NANO-F2]
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0); // [NANO-F2]
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0)); // [NANO-F2]
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0)); // [NANO-F2]
  return magA && magB ? dot / (magA * magB) : 0; // [NANO-F2]
} // [NANO-F2]
 // [NANO-F2]
const MEMORY_SIMILARITY_THRESHOLD = 0.30; // [NANO-F2]

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, content, text } = body;
        const activeEngine = ensureEngine();

        if (!activeEngine) {
            return NextResponse.json({ 
                status: 'error', 
                message: 'Rust Core Bridge derlenmemiş veya yüklenemedi.' 
            }, { status: 503 });
        }

        switch (action) {
            case 'add_memory': {
                const vector = generatePseudoEmbedding(content || '');
                if (typeof activeEngine.add_to_memory === 'function') {
                    activeEngine.add_to_memory(content || '', vector);
                }
                return NextResponse.json({ status: 'ok', message: 'Hafıza çekirdeğe iletildi' });
            }
            case 'search_memory': {
                const queryVector = generateHashSemanticVector(text || content || ''); // [NANO-F2]
                const results: string[] = activeEngine.search_memory(queryVector, 10); // [NANO-F2] Increased pool for filtering
                
                // [NANO-F2] Similarity filtering
                const filteredResults = results.filter(res => { // [NANO-F2]
                    const resVector = generateHashSemanticVector(res); // [NANO-F2]
                    return cosineSimilarity(queryVector, resVector) >= MEMORY_SIMILARITY_THRESHOLD; // [NANO-F2]
                }).slice(0, 5); // [NANO-F2] Take top 5 after filter
                
                return NextResponse.json({ status: 'ok', results: filteredResults }); // [NANO-F2]
            }
            default: {
                return NextResponse.json({ status: 'ok', message: 'Aillame Rust Core aktif ve hazır' });
            }
        }
    } catch (error: any) {
        console.error('[Rust Bridge Error]', error);
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
