import { NextRequest, NextResponse } from 'next/server';
import { PRO_CHAT_MODEL_ID, getModel } from '@core/models/registry';
import { getAllModelInstallStatuses, getGeminiReadiness } from '@core/model-management/status';
import { checkGeminiConfig, generateGeminiResponse } from '@core/inference/gemini';
import { generateProMultimodalResponse } from '@core/inference/pro-multimodal';
import { enrichPromptForConversation, normalizeAssistantAnswer } from '@core/conversation/conversation-quality';
import { LOCAL_FIRST_DISABLED_MESSAGE, isLegacyProvidersEnabled } from '@core/feature-flags/legacy-providers';

type ProProvider = 'gemini' | 'qwen';

function getRequestedProvider(): ProProvider | undefined {
  const requested = process.env.AILLAME_PRO_PROVIDER?.trim().toLowerCase();
  if (requested === 'gemini' || requested === 'qwen') return requested;
  return undefined;
}

function isQwenEnabled(): boolean {
  return process.env.AILLAME_QWEN_ENABLED === 'true';
}

function chooseProProvider(): {
  provider?: ProProvider;
  requestedProvider?: ProProvider;
  fallbackFrom?: ProProvider;
  reason?: string;
} {
  const requestedProvider = getRequestedProvider();
  const gemini = checkGeminiConfig();
  const qwenEnabled = isQwenEnabled();
  const legacyProvidersEnabled = isLegacyProvidersEnabled();

  if (requestedProvider === 'gemini') {
    return legacyProvidersEnabled
      ? { provider: 'gemini', requestedProvider }
      : { requestedProvider, reason: 'legacy_provider_disabled' };
  }

  if (requestedProvider === 'qwen') {
    if (qwenEnabled) return { provider: 'qwen', requestedProvider };
    if (legacyProvidersEnabled && gemini.enabled && gemini.apiKeyConfigured) {
      return {
        provider: 'gemini',
        requestedProvider,
        fallbackFrom: 'qwen',
        reason: 'qwen_disabled',
      };
    }
    return { provider: 'qwen', requestedProvider, reason: 'qwen_disabled' };
  }

  if (legacyProvidersEnabled && gemini.enabled && gemini.apiKeyConfigured) {
    return { provider: 'gemini' };
  }

  if (qwenEnabled) {
    return { provider: 'qwen' };
  }

  return { reason: gemini.enabled ? 'api_key_missing' : 'provider_disabled' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt = '', action, images = [], maxTokens = 1024, temperature = 0.7 } = body;
    const qwenModel = getModel(PRO_CHAT_MODEL_ID);
    const providerChoice = chooseProProvider();
    const geminiConfig = checkGeminiConfig();

    if (action === 'load') {
      const geminiStatus = getGeminiReadiness();
      const routeReady = providerChoice.provider === 'gemini'
        ? geminiStatus.isReady
        : providerChoice.provider === 'qwen'
        ? isQwenEnabled()
        : false;
      return NextResponse.json({
        status: routeReady ? 'ready' : 'unavailable',
        provider: providerChoice.provider,
        requestedProvider: providerChoice.requestedProvider,
        fallbackFrom: providerChoice.fallbackFrom,
        modelId: providerChoice.provider === 'gemini' ? geminiConfig.model : qwenModel.id,
        repoId: providerChoice.provider === 'gemini' ? undefined : qwenModel.repoId,
        capabilities: providerChoice.provider === 'gemini'
          ? ['text-generation', 'multimodal-input']
          : qwenModel.capabilities,
        gemini: geminiStatus,
        qwen: {
          enabled: isQwenEnabled(),
          modelId: qwenModel.id,
          repoId: qwenModel.repoId,
          install: (await getAllModelInstallStatuses()).find((s: any) => s.modelId === qwenModel.id),
        },
      });
    }

    if (providerChoice.provider === 'gemini') {
      const result = await generateGeminiResponse({
        prompt: enrichPromptForConversation(prompt),
        images,
        maxOutputTokens: maxTokens,
        temperature,
      });

      if (!result.success) {
        const status =
          result.code === 'api_key_missing' || result.code === 'provider_disabled'
            ? 503
            : result.code === 'auth_error'
            ? 401
            : result.code === 'model_not_found'
            ? 404
            : result.code === 'timeout'
            ? 504
            : 502;

        return NextResponse.json(result, { status });
      }

      return NextResponse.json({
        success: true,
        provider: 'gemini',
        model: result.model,
        answer: result.answer,
        response: result.answer,
        modelId: result.model,
        engine: 'gemini-api',
        fallbackFrom: providerChoice.fallbackFrom,
      });
    }

    if (providerChoice.provider === 'qwen' && !isQwenEnabled()) {
      return NextResponse.json(
        {
          success: false,
          provider: 'qwen',
          code: 'provider_disabled',
          error: 'Qwen provider devre dışı ve kullanılabilir Gemini fallback bulunamadı.',
        },
        { status: 503 }
      );
    }

    if (!providerChoice.provider) {
      if (providerChoice.reason === 'legacy_provider_disabled') {
        return NextResponse.json(
          {
            success: false,
            provider: 'pro',
            code: 'disabled_by_policy',
            error: LOCAL_FIRST_DISABLED_MESSAGE,
          },
          { status: 410 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          provider: 'pro',
          code: providerChoice.reason === 'api_key_missing' ? 'api_key_missing' : 'provider_unavailable',
          error: providerChoice.reason === 'api_key_missing'
            ? 'Gemini API key tanımlı değil ve Qwen provider aktif değil.'
            : 'Pro Chat için kullanılabilir provider yok.',
        },
        { status: 503 }
      );
    }

    const response = await generateProMultimodalResponse({
      prompt: enrichPromptForConversation(prompt),
      images,
      maxTokens,
      temperature,
    });

    return NextResponse.json({
      success: true,
      provider: 'qwen',
      model: qwenModel.id,
      answer: normalizeAssistantAnswer(response),
      response: normalizeAssistantAnswer(response),
      modelId: qwenModel.id,
      repoId: qwenModel.repoId,
      engine: qwenModel.runtime,
    });
  } catch (error) {
    console.error('API Pro-Chat Error:', error);
    const message = error instanceof Error ? error.message : 'Qwen3-VL Pro chat failed.';
    return NextResponse.json(
      {
        success: false,
        provider: 'pro',
        code: 'provider_error',
        error: message,
      },
      { status: 500 }
    );
  }
}
