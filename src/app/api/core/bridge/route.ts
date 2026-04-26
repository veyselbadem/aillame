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
                engine.init_trainer(5000, 128, 4, 0.001);
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
                activeEngine.add_to_memory(content || '', vector);
                return NextResponse.json({ status: 'ok', message: 'Hafıza Rust çekirdeğine eklendi' });
            }
            case 'search_memory': {
                const queryVector = generatePseudoEmbedding(text || content || '');
                const results = activeEngine.search_memory(queryVector, 5);
                return NextResponse.json({ status: 'ok', results });
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
