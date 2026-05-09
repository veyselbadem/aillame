import { NextRequest, NextResponse } from 'next/server';
import { getSharedCore } from '@/lib/aillame-engine';
import { routeRequest } from '@/core/model-orchestration/router';
import { webSearch } from '@/core/research/search';
import { summarizeResearch } from '@/core/research/summarize';
import {
  buildConversationAnswer,
    classifyIntentWithConfidence,
  detectUserIntent,
  enrichPromptForConversation,
  getRecommendedMaxTokens,
  improveAssistantAnswer,
  normalizeAssistantAnswer,
} from '@/core/conversation/conversation-quality';
import { 
  getQuickResponse, 
  getGeneralKnowledgeResponse, 
  looksMalformedNanoText, 
  safeFallback,
  classifyTask
} from '@/core/nano-cognitive/service';
import { imageGenerationService } from '@/core/runtime/image/image-generation-service';

function buildRuntimeAttribution(input: {
    provider: string;
    modelId: string;
    runtime: string;
    fallbackUsed?: boolean;
    degraded?: boolean;
    reason?: string;
}) {
    return {
        provider: input.provider,
        modelId: input.modelId,
        runtime: input.runtime,
        fallbackUsed: Boolean(input.fallbackUsed),
        degraded: Boolean(input.degraded),
        reason: input.reason || null
    };
}

function chatJson(payload: Record<string, any>, attribution: ReturnType<typeof buildRuntimeAttribution>) {
    return NextResponse.json({
        ...payload,
        provider: attribution.provider,
        runtime: attribution.runtime,
        fallbackUsed: attribution.fallbackUsed,
        degraded: attribution.degraded,
        runtimeAttribution: attribution
    });
}

const QUALITY_GUARD_PATTERNS = [
    'yanıtı tamamlayamadı',
    'daha kısa bir mesajla tekrar deneyin',
    'konuyu önce sadeleştireyim',
    'amacımız neyi anlamak',
    'hazırlıyorum',
    'sağlayabilirim',
    'daraltabilirsin'
];

function hasGuardPhrase(value?: string): boolean {
    const text = String(value || '').toLocaleLowerCase('tr-TR');
    return QUALITY_GUARD_PATTERNS.some((pattern) => text.includes(pattern));
}

function isExplicitIntent(intent?: string): boolean {
    return intent === 'image_generation' || intent === 'general_knowledge' || intent === 'coding_help';
}

function buildExplicitIntentGuardResponse(prompt: string, messages: any[], intent?: string): string {
    if (intent === 'image_generation') {
        return improveAssistantAnswer(prompt, 'Görsel üretim isteğini algıladım. İsteği IGM/SDXL modülüne yönlendiriyorum; üretim durumunu iş kaydı üzerinden takip edebilirsin.', messages);
    }
    if (intent === 'general_knowledge') {
        const gk = getGeneralKnowledgeResponse(prompt) || buildConversationAnswer(prompt, messages);
        return improveAssistantAnswer(prompt, gk || 'Bu konuyu doğrudan açıklayayım: temel tanımı, ana kullanım alanlarını ve kısa bir örneğini paylaşabilirim.', messages);
    }
    if (intent === 'coding_help') {
        const coding = buildConversationAnswer(prompt, messages) || 'Bu kod isteğini adım adım çözelim: önce problemi netleyelim, sonra çalışan örnek kod ve kısa açıklama ile ilerleyelim.';
        return improveAssistantAnswer(prompt, coding, messages);
    }
    return improveAssistantAnswer(prompt, safeFallback(prompt, messages), messages);
}




export async function POST(req: NextRequest) {
    let prompt = '';
    let messages: any[] = [];
    try {
        const body = await req.json();
        prompt = typeof body?.prompt === 'string' ? body.prompt : '';
        messages = Array.isArray(body?.messages) ? body.messages : [];
        const requestedMaxTokens = typeof body?.maxTokens === 'number' ? body.maxTokens : 100;
        const { temperature = 0.8 } = body;

        // If prompt is empty but messages exist, use the last user message
        if (!prompt && messages.length > 0) {
            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
            if (lastUserMsg) {
                prompt = lastUserMsg.content;
            }
        }

        if (prompt === 'PING') {
            return NextResponse.json({ status: 'ready' });
        }

        // 1. Nano Cognitive Layer - Task Classification
        const cognitivePlan = classifyTask(prompt);
        const intentMeta = cognitivePlan.intentMeta || classifyIntentWithConfidence(prompt);
        const taskScore = cognitivePlan.taskScore || { complexity: 0, research: 0, code: 0, creative: 0 };
        const plan = routeRequest(prompt); // Keep orchestration plan for compatibility
        const conversationIntent = detectUserIntent(prompt);
        const maxTokens = Math.max(requestedMaxTokens, getRecommendedMaxTokens(conversationIntent));
        const directConversationAnswer = buildConversationAnswer(prompt, messages);
        const shouldUseLiveResearch = conversationIntent === 'research_summary' && /güncel|haber|son dakika|bugünkü|araştır/i.test(prompt);

        if (directConversationAnswer && !shouldUseLiveResearch) {
            const modelId = `aillame-nano-v1-quality-${conversationIntent}`;
            const guarded = isExplicitIntent(intentMeta.intent) && hasGuardPhrase(directConversationAnswer)
                ? buildExplicitIntentGuardResponse(prompt, messages, intentMeta.intent)
                : normalizeAssistantAnswer(directConversationAnswer);
            return chatJson({
                response: guarded,
                modelId,
                plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
            }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'nano-quality-direct' }));
        }

        // 2. Handle Social Chat / Quick Response
        if (cognitivePlan.taskType === 'social_chat') {
            const quickResponse = getQuickResponse(prompt, messages);
            if (quickResponse) {
                const modelId = 'aillame-nano-v1-cognitive-social';
                return chatJson({
                    response: normalizeAssistantAnswer(quickResponse), 
                    modelId,
                    plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
                }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'nano-cognitive-social' }));
            }
        }

        // 3. Handle General Knowledge
        if (cognitivePlan.taskType === 'general_knowledge') {
            const generalKnowledge = getGeneralKnowledgeResponse(prompt);
            if (generalKnowledge) {
                // Return local General Knowledge immediately for performance
                const modelId = 'aillame-nano-v1-cognitive-gk';
                return chatJson({
                    response: improveAssistantAnswer(prompt, generalKnowledge, messages),
                    modelId,
                    plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
                }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'nano-cognitive-general-knowledge' }));
            }
        }

        // 4. Handle Image Generation
        if (cognitivePlan.taskType === 'image_generation' || plan.selectedTarget === 'sdxl') {
            try {
                // Extract clean prompt for image generation
                const imagePrompt = prompt
                    .replace(/bana|oluşturur musun|yapar mısın|çiz|üret|bir|tane|olsun/gi, '')
                    .trim();
                
                const result = await imageGenerationService.createJob({
                    projectId: 'default-chat',
                    sourceApp: 'aillame-chat',
                    prompt: imagePrompt || prompt,
                    modelId: process.env.AILLAME_IGM_ACTIVE_MODEL || 'sdxl-base-1.0'
                });

                if (result.success) {
                    const modelId = 'aillame-nano-v1-igm-handoff';
                    return chatJson({
                        response: improveAssistantAnswer(prompt, `Görsel üretim isteğini aldım. "${imagePrompt || prompt}" betimlemesiyle üretimi başlattım (İş No: ${result.jobId}). Sonuç hazır olduğunda Görsel Üretim panelinden veya buradan takip edebilirsin.`, messages),
                        modelId,
                        plan: { ...plan, cognitivePlan, conversationIntent, intentMeta },
                        imageJobId: result.jobId
                    }, buildRuntimeAttribution({ provider: 'aillame-igm', modelId, runtime: 'igm-image-generation-service' }));
                } else {
                    const modelId = 'aillame-nano-v1-igm-error';
                    return chatJson({
                        response: improveAssistantAnswer(prompt, `Görsel üretim şu an başlatılamadı: ${result.warning || 'Bilinmeyen hata'}. Lütfen daha sonra tekrar deneyin.`, messages),
                        modelId,
                        plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
                    }, buildRuntimeAttribution({ provider: 'aillame-igm', modelId, runtime: 'igm-image-generation-service', fallbackUsed: true, degraded: true, reason: result.warning || 'image_job_create_failed' }));
                }
            } catch (error: any) {
                console.error('Image Handoff Error:', error);
                const modelId = 'aillame-nano-v1-igm-exception';
                return chatJson({
                    response: improveAssistantAnswer(prompt, `Görsel üretim modülüne yönlendirme sırasında bir hata oluştu. Lütfen Görsel Üretim sayfasını kullanın.`, messages),
                    modelId,
                    plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
                }, buildRuntimeAttribution({ provider: 'aillame-igm', modelId, runtime: 'igm-image-generation-service', fallbackUsed: true, degraded: true, reason: error?.message || 'image_exception' }));
            }
        }

        if (cognitivePlan.taskType === 'agent_task' || plan.selectedTarget === 'code_agent') {
            const modelId = 'aillame-nano-v1-agent-handoff';
            return chatJson({
                response: improveAssistantAnswer(prompt, 'Bu isteği bir ajan görevi olarak algıladım. Güvenli şekilde Code Agent hattına yönlendiriyorum; dosya ve patch adımlarını sırayla uygulayacağım.', messages),
                modelId,
                plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
            }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'nano-agent-handoff' }));
        }


        if (plan.executionMode === 'planning_only') {
            if (intentMeta.intent === 'coding_help') {
                const modelId = 'aillame-nano-v1-coding-fallback';
                const fallbackCoding = buildExplicitIntentGuardResponse(prompt, messages, 'coding_help');
                return chatJson({
                    response: fallbackCoding,
                    modelId,
                    plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
                }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'nano-coding-fallback' }));
            }

            let planningMsg = `Aillame Nano: "${plan.intent}" talebini algıladım. `;
            if (plan.intent === 'image_generation') {
                planningMsg += "Görsel üretim modülü (SDXL) şu an hazırlık aşamasında. Çok yakında doğrudan buradan görsel oluşturabileceksiniz.";
            } else if (plan.intent === 'web_research') {
                planningMsg += "Canlı araştırma modülü (Web Search) şu an entegre ediliyor. Şimdilik yerel bilgilerimle yardımcı olabilirim.";
            } else if (plan.intent === 'agent_task') {
                planningMsg += 'Bu görev Code Agent akışına yönlendirildi. İstersen dosya hedefini belirterek devam edebilirsin.';
            } else {
                planningMsg += `${plan.selectedTarget} katmanı şu an planlama aşamasında.`;
            }
            const modelId = 'aillame-nano-v1-planner';
            return chatJson({
                response: improveAssistantAnswer(prompt, planningMsg, messages), 
                modelId,
                plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
            }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'nano-planner', fallbackUsed: true, degraded: true, reason: 'planning_only' }));
        }

        if (plan.selectedTarget === 'web_search' || cognitivePlan.taskType === 'current_research') {
            try {
                const sources = await webSearch(prompt);
                
                let summary = '';
                const isOllamaEnabled = process.env.AILLAME_OLLAMA_ENABLED !== 'false';
                
                if (isOllamaEnabled) {
                    const context = sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.snippet}`).join('\n');
                    const ollamaPrompt = `Aşağıdaki güncel web sonuçlarını kullanarak "${prompt}" konusunu Türkçe olarak özetle:\n\n${context}`;
                    try {
                        const { generateOllamaResponse } = await import('@/core/inference/ollama');
                        summary = await generateOllamaResponse({ prompt: ollamaPrompt, maxTokens: 300, temperature: 0.6 });
                    } catch (e) {
                        console.warn('Ollama search summarize timeout/error', e);
                    }
                }
                
                if (!summary) {
                    // Fallback: Skip heavy Qwen cold-start, format manually
                    summary = `Araştırma tamamlandı. İşte bazı kaynaklar:\n\n` + 
                             sources.map((s, i) => `[${i+1}] ${s.title}\n${s.url}`).join('\n\n');
                }
                
                if (summary && !looksMalformedNanoText(summary)) {
                    // Nano Cognitive Commentary
                    summary = `Aillame Nano: Güncel kaynakları taradım ve şu sonuçlara ulaştım:\n\n${summary}\n\nBu bilgi konunun güncel durumunu yansıtıyor.`;
                }

                const modelId = 'aillame-nano-v1-web-search';
                return chatJson({
                    response: improveAssistantAnswer(prompt, summary, messages),
                    modelId,
                    plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
                }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'web-search-summary' }));
            } catch (error) {

                console.error('Web Search Error:', error);
                // Last resort fallback
                const manualSummary = `Araştırma modülünde bir sorun oluştu, ancak şu sonuçlara ulaştım:\n\n` + 
                                     prompt + " konusuyla ilgili güncel kaynakları kontrol ediyorum.";
                
                const modelId = 'aillame-nano-v1-web-search-fallback';
                return chatJson({
                    response: improveAssistantAnswer(prompt, manualSummary, messages),
                    modelId,
                    plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
                }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'web-search-summary', fallbackUsed: true, degraded: true, reason: 'web_search_error' }));
            }
        }

        // 4. Engine'i al
        const requestedCheckpoint = req.headers.get('x-aillame-checkpoint') || undefined;
        const requestedVersion = requestedCheckpoint === 'v1' || requestedCheckpoint === 'v2'
            ? requestedCheckpoint
            : undefined;
        const core = await getSharedCore(requestedVersion);
        if (!core) {
            const fallback = isExplicitIntent(intentMeta.intent)
                ? buildExplicitIntentGuardResponse(prompt, messages, intentMeta.intent)
                : safeFallback(prompt, messages);
            const modelId = 'aillame-nano-v1-fallback';
            return chatJson({
                response: improveAssistantAnswer(prompt, fallback, messages), 
                modelId,
                plan: { ...plan, cognitivePlan, conversationIntent, intentMeta }
            }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'nano-safe-fallback', fallbackUsed: true, degraded: true, reason: 'core_unavailable' }));
        }

        const { engine, tokenizer } = core;

        // 5. Inference (Version Controlled)
        const { inferWithVersionControl } = await import('@/core/nano-cognitive/service');
        
        const enrichedPrompt = enrichPromptForConversation(prompt, messages);
        const { response: rawResponse, modelId } = await inferWithVersionControl(
            enrichedPrompt,
            taskScore,
            maxTokens,
            temperature
        );
        
        // 6. Kalite kontrolü ve Fallback
        const rawImproved = looksMalformedNanoText(rawResponse)
            ? improveAssistantAnswer(prompt, safeFallback(prompt, messages), messages)
            : improveAssistantAnswer(prompt, rawResponse, messages);

        const response = isExplicitIntent(intentMeta.intent) && hasGuardPhrase(rawImproved)
            ? buildExplicitIntentGuardResponse(prompt, messages, intentMeta.intent)
            : rawImproved;

        return chatJson({
            response, 
            modelId,
            plan: { ...plan, cognitivePlan, conversationIntent, taskScore, intentMeta }
        }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'nano-versioned-inference', fallbackUsed: looksMalformedNanoText(rawResponse), degraded: looksMalformedNanoText(rawResponse), reason: looksMalformedNanoText(rawResponse) ? 'malformed_nano_text' : undefined }));
    } catch (error: any) {
        console.error('API Chat Error:', error);
        const intentMeta = classifyIntentWithConfidence(prompt);
        const fallback = isExplicitIntent(intentMeta.intent)
            ? buildExplicitIntentGuardResponse(prompt, messages, intentMeta.intent)
            : safeFallback(prompt, messages);
        const modelId = 'aillame-nano-v1-error';
        return chatJson({
            response: improveAssistantAnswer(prompt, fallback, messages), 
            modelId
        }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId, runtime: 'nano-error-fallback', fallbackUsed: true, degraded: true, reason: error?.message || 'chat_route_error' }));
    }
}
