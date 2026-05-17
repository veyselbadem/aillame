import { NextRequest, NextResponse } from 'next/server';
import { VlmInferenceAdapter } from '@core/nano/vision/vlm-inference-adapter';
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
  analyzeComplexity,
} from '@/core/conversation/conversation-quality';
import { 
  getQuickResponse, 
  getGeneralKnowledgeResponse, 
  looksMalformedNanoText, 
  safeFallback,
  classifyTask,
  routeCognitiveRequest
} from '@/core/nano-cognitive/service';
import { imageGenerationService } from '@/core/runtime/image/image-generation-service';
import { getActiveChatModelId, getActiveImageModelId } from '@core/model-management/active-model-store';
import { MODEL_REGISTRY } from '@core/models/registry';

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

        // --- Multimodal vision interceptor (UI-internal, no external API key required) ---
        if (body?.multimodal && body?.imageBase64) {
            const visionPrompt = (typeof body.prompt === 'string' && body.prompt.trim())
                ? body.prompt.trim()
                : 'Bu görseli kısaca açıkla.';
            const startMs = Date.now();
            try {
                const visionResult = await VlmInferenceAdapter.analyzeImage({
                    modelId: 'qwen3-vl-4b-instruct-q4-k-m',
                    image: body.imageBase64,
                    prompt: visionPrompt,
                    maxTokens: 256
                });
                const durationMs = Date.now() - startMs;
                if (!visionResult.success) {
                    return NextResponse.json({
                        response: 'Görsel işlenirken bir hata oluştu: ' + (visionResult.message || 'Bilinmeyen hata'),
                        model: 'qwen3-vl-4b-instruct-q4-k-m',
                        meta: { durationMs },
                        degraded: true
                    });
                }
                return NextResponse.json({
                    response: visionResult.text,
                    model: 'qwen3-vl-4b-instruct-q4-k-m',
                    meta: { durationMs },
                    executionMode: 'vision_inference'
                });
            } catch (visionErr: any) {
                return NextResponse.json({
                    response: 'Beklenmeyen bir hata oluştu: ' + (visionErr?.message || 'hata'),
                    model: 'qwen3-vl-4b-instruct-q4-k-m',
                    meta: { durationMs: Date.now() - startMs },
                    degraded: true
                });
            }
        }
        // --- End multimodal interceptor ---

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

        // --- Central Safety Shield (Hassas ve Tehlikeli İstek Engelleyici) ---
        const blockKeywords = [
            'env', '.env', 'dotenv', 'shifre', 'şifre', 'parola', 'password', 'token', 'api_key', 'apikey', 'secret',
            'format', 'delete', 'rm -rf', 'rmdir', 'del ', 'cmd', 'powershell', 'shell', 'bash', 'run ', 'exec',
            'sudo ', 'runas', 'administrators', 'system32', 'registry', 'regedit'
        ];
        const pLower = prompt.toLowerCase();
        const isExploitDistill = pLower.includes('dataset') || pLower.includes('veri seti') || pLower.includes('öğrenme verisi') || pLower.includes('eğitim verisi');
        const containsBlock = blockKeywords.some(keyword => pLower.includes(keyword)) || 
                             pLower.includes('komut çalıştır') || 
                             pLower.includes('dosya sil') ||
                             (isExploitDistill && (pLower.includes('token') || pLower.includes('env') || pLower.includes('şifre') || pLower.includes('sır') || pLower.includes('secret')));
        
        if (containsBlock) {
            const rejectionMsg = `**Bu işlem güvenlik nedeniyle engellendi.**\n\nAillame Nano, yerel sistem güvenliği gereği serbest komut (shell/PowerShell/CMD) çalıştırma, gizli dosya okuma veya token/şifre gösterme işlemlerini desteklemez.\n\n**Güvenli alternatif:** Sisteminizin sağlığını (\`system.health\`) veya aktif yerel modellerin durumunu (\`models.status\`) kontrol etmemi isteyebilirsiniz.`;
            return chatJson({
                response: rejectionMsg,
                modelId: 'aillame-nano-v1-tool-blocked',
                plan: {}
            }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId: 'aillame-nano-v1-tool-blocked', runtime: 'nano-tool-security-guard' }));
        }
        // --- End Safety Shield ---

        // --- Aillame Nano Cognitive Router (Phase 5) ---
        const hasAttachment = Boolean(body?.multimodal && body?.imageBase64);
        const cognitiveRoute = routeCognitiveRequest(prompt, hasAttachment);
        console.log(`[CognitiveRouter] Intent: ${cognitiveRoute.intent}, Target: ${cognitiveRoute.target}, Confidence: ${cognitiveRoute.confidence}`);

        // Health Check router decision
        if (cognitiveRoute.intent === 'health_check') {
            const healthResponse = `**Aillame Nano Görev Yönlendirici (Teşhis/Sağlık Kontrolü):**
Sistem teşhis ve sağlık testi talebi başarıyla algılandı ve **Nano Lab** yönetim katmanına yönlendirildi.

**Mevcut Sistem Durumu Özeti:**
*   **Ana Çekirdek (Aillame Nano):** Çevrimdışı/Yerel motor çalışıyor, niyet anlama ve görev yönlendirme kararlı.
*   **Göz (Qwen3-VL 4B Nano Vision):** Kurulu ve multimodal analize hazır (C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\).
*   **Görsel Üretici (SDXL Turbo):** Güvenli Çalışma Zamanı (SafeRuntime) ve GPU Kilit (GpuHeavyLock) korumalı olarak devrede.

*Gerçek bir performans testi veya sağlık taraması gerçekleştirmek için lütfen üst menüden **Nano Lab** panelini açın veya doğrudan **Vision Health** ya da **Mini Görsel Anlama Testi** kartlarındaki test butonlarını kullanın.*`;

            return chatJson({
                response: healthResponse,
                modelId: 'aillame-nano-v1-router-health',
                plan: { cognitiveRoute }
            }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId: 'aillame-nano-v1-router-health', runtime: 'nano-cognitive-router' }));
        }

        // --- Aillame Nano Safe Local Tool Execution Interceptor ---
        if (cognitiveRoute.intent === 'tool_use' && cognitiveRoute.selectedToolId) {
            const toolId = cognitiveRoute.selectedToolId;
            console.log(`[CognitiveRouter] Intercepting chat request for safe tool-use: ${toolId}`);
            
            // 1. Securely check for malicious/dangerous keywords before launching tool
            const blockKeywords = [
                'env', '.env', 'dotenv', 'shifre', 'şifre', 'parola', 'password', 'token', 'api_key', 'apikey', 'secret',
                'format', 'delete', 'rm -rf', 'rmdir', 'del ', 'cmd', 'powershell', 'shell', 'bash', 'run ', 'exec',
                'sudo ', 'runas', 'administrators', 'system32', 'registry', 'regedit'
            ];
            const pLower = prompt.toLowerCase();
            const containsBlock = blockKeywords.some(keyword => pLower.includes(keyword));
            
            if (containsBlock || pLower.includes('komut çalıştır') || pLower.includes('dosya sil')) {
                const rejectionMsg = `**Bu işlem güvenlik nedeniyle engellendi.**\n\nAillame Nano, yerel sistem güvenliği gereği serbest komut (shell/PowerShell/CMD) çalıştırma, gizli dosya okuma veya token/şifre gösterme işlemlerini desteklemez.\n\n**Güvenli alternatif:** Sisteminizin sağlığını (\`system.health\`) veya aktif yerel modellerin durumunu (\`models.status\`) kontrol etmemi isteyebilirsiniz.`;
                return chatJson({
                    response: rejectionMsg,
                    modelId: 'aillame-nano-v1-tool-blocked',
                    plan: { cognitiveRoute }
                }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId: 'aillame-nano-v1-tool-blocked', runtime: 'nano-tool-security-guard' }));
            }

            // 2. Prepare safe input arguments
            let toolInput: any = {};
            if (toolId === 'memory.search') {
                // Extract clean search query
                const cleanQuery = prompt
                    .replace(/hafızamda|hafızada|ara|bul|sorgula|ile ilgili|hakkında|ne var/gi, '')
                    .trim();
                toolInput = { query: cleanQuery || prompt };
            } else if (toolId === 'project.search') {
                const cleanQuery = prompt
                    .replace(/projelerimde|projelerimde|projesini|projesinde|ara|bul|sorgula|ile ilgili|hakkında|ne var/gi, '')
                    .trim();
                toolInput = { query: cleanQuery || prompt };
            }

            // 3. Execute tool via central safe executor
            const { AillameToolExecutor } = await import('@core/tools/tool-executor');
            const toolResult = await AillameToolExecutor.executeTool(toolId, toolInput);

            // 4. Build natural Turkish commentary summarizing the results
            let responseText = '';
            if (toolResult.ok) {
                if (toolId === 'memory.search') {
                    const records = toolResult.data || [];
                    if (records.length === 0) {
                        responseText = `Yerel hafızanızda aradığınız konuyla ilgili herhangi bir kayıt bulunamadı.`;
                    } else {
                        responseText = `**Aillame Nano Yerel Hafıza Sorgusu Başarılı:**\n`;
                        responseText += `Yerel hafızanızda arama sorgunuza uygun **${records.length}** adet kayıt bulundu:\n\n`;
                        records.forEach((rec: any, idx: number) => {
                            responseText += `${idx + 1}. **[${rec.type === 'preference' ? 'Tercih' : 'Not'}]** ${rec.content} *(Etiketler: ${rec.tags.join(', ')})*\n`;
                        });
                    }
                } else if (toolId === 'memory.list') {
                    const records = toolResult.data || [];
                    if (records.length === 0) {
                        responseText = `Yerel hafızanızda henüz kayıtlı herhangi bir bilgi bulunmuyor.`;
                    } else {
                        responseText = `**Aillame Nano Yerel Hafıza Listesi:**\n`;
                        responseText += `Yerel hafızanızda toplam **${records.length}** adet kayıtlı tercih/not listelendi:\n\n`;
                        records.forEach((rec: any, idx: number) => {
                            responseText += `${idx + 1}. **[${rec.type === 'preference' ? 'Tercih' : 'Not'}]** ${rec.content} *(Etiketler: ${rec.tags.join(', ')})*\n`;
                        });
                    }
                } else if (toolId === 'system.health') {
                    const data = toolResult.data || {};
                    responseText = `**Aillame Nano Sistem Sağlığı Raporu:**\n\n`;
                    responseText += `*   **GPU Heavy Lock Durumu:** ${data.gpuHeavyLock === 'locked' ? '🔴 Dolu (İşlem Çalışıyor)' : '🟢 Boş (Kullanılabilir)'}\n`;
                    if (data.gpuHeavyLockOwner) {
                        responseText += `*   **GPU Kilidini Tutan İşlem:** \`${data.gpuHeavyLockOwner}\`\n`;
                    }
                    responseText += `*   **İşletim Sistemi Platformu:** \`${data.platform}\`\n`;
                    responseText += `*   **NodeJS Sürümü:** \`${data.nodeVersion}\`\n`;
                    responseText += `*   **Genel Sistem Durumu:** 🟢 Sağlıklı\n\n`;
                    responseText += `*${toolResult.message}*`;
                } else if (toolId === 'models.status') {
                    const models = toolResult.data || {};
                    responseText = `**Yerel Yapay Zeka Model Hazır Olma Raporu:**\n\n`;
                    
                    const mList = Object.values(models) as any[];
                    mList.forEach((m: any) => {
                        let statusEmoji = '⚪';
                        if (m.status === 'active') statusEmoji = '🟢';
                        else if (m.status === 'inactive') statusEmoji = '🟡';
                        else if (m.status === 'removed') statusEmoji = '🔴';
                        
                        responseText += `*   ${statusEmoji} **${m.name}** (${m.id}): ${m.status === 'active' ? 'Aktif / Hazır' : m.status === 'removed' ? 'Sistemden Kaldırıldı' : 'Yüklü Değil / İnaktif'}\n`;
                        if (m.message) {
                            responseText += `    *Açıklama: ${m.message}*\n`;
                        }
                    });
                } else if (toolId === 'project.docs') {
                    const docs = toolResult.data || [];
                    responseText = `**Yerel AI Mimari Dokümanları Kontrol Raporu:**\n\n`;
                    docs.forEach((doc: any) => {
                        responseText += `*   ${doc.exists ? '🟢' : '🔴'} **${doc.name}** (\`${doc.id}\`): ${doc.exists ? 'Mevcut' : 'Bulunamadı'}\n`;
                        if (doc.exists) {
                            responseText += `    *Boyut:* ${(doc.sizeBytes / 1024).toFixed(2)} KB\n`;
                            responseText += `    *Başlık/Özet:* _${doc.summary.split('\n')[0].replace('#', '').trim()}_\n`;
                        }
                    });
                } else if (toolId === 'project.list') {
                    const list = toolResult.data || [];
                    if (list.length === 0) {
                        responseText = `Aillame üzerinde kayıtlı herhangi bir proje bağlamı bulunmuyor.`;
                    } else {
                        responseText = `**Kayıtlı Aillame Proje Bağlamları:**\n\n`;
                        list.forEach((p: any, idx: number) => {
                            responseText += `${idx + 1}. 📁 **${p.name}** (\`${p.id}\` - Kategori: ${p.category})\n`;
                            if (p.description) responseText += `   *Açıklama:* ${p.description}\n`;
                            if (p.goals && p.goals.length > 0) responseText += `   *Hedefler:* ${p.goals.join(', ')}\n`;
                        });
                    }
                } else if (toolId === 'project.active') {
                    const active = toolResult.data;
                    if (!active) {
                        responseText = `Şu anda aktif bir Aillame proje bağlamı seçilmemiş.`;
                    } else {
                        responseText = `**Aktif Aillame Proje Bağlamı:**\n\n`;
                        responseText += `*   **Adı:** 📁 **${active.name}** (\`${active.id}\`)\n`;
                        if (active.description) responseText += `*   **Açıklama:** ${active.description}\n`;
                        responseText += `*   **Kategori:** \`${active.category}\`\n`;
                        if (active.tone) responseText += `*   **Ton / Üslup:** \`${active.tone}\`\n`;
                        if (active.language) responseText += `*   **Dil:** \`${active.language.toUpperCase()}\`\n`;
                        if (active.seoPreferences?.enabled) {
                            responseText += `*   **SEO Tercihleri:** Etkin (Min ${active.seoPreferences.minWords || 300} kelime)\n`;
                        }
                    }
                } else if (toolId === 'project.search') {
                    const list = toolResult.data || [];
                    if (list.length === 0) {
                        responseText = `Arama sorgunuza uyan herhangi bir proje bağlamı bulunamadı.`;
                    } else {
                        responseText = `**Proje Arama Sonuçları:**\n\n`;
                        list.forEach((p: any, idx: number) => {
                            responseText += `${idx + 1}. 📁 **${p.name}** (\`${p.id}\` - Kategori: ${p.category})\n`;
                            if (p.description) responseText += `   *Açıklama:* ${p.description}\n`;
                        });
                    }
                }
            } else {
                responseText = `**Araç Çalıştırma Hatası:** ${toolResult.errors?.join(', ') || 'Bilinmeyen bir hata oluştu.'}`;
            }

            return chatJson({
                response: responseText,
                modelId: `aillame-nano-v1-tool-${toolId}`,
                plan: { cognitiveRoute },
                meta: {
                    toolExecuted: toolId,
                    riskLevel: toolResult.riskLevel,
                    toolOk: toolResult.ok
                }
            }, buildRuntimeAttribution({ 
                provider: 'aillame-nano', 
                modelId: `aillame-nano-v1-tool-${toolId}`, 
                runtime: 'nano-cognitive-tool-executor' 
            }));
        }
        // --- End tool execution interceptor ---

        // Clarification query for ambiguous inputs
        if (cognitiveRoute.shouldAskClarifyingQuestion) {
            const clarifyResponse = `Merhaba! Ben Aillame Nano, yerel asistanınız ve yönlendiriciniz. Talebinizi tam olarak anlayamadım veya bağlam çok belirsiz kaldı. 

Size en doğru yerel uzman modelimizle yardımcı olabilmem için lütfen isteğinizi biraz daha detaylandırabilir misiniz?
*   **Sohbet veya Bilgi:** Normal bir soru sorabilir veya konuyu açıklamamı isteyebilirsiniz (örn. *"Bana kısa bir özet çıkar"*).
*   **Görsel Analiz:** Ekranın sol altındaki buton veya sürükle-bırak ile bir görsel ekleyip soru sorabilirsiniz.
*   **Görsel Üretim:** *"Bana fütüristik bir şehir görseli üret"* gibi net bir görsel üretim komutu verebilirsiniz.`;

            return chatJson({
                response: clarifyResponse,
                modelId: 'aillame-nano-v1-router-clarify',
                plan: { cognitiveRoute }
            }, buildRuntimeAttribution({ provider: 'aillame-nano', modelId: 'aillame-nano-v1-router-clarify', runtime: 'nano-cognitive-router' }));
        }

        // 0. Active model override — if user selected an Ollama model, route ALL chat there
        const activeChatModelId = getActiveChatModelId();
        const activeRegistryModel = activeChatModelId ? MODEL_REGISTRY[activeChatModelId] : null;
        const isActiveOllama = activeRegistryModel
            ? activeRegistryModel.runtime === 'ollama'
            : typeof activeChatModelId === 'string' && activeChatModelId.startsWith('ollama-');

        if (activeChatModelId && isActiveOllama) {
            try {
                const { generateOllamaResponse } = await import('@/core/inference/ollama');
                const ollamaModelName = activeRegistryModel?.externalModelId
                    || (activeChatModelId.startsWith('ollama-') ? activeChatModelId.slice(7) : activeChatModelId);
                const ollamaAnswer = await generateOllamaResponse({
                    prompt,
                    messages,
                    maxTokens: typeof body?.maxTokens === 'number' ? body.maxTokens : 512,
                    temperature: body.temperature ?? 0.8,
                    model: ollamaModelName,
                });
                return NextResponse.json({
                    response: ollamaAnswer,
                    modelId: activeChatModelId,
                    provider: 'ollama',
                    runtime: 'ollama',
                    activeModelId: activeChatModelId,
                    fallbackUsed: false,
                    degraded: false,
                    runtimeAttribution: { provider: 'ollama', modelId: activeChatModelId, runtime: 'ollama', fallbackUsed: false, degraded: false, reason: null },
                });
            } catch (ollamaError: any) {
                console.warn('[chat] Active Ollama model failed, falling back to Nano:', ollamaError?.message);
                // Fall through to Nano pipeline
            }
        }

        // 0.5. Complexity Analysis & Dynamic Routing Intelligence [PHASE 2]
        const { score: complexityScore, suggestedTier } = analyzeComplexity(prompt);
        console.log(`[CognitiveRouter] Complexity: ${complexityScore}, Suggested Tier: ${suggestedTier}`);

        // If high complexity and Ollama is available, prefer Gemma [PHASE 2]
        if (suggestedTier === 'gemma-heavy' && !activeChatModelId) {
            try {
                const { generateOllamaResponse } = await import('@/core/inference/ollama');
                const gemmaAnswer = await generateOllamaResponse({
                    prompt,
                    messages,
                    maxTokens: 512,
                    temperature: 0.7,
                    model: 'gemma2:2b', // Yerel ağır siklet modelimiz
                });
                return chatJson({
                    response: gemmaAnswer,
                    modelId: 'gemma-heavy-auto',
                    provider: 'ollama',
                    runtime: 'ollama-gemma',
                    fallbackUsed: false,
                    degraded: false,
                    complexityScore
                }, buildRuntimeAttribution({ provider: 'ollama', modelId: 'gemma-heavy-auto', runtime: 'gemma-routing', fallbackUsed: false, degraded: false, reason: 'high_complexity_escalation' }));
            } catch (e) {
                console.warn('[CognitiveRouter] Gemma escalation failed, falling back to Nano:', e);
            }
        }

        // 1. Nano Cognitive Layer - Task Classification
        const cognitivePlan = classifyTask(prompt);
        const intentMeta = cognitivePlan.intentMeta || classifyIntentWithConfidence(prompt, messages);
        const taskScore = cognitivePlan.taskScore || { complexity: 0, research: 0, code: 0, creative: 0 };
        const plan = {
            ...routeRequest(prompt),
            cognitiveRoute
        }; // Keep orchestration plan for compatibility
        const conversationIntent = detectUserIntent(prompt);
        const maxTokens = Math.max(typeof body?.maxTokens === 'number' ? body.maxTokens : 100, getRecommendedMaxTokens(conversationIntent));
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
        if (cognitiveRoute.intent === 'image_generation' || cognitivePlan.taskType === 'image_generation' || plan.selectedTarget === 'sdxl') {
            try {
                // Extract clean prompt for image generation
                const imagePrompt = prompt
                    .replace(/bana|oluşturur musun|yapar mısın|çiz|üret|bir|tane|olsun/gi, '')
                    .trim();
                
                const basePrompt = imagePrompt || prompt;
                let finalPrompt = basePrompt;

                try {
                    const { inferWithVersionControl } = await import('@/core/nano-cognitive/service');
                    const translatePrompt = `You are a translator. Translate the following image generation prompt to English. Return ONLY the translated prompt, nothing else.\n\nPrompt: ${basePrompt}`;
                    const translateResult = await inferWithVersionControl(
                        translatePrompt,
                        { complexity: 0, research: 0, code: 0, creative: 0 },
                        50,
                        0.3
                    );
                    if (translateResult?.response && !looksMalformedNanoText(translateResult.response) && translateResult.response.length > 3) {
                        finalPrompt = translateResult.response.trim();
                    } else {
                        console.warn('[chat] Nano translation output looks invalid, using original prompt');
                        finalPrompt = basePrompt;
                    }
                } catch (e) {
                    console.warn('Image prompt translation failed, fallback to original', e);
                    finalPrompt = basePrompt;
                }

                const activeImgModel =
                    getActiveImageModelId() ||
                    process.env.AILLAME_IGM_ACTIVE_MODEL ||
                    'sdxl-base-1.0';
                const result = await imageGenerationService.createJob({
                    projectId: 'default-chat',
                    sourceApp: 'aillame-chat',
                    prompt: finalPrompt,
                    modelId: activeImgModel
                });

                if (result.success) {
                    const modelId = 'aillame-nano-v1-igm-handoff';
                    const statusMsg = `Görsel üretim isteğini aldım. "${imagePrompt || prompt}" betimlemesiyle arka planda üretimi başlattım (İş No: ${result.jobId}). Durum: Sıraya Alındı. Sonuç hazır olduğunda Görsel Üretim panelinden veya Yönetim panelinden takip edebilirsin.`;
                    return chatJson({
                        response: improveAssistantAnswer(prompt, statusMsg, messages),
                        modelId,
                        plan: { ...plan, cognitivePlan, conversationIntent, intentMeta },
                        imageJobId: result.jobId,
                        imagePrompt: imagePrompt || prompt,
                        imageEnglishPrompt: finalPrompt
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

        // 4. Engine'i al (Nano / default)
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
        
        let enrichedPrompt = enrichPromptForConversation(prompt, messages);
        
        // --- Aillame Project Context Integration (Phase 8) ---
        try {
            const { AillameProjectContextService } = await import('@/core/projects/project-context.service');
            const projectContextBlock = AillameProjectContextService.getProjectContextForPrompt(prompt);
            if (projectContextBlock) {
                console.log(`[AillameProjectContext] Injected active project context into LLM prompt.`);
                enrichedPrompt = enrichedPrompt + '\n\n' + projectContextBlock;
            }
        } catch (projError) {
            console.warn('[AillameProjectContext] Failed to retrieve or inject project context:', projError);
        }
        
        // --- Aillame Nano Local Memory Context Injection (Phase 6) ---
        try {
            const { AillameMemoryService } = await import('@/core/memory/aillame-memory.service');
            const relevantMemories = await AillameMemoryService.getRelevantMemoriesForPrompt(prompt, 3);
            
            if (relevantMemories.length > 0) {
                console.log(`[AillameMemory] Retrieved ${relevantMemories.length} relevant memories for prompt context injection.`);
                const memoryContextBlock = `\n\n[YEREL HAFIZA BİLGİLERİ (Sadece yerel olarak saklanan kullanıcı/proje tercihleri)]:\n` +
                    relevantMemories.map((m, i) => `- ${m.content}`).join('\n') + 
                    `\nLütfen yanıtını hazırlarken yukarıdaki kullanıcı/proje tercihlerine uygun hareket et.`;
                
                enrichedPrompt = enrichedPrompt + memoryContextBlock;
            }
            
            // Update session context with current routing info
            AillameMemoryService.updateSessionContext({
                lastPrompt: prompt,
                lastIntent: cognitiveRoute.intent,
                lastTarget: cognitiveRoute.target,
                lastModelId: activeChatModelId || 'aillame-nano-v1',
                lastRouteExplanation: cognitiveRoute.reason
            });
        } catch (memError) {
            console.warn('[AillameMemory] Failed to retrieve or inject memory context:', memError);
        }

        const { response: rawResponse, modelId } = await inferWithVersionControl(
            enrichedPrompt,
            taskScore,
            maxTokens,
            temperature
        );
        
        // 6. Kalite kontrolü ve Otomatik Düzeltme (Self-Correction) [PHASE 4]
        let finalResponse = rawResponse;
        let finalModelId = modelId;
        let correctionTriggered = false;

        const isMalformed = looksMalformedNanoText(rawResponse) || rawResponse.length < 3;
        
        if (isMalformed && !activeChatModelId) {
            console.log('[SelfCorrection] Nano output looks malformed, escalating to Gemma...');
            try {
                const { generateOllamaResponse } = await import('@/core/inference/ollama');
                const correctedAnswer = await generateOllamaResponse({
                    prompt,
                    messages,
                    maxTokens: 512,
                    temperature: 0.6,
                    model: 'gemma2:2b',
                });
                if (correctedAnswer && correctedAnswer.length > 5) {
                    finalResponse = correctedAnswer;
                    finalModelId = 'gemma-self-correction';
                    correctionTriggered = true;
                }
            } catch (e) {
                console.warn('[SelfCorrection] Escalation failed:', e);
            }
        }

        const rawImproved = looksMalformedNanoText(finalResponse)
            ? improveAssistantAnswer(prompt, safeFallback(prompt, messages), messages)
            : improveAssistantAnswer(prompt, finalResponse, messages);

        const response = isExplicitIntent(intentMeta.intent) && hasGuardPhrase(rawImproved)
            ? buildExplicitIntentGuardResponse(prompt, messages, intentMeta.intent)
            : rawImproved;

        // --- Aillame Local Distillation Dataset Suggestion Engine (Phase 9) ---
        let distillationSuggestion = null;
        try {
            const { AillameDistillationDatasetService } = await import('@core/distillation/distillation-dataset.service');
            const { AillameProjectContextService } = await import('@core/projects/project-context.service');
            const { AillameMemoryService } = await import('@core/memory/aillame-memory.service');

            const activeProjId = AillameProjectContextService.getActiveProjectId();
            const relevantMems = await AillameMemoryService.getRelevantMemoriesForPrompt(prompt, 3);
            const isBlocked = finalModelId === 'aillame-nano-v1-tool-blocked';

            distillationSuggestion = AillameDistillationDatasetService.suggestSampleFromInteraction({
                prompt,
                intent: cognitiveRoute.intent,
                target: cognitiveRoute.target,
                toolId: cognitiveRoute.selectedToolId || undefined,
                projectId: activeProjId || undefined,
                memoryTags: relevantMems.length > 0 ? Array.from(new Set(relevantMems.flatMap(m => m.tags || []))) : undefined,
                routeConfidence: cognitiveRoute.confidence,
                safetyBlocked: isBlocked,
                projectContextUsed: !!activeProjId,
                modelId: finalModelId
            });
        } catch (distError) {
            console.warn('[DistillationDataset] Failed to formulate dynamic sample suggestion:', distError);
        }

        return chatJson({
            response, 
            modelId: finalModelId,
            plan: { 
                ...plan, 
                cognitivePlan, 
                conversationIntent, 
                taskScore, 
                intentMeta, 
                correctionTriggered,
                distillationSuggestion 
            }
        }, buildRuntimeAttribution({ 
            provider: correctionTriggered ? 'ollama' : 'aillame-nano', 
            modelId: finalModelId, 
            runtime: correctionTriggered ? 'gemma-correction' : 'nano-versioned-inference', 
            fallbackUsed: isMalformed, 
            degraded: isMalformed && !correctionTriggered,
            reason: isMalformed ? 'malformed_nano_text_corrected' : undefined 
        }));
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
