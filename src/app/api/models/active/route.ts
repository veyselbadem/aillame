import { NextRequest, NextResponse } from 'next/server';
import { getAllModelInstallStatuses } from '@core/model-management/status';
import {
  readActiveModelSelection,
  writeActiveModelSelection,
  setActiveChatModelId,
  setActiveImageModelId,
} from '@core/model-management/active-model-store';

export const runtime = 'nodejs';

/** GET /api/models/active — returns current active model selection, auto-clearing stale IDs */
export async function GET() {
  const selection = readActiveModelSelection();
  const allModels = await getAllModelInstallStatuses();

  const chatModel = selection.activeChatModelId
    ? allModels.find((m) => m.id === selection.activeChatModelId)
    : null;
  const imageModel = selection.activeImageModelId
    ? allModels.find((m) => m.id === selection.activeImageModelId)
    : null;

  // Auto-clear stale selections (model was deleted)
  let needsWrite = false;
  let resolvedChatId = selection.activeChatModelId;
  let resolvedImageId = selection.activeImageModelId;
  if (selection.activeChatModelId && !chatModel) {
    resolvedChatId = null;
    needsWrite = true;
  }
  if (selection.activeImageModelId && !imageModel) {
    resolvedImageId = null;
    needsWrite = true;
  }
  if (needsWrite) {
    writeActiveModelSelection({ activeChatModelId: resolvedChatId, activeImageModelId: resolvedImageId });
  }

  return NextResponse.json({
    activeChatModelId: resolvedChatId,
    activeImageModelId: resolvedImageId,
    updatedAt: selection.updatedAt,
    staleChatModelCleared: selection.activeChatModelId && !chatModel ? selection.activeChatModelId : null,
    staleImageModelCleared: selection.activeImageModelId && !imageModel ? selection.activeImageModelId : null,
    chatModel: chatModel ? {
      id: chatModel.id,
      label: chatModel.label,
      runtime: chatModel.runtime,
      installed: chatModel.installed,
      builtIn: chatModel.builtIn,
    } : null,
    imageModel: imageModel ? {
      id: imageModel.id,
      label: imageModel.label,
      runtime: imageModel.runtime,
      installed: imageModel.installed,
      builtIn: imageModel.builtIn,
    } : null,
  });
}

/** POST /api/models/active — sets the active chat or image model */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, modelId } = body as { type?: string; modelId?: string };

    if (!type || !modelId) {
      return NextResponse.json(
        { success: false, error: 'type ve modelId zorunludur.' },
        { status: 400 }
      );
    }

    if (type !== 'chat' && type !== 'image') {
      return NextResponse.json(
        { success: false, error: 'type "chat" veya "image" olmalıdır.' },
        { status: 400 }
      );
    }

    // Find model in installed list
    const allModels = await getAllModelInstallStatuses();
    const model = allModels.find((m) => m.id === modelId);

    if (!model) {
      return NextResponse.json(
        { success: false, error: `Model bulunamadı: ${modelId}. Önce listeyi yenileyin.` },
        { status: 404 }
      );
    }

    if (!model.installed) {
      return NextResponse.json(
        { success: false, error: `Model henüz kurulu değil: ${model.label}. Önce modeli yükleyin.` },
        { status: 422 }
      );
    }

    // Capability validation
    if (type === 'image') {
      const caps: string[] = model.capabilities ?? [];
      const isImageCapable =
        model.purpose === 'image-generation' ||
        caps.includes('image-generation') ||
        caps.includes('image');
      if (!isImageCapable) {
        return NextResponse.json(
          {
            success: false,
            error: `"${model.label}" görsel üretim modeli değil. Görsel üretim için SDXL veya benzeri bir model seçin.`,
          },
          { status: 422 }
        );
      }
    }

    if (type === 'chat') {
      const caps: string[] = model.capabilities ?? [];
      const isChatCapable =
        model.purpose === 'chat' ||
        caps.includes('text-generation') ||
        caps.includes('chat') ||
        caps.includes('text');
      if (!isChatCapable) {
        return NextResponse.json(
          {
            success: false,
            error: `"${model.label}" bir chat/LLM modeli değil. Chat için LLM seçin.`,
          },
          { status: 422 }
        );
      }
    }

    // Persist the selection
    const updated =
      type === 'chat'
        ? setActiveChatModelId(modelId)
        : setActiveImageModelId(modelId);

    return NextResponse.json({
      success: true,
      type,
      modelId,
      label: model.label,
      updatedAt: updated.updatedAt,
      message: `"${model.label}" aktif ${type === 'chat' ? 'chat' : 'görsel'} modeli olarak ayarlandı.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Aktif model ayarlanamadı.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
