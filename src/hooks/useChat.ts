import { useState, useRef, useEffect } from 'react';
import { Message } from '@apptypes/message';
import { LocalMemoryStore } from '@providers/memory/local';
import { useSettings } from '@hooks/useSettings';
import { orchestrateChat } from '@core/orchestrator';
import { routeAillameRequest } from '@core/aillame-router/router';
import { liveLearning } from '@core/orchestrator/live-learning';
import type { ToolCall, ToolResult } from '@core/orchestrator/tools';
import type { ImageAttachment } from '@apptypes/attachments';
import type { AillameTier, LLMMode } from '@apptypes/settings';
import type {
  AillameRouteDecision,
  AillameSafetyFlags,
  MemoryScopeReference,
} from '@core/aillame-router/types';
import type { MessageMetadata } from '@apptypes/message';

const memory = new LocalMemoryStore();

export interface ActiveTool {
  call: ToolCall;
  result?: ToolResult;
  status: 'running' | 'done' | 'error';
}

export interface UseChatRuntimeSettings {
  llmMode: LLMMode;
  tier: AillameTier;
}

function formatMemoryScope(scope: MemoryScopeReference): string {
  if (scope.layer === 'mode' && scope.mode) {
    return `mode:${scope.mode}`;
  }
  return scope.layer;
}

function compactSafetyFlags(flags: AillameSafetyFlags): Partial<AillameSafetyFlags> {
  const metadataFlags: Partial<AillameSafetyFlags> = {};

  if (flags.requiresFinancialDisclaimer) {
    metadataFlags.requiresFinancialDisclaimer = true;
  }
  if (flags.containsImageInput) {
    metadataFlags.containsImageInput = true;
  }
  if (flags.mayGenerateImage) {
    metadataFlags.mayGenerateImage = true;
  }
  if (!flags.allowAutomaticMemoryWrite) {
    metadataFlags.allowAutomaticMemoryWrite = false;
  }

  return metadataFlags;
}

function toMessageRoutingMetadata(decision: AillameRouteDecision): MessageMetadata {
  return {
    routing: {
      primaryMode: decision.primaryMode,
      selectedModes: decision.selectedModes,
      intent: decision.intent,
      requiredAdapters: decision.requiredAdapters.map((adapter) => adapter.adapterId),
      memoryScopes: Array.from(new Set(decision.memoryScopes.map(formatMemoryScope))),
      safetyFlags: compactSafetyFlags(decision.safetyFlags),
    },
  };
}

function createAssistantMetadata(prompt: string, imageCount: number): MessageMetadata {
  try {
    return toMessageRoutingMetadata(
      routeAillameRequest({
        prompt,
        imageCount,
      })
    );
  } catch (error) {
    console.error('[Aillame Router] metadata decision failed:', error);
    return {
      routingError: {
        code: 'ROUTER_FAILED',
        message: 'Router metadata could not be prepared.',
      },
    };
  }
}

export function useChat(conversationId?: string, runtimeSettings?: UseChatRuntimeSettings) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<ActiveTool[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const savedSettings = useSettings();
  const llmMode = runtimeSettings?.llmMode ?? savedSettings.llmMode;
  const tier = runtimeSettings?.tier ?? savedSettings.tier;

  useEffect(() => {
    if (conversationId) {
      memory.getMessages(conversationId).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  const updateAssistantContent = (assistantId: string, contentUpdater: (current: string) => string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantId ? { ...msg, content: contentUpdater(msg.content) } : msg
      )
    );
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setModelLoading(false);
    }
  };

  const clearMessages = async () => {
    if (conversationId && confirm('Bu sohbetteki tüm mesajları silmek istediğine emin misin?')) {
      await memory.deleteConversation(conversationId);
      setMessages([]);
      setActiveTools([]);
    }
  };

  const sendMessage = async () => {
    if (loading || modelLoading || (!input.trim() && attachments.length === 0) || !conversationId) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const outgoingAttachments = attachments;
    const outgoingInput = input.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: outgoingInput || 'Görsel analizi',
      createdAt: Date.now(),
      attachments: outgoingAttachments,
    };

    setMessages((prev) => [...prev, userMessage]);
    await memory.addMessage(conversationId, userMessage);
    setInput('');
    setAttachments([]);
    setLoading(true);
    setModelLoading(true);
    setActiveTools([]);

    const assistantId = (Date.now() + 1).toString();
    const assistantMetadata = createAssistantMetadata(outgoingInput, outgoingAttachments.length);
    const placeholder: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      metadata: assistantMetadata,
    };
    setMessages((prev) => [...prev, placeholder]);

    try {
      console.info('[Aillame Chat] dispatch', { tier, llmMode, imageCount: outgoingAttachments.length });
      const result = await orchestrateChat(outgoingInput, {
        llmMode,
        tier,
        attachments: outgoingAttachments,
        messages,
        signal,
        onToken: (token) => {
          if (signal.aborted) return;
          updateAssistantContent(assistantId, (current) => current + token);
        },
        onToolCall: (call: ToolCall) => {
          if (signal.aborted) return;
          setActiveTools((prev) => [...prev, { call, status: 'running' }]);
        },
        onToolResult: (toolResult: ToolResult) => {
          if (signal.aborted) return;
          setActiveTools((prev) =>
            prev.map((t) =>
              t.call.tool === toolResult.tool
                ? { ...t, result: toolResult, status: toolResult.success ? 'done' : 'error' }
                : t
            )
          );
        },
      });

      if (signal.aborted) return;

      let replyContent = '';
      let extraData: any = {};

      if (typeof result === 'string') {
        replyContent = result;
      } else if (result && typeof result === 'object') {
        replyContent = result.response || result.answer || JSON.stringify(result, null, 2);
        extraData = {
          imageJobId: result.imageJobId,
          imagePrompt: result.imagePrompt,
          imageEnglishPrompt: result.imageEnglishPrompt
        };
      }

      const finalAssistantMessage: Message = { 
        ...placeholder, 
        content: replyContent,
        ...extraData
      };

      updateAssistantContent(assistantId, () => replyContent);
      setMessages(prev => prev.map(m => m.id === assistantId ? finalAssistantMessage : m));
      
      await memory.addMessage(conversationId, finalAssistantMessage);

      liveLearning.learnFromConversation(outgoingInput, replyContent)
        .catch(err => console.error('[LiveLearning] Senkronizasyon hatası:', err));

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const errorMessage = 'Cevap alınamadı.';
      updateAssistantContent(assistantId, () => errorMessage);
      await memory.addMessage(conversationId, { ...placeholder, content: errorMessage });
    } finally {
      setLoading(false);
      setModelLoading(false);
      abortControllerRef.current = null;
    }
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    attachments,
    setAttachments,
    sendMessage,
    stopGeneration,
    clearMessages,
    loading: loading || modelLoading,
    modelLoading,
    activeTools,
    listRef,
  };
}
