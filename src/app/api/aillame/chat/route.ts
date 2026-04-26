import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { validateExternalApiKey } from '@core/external-api/auth';
import { validateExternalAillameRequest } from '@core/external-api/validation';
import { getExternalProjectConfig } from '@core/external-api/project-config';
import { resolveExternalMemoryScopePlan } from '@core/external-api/memory-scope';
import { createExternalApiRequestLog, type CreateExternalApiRequestLogInput } from '@core/external-api/request-log/service';
import { checkExternalRateLimit } from '@core/external-api/rate-limit/service';
import type {
  ExternalAillameRequest,
  ExternalAillameResponse,
  ExternalAdapterPlan,
  ExternalProjectPolicy,
  ExternalRoutingPlan,
  ExternalNormalizedTask,
  ExternalProjectConfig,
  ExternalAdapterName,
  ExternalProjectId,
  ExternalApiMode,
  ExternalResearchType,
  ExternalSourcePolicy,
  ExternalFreshnessRequirement,
  ExternalCitationPolicy,
} from '@core/external-api/types';

function createErrorResponse(message: string, status: number) {
  return NextResponse.json<ExternalAillameResponse>({ success: false, error: message }, { status });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRequestMetadata(payload: unknown) {
  if (!isPlainObject(payload)) {
    return { projectId: undefined, mode: undefined, requestId: undefined };
  }
  return {
    projectId: typeof payload.projectId === 'string' ? payload.projectId : undefined,
    mode: typeof payload.mode === 'string' ? payload.mode : undefined,
    requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined,
  };
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function getClientIp(req: NextRequest): string | undefined {
  const headerValue = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');
  if (!headerValue) return undefined;
  return headerValue.split(',')[0].trim() || undefined;
}

async function safeLogRequest(logInput: CreateExternalApiRequestLogInput) {
  try {
    await createExternalApiRequestLog(logInput);
  } catch {
    // Logging failure must not block the API response.
  }
}

const SAFE_CONTEXT_KEYS = ['taskType', 'agentRole', 'assetType', 'symbol', 'classLevel', 'gradeLevel', 'subject', 'topic', 'outputType', 'framework', 'documentationTopic'] as const;

function buildIntent(message: string) {
  const normalized = message.trim().replace(/\s+/g, ' ');
  if (normalized.length <= 120) {
    return normalized;
  }
  return `${normalized.slice(0, 120).trim()}…`;
}

function getSafeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getSafeArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
  }

  const maybeString = getSafeString(value);
  return maybeString ? [maybeString] : undefined;
}

function getSafeContextSummary(context?: Record<string, unknown>): Record<string, string> | undefined {
  if (!isPlainObject(context)) {
    return undefined;
  }

  const summary: Record<string, string> = {};
  for (const key of SAFE_CONTEXT_KEYS) {
    const value = getSafeString(context[key]);
    if (value) {
      summary[key] = value;
    }
  }

  return Object.keys(summary).length > 0 ? summary : undefined;
}

function buildNormalizedTask(context?: Record<string, unknown>): ExternalNormalizedTask {
  if (!isPlainObject(context)) {
    return {};
  }

  return {
    taskType: getSafeString(context.taskType),
    agentRole: getSafeString(context.agentRole),
    assetType: getSafeString(context.assetType),
    symbol: getSafeString(context.symbol),
    symbols: getSafeArray(context.symbols),
    timeframe: getSafeString(context.timeframe),
    sourceType: getSafeString(context.sourceType),
    query: getSafeString(context.query),
    framework: getSafeString(context.framework),
    documentationTopic: getSafeString(context.documentationTopic),
    classLevel: getSafeString(context.classLevel),
    subject: getSafeString(context.subject),
    topic: getSafeString(context.topic),
    outputType: getSafeString(context.outputType),
  };
}

function buildAttachmentSummary(attachments?: ExternalAillameRequest['attachments']) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return undefined;
  }

  return attachments.map((attachment) => ({
    id: attachment.id,
    type: attachment.type,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
  }));
}

function resolveResearchType(
  projectId: ExternalProjectId,
  selectedMode: ExternalApiMode,
  context?: Record<string, unknown>
): ExternalResearchType | undefined {
  if (!isPlainObject(context)) {
    return undefined;
  }

  const requested = getSafeString(context.researchType)?.toLowerCase();
  if (projectId === 'boss-ai' && selectedMode === 'economy' && requested === 'news') {
    return 'economy_news';
  }

  if (projectId === 'doomsgame-engine' && selectedMode === 'code' && requested === 'documentation') {
    return 'documentation';
  }

  if (projectId === 'egitim-web' && selectedMode === 'education' && requested === 'education') {
    return 'education';
  }

  if (requested === 'economy_news' || requested === 'documentation' || requested === 'education' || requested === 'source_summary') {
    return requested;
  }

  if (requested === 'news') {
    return projectId === 'boss-ai' && selectedMode === 'economy' ? 'economy_news' : 'news';
  }

  if (requested === 'web' || requested === 'source_summary') {
    return requested;
  }

  return 'web';
}

function buildSourcePolicy(researchType: ExternalResearchType): ExternalSourcePolicy {
  const requirePublicationDate = researchType === 'news' || researchType === 'economy_news' || researchType === 'documentation' || researchType === 'education';
  return {
    requireCitations: true,
    requirePublicationDate,
    requireMultipleSources: researchType === 'economy_news' || researchType === 'news',
    allowedSourceTypes: ['web', 'news', 'documentation', 'education'],
    blockedSourceTypes: [],
    reliabilityScoringRequired: true,
  };
}

function buildFreshnessRequirement(context?: Record<string, unknown>, researchType?: ExternalResearchType): ExternalFreshnessRequirement | undefined {
  if (researchType !== 'news' && researchType !== 'economy_news') {
    return undefined;
  }

  return {
    timeframe: getSafeString(context?.timeframe),
    requiresRecentSources: true,
    maxAgeDays: researchType === 'economy_news' ? 3 : 7,
    publicationDateRequired: true,
  };
}

function buildCitationPolicy(requiresWebResearch: boolean, researchType?: ExternalResearchType): ExternalCitationPolicy | undefined {
  if (!requiresWebResearch) {
    return undefined;
  }

  return {
    citationsRequired: true,
    sourceUrlRequired: true,
    publicationDateRequired: researchType === 'economy_news' || researchType === 'news' || researchType === 'documentation' || researchType === 'education',
    accessedAtRequired: true,
  };
}

function buildAdapterPlan(request: ExternalAillameRequest, requiresWebResearch: boolean, researchType?: ExternalResearchType): ExternalAdapterPlan {
  const hasImageAttachment = Array.isArray(request.attachments)
    ? request.attachments.some((attachment) =>
        (typeof attachment.mimeType === 'string' && attachment.mimeType.startsWith('image/')) ||
        (typeof attachment.type === 'string' && attachment.type.startsWith('image/'))
      )
    : false;

  const selectedMode = request.mode ?? 'general';
  const textAdapterRequired = selectedMode !== 'image_generation';
  const imageAdapterRequired = selectedMode === 'image_generation';
  const visionAdapterRequired = hasImageAttachment;

  const suggestedAdapters: ExternalAdapterName[] = [];
  if (textAdapterRequired) suggestedAdapters.push('text');
  if (imageAdapterRequired) suggestedAdapters.push('image');
  if (visionAdapterRequired) suggestedAdapters.push('vision');

  return {
    textAdapterRequired,
    imageAdapterRequired,
    visionAdapterRequired,
    webResearchAdapterRequired: requiresWebResearch,
    newsAnalysisRequired: requiresWebResearch && !!researchType,
    citationRequired: requiresWebResearch,
    freshnessCheckRequired: requiresWebResearch && (researchType === 'news' || researchType === 'economy_news'),
    sourceReliabilityCheckRequired: requiresWebResearch,
    suggestedAdapters: suggestedAdapters.length > 0 ? suggestedAdapters : ['text'],
    executionAllowed: false,
    executionBlockedReason: 'Model execution is not enabled in planning_only mode.',
  };
}

function buildProjectPolicy(config: ExternalProjectConfig): ExternalProjectPolicy {
  const safetyRules = {
    financialDisclaimerRequired: false,
    directTradingAdviceAllowed: true,
    directFileWriteAllowed: true,
    directTerminalExecutionAllowed: true,
    educationLevelContextSupported: false,
    localGeneralUse: false,
    economyNewsSafetyRequired: false,
    sourceCitationRequired: false,
    childSafeEducationContentRequired: false,
    documentationSourceRequired: false,
  };

  if (config.projectId === 'boss-ai') {
    safetyRules.financialDisclaimerRequired = true;
    safetyRules.directTradingAdviceAllowed = false;
    safetyRules.economyNewsSafetyRequired = true;
    safetyRules.sourceCitationRequired = true;
  }

  if (config.projectId === 'doomsgame-engine') {
    safetyRules.directFileWriteAllowed = false;
    safetyRules.directTerminalExecutionAllowed = false;
    safetyRules.documentationSourceRequired = true;
  }

  if (config.projectId === 'egitim-web') {
    safetyRules.educationLevelContextSupported = true;
    safetyRules.childSafeEducationContentRequired = true;
    safetyRules.sourceCitationRequired = true;
  }

  if (config.projectId === 'aillame-local') {
    safetyRules.localGeneralUse = true;
  }

  return {
    projectId: config.projectId,
    allowedModes: config.allowedModes,
    defaultMode: config.defaultMode,
    memoryPolicy: config.memoryPolicy,
    safetyRules,
  };
}

function buildNextActions(projectId: ExternalProjectId, researchType?: ExternalResearchType): string[] {
  if (projectId === 'boss-ai' && researchType === 'economy_news') {
    return [
      'Search recent market/news sources',
      'Verify publication dates',
      'Compare multiple independent sources',
      'Include financial disclaimer',
      'Do not present as direct investment advice',
      'Do not write unverified news directly to memory',
    ];
  }

  if (projectId === 'doomsgame-engine' && researchType === 'documentation') {
    return [
      'Search official documentation first',
      'Check framework/library version',
      'Return findings as suggestion',
      'Do not apply file changes automatically',
      'Do not execute terminal commands automatically',
    ];
  }

  if (projectId === 'egitim-web' && researchType === 'education') {
    return [
      'Use reliable education sources',
      'Adapt language to class level',
      'Keep content child-appropriate',
      'Do not store unverified facts directly to memory',
    ];
  }

  switch (projectId) {
    case 'boss-ai':
      return [
        'Display financial disclaimer',
        'Show risk and uncertainty notes',
        'Do not present as direct investment advice',
      ];
    case 'doomsgame-engine':
      return [
        'Show code analysis as suggestion',
        'Require user approval before file changes',
        'Do not execute terminal commands automatically',
      ];
    case 'egitim-web':
      return [
        'Use grade-level appropriate language',
        'Preserve education context metadata',
        'Generate content according to outputType',
      ];
    case 'aillame-local':
      return ['Continue in selected Aillame mode'];
    default:
      return ['Continue with planning-only execution'];
  }
}

function buildRoutingPlan(
  request: ExternalAillameRequest,
  memoryScopes: Array<{ scope: string }> | string[],
  safetyFlags: Record<string, boolean | string>,
  warnings: string[],
  contextSummary: Record<string, string> | undefined,
  attachmentSummary: Array<{ id: string; type: string; filename?: string; mimeType?: string }> | undefined,
  adapterPlan: ExternalAdapterPlan,
  selectedMode: ExternalApiMode,
  requiresWebResearch: boolean,
  researchType?: ExternalResearchType,
  sourcePolicy?: ExternalSourcePolicy,
  freshnessRequirement?: ExternalFreshnessRequirement,
  citationPolicy?: ExternalCitationPolicy
): ExternalRoutingPlan {
  const requiredAdapters: ExternalAdapterName[] = [];
  if (adapterPlan.textAdapterRequired) requiredAdapters.push('text');
  if (adapterPlan.imageAdapterRequired) requiredAdapters.push('image');
  if (adapterPlan.visionAdapterRequired) requiredAdapters.push('vision');

  return {
    projectId: request.projectId,
    selectedMode,
    intent: buildIntent(request.message),
    requiredAdapters,
    memoryScopes: Array.isArray(memoryScopes)
      ? memoryScopes.map((scope) => (typeof scope === 'string' ? scope : scope.scope))
      : [],
    safetyFlags,
    warnings,
    requiresWebResearch,
    researchType,
    sourcePolicy,
    freshnessRequirement,
    citationPolicy,
    contextSummary,
    attachmentSummary,
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Use POST /api/aillame/chat',
  }, { status: 405 });
}

export async function POST(req: NextRequest) {
  const endpoint = '/api/aillame/chat';
  const method = req.method;
  const startTime = Date.now();
  const clientIp = getClientIp(req);
  const userAgent = req.headers.get('user-agent') ?? undefined;

  try {
    const auth = await validateExternalApiKey(req);
    if (!auth.success) {
      const message = auth.error ?? 'Unauthorized.';
      const status = message.includes('configured') ? 503 : 401;
      await safeLogRequest({
        endpoint,
        method,
        statusCode: status,
        success: false,
        error: message,
        executionMode: 'planning_only',
        ipHash: clientIp,
        userAgent,
        durationMs: Date.now() - startTime,
      });
      return createErrorResponse(message, status);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      await safeLogRequest({
        endpoint,
        method,
        statusCode: 400,
        success: false,
        error: 'Invalid JSON payload.',
        executionMode: 'planning_only',
        ipHash: clientIp,
        userAgent,
        durationMs: Date.now() - startTime,
      });
      return createErrorResponse('Invalid JSON payload.', 400);
    }

    const metadata = getRequestMetadata(payload);
    const validation = validateExternalAillameRequest(payload);
    if (!validation.success) {
      await safeLogRequest({
        endpoint,
        method,
        requestId: metadata.requestId,
        projectId: metadata.projectId as ExternalAillameRequest['projectId'] | undefined,
        mode: metadata.mode as ExternalAillameRequest['mode'] | undefined,
        statusCode: 400,
        success: false,
        error: validation.error,
        executionMode: 'planning_only',
        ipHash: clientIp,
        userAgent,
        durationMs: Date.now() - startTime,
      });
      return createErrorResponse(validation.error, 400);
    }

    const request = validation.request;
    const config = getExternalProjectConfig(request.projectId);
    const selectedMode = request.mode ?? config.defaultMode;
    const rateLimitResult = checkExternalRateLimit(request.projectId, config.rateLimitProfile);
    if (!rateLimitResult.success) {
      await safeLogRequest({
        endpoint,
        method,
        requestId: request.requestId,
        projectId: request.projectId,
        mode: request.mode,
        statusCode: 429,
        success: false,
        error: rateLimitResult.error,
        executionMode: 'planning_only',
        ipHash: clientIp,
        userAgent,
        durationMs: Date.now() - startTime,
      });
      return createErrorResponse(rateLimitResult.error ?? 'Rate limit exceeded.', 429);
    }

    const memoryScopes = resolveExternalMemoryScopePlan(request, config);
    const requiresWebResearch = Boolean(
      request.context && isPlainObject(request.context) && request.context.requiresWebResearch === true
    );
    const researchType = requiresWebResearch
      ? resolveResearchType(request.projectId, selectedMode, request.context)
      : undefined;
    const sourcePolicy = requiresWebResearch && researchType ? buildSourcePolicy(researchType) : undefined;
    const freshnessRequirement = buildFreshnessRequirement(request.context, researchType);
    const citationPolicy = buildCitationPolicy(requiresWebResearch, researchType);
    const adapterPlan = buildAdapterPlan(request, requiresWebResearch, researchType);
    const projectPolicy = buildProjectPolicy(config);
    const normalizedTask = buildNormalizedTask(request.context);
    const contextSummary = getSafeContextSummary(request.context);
    const attachmentSummary = buildAttachmentSummary(request.attachments);

    const warnings: string[] = [];
    const safetyFlags: Record<string, boolean | string> = {
      requiresFinancialDisclaimer: false,
    };

    if (request.projectId === 'boss-ai' && request.mode === 'economy') {
      safetyFlags.requiresFinancialDisclaimer = true;
      warnings.push('Bu yatırım tavsiyesi değildir.');
    }

    if (request.projectId === 'doomsgame-engine' && request.mode === 'code') {
      warnings.push('Kod/dosya/terminal işlemleri doğrudan uygulanmaz; öneriler kullanıcı onayından geçmelidir.');
    }

    const routingPlan = buildRoutingPlan(
      request,
      memoryScopes,
      safetyFlags,
      warnings,
      contextSummary,
      attachmentSummary,
      adapterPlan,
      selectedMode,
      requiresWebResearch,
      researchType,
      sourcePolicy,
      freshnessRequirement,
      citationPolicy
    );

    const response: ExternalAillameResponse = {
      success: true,
      answer: 'Aillame external chat endpoint planning-only modda çalışıyor. Gerçek model execution sonraki aşamada bağlanacak.',
      projectId: request.projectId,
      selectedMode,
      usedAdapters: [],
      memoryScopes: memoryScopes.map((scope) => scope.scope),
      safetyFlags,
      warnings,
      taskId: null,
      executionMode: 'planning_only',
      routingPlan,
      adapterPlan,
      projectPolicy,
      normalizedTask,
      nextActions: buildNextActions(request.projectId, researchType),
    };

    await safeLogRequest({
      endpoint,
      method,
      requestId: request.requestId,
      projectId: request.projectId,
      mode: request.mode,
      statusCode: 200,
      success: true,
      executionMode: 'planning_only',
      ipHash: clientIp,
      userAgent,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch {
    await safeLogRequest({
      endpoint,
      method,
      statusCode: 500,
      success: false,
      error: 'Internal server error.',
      executionMode: 'planning_only',
      ipHash: clientIp,
      userAgent,
      durationMs: Date.now() - startTime,
    });
    return createErrorResponse('Internal server error.', 500);
  }
}
