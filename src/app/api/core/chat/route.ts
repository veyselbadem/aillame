import { NextRequest, NextResponse } from 'next/server';
import { getSharedCore } from '@/lib/aillame-engine';
import { routeRequest } from '@/core/model-orchestration/router';

/**
 * Nano modeli bazen anlamsız karakterler üretebilir (untrained haliyle).
 * Bu fonksiyon çıktının kalitesini kontrol eder.
 */
function looksMalformedNanoText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 1) return true;
  
  const lowerText = trimmed.toLowerCase();
  // Bilinen hata mesajları veya asistanın "durduğu" durumlar
  if (lowerText.includes('işlem durduruldu') || lowerText.includes('islem durduruldu')) {
    return true;
  }

  // Karakter dağılımı kontrolü (Çok fazla sembol veya bilinmeyen karakter varsa)
  const replacementCount = (trimmed.match(/\ufffd/g) || []).length;
  if (replacementCount > 0) return true;

  // Çok kısa cevaplar (eğer selamlaşma değilse) malformed olabilir
  // Ama selamlaşmaları QuickResponseLayer halledeceği için burası daha esnek olabilir.
  const letters = (trimmed.match(/[a-zA-ZğüşöçıİĞÜŞÖÇ0-9]/g) || []).length;
  const visible = trimmed.replace(/\s/g, '').length || 1;
  
  // Harf oranı %25'in altındaysa muhtemelen çöp veridir
  return letters / visible < 0.25;
}

/**
 * Basit selamlaşmalar ve genel ifadeler için Nano'nun modelden bağımsız 
 * doğal cevaplar vermesini sağlayan kural tabanlı katman.
 */
function getQuickResponse(prompt: string): string | null {
  const p = prompt.trim().toLowerCase();
  
  if (p === 'selam' || p === 'selamlar' || p === 'slm') return 'Selam! Sana nasıl yardımcı olabilirim?';
  if (p === 'merhaba' || p === 'merhabalar' || p === 'mrb') return 'Merhaba! Ben Aillame Nano. Size nasıl yardımcı olabilirim?';
  if (p === 'nasılsın' || p === 'nasilsin' || p === 'ne haber') return 'İyiyim, teşekkür ederim. Siz nasılsınız?';
  if (p === 'kimsin' || p === 'adın ne') return 'Ben Aillame Nano, yerel cihazında çalışan hafif bir yapay zeka modeliyim.';
  if (p === 'teşekkürler' || p === 'teşekkür ederim' || p === 'sağol') return 'Rica ederim! Her zaman buradayım.';
  if (p === 'güle güle' || p === 'hoşça kal' || p === 'bay bay') return 'Görüşmek üzere! Kendinize iyi bakın.';
  
  return null;
}

function nanoFallback(prompt: string): string {
  const quick = getQuickResponse(prompt);
  if (quick) return quick;

  const safePrompt = prompt.trim();
  return safePrompt
    ? `Aillame Nano mesajınızı aldı: "${safePrompt.substring(0, 50)}${safePrompt.length > 50 ? '...' : ''}". Şu an yerel motorum bu talebi tam işleyemiyor ama gelişmeye devam ediyorum. Daha karmaşık işler için Pro modunu deneyebilirsiniz.`
    : 'Aillame Nano hazır. Size nasıl yardımcı olabilirim?';
}

export async function POST(req: NextRequest) {
    let prompt = '';
    try {
        const body = await req.json();
        prompt = typeof body?.prompt === 'string' ? body.prompt : '';
        const { maxTokens = 100, temperature = 0.8 } = body;

        if (prompt === 'PING') {
            return NextResponse.json({ status: 'ready' });
        }

        // 1. Model Orchestration Plan
        const plan = routeRequest(prompt);

        // 2. Önce hızlı cevap katmanını kontrol et
        const quickResponse = getQuickResponse(prompt);
        if (quickResponse) {
            return NextResponse.json({ 
                response: quickResponse, 
                modelId: 'aillame-nano-v1-quick',
                plan
            });
        }

        // 3. Planning-only fallback (e.g. Image Generation requested but not active)
        if (plan.executionMode === 'planning_only') {
            let planningMsg = `Aillame Nano: "${plan.intent}" talebini algıladım. `;
            if (plan.intent === 'image_generation') {
                planningMsg += "Görsel üretim modülü (SDXL) şu an hazırlık aşamasında. Çok yakında doğrudan buradan görsel oluşturabileceksiniz.";
            } else if (plan.intent === 'web_research') {
                planningMsg += "Canlı araştırma modülü (Web Search) şu an entegre ediliyor. Şimdilik yerel bilgilerimle yardımcı olabilirim.";
            } else {
                planningMsg += `${plan.selectedTarget} katmanı şu an planlama aşamasında.`;
            }
            return NextResponse.json({ 
                response: planningMsg, 
                modelId: 'aillame-nano-v1-planner',
                plan 
            });
        }

        // 4. Engine'i al
        const core = await getSharedCore();
        if (!core) {
            return NextResponse.json({ 
                response: nanoFallback(prompt), 
                modelId: 'aillame-nano-v1-fallback',
                plan
            });
        }

        const { engine, tokenizer } = core;

        // 5. Inference
        const inputIds = tokenizer.encode(prompt);
        const outputIds = engine.generate(new Uint32Array(inputIds), maxTokens, temperature);
        
        // Sadece yeni üretilen tokenları al
        const generatedIds = Array.from(outputIds).slice(inputIds.length);
        const rawResponse = tokenizer.decode(generatedIds.length > 0 ? generatedIds : outputIds);
        
        // 6. Kalite kontrolü ve Fallback
        const response = looksMalformedNanoText(rawResponse) ? nanoFallback(prompt) : rawResponse;

        return NextResponse.json({ 
            response, 
            modelId: 'aillame-nano-v1',
            plan
        });
    } catch (error: any) {
        console.error('API Chat Error:', error);
        return NextResponse.json({ 
            response: nanoFallback(prompt), 
            modelId: 'aillame-nano-v1-error' 
        });
    }
}
