import type { ProviderGenerateRequest, ProviderGenerateResponse, ProviderOutput, ProviderTextOutput, ProviderArticleOutput, ProviderEmbedListOutput, ProviderEmbedItemOutput, ProviderAnalysisPlanOutput, ProviderClient } from './types';

function createTimestamp(): string {
  return new Date().toISOString();
}

function normalizeLanguage(language?: string): string {
  return language?.trim() || 'tr';
}

function createTextOutput(input: string, mode: string, language: string): ProviderTextOutput {
  return {
    type: 'text',
    summary: `Generated safe ${mode} text in ${language}.`,
    warnings: [],
    content: input
      ? `Bu cevap, "${input}" girdisine dayanılarak oluşturuldu. Detaylar ve yönlendirmeler sağlayan güvenli bir metin yanıtıdır.`
      : 'Giriş sağlanmadı; varsayılan güvenli metin yanıtı sunuldu.',
  };
}

function createArticleOutput(input: string, language: string): ProviderArticleOutput {
  const subject = input || 'sağlanan konu';
  return {
    type: 'article',
    title: `Güvenli ${language} içeriği: ${subject}`,
    content: `Bu makale, verilen girdiye dayalı olarak güvenli bir şekilde hazırlanmıştır. İçerik, eğitim, genel bilgi ve proje gereksinimlerine uygun olacak şekilde düzenlenmiştir.`,
    category: 'general',
    tags: ['özet', 'güvenlik', 'içerik'],
    metaTitle: `Güvenli ${subject} Bilgilendirmesi`,
    metaDescription: `Sağlanan içeriğe dayalı güvenli makale özeti ve önerilen kullanım açıklaması.`,
    summary: 'Makale biçiminde güvenli içerik önerisi sağlandı.',
    warnings: [],
  };
}

function createEmbedListOutput(input: string): ProviderEmbedItemOutput[] {
  return [
    {
      type: 'embed_item',
      summary: 'Oyun tarafı yerleştirme önerisi oluşturuldu.',
      warnings: [],
      title: 'Sürükleyici Eğitim Deneyimi',
      description: 'Öğrencilerin etkileşimli olarak öğrenmesini destekleyen oyun içi anlatı sistemi.',
      category: 'education',
      embedUrl: `https://example.com/embed/${encodeURIComponent(input || 'default')}/1`,
      tags: ['eğitim', 'etkileşim', 'oyun'],
    },
    {
      type: 'embed_item',
      summary: 'Oyun içi görev akışı önerisi oluşturuldu.',
      warnings: [],
      title: 'Hikaye Tabanlı Görev Akışı',
      description: 'Oyuncuları yönlendirmek için güvenli ve net görev anlatımları.',
      category: 'story',
      embedUrl: `https://example.com/embed/${encodeURIComponent(input || 'default')}/2`,
      tags: ['hikaye', 'görev', 'tasarım'],
    },
  ];
}

function createAnalysisPlanOutput(input: string): ProviderAnalysisPlanOutput {
  return {
    type: 'analysis_plan',
    summary: 'Analiz için güvenli bir plan oluşturuldu.',
    warnings: [],
    requiredResearch: true,
    nextSteps: [
      'Verilen kaynağı doğrula ve güvenilir bilgileri ayıkla.',
      'Anahtar bulguları kısa ve açık bir şekilde özetle.',
      'Güvenlik ve politika gereksinimlerine uygun sonuçlar üret.',
    ],
  };
}

export async function generateProviderResponse(
  request: ProviderGenerateRequest,
  client: ProviderClient,
): Promise<ProviderGenerateResponse> {
  const mode = request.mode || 'general';
  const language = normalizeLanguage(request.language);
  const task = request.task;
  const input = request.input?.trim() || '';

  if (!client.allowedTasks?.includes(task)) {
    return {
      success: false,
      provider: 'aillame',
      error: 'Client is not authorized for the requested task.',
    };
  }

  if (request.projectId !== client.projectId) {
    return {
      success: false,
      provider: 'aillame',
      error: 'Project ID does not match the authenticated client project.',
    };
  }

  const routingMetadata = {
    clientId: client.id,
    projectId: client.projectId,
    mode,
    task,
    language,
    outputFormat: request.outputFormat || 'structured',
    createdAt: createTimestamp(),
    executionMode: 'planning_only' as const,
    modelExecution: false as const,
    memoryWrite: false as const,
  };

  let output: ProviderOutput | ProviderOutput[];

  switch (task) {
    case 'generate_text':
      output = createTextOutput(input, mode, language);
      break;
    case 'generate_news_draft':
      output = createArticleOutput(input, language);
      break;
    case 'suggest_game_embeds':
      output = createEmbedListOutput(input);
      break;
    case 'analyze_news':
      output = createAnalysisPlanOutput(input);
      break;
    default:
      return {
        success: false,
        provider: 'aillame',
        error: 'Unsupported task requested.',
      };
  }

  return {
    success: true,
    provider: 'aillame',
    clientId: client.id,
    projectId: client.projectId,
    mode,
    task,
    outputFormat: request.outputFormat || 'structured',
    output,
    metadata: routingMetadata,
    safetyFlags: {
      directModelExecutionAllowed: false,
      directMemoryWriteAllowed: false,
      contentPolicy: 'safe-by-default',
    },
    warnings: [],
  };
}
