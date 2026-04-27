import { NextRequest, NextResponse } from 'next/server';
import { getSharedCore } from '@/lib/aillame-engine';
import { routeRequest } from '@/core/model-orchestration/router';
import { webSearch } from '@/core/research/search';
import { summarizeResearch } from '@/core/research/summarize';
import { ProServerProvider } from '@/providers/llm/pro-server-provider';
import { generateProMultimodalResponse } from '@/core/inference/pro-multimodal';

import { 
  getQuickResponse, 
  getGeneralKnowledgeResponse, 
  looksMalformedNanoText, 
  safeFallback,
  classifyTask
} from '@/core/nano-cognitive/service';

const GENERAL_KNOWLEDGE_PROMPTS = [
  'ekonomi nedir',
  'yapay zeka nedir',
  'javascript nedir',
  'psikoloji nedir',
  'hukuk nedir',
  'enflasyon nedir',
  'arz ve talep nedir',
  'api nedir',
  'algoritma nedir',
  'web sitesi nedir',
];

async function getProAnswer(prompt: string): Promise<string | null> {
  try {
    const response = await generateProMultimodalResponse({
      prompt,
      maxTokens: 100,
      temperature: 0.7
    });
    
    if (!response || looksMalformedNanoText(response)) return null;
    return response;
  } catch (error) {
    console.error('getProAnswer error:', error);
    return null;
  }
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

        // 1. Nano Cognitive Layer - Task Classification
        const cognitivePlan = classifyTask(prompt);
        const plan = routeRequest(prompt); // Keep orchestration plan for compatibility

        // 2. Handle Social Chat / Quick Response
        if (cognitivePlan.taskType === 'social_chat') {
            const quickResponse = getQuickResponse(prompt);
            if (quickResponse) {
                return NextResponse.json({ 
                    response: quickResponse, 
                    modelId: 'aillame-nano-v1-cognitive-social',
                    plan: { ...plan, cognitivePlan }
                });
            }
        }

        // 3. Handle General Knowledge
        if (cognitivePlan.taskType === 'general_knowledge') {
            const generalKnowledge = getGeneralKnowledgeResponse(prompt);
            if (generalKnowledge) {
                const proResponse = await getProAnswer(prompt);
                if (proResponse) {
                    return NextResponse.json({
                        response: proResponse,
                        modelId: 'aillame-pro-v1',
                        plan: { ...plan, cognitivePlan }
                    });
                }
                return NextResponse.json({
                    response: generalKnowledge,
                    modelId: 'aillame-nano-v1-cognitive-gk',
                    plan: { ...plan, cognitivePlan }
                });
            }
        }

        // 4. Handle Image Generation
        if (cognitivePlan.taskType === 'image_generation' || plan.selectedTarget === 'sdxl') {
            return NextResponse.json({
                response: 'Görsel üretim modülü (SDXL) şu an sohbet içinde doğrudan desteklenmiyor. Lütfen Görsel Üretim sayfasını kullanın veya daha sonra tekrar deneyin.',
                modelId: 'aillame-nano-v1-planner',
                plan: { ...plan, cognitivePlan }
            });
        }


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

        if (plan.selectedTarget === 'web_search' || cognitivePlan.taskType === 'current_research') {
            try {
                const sources = await webSearch(prompt);
                const provider = new ProServerProvider();
                await provider.loadModel();
                let summary = await summarizeResearch(provider, sources);
                
                if (!summary || looksMalformedNanoText(summary)) {
                    // Fallback: Format sources manually
                    summary = `Araştırma tamamlandı. İşte bazı kaynaklar:\n\n` + 
                             sources.map((s, i) => `[${i+1}] ${s.title}\n${s.url}`).join('\n\n');
                } else {
                    // Nano Cognitive Commentary
                    summary = `Aillame Nano: Güncel kaynakları taradım ve şu sonuçlara ulaştım:\n\n${summary}\n\nBu bilgi konunun güncel durumunu yansıtıyor.`;
                }

                return NextResponse.json({
                    response: summary,
                    modelId: 'aillame-nano-v1-web-search',
                    plan: { ...plan, cognitivePlan }
                });
            } catch (error) {

                console.error('Web Search Error:', error);
                // Last resort fallback
                const manualSummary = `Araştırma modülünde bir sorun oluştu, ancak şu sonuçlara ulaştım:\n\n` + 
                                     prompt + " konusuyla ilgili güncel kaynakları kontrol ediyorum.";
                
                return NextResponse.json({
                    response: manualSummary,
                    modelId: 'aillame-nano-v1-web-search-fallback',
                    plan
                });
            }
        }

        // 4. Engine'i al
        const requestedCheckpoint = req.headers.get('x-aillame-checkpoint') || undefined;
        const core = await getSharedCore(requestedCheckpoint);
        if (!core) {
            return NextResponse.json({ 
                response: safeFallback(prompt), 
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
        const response = looksMalformedNanoText(rawResponse) ? safeFallback(prompt) : rawResponse;

        return NextResponse.json({ 
            response, 
            modelId: 'aillame-nano-v1',
            plan
        });
    } catch (error: any) {
        console.error('API Chat Error:', error);
        return NextResponse.json({ 
            response: safeFallback(prompt), 
            modelId: 'aillame-nano-v1-error' 
        });
    }
}
