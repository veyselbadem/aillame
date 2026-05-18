import { useState, useRef, useEffect } from 'react';
import { Message } from '@apptypes/message';
import { LocalMemoryStore } from '@providers/memory/local';
import { useSettings } from '@hooks/useSettings';
import { aillameFetch } from '@/lib/aillame-api-client';
import type { ToolCall, ToolResult } from '@core/orchestrator/tools';
import type { ImageAttachment } from '@apptypes/attachments';
import type { AillameTier, LLMMode } from '@apptypes/settings';
import type {
  AillameRouteDecision,
  AillameSafetyFlags,
  MemoryScopeReference,
} from '@core/aillame-router/types';
import type { MessageMetadata } from '@apptypes/message';
import { auditChatMessage, checkInjectionPatterns } from '@core/chat/message-audit';
import { createMessageUiMetadata } from '@core/chat/message-metadata';

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
  return {
    routing: {
      intent: 'text',
      primaryMode: 'general',
      selectedModes: ['general'],
      requiredAdapters: [],
      memoryScopes: [],
      safetyFlags: {
        requiresFinancialDisclaimer: false,
        containsImageInput: imageCount > 0,
        mayGenerateImage: false,
        allowAutomaticMemoryWrite: true
      }
    }
  };
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
  const streamingAssistantIdRef = useRef<string | null>(null);
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
    }
    setLoading(false);
    setModelLoading(false);
    streamingAssistantIdRef.current = null;
  };

  const clearChat = () => {
    if (loading || modelLoading) {
      return false;
    }

    if (conversationId) {
      memory.clearConversationMessages(conversationId).catch(() => {
        // Safe diagnostic fallback
      });
    }

    setMessages([]);
    setInput('');
    setAttachments([]);
    setActiveTools([]);
    streamingAssistantIdRef.current = null;
    return true;
  };

  const sendMessage = async () => {
    if (loading || modelLoading || (!input.trim() && attachments.length === 0) || !conversationId) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const outgoingAttachments = attachments;
    const outgoingInput = input.trim();

    // Audit visible user message for manual context boundary integrity
    const auditResult = auditChatMessage({ userVisibleMessage: outgoingInput, conversationId });
    const injectionWarnings = checkInjectionPatterns(outgoingInput);
    
    // Create safe UI metadata from audit result
    const uiContextMetadata = createMessageUiMetadata(auditResult);
    
    // Log audit result safely (no raw message content)
    const safeLog = auditResult.hasManualContext 
      ? `[MessageAudit] manual context detected, boundary ${auditResult.isBoundaryIntact ? 'valid' : 'invalid'}`
      : '[MessageAudit] no manual context';
    
    if (auditResult.warnings.length > 0 || injectionWarnings.length > 0) {
      // Warnings present but message still sends (audit is advisory, not blocking)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: outgoingInput || 'Görsel analizi',
      createdAt: Date.now(),
      attachments: outgoingAttachments,
      metadata: {
        uiContextMetadata,
      },
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
    streamingAssistantIdRef.current = assistantId;

    try {
      const hasImage = outgoingAttachments.length > 0;
      const payload: any = {
        message: outgoingInput,
        projectId: "doomsgame-engine", // MVP Default
        mode: "general",
        context: {
          llmMode,
          tier,
          nanoProfile: savedSettings.nanoProfile,
          conversationId
        }
      };

      if (hasImage) {
        payload.imageBase64 = outgoingAttachments[0].dataUrl || outgoingAttachments[0].data;
        payload.mimeType = outgoingAttachments[0].mimeType;
        payload.modelId = 'qwen3-vl-4b-instruct-q4-k-m';
        payload.multimodal = true;
      }

      const result = await aillameFetch('/api/core/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          // core/chat reads 'prompt', not 'message'
          prompt: payload.message
        }),
        signal
      });

      if (signal.aborted) return;

      let replyContent = result.response || result.answer || result.text || '';
      
      const modelIdentifier = result.modelId || result.model || 'aillame-nano-v1';
      let modelMetadata = {
        provider: 'aillame-nano',
        name: 'Aillame Nano',
        runtime: 'nano-rust'
      };

      if (typeof modelIdentifier === 'string') {
        if (modelIdentifier.includes('qwen3-vl') || modelIdentifier.includes('vision') || result.executionMode === 'vision_inference') {
          modelMetadata = {
            provider: 'qwen',
            name: 'Qwen3-VL 4B Vision',
            runtime: 'vlm-inference'
          };
        } else if (modelIdentifier.includes('sdxl') || modelIdentifier.includes('igm')) {
          modelMetadata = {
            provider: 'sdxl',
            name: 'SDXL Turbo',
            runtime: 'igm-queue'
          };
        } else if (modelIdentifier.includes('router-health')) {
          modelMetadata = {
            provider: 'aillame-nano',
            name: 'Aillame Nano (Teşhis)',
            runtime: 'nano-cognitive-router'
          };
        } else if (modelIdentifier.includes('router-clarify')) {
          modelMetadata = {
            provider: 'aillame-nano',
            name: 'Aillame Nano (Netleştirici)',
            runtime: 'nano-cognitive-router'
          };
        } else if (modelIdentifier.includes('v2')) {
          modelMetadata = {
            provider: 'aillame-nano',
            name: 'Aillame Nano V2',
            runtime: 'nano-versioned-inference'
          };
        } else if (modelIdentifier.includes('gemma')) {
          modelMetadata = {
            provider: 'ollama',
            name: 'Gemma 2B',
            runtime: 'ollama-inference'
          };
        }
      } else if (modelIdentifier && typeof modelIdentifier === 'object') {
        modelMetadata = modelIdentifier;
      }

      const responseMetadata: MessageMetadata = {
        ...assistantMetadata,
        runtime: result.meta?.runtime,
        model: modelMetadata,
        degraded: result.degraded,
        errorCode: result.error?.code,
        latencyMs: result.meta?.latencyMs || result.meta?.durationMs,
        toolExecuted: result.meta?.toolExecuted,
        toolRiskLevel: result.meta?.riskLevel,
        toolOk: result.meta?.toolOk
      };

      // Simulate streaming for UI consistency
      if (replyContent) {
        const words = replyContent.split(' ');
        let currentText = '';
        for (const word of words) {
          if (signal.aborted) break;
          currentText += word + ' ';
          updateAssistantContent(assistantId, () => currentText);
          await new Promise(r => setTimeout(r, 15));
        }
      }

      const finalAssistantMessage: Message = { 
        ...placeholder, 
        content: replyContent,
        metadata: responseMetadata
      };

      updateAssistantContent(assistantId, () => replyContent);
      setMessages(prev => prev.map(m => m.id === assistantId ? finalAssistantMessage : m));
      
      await memory.addMessage(conversationId, finalAssistantMessage);

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      const errorMessage = error.message || 'Cevap alınamadı.';
      const errorMetadata: MessageMetadata = {
        ...assistantMetadata,
        degraded: true,
        errorCode: error.code || 'GENERATION_FAILED'
      };

      updateAssistantContent(assistantId, () => errorMessage);
      const finalErrorMessage = { ...placeholder, content: errorMessage, metadata: errorMetadata };
      setMessages(prev => prev.map(m => m.id === assistantId ? finalErrorMessage : m));
      await memory.addMessage(conversationId, finalErrorMessage);
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
    clearChat,
    clearMessages: clearChat,
    loading: loading || modelLoading,
    modelLoading,
    isLocalModelReady: llmMode === 'local' ? !loading && !modelLoading : true,
    activeTools,
    listRef,
  };
}
