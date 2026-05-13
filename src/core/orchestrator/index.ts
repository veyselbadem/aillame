import { analyzeRequest } from './analyzer';
import { routeProvider } from './provider-router';
import { detectTools, TOOLS, ToolCall, ToolResult } from './tools';
import { liveLearning } from './live-learning';
import { summarizeResearch } from '../research/summarize';
import type { ImageAttachment } from '@apptypes/attachments';
import type { AillameTier, LLMMode } from '@apptypes/settings';
import type { ResearchSource } from '@apptypes/research';

import { Message } from '@apptypes/message';

export interface OrchestratorOptions {
  llmMode?: LLMMode;
  tier?: AillameTier;
  attachments?: ImageAttachment[];
  messages?: Message[];
  onToken?: (token: string) => void;
  onToolCall?: (call: ToolCall) => void;
  onToolResult?: (result: ToolResult) => void;
  signal?: AbortSignal;
  nanoProfile?: any; // Phase 19: Nano profile support
}

export function isNanoNoToolMode(tier: AillameTier): boolean {
  return tier === 'nano';
}

export function shouldForwardProviderMessages(tier: AillameTier): boolean {
  return tier !== 'nano';
}

/**
 * Ana Orkestratör v2 - Faz 2.3
 * Tool-Calling, RAG hafızası ve canlı öğrenme hepsini yönetir.
 */
export async function orchestrateChat(
  input: string,
  options?: OrchestratorOptions
): Promise<string | any> {
  const analyzed = analyzeRequest(input);
  const llmMode = options?.llmMode ?? 'hybrid';
  const tier = options?.tier ?? 'nano';
  const attachments = options?.attachments ?? [];
  const signal = options?.signal;
  const nanoNoToolMode = isNanoNoToolMode(tier);

  // ──────────────────────────────────────────
  // ADIM 1: Araç Tespiti & Çalıştırma
  // ──────────────────────────────────────────
  const toolCalls = nanoNoToolMode ? [] : detectTools(input);
  const toolOutputs: string[] = [];

  if (toolCalls.length > 0) {
    for (const call of toolCalls) {
      if (signal?.aborted) throw new Error('AbortError');
      
      options?.onToken?.(`[Sistem: ${call.tool.replace('_', ' ')} çalıştırılıyor...]\n`);
      options?.onToolCall?.(call);
      const tool = TOOLS[call.tool];
      if (!tool) continue;

      const result = await tool.execute(call.params);
      if (signal?.aborted) throw new Error('AbortError');
      
      options?.onToolResult?.(result);

      if (result.success && result.output) {
        if (result.tool === 'web_search') {
          // Ham JSON çıktısını özetleyerek kullanıcıya sun
          try {
            const parsed = JSON.parse(result.output);
            if (parsed && typeof parsed === 'object' && 'summary' in parsed) {
              toolOutputs.push(parsed.summary);
            } else {
              const provider = routeProvider('text', llmMode, tier);
            
            options?.onToken?.(`[Sistem: Bilgiler özetleniyor...]\n`);
            const summary = await summarizeResearch(provider as any, parsed as ResearchSource[], options?.onToken);

            toolOutputs.push(summary);
            }
            liveLearning.learnFromContent(result.output, 'research').catch(() => {});
          } catch (e) {
            // JSON değilse veya hata olursa ham çıktıyı ekle
            toolOutputs.push(`[WEB SEARCH]\n${result.output}`);
          }
        } else {
          toolOutputs.push(`[${call.tool.replace('_', ' ').toUpperCase()}]\n${result.output}`);
          if (result.tool === 'learn_content') {
            // Zaten öğrenildi mesajı, direkt eklenebilir
          }
        }
      }
    }
  }

  // ──────────────────────────────────────────
  // ADIM 2: Araştırma isteği varsa direkt döndür
  // ──────────────────────────────────────────
  if (!nanoNoToolMode && (analyzed.type === 'research' || (toolCalls.length > 0 && toolOutputs.length > 0))) {
    if (toolOutputs.length > 0) {
      return toolOutputs.join('\n\n');
    }

    if (signal?.aborted) throw new Error('AbortError');

    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: analyzed.content, llmMode }),
      signal: signal,
    });
    const payload = await res.text();
    if (!res.ok) return `Araştırma API hatası: ${payload}`;
    try {
      const parsed = JSON.parse(payload);
      return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    } catch {
      return payload;
    }
  }

  // ──────────────────────────────────────────
  // ADIM 3: LLM Provider'a gönder (context zenginleştirilmiş)
  // ──────────────────────────────────────────
  const provider = routeProvider(attachments.length > 0 ? 'image' : analyzed.type, llmMode, tier);

  if ('isReady' in provider && !provider.isReady()) {
    if ('loadModel' in provider) {
      await provider.loadModel();
    }
  }

  let enrichedInput = toolOutputs.length > 0
    ? `${input}\n\n[Sistem Bağlamı]:\n${toolOutputs.join('\n')}`
    : analyzed.content;

  // Phase 18: Nano özel planlama ve sistem promptu entegrasyonu
  if (tier === 'nano') {
    const { AillameNanoController } = await import('../nano/nano-controller');
    const controller = new AillameNanoController();
    const plan = controller.createPlan({ 
      prompt: enrichedInput, 
      images: attachments,
      profile: options?.nanoProfile 
    });
    enrichedInput = `${plan.systemPrompt}\n\n${plan.modelPrompt}`;
  }

  const providerMessages = shouldForwardProviderMessages(tier) ? options?.messages : undefined;

  if ('generate' in provider) {
    return provider.generate(enrichedInput, options?.onToken, signal, { 
        images: attachments,
        messages: providerMessages 
    }) as Promise<string>;
  }

  if ('analyze' in provider) {
    if (signal?.aborted) throw new Error('AbortError');
    const result = await provider.analyze({
      id: Date.now().toString(),
      file: null as any,
      url: analyzed.content,
      uploadedAt: Date.now(),
    });
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  throw new Error('Desteklenmeyen istek tipi');
}
