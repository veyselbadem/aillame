'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FiCheckCircle, FiDownloadCloud, FiLoader, FiSettings, FiTrash2,
  FiZap, FiImage, FiCpu, FiBox, FiDatabase, FiPlus, FiSearch, FiFolder, FiGlobe, FiCopy
} from 'react-icons/fi';
import { useSettings } from '@hooks/useSettings';
import type { AillameTier, LLMMode } from '@apptypes/settings';
import { isLegacyProvidersEnabled } from '@core/feature-flags/legacy-providers';
import { aillameFetch } from '@/lib/aillame-api-client';
import { safeConfirm } from '@/lib/confirm';

const MODES: Array<{ value: LLMMode; label: string; description: string }> = [
  { value: 'local', label: 'Local', description: 'Nano için yerel Rust çekirdeği.' },
  { value: 'hybrid', label: 'Hybrid (Experimental)', description: 'Deneysel uyumluluk modu.' },
  { value: 'cloud', label: 'Cloud (Legacy)', description: 'Eski uzak sağlayıcı modu.' },
];
const LEGACY_PROVIDERS_ENABLED = isLegacyProvidersEnabled();
function modeBadge(mode: LLMMode): string | undefined {
  if (mode === 'hybrid') return 'ADVANCED ONLY';
  if (mode === 'cloud') return 'DEPRECATED';
  return undefined;
}
const TIERS: Array<{ value: AillameTier; label: string; description: string }> = [
  { value: 'nano', label: 'Nano', description: 'Aillame Nano text-only yerel çekirdek.' },
  { value: 'pro', label: 'Pro', description: 'Opsiyonel gelişmiş model profili; yalnızca kurulu modellerle kullanılır.' },
];

type ModelStatus = {
  id: string;
  label: string;
  purpose: 'chat' | 'image-generation';
  tier: AillameTier;
  runtime: string;
  repoId?: string;
  sizeLabel: string;
  capabilities: string[];
  description: string;
  installHint: string;
  installed: boolean;
  builtIn: boolean;
  cachePath?: string;
  runtimeAvailable: boolean;
};

type ActiveSelection = {
  activeChatModelId: string | null;
  activeImageModelId: string | null;
};

type ModelPathStatus = 'ready' | 'missing' | 'warning' | 'optional_missing' | 'legacy_absent';

type ModelPathCheck = {
  label: string;
  path: string;
  exists: boolean;
  signature?: string | null;
  sizeBytes: number;
  type: 'file' | 'directory';
  error?: string;
};

type ModelPathHealthDetail = {
  id: string;
  name: string;
  role: string;
  required: boolean;
  requirement: 'required' | 'optional' | 'legacy';
  status: ModelPathStatus;
  paths: ModelPathCheck[];
  note?: string;
};

type ModelPathHealth = {
  ok: boolean;
  generatedAt: string;
  checkedAt?: string;
  readOnly: true;
  models: ModelPathHealthDetail[];
  summary: {
    ready: number;
    missing: number;
    warning: number;
    optionalMissing: number;
    legacyAbsent: number;
  };
  message: string;
};

type RuntimePortHealth = {
  ok: boolean;
  host: string;
  port: number;
  available: boolean;
  occupied: boolean;
  owner: 'available' | 'aillame' | 'unknown';
  message: string;
  recommendation?: string;
};

function purposeLabel(purpose: ModelStatus['purpose']) {
  return purpose === 'chat' ? 'Chat / LLM' : 'Görsel Üretim';
}

function pathStatusLabel(status: ModelPathStatus) {
  const labels: Record<ModelPathStatus, string> = {
    ready: 'Hazır',
    missing: 'Eksik',
    warning: 'Uyarı',
    optional_missing: 'Opsiyonel Eksik',
    legacy_absent: 'Legacy Yok',
  };
  return labels[status];
}

function pathStatusClass(status: ModelPathStatus) {
  if (status === 'ready') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (status === 'missing') return 'bg-rose-500/10 text-rose-300 border-rose-500/25';
  if (status === 'warning' || status === 'optional_missing') return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
  return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const fractionDigits = unitIndex >= 3 ? 3 : value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

function formatCheckedAt(value?: string) {
  if (!value) return 'Henüz kontrol yapılmadı';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Henüz kontrol yapılmadı';
  return `Son kontrol: ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

function getPathHealthSummaryMessage(pathHealth: ModelPathHealth | null) {
  if (!pathHealth) return 'Henüz kontrol yapılmadı';
  if (pathHealth.summary.missing > 0) {
    return 'Bazı gerekli model dosyaları eksik. Lütfen model yollarını kontrol edin.';
  }
  if (pathHealth.summary.warning > 0) {
    return 'Bazı model yollarında uyarı var. Ayrıntıları aşağıdan kontrol edin.';
  }
  if (pathHealth.summary.legacyAbsent > 0) {
    return 'Temel yerel AI modelleri hazır görünüyor. Legacy modeller eksik olabilir; bu durum ana sistemi etkilemez.';
  }
  return 'Temel yerel AI modelleri hazır görünüyor.';
}

function supportStatusLabel(model: ModelPathHealthDetail) {
  if (model.id === 'tiny-sd' && model.status === 'legacy_absent') {
    return 'Kaldırılmış Legacy';
  }
  return pathStatusLabel(model.status);
}

function buildModelPathSupportSummary(pathHealth: ModelPathHealth) {
  const lines = [
    'Aillame Model Yolu Destek Özeti',
    formatCheckedAt(pathHealth.checkedAt || pathHealth.generatedAt),
    `Genel durum: ${getPathHealthSummaryMessage(pathHealth)}`,
    '',
    'Özet:',
    `- Hazır: ${pathHealth.summary.ready}`,
    `- Eksik: ${pathHealth.summary.missing}`,
    `- Uyarı: ${pathHealth.summary.warning}`,
    `- Legacy Yok: ${pathHealth.summary.legacyAbsent}`,
    '',
    'Modeller:',
  ];

  for (const model of pathHealth.models) {
    lines.push(`- ${model.name}: ${supportStatusLabel(model)}`);
    if (model.id === 'tiny-sd') {
      lines.push('  - Tiny SD artık aktif/korunan model değildir. Eksik olması hata değildir.');
      continue;
    }

    for (const item of model.paths) {
      const parts = [item.exists ? 'Var' : 'Yok'];
      if (item.signature) parts.push(item.signature);
      parts.push(formatBytes(item.sizeBytes));
      if (item.error) parts.push('Uyarı var');
      lines.push(`  - ${item.label}: ${parts.join(', ')}`);
    }
  }

  lines.push(
    '',
    'Not:',
    'Bu rapor yalnızca dosya varlığı, boyut ve temel imza bilgisini içerir. Gizli anahtar, parola, ortam dosyası içeriği veya kişisel kullanıcı yolu içermez.',
  );

  return lines.join('\n');
}

function readinessBadgeClass(status: 'ready' | 'missing' | 'warning' | 'info') {
  if (status === 'ready') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (status === 'missing') return 'bg-rose-500/10 text-rose-300 border-rose-500/25';
  if (status === 'warning') return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
  return 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20';
}

function getModelGuideStatus(pathHealth: ModelPathHealth | null, modelId: string) {
  const model = pathHealth?.models.find(item => item.id === modelId);
  if (!model) return { label: 'Kontrol bekliyor', status: 'warning' as const };
  if (model.status === 'ready') return { label: 'Hazır', status: 'ready' as const };
  if (model.status === 'missing') return { label: 'Eksik', status: 'missing' as const };
  if (model.status === 'warning') return { label: 'Uyarı', status: 'warning' as const };
  if (model.status === 'legacy_absent') return { label: 'Kaldırılmış Legacy', status: 'info' as const };
  return { label: 'Opsiyonel Eksik', status: 'warning' as const };
}

function getPortGuideStatus(portHealth: RuntimePortHealth | null, loadingPortHealth: boolean) {
  if (loadingPortHealth) return { label: 'Kontrol ediliyor', status: 'warning' as const };
  if (!portHealth) return { label: 'Kontrol bekliyor', status: 'warning' as const };
  if (portHealth.owner === 'aillame') return { label: 'Aillame çalışıyor', status: 'ready' as const };
  if (portHealth.available) return { label: 'Kullanılabilir', status: 'ready' as const };
  if (portHealth.occupied) return { label: 'Port kullanımda', status: 'missing' as const };
  return { label: 'Kontrol edilemedi', status: 'warning' as const };
}

function OnboardingReadinessGuide({
  pathHealth,
  loadingPathHealth,
  loadPathHealth,
  copyPathHealthSupportSummary,
  pathHealthCopyMessage,
  portHealth,
  loadingPortHealth,
  portHealthError,
  loadPortHealth,
}: {
  pathHealth: ModelPathHealth | null;
  loadingPathHealth: boolean;
  loadPathHealth: () => void;
  copyPathHealthSupportSummary: () => void;
  pathHealthCopyMessage: string | null;
  portHealth: RuntimePortHealth | null;
  loadingPortHealth: boolean;
  portHealthError: string | null;
  loadPortHealth: () => void;
}) {
  const portStatus = getPortGuideStatus(portHealth, loadingPortHealth);
  const qwenStatus = getModelGuideStatus(pathHealth, 'qwen3-vl-4b-instruct-q4-k-m');
  const sdxlStatus = getModelGuideStatus(pathHealth, 'sdxl-turbo-1.0');
  const nanoStatus = getModelGuideStatus(pathHealth, 'aillame-nano-v1');
  const tinyStatus = getModelGuideStatus(pathHealth, 'tiny-sd');
  const mainReady = Boolean(pathHealth?.ok && portHealth?.ok);
  const statusRows = [
    { label: 'Qwen3-VL 4B', value: qwenStatus.label, status: qwenStatus.status },
    { label: 'SDXL Turbo', value: sdxlStatus.label, status: sdxlStatus.status },
    { label: 'Aillame Nano', value: nanoStatus.label, status: nanoStatus.status },
    { label: 'Tiny SD', value: tinyStatus.label, status: 'info' as const },
  ];

  return (
    <section className="glass-card rounded-[28px] p-5 border-white/5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">İlk Açılış Rehberi</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
            Aillame'in yerel modelleri, port durumu ve güvenlik ayarlarını hızlıca kontrol edin.
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${readinessBadgeClass(mainReady ? 'ready' : 'warning')}`}>
          {mainReady ? 'Hazır' : 'Kontrol'}
        </span>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[10px] leading-relaxed text-indigo-200">
        <p className="font-bold">{mainReady ? 'Temel sistem hazır görünüyor.' : 'Bazı hazırlık kontrolleri tamamlanmadı veya uyarı veriyor.'}</p>
        <p className="mt-1">Bu kontroller yalnızca okuma yapar, dosya indirmez veya silmez.</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <article className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-white">Yerel Sunucu</p>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                Port: {portHealth?.port ?? 3000}. Port başka uygulama tarafından kullanılıyorsa Aillame açılmayabilir.
              </p>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${readinessBadgeClass(portStatus.status)}`}>
              {portStatus.label}
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
            {portHealth?.message ?? portHealthError ?? 'Port durumu henüz kontrol edilmedi.'}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs font-black text-white">Model Dosyaları</p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {statusRows.map(item => (
              <div key={item.label} className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                <span className="text-[10px] font-bold text-gray-300">{item.label}</span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${readinessBadgeClass(item.status)}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
            Tiny SD artık aktif model değildir; eksikliği hata değildir.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs font-black text-white">Yerel Veri</p>
          <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
            Verileriniz cihazınızda saklanır. Hafıza, proje bağlamı ve öğrenme verileri otomatik buluta gönderilmez.
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
            Sohbeti Temizle kalıcı hafızayı silmez; yalnızca ekrandaki aktif sohbeti, taslağı ve görsel eki temizler.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs font-black text-white">Güvenlik</p>
          <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
            Shell/PowerShell/CMD serbest çalıştırılmaz. Token/env/şifre gösterme engellenir.
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
            Model dosyaları otomatik silinmez veya indirilmez.
          </p>
        </article>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={loadPathHealth}
          disabled={loadingPathHealth}
          className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50"
        >
          <FiLoader size={11} className={loadingPathHealth ? 'animate-spin' : ''} />
          Model Yollarını Kontrol Et
        </button>
        <button
          type="button"
          onClick={loadPortHealth}
          disabled={loadingPortHealth}
          className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50"
        >
          <FiLoader size={11} className={loadingPortHealth ? 'animate-spin' : ''} />
          Port Durumunu Kontrol Et
        </button>
        <button
          type="button"
          onClick={copyPathHealthSupportSummary}
          disabled={!pathHealth || loadingPathHealth}
          className="h-8 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50"
        >
          <FiCopy size={11} />
          Destek Özeti Kopyala
        </button>
        <a
          href="/admin/desktop-readiness"
          className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
        >
          <FiCpu size={11} />
          Sorun Giderme Rehberini Aç
        </a>
      </div>

      {pathHealthCopyMessage && (
        <p className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] leading-relaxed text-emerald-200">
          {pathHealthCopyMessage}
        </p>
      )}
    </section>
  );
}

function ModelCard({
  model,
  activeChatModelId,
  activeImageModelId,
  installing,
  removing,
  activating,
  onInstall,
  onRemove,
  onActivate,
}: {
  model: ModelStatus;
  activeChatModelId: string | null;
  activeImageModelId: string | null;
  installing: string | null;
  removing: string | null;
  activating: string | null;
  onInstall: (id: string) => void;
  onRemove: (id: string, label: string) => void;
  onActivate: (id: string, type: 'chat' | 'image') => void;
}) {
  const isChat = model.purpose === 'chat';
  const isActiveChat = activeChatModelId === model.id;
  const isActiveImage = activeImageModelId === model.id;
  const isActive = isActiveChat || isActiveImage;
  const isBusy = installing === model.id || removing === model.id || activating === model.id;

  return (
    <article className={`rounded-[22px] border p-4 transition-all ${
      isActive
        ? 'border-indigo-400/40 bg-indigo-500/5'
        : 'border-white/10 bg-black/20'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-400">
              {purposeLabel(model.purpose)}
            </span>
            {model.builtIn && (
              <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[8px] font-black uppercase text-violet-300">
                Bundled
              </span>
            )}
            {isActive && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Aktif
              </span>
            )}
          </div>
          <h3 className="text-base font-black text-white leading-tight">{model.label}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-400 line-clamp-2">{model.description}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
          model.installed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
        }`}>
          {model.installed ? 'Kurulu' : 'Kurulabilir'}
        </span>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[9px] text-gray-400">{model.tier}</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[9px] text-gray-400">{model.runtime}</span>
        <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[9px] text-gray-400">{model.sizeLabel}</span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-[9px] text-gray-600 font-mono truncate max-w-[100px]">
          {model.cachePath ? `…/${model.cachePath.split(/[\\/]/).slice(-1)[0]}` : model.builtIn ? 'bundled' : '—'}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {/* Remove button — only installed, non-active, non-bundled */}
          {model.installed && !model.builtIn && !isActive && (
            <button
              type="button"
              onClick={() => onRemove(model.id, model.label)}
              disabled={isBusy}
              className="h-8 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40 transition-all"
              title="Modeli kaldır"
            >
              {removing === model.id ? <FiLoader className="animate-spin" size={11} /> : <FiTrash2 size={11} />}
              <span className="hidden sm:inline">Kaldır</span>
            </button>
          )}

          {/* Activate / Active indicator */}
          {model.installed && !isActive && (
            <button
              type="button"
              onClick={() => onActivate(model.id, isChat ? 'chat' : 'image')}
              disabled={isBusy}
              className="h-8 px-3 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40 transition-all"
            >
              {activating === model.id
                ? <FiLoader className="animate-spin" size={11} />
                : isChat ? <FiZap size={11} /> : <FiImage size={11} />}
              Kullan
            </button>
          )}

          {model.installed && isActive && (
            <div className="h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <FiCheckCircle size={11} />
              Aktif
            </div>
          )}

          {/* Install button — not installed */}
          {!model.installed && (
            <button
              type="button"
              onClick={() => onInstall(model.id)}
              disabled={isBusy || model.builtIn}
              className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40 transition-all"
            >
              {installing === model.id
                ? <FiLoader className="animate-spin" size={11} />
                : <FiDownloadCloud size={11} />}
              Kur
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function SettingsPage() {
  const { llmMode, setLlmMode, tier, setTier } = useSettings();
  const [legacyProvidersEnabled, setLegacyProvidersEnabled] = useState(LEGACY_PROVIDERS_ENABLED);
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [activeSelection, setActiveSelection] = useState<ActiveSelection>({ activeChatModelId: null, activeImageModelId: null });
  const [loadingModels, setLoadingModels] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pathHealth, setPathHealth] = useState<ModelPathHealth | null>(null);
  const [loadingPathHealth, setLoadingPathHealth] = useState(false);
  const [pathHealthError, setPathHealthError] = useState<string | null>(null);
  const [pathHealthStatusMessage, setPathHealthStatusMessage] = useState('Henüz kontrol yapılmadı');
  const [pathHealthCopyMessage, setPathHealthCopyMessage] = useState<string | null>(null);
  const [pathHealthSupportText, setPathHealthSupportText] = useState<string | null>(null);
  const [portHealth, setPortHealth] = useState<RuntimePortHealth | null>(null);
  const [loadingPortHealth, setLoadingPortHealth] = useState(false);
  const [portHealthError, setPortHealthError] = useState<string | null>(null);

  // Aillame Hafıza ve Bağlam Yönetimi Durum Bildirimleri ve Fonksiyonları (Phase 6)
  const [activeTab, setActiveTab] = useState<'models' | 'memory' | 'projects' | 'distillation'>('models');
  const [memories, setMemories] = useState<any[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [memorySearch, setMemorySearch] = useState('');
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState<'preference' | 'project' | 'system' | 'workflow' | 'note'>('preference');
  const [newMemoryScope, setNewMemoryScope] = useState<'user' | 'project' | 'session'>('user');
  const [newMemoryTags, setNewMemoryTags] = useState('');
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memorySuccess, setMemorySuccess] = useState<string | null>(null);

  // Aillame Proje Bağlamı / Workspace Context (Phase 8)
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [newProjId, setNewProjId] = useState('');
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjCategory, setNewProjCategory] = useState<'website' | 'software' | 'content' | 'legal' | 'psychology' | 'social' | 'other'>('website');
  const [newProjGoals, setNewProjGoals] = useState('');
  const [newProjTone, setNewProjTone] = useState('');
  const [newProjLanguage, setNewProjLanguage] = useState<'tr' | 'en' | 'mixed'>('tr');
  const [newProjSeoEnabled, setNewProjSeoEnabled] = useState(false);
  const [newProjSeoMinWords, setNewProjSeoMinWords] = useState(300);
  const [newProjSeoHeadings, setNewProjSeoHeadings] = useState(true);
  const [newProjSeoMeta, setNewProjSeoMeta] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectSuccess, setProjectSuccess] = useState<string | null>(null);

  // Aillame Distillation Dataset (Phase 9)
  const [samples, setSamples] = useState<any[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [sampleStats, setSampleStats] = useState<any>({ total: 0 });
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [sampleSuccess, setSampleSuccess] = useState<string | null>(null);
  const [sampleSearch, setSampleSearch] = useState('');

  // New sample form state
  const [newSampleKind, setNewSampleKind] = useState<'routing' | 'tool_use' | 'safety_block' | 'project_context' | 'memory_retrieval' | 'chat_quality'>('routing');
  const [newSamplePrompt, setNewSamplePrompt] = useState('');
  const [newSampleExpected, setNewSampleExpected] = useState('{\n  "intent": "text_chat",\n  "target": "aillame_nano"\n}');


  const loadMemories = useCallback(async (q = '') => {
    setLoadingMemories(true);
    setMemoryError(null);
    try {
      const url = q ? `/api/aillame/memory?q=${encodeURIComponent(q)}` : '/api/aillame/memory';
      const data = await aillameFetch(url);
      if (!data.success) throw new Error(data.error || 'Hafıza kayıtları yüklenemedi.');
      setMemories(data.memories || []);
    } catch (err: any) {
      setMemoryError(err.message);
    } finally {
      setLoadingMemories(false);
    }
  }, []);

  const addMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;
    setMemoryError(null);
    setMemorySuccess(null);
    try {
      const tagsArray = newMemoryTags.split(',').map(t => t.trim()).filter(Boolean);
      const data = await aillameFetch('/api/aillame/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newMemoryType,
          scope: newMemoryScope,
          content: newMemoryContent.trim(),
          tags: tagsArray
        })
      });
      if (!data.success) throw new Error(data.error || 'Hafıza eklenemedi.');
      
      setMemorySuccess('Hafıza kaydı başarıyla eklendi.');
      setNewMemoryContent('');
      setNewMemoryTags('');
      await loadMemories();
      setTimeout(() => setMemorySuccess(null), 4000);
    } catch (err: any) {
      setMemoryError(err.message);
    }
  };

  const deleteMemory = async (id: string) => {
    if (!await safeConfirm('Bu hafıza kaydını kalıcı olarak silmek istediğinize emin misiniz?', { title: 'Hafıza Kaydını Sil' })) return;
    setMemoryError(null);
    setMemorySuccess(null);
    try {
      const data = await aillameFetch('/api/aillame/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      if (!data.success) throw new Error(data.error || 'Hafıza silinemedi.');
      setMemorySuccess('Hafıza kaydı başarıyla silindi.');
      await loadMemories();
      setTimeout(() => setMemorySuccess(null), 4000);
    } catch (err: any) {
      setMemoryError(err.message);
    }
  };

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setProjectError(null);
    try {
      const [listData, activeData] = await Promise.all([
        aillameFetch('/api/aillame/projects'),
        aillameFetch('/api/aillame/projects/active')
      ]);
      
      if (!listData.success) throw new Error(listData.error || 'Projeler yüklenemedi.');
      if (!activeData.success) throw new Error(activeData.error || 'Aktif proje bilgisi alınamadı.');
      
      setProjects(listData.projects || []);
      setActiveProjectId(activeData.activeProjectId);
    } catch (err: any) {
      setProjectError(err.message);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const handleSelectActiveProject = async (id: string | null) => {
    setProjectError(null);
    setProjectSuccess(null);
    try {
      const data = await aillameFetch('/api/aillame/projects/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id })
      });
      if (!data.success) throw new Error(data.error || 'Aktif proje ayarlanamadı.');
      
      setActiveProjectId(id);
      setProjectSuccess(id ? 'Aktif proje bağlamı başarıyla seçildi.' : 'Aktif proje bağlamı temizlendi.');
      setTimeout(() => setProjectSuccess(null), 3000);
    } catch (err: any) {
      setProjectError(err.message);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjId.trim() || !newProjName.trim()) return;
    setProjectError(null);
    setProjectSuccess(null);
    try {
      const goalsArray = newProjGoals.split('\n').map(g => g.trim()).filter(Boolean);
      const data = await aillameFetch('/api/aillame/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newProjId.trim().toLowerCase().replace(/\s+/g, '-'),
          name: newProjName.trim(),
          description: newProjDesc.trim(),
          category: newProjCategory,
          goals: goalsArray,
          tone: newProjTone.trim(),
          language: newProjLanguage,
          seoPreferences: {
            enabled: newProjSeoEnabled,
            minWords: Number(newProjSeoMinWords),
            headings: newProjSeoHeadings,
            metaDescription: newProjSeoMeta
          },
          linkedMemoryTags: []
        })
      });
      if (!data.success) throw new Error(data.error || 'Proje oluşturulamadı.');
      
      setProjectSuccess('Yeni proje bağlamı başarıyla oluşturuldu.');
      setNewProjId('');
      setNewProjName('');
      setNewProjDesc('');
      setNewProjGoals('');
      setNewProjTone('');
      setNewProjSeoEnabled(false);
      
      await loadProjects();
      setTimeout(() => setProjectSuccess(null), 4000);
    } catch (err: any) {
      setProjectError(err.message);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!await safeConfirm(`"${name}" proje bağlamını listeden kaldırmak istediğinize emin misiniz?\n\nBu işlem fiziksel klasör veya dosyalara zarar vermez.`, { title: 'Proje Bağlamını Kaldır' })) return;
    setProjectError(null);
    setProjectSuccess(null);
    try {
      const data = await aillameFetch(`/api/aillame/projects?id=${id}`, {
        method: 'DELETE'
      });
      if (!data.success) throw new Error(data.error || 'Proje kaldırılamadı.');
      
      setProjectSuccess('Proje bağlamı başarıyla kaldırıldı.');
      await loadProjects();
      setTimeout(() => setProjectSuccess(null), 3000);
    } catch (err: any) {
      setProjectError(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'memory') {
      loadMemories(memorySearch);
    }
  }, [activeTab, memorySearch, loadMemories]);

  useEffect(() => {
    if (activeTab === 'projects') {
      loadProjects();
    }
  }, [activeTab, loadProjects]);

  const loadDistillation = useCallback(async (q = '') => {
    setLoadingSamples(true);
    setSampleError(null);
    try {
      const url = q ? `/api/aillame/distillation/dataset?query=${encodeURIComponent(q)}` : '/api/aillame/distillation/dataset';
      const [dsData, statsData] = await Promise.all([
        aillameFetch(url),
        aillameFetch('/api/aillame/distillation/dataset/stats')
      ]);

      if (!dsData.success) throw new Error(dsData.error || 'Öğrenme verisi yüklenemedi.');
      if (!statsData.success) throw new Error(statsData.error || 'İstatistikler alınamadı.');

      setSamples(dsData.samples || []);
      setSampleStats(statsData.stats || { total: 0 });
    } catch (err: any) {
      setSampleError(err.message);
    } finally {
      setLoadingSamples(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'distillation') {
      loadDistillation(sampleSearch);
    }
  }, [activeTab, sampleSearch, loadDistillation]);

  const handleCreateSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSamplePrompt.trim()) return;
    setSampleError(null);
    setSampleSuccess(null);
    try {
      let parsedExpected = {};
      try {
        parsedExpected = JSON.parse(newSampleExpected);
      } catch {
        throw new Error('Beklenen çıktı alanı geçerli bir JSON formatında olmalıdır.');
      }

      const data = await aillameFetch('/api/aillame/distillation/dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: newSampleKind,
          redactedPrompt: newSamplePrompt.trim(),
          expected: parsedExpected,
          source: 'manual'
        })
      });

      if (!data.success) throw new Error(data.error || 'Veri kaydı başarısız oldu.');

      setSampleSuccess('Öğrenme verisi örneği başarıyla kaydedildi.');
      setNewSamplePrompt('');
      await loadDistillation();
      setTimeout(() => setSampleSuccess(null), 4000);
    } catch (err: any) {
      setSampleError(err.message);
    }
  };

  const handleDeleteSample = async (id: string) => {
    if (!await safeConfirm('Bu veri örneğini kalıcı olarak silmek istediğinize emin misiniz?', { title: 'Örnek Veriyi Sil' })) return;
    setSampleError(null);
    setSampleSuccess(null);
    try {
      const data = await aillameFetch(`/api/aillame/distillation/dataset?id=${id}`, {
        method: 'DELETE'
      });
      if (!data.success) throw new Error(data.error || 'Veri silinemedi.');
      setSampleSuccess('Veri örneği başarıyla kaldırıldı.');
      await loadDistillation();
      setTimeout(() => setSampleSuccess(null), 3000);
    } catch (err: any) {
      setSampleError(err.message);
    }
  };

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const [modelsPayload, activePayload] = await Promise.all([
        aillameFetch('/api/models'),
        aillameFetch('/api/models/active'),
      ]);
      setModels(modelsPayload.models || []);
      setActiveSelection({
        activeChatModelId: activePayload.activeChatModelId ?? null,
        activeImageModelId: activePayload.activeImageModelId ?? null,
      });
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Model durumu alınamadı.');
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const loadPathHealth = useCallback(async () => {
    setLoadingPathHealth(true);
    setPathHealthError(null);
    setPathHealthCopyMessage(null);
    setPathHealthStatusMessage('Model yolları kontrol ediliyor...');
    try {
      const payload = await aillameFetch('/api/aillame/models/path-health');
      setPathHealth(payload);
      setPathHealthStatusMessage('Model yolu kontrolü tamamlandı.');
    } catch (error) {
      setPathHealthError(error instanceof Error ? error.message : 'Model yolu doğrulama bilgisi alınamadı.');
      setPathHealthStatusMessage('Model yolu kontrolü sırasında hata oluştu.');
    } finally {
      setLoadingPathHealth(false);
    }
  }, []);

  const loadPortHealth = useCallback(async () => {
    setLoadingPortHealth(true);
    setPortHealthError(null);
    try {
      const response = await fetch('/api/aillame/runtime/port-health', { cache: 'no-store' });
      const payload = await response.json();
      setPortHealth(payload);
      if (!response.ok && payload?.message) {
        setPortHealthError(payload.message);
      }
    } catch (error) {
      setPortHealthError(error instanceof Error ? error.message : 'Port durumu alınamadı.');
      setPortHealth(null);
    } finally {
      setLoadingPortHealth(false);
    }
  }, []);

  const copyPathHealthSupportSummary = useCallback(async () => {
    if (!pathHealth) {
      setPathHealthCopyMessage('Önce model yolu kontrolü yapılmalı.');
      return;
    }

    const report = buildModelPathSupportSummary(pathHealth);
    setPathHealthSupportText(null);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard desteklenmiyor.');
      }

      await navigator.clipboard.writeText(report);
      setPathHealthCopyMessage('Destek özeti panoya kopyalandı.');
    } catch {
      setPathHealthSupportText(report);
      setPathHealthCopyMessage('Destek özeti kopyalanamadı. Metni aşağıdan elle kopyalayabilirsiniz.');
    }
  }, [pathHealth]);

  useEffect(() => { loadModels(); }, [loadModels]);
  useEffect(() => { loadPathHealth(); }, [loadPathHealth]);
  useEffect(() => { loadPortHealth(); }, [loadPortHealth]);

  useEffect(() => {
    let cancelled = false;
    aillameFetch('/api/settings/legacy-providers')
      .then(p => { if (!cancelled) setLegacyProvidersEnabled(p?.enabled === true); })
      .catch(() => { if (!cancelled) setLegacyProvidersEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!legacyProvidersEnabled && llmMode !== 'local') setLlmMode('local');
  }, [legacyProvidersEnabled, llmMode, setLlmMode]);

  const installModel = async (modelId: string) => {
    setInstalling(modelId); setModelError(null); setSuccessMsg(null);
    try {
      const payload = await aillameFetch('/api/models', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', modelId }),
      });
      if (!payload.success) throw new Error(payload.error || 'Model kurulamadı.');
      await loadModels();
    } catch (e) {
      setModelError(e instanceof Error ? e.message : 'Model kurulamadı.');
    } finally { setInstalling(null); }
  };

  const removeModel = async (modelId: string, label: string) => {
    if (!await safeConfirm(`'${label}' modelini kaldırmak istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`, { title: 'Modeli Kaldır' })) return;
    setRemoving(modelId); setModelError(null); setSuccessMsg(null);
    try {
      const payload = await aillameFetch('/api/models', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', modelId }),
      });
      if (!payload.success) throw new Error(payload.error || payload.message || 'Model kaldırılamadı.');
      setSuccessMsg(`'${label}' başarıyla kaldırıldı.`);
      await loadModels();
    } catch (e) {
      setModelError(e instanceof Error ? e.message : 'Model kaldırılamadı.');
    } finally { setRemoving(null); }
  };

  const activateModel = async (modelId: string, type: 'chat' | 'image') => {
    setActivating(modelId); setModelError(null); setSuccessMsg(null);
    try {
      const payload = await aillameFetch('/api/models/active', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, modelId }),
      });
      if (!payload.success) throw new Error(payload.error || 'Aktif model ayarlanamadı.');
      setSuccessMsg(payload.message || 'Aktif model güncellendi.');
      await loadModels();
    } catch (e) {
      setModelError(e instanceof Error ? e.message : 'Aktif model ayarlanamadı.');
    } finally { setActivating(null); }
  };

  const activeChatModel = models.find(m => m.id === activeSelection.activeChatModelId);
  const activeImageModel = models.find(m => m.id === activeSelection.activeImageModelId);
  const chatModels = models.filter(m => m.purpose === 'chat');
  const imageModels = models.filter(m => m.purpose === 'image-generation');

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pt-12 md:pt-20 pb-12 animate-fade-in">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
          <FiSettings size={14} className="text-indigo-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Panel & Tercihler</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">Ayarlar</h1>
      </header>

      {/* Modern Premium Tab Switcher */}
      <div className="flex gap-2 border-b border-white/10 pb-4 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('models')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${
            activeTab === 'models'
              ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/5'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200'
          }`}
        >
          <FiCpu size={14} />
          Modeller & Modlar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('memory')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${
            activeTab === 'memory'
              ? 'bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 shadow-lg shadow-fuchsia-500/5'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200'
          }`}
        >
          <FiDatabase size={14} />
          Aillame Hafızası
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${
            activeTab === 'projects'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/5'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200'
          }`}
        >
          <FiFolder size={14} />
          Proje Bağlamları
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('distillation')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${
            activeTab === 'distillation'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-lg shadow-amber-500/5'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200'
          }`}
        >
          <FiZap size={14} />
          Nano Öğrenme Verileri
        </button>
      </div>

      {activeTab === 'models' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
          {/* Left panel */}
          <div className="space-y-4">
            <OnboardingReadinessGuide
              pathHealth={pathHealth}
              loadingPathHealth={loadingPathHealth}
              loadPathHealth={loadPathHealth}
              copyPathHealthSupportSummary={copyPathHealthSupportSummary}
              pathHealthCopyMessage={pathHealthCopyMessage}
              portHealth={portHealth}
              loadingPortHealth={loadingPortHealth}
              portHealthError={portHealthError}
              loadPortHealth={loadPortHealth}
            />

            {/* Active model summary */}
            <section className="glass-card rounded-[28px] p-5 border-white/5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Aktif Modeller</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <FiZap size={14} className="text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Aktif LLM</p>
                    <p className="text-sm font-bold text-white truncate">
                      {activeChatModel?.label ?? <span className="text-gray-500 italic text-xs">Seçilmedi</span>}
                    </p>
                    {activeChatModel && (
                      <p className="text-[9px] text-indigo-400 font-mono">{activeChatModel.runtime}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <FiImage size={14} className="text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Aktif Görsel Modeli</p>
                    <p className="text-sm font-bold text-white truncate">
                      {activeImageModel?.label ?? <span className="text-gray-500 italic text-xs">Seçilmedi</span>}
                    </p>
                    {activeImageModel && (
                      <p className="text-[9px] text-violet-400 font-mono">{activeImageModel.runtime}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center flex-shrink-0">
                    <FiCpu size={14} className="text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Çalışma Modu</p>
                    <p className="text-sm font-bold text-white uppercase">{llmMode}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-card rounded-[28px] p-5 border-white/5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Model Yolu Doğrulama</h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                    Bu kontrol yalnızca yerel dosya varlığını doğrular; dosya indirmez veya silmez.
                  </p>
                  <p className="mt-2 text-[10px] font-bold text-indigo-300">
                    {formatCheckedAt(pathHealth?.checkedAt || pathHealth?.generatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={copyPathHealthSupportSummary}
                    disabled={!pathHealth || loadingPathHealth}
                    title="Model yolu durumunu güvenli destek metni olarak panoya kopyalar."
                    className="h-8 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <FiCopy size={11} />
                    Destek Özeti Kopyala
                  </button>
                  <button
                    type="button"
                    onClick={loadPathHealth}
                    disabled={loadingPathHealth}
                    className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <FiLoader size={11} className={loadingPathHealth ? 'animate-spin' : ''} />
                    {loadingPathHealth ? 'Model yolları kontrol ediliyor...' : 'Tekrar kontrol et'}
                  </button>
                </div>
              </div>

              <div className="mb-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[10px] leading-relaxed text-indigo-200">
                <p className="font-bold">{pathHealthStatusMessage}</p>
                <p className="mt-1">{getPathHealthSummaryMessage(pathHealth)}</p>
              </div>

              {pathHealth && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Hazır', value: pathHealth.summary.ready, tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
                    { label: 'Eksik', value: pathHealth.summary.missing, tone: 'bg-rose-500/10 text-rose-300 border-rose-500/25' },
                    { label: 'Uyarı', value: pathHealth.summary.warning, tone: 'bg-amber-500/10 text-amber-300 border-amber-500/25' },
                    { label: 'Legacy Yok', value: pathHealth.summary.legacyAbsent, tone: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-2xl border px-3 py-2 ${item.tone}`}>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-75">{item.label}</p>
                      <p className="mt-1 text-lg font-black">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {pathHealthError && (
                <div className="mb-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-200">
                  {pathHealthError}
                </div>
              )}

              {pathHealthCopyMessage && (
                <div className={`mb-3 rounded-2xl border px-3 py-2 text-[10px] ${
                  pathHealthSupportText
                    ? 'border-amber-500/25 bg-amber-500/10 text-amber-200'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                }`}>
                  {pathHealthCopyMessage}
                </div>
              )}

              {pathHealthSupportText && (
                <textarea
                  readOnly
                  value={pathHealthSupportText}
                  className="mb-3 h-44 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-3 font-mono text-[10px] leading-relaxed text-gray-200 outline-none"
                />
              )}

              {loadingPathHealth && !pathHealth ? (
                <div className="h-28 flex items-center justify-center text-gray-500">
                  <FiLoader className="animate-spin" size={22} />
                </div>
              ) : (
                <div className="space-y-3">
                  {pathHealth?.models.map((model) => (
                    <div key={model.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{model.name}</p>
                          <p className="mt-0.5 text-[10px] text-gray-500">{model.role}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${pathStatusClass(model.status)}`}>
                          {model.id === 'tiny-sd' && model.status === 'legacy_absent' ? 'Kaldırılmış Legacy' : pathStatusLabel(model.status)}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {model.paths.map((item) => (
                          <div key={`${model.id}-${item.label}`} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                            <div className="flex items-center justify-between gap-2 text-[9px]">
                              <span className="font-black uppercase tracking-widest text-gray-500">{item.label}</span>
                              <span className={item.exists ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
                                {item.exists ? 'Hazır' : 'Dosya bulunamadı'}
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-[9px] text-gray-600 truncate" title={item.path}>{item.path}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-[9px] text-gray-500">
                              <span>Boyut: {formatBytes(item.sizeBytes)}</span>
                              {item.signature && <span>GGUF: {item.signature}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {model.note && <p className="mt-2 text-[10px] leading-relaxed text-gray-500">{model.note}</p>}
                    </div>
                  ))}
                  {pathHealth && (
                    <p className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[10px] leading-relaxed text-indigo-200">
                      Model dosyaları uygulama paketine dahil değildir. Eksik Tiny SD hata değildir; aktif modeller listesine geri eklenmez.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Tier selection */}
            <section className="glass-card rounded-[28px] p-5 border-white/5">
              <div className="relative z-10 space-y-5">
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Aktif Tier</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {TIERS.map(item => (
                      <button key={item.value} type="button" onClick={() => setTier(item.value)}
                        className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                          tier === item.value
                            ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100'
                            : 'border-white/10 bg-black/20 text-gray-400 hover:text-gray-200'
                        }`}>
                        <span className="block text-xs font-black uppercase">{item.label}</span>
                        <span className="mt-1 block text-[10px] leading-relaxed opacity-70">{item.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">LLM Modu</h2>
                  <div className="space-y-2">
                    {MODES.filter(mode => legacyProvidersEnabled || mode.value === 'local').map(mode => (
                      <button key={mode.value} type="button" onClick={() => setLlmMode(mode.value)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                          llmMode === mode.value
                            ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100'
                            : 'border-white/10 bg-black/20 text-gray-400 hover:text-gray-200'
                        }`}>
                        <span className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-widest">
                          <span>{mode.label}</span>
                          {modeBadge(mode.value) && (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[8px] text-amber-300">
                              {modeBadge(mode.value)}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-[10px] opacity-70">{mode.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right panel — model inventory */}
          <section className="glass-card rounded-[28px] p-5 border-white/5">
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-300">Yerel Model Envanteri</h2>
                  <p className="mt-1 text-xs text-gray-500">Kurulu modelleri aktif yapın, yeni model yükleyin veya kaldırın.</p>
                </div>
                <button type="button" onClick={loadModels}
                  className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <FiLoader size={12} className={loadingModels ? 'animate-spin' : ''} />
                  Yenile
                </button>
              </div>

              {modelError && (
                <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-start gap-2">
                  <span className="mt-0.5">⚠</span>
                  <span>{modelError}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-start gap-2">
                  <FiCheckCircle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {loadingModels ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <FiLoader className="animate-spin" size={28} />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Chat models */}
                  {chatModels.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FiZap size={12} className="text-indigo-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                          Chat / LLM Modelleri
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {chatModels.map(model => (
                          <ModelCard
                            key={model.id} model={model}
                            activeChatModelId={activeSelection.activeChatModelId}
                            activeImageModelId={activeSelection.activeImageModelId}
                            installing={installing} removing={removing} activating={activating}
                            onInstall={installModel} onRemove={removeModel} onActivate={activateModel}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Image models */}
                  {imageModels.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FiImage size={12} className="text-violet-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                          Görsel Üretim Modelleri
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {imageModels.map(model => (
                          <ModelCard
                            key={model.id} model={model}
                            activeChatModelId={activeSelection.activeChatModelId}
                            activeImageModelId={activeSelection.activeImageModelId}
                            installing={installing} removing={removing} activating={activating}
                            onInstall={installModel} onRemove={removeModel} onActivate={activateModel}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {models.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-12 text-gray-600">
                      <FiBox size={32} />
                      <p className="text-sm">Model bulunamadı.</p>
                      <p className="text-xs">Model klasörünü kontrol edin veya Yenile butonuna basın.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : activeTab === 'memory' ? (
        /* Memory & Context tab content */
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          {/* Memory left column — form and rules */}
          <div className="space-y-4">
            <section className="glass-card rounded-[28px] p-5 border-white/5">
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-fuchsia-400 mb-2">Yeni Hafıza Ekle</h2>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                Aillame Nano'nun gelecek sorgularda yararlanacağı yeni bir kullanıcı tercihi, proje notu veya yönerge ekleyin.
              </p>

              <form onSubmit={addMemory} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                    Hafıza İçeriği
                  </label>
                  <textarea
                    value={newMemoryContent}
                    onChange={(e) => setNewMemoryContent(e.target.value)}
                    required
                    placeholder="Örn: Kullanıcı SEO uyumlu Türkçe yazılar istiyor."
                    className="w-full h-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                      Tür
                    </label>
                    <select
                      value={newMemoryType}
                      onChange={(e: any) => setNewMemoryType(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500/50"
                    >
                      <option value="preference">Tercih</option>
                      <option value="project">Proje</option>
                      <option value="system">Sistem</option>
                      <option value="workflow">İş Akışı</option>
                      <option value="note">Not</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                      Kapsam
                    </label>
                    <select
                      value={newMemoryScope}
                      onChange={(e: any) => setNewMemoryScope(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500/50"
                    >
                      <option value="user">Kullanıcı</option>
                      <option value="project">Proje</option>
                      <option value="session">Oturum</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                    Etiketler (Virgülle ayırın)
                  </label>
                  <input
                    type="text"
                    value={newMemoryTags}
                    onChange={(e) => setNewMemoryTags(e.target.value)}
                    placeholder="seo, turkce, yazi"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <FiPlus size={14} />
                  Bu Bilgiyi Kaydet
                </button>
              </form>
            </section>

            <section className="glass-card rounded-[28px] p-5 border-white/5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Güvenlik & Gizlilik</h2>
              <ul className="text-[10px] text-gray-400 space-y-2 leading-relaxed list-disc pl-4">
                <li>Hafıza verileri <strong>yalnızca yerel cihazınızda</strong> saklanır, harici buluta gönderilmez.</li>
                <li>Güvenlik nedeniyle şifre, token veya API key gibi <strong>hassas verileri kaydetmeyin</strong>.</li>
                <li>Yerel koruma sistemi, hassas anahtar kelimeleri tespit ederse kaydetmeyi otomatik olarak reddeder.</li>
              </ul>
            </section>
          </div>

          {/* Memory right column — list and search */}
          <section className="glass-card rounded-[28px] p-5 border-white/5">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-300">Yerel Hafıza Kartları</h2>
                  <p className="mt-1 text-xs text-gray-500">Mevcut yerel hafıza kayıtlarını yönetin ve arayın.</p>
                </div>
                
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-600" size={14} />
                  <input
                    type="text"
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    placeholder="Hafızalarda ara..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50"
                  />
                </div>
              </div>

              {memoryError && (
                <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-start gap-2">
                  <span className="mt-0.5">⚠</span>
                  <span>{memoryError}</span>
                </div>
              )}
              {memorySuccess && (
                <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-start gap-2">
                  <FiCheckCircle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{memorySuccess}</span>
                </div>
              )}

              {loadingMemories ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <FiLoader className="animate-spin" size={28} />
                </div>
              ) : (
                <div className="space-y-3 flex-grow overflow-y-auto max-h-[500px] pr-1">
                  {memories.map((m) => {
                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl border border-white/5 bg-black/20 hover:bg-black/30 transition-all flex justify-between gap-4 animate-slide-in"
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-fuchsia-500/10 border border-fuchsia-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase text-fuchsia-300">
                              {m.type === 'preference' ? 'Tercih' : m.type === 'project' ? 'Proje' : m.type === 'system' ? 'Sistem' : m.type === 'workflow' ? 'İş Akışı' : 'Not'}
                            </span>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                              Kapsam: {m.scope === 'user' ? 'Kullanıcı' : m.scope === 'project' ? 'Proje' : 'Oturum'}
                            </span>
                            <span className="text-[9px] text-gray-600 font-mono">
                              {new Date(m.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          
                          <p className="text-xs font-semibold text-gray-200 leading-relaxed pr-2">
                            {m.content}
                          </p>

                          {m.tags && m.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {m.tags.map((tag: string) => (
                                <span key={tag} className="rounded-full bg-white/5 border border-white/10 px-2 py-0.2 text-[8px] text-gray-500">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteMemory(m.id)}
                          className="self-start p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 transition-all"
                          title="Bu kaydı sil"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    );
                  })}

                  {memories.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-16 text-gray-600">
                      <FiDatabase size={32} />
                      <p className="text-xs">Yerel hafıza kaydı bulunamadı.</p>
                      {memorySearch && (
                        <p className="text-[10px]">Arama kelimesini değiştirmeyi veya temizlemeyi deneyin.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* Projects tab content */
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
          {/* Left Column: Create Project Form */}
          <div className="space-y-4">
            <section className="glass-card rounded-[28px] p-5 border-white/5">
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-emerald-400 mb-2">Yeni Bağlam Ekle</h2>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                Aillame Nano'nun hedefleri, SEO tercihlerini ve dil üslubunu özelleştirebileceği yeni bir çalışma alanı bağlamı tanımlayın.
              </p>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                    Proje Kimliği (Slug ID)
                  </label>
                  <input
                    type="text"
                    value={newProjId}
                    onChange={(e) => setNewProjId(e.target.value)}
                    required
                    placeholder="örn: hukuk-sitesi"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                    Proje Adı
                  </label>
                  <input
                    type="text"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    required
                    placeholder="örn: Hukuk & Avukatlık Portalı"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                    Proje Açıklaması
                  </label>
                  <textarea
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    placeholder="Projenin temel amacını açıklayın..."
                    className="w-full h-16 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                      Kategori
                    </label>
                    <select
                      value={newProjCategory}
                      onChange={(e: any) => setNewProjCategory(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="website">Web Sitesi</option>
                      <option value="software">Yazılım / Uygulama</option>
                      <option value="content">İçerik Üretimi</option>
                      <option value="legal">Hukuk / Danışmanlık</option>
                      <option value="psychology">Psikoloji / Sağlık</option>
                      <option value="social">Sosyal Medya</option>
                      <option value="other">Diğer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                      Dil
                    </label>
                    <select
                      value={newProjLanguage}
                      onChange={(e: any) => setNewProjLanguage(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="tr">Türkçe</option>
                      <option value="en">English</option>
                      <option value="mixed">Karma / Mixed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                    İletişim Tonu / Dil Üslubu
                  </label>
                  <input
                    type="text"
                    value={newProjTone}
                    onChange={(e) => setNewProjTone(e.target.value)}
                    placeholder="örn: resmi, güven veren, samimi"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                    Proje Hedefleri (Satır başına bir tane)
                  </label>
                  <textarea
                    value={newProjGoals}
                    onChange={(e) => setNewProjGoals(e.target.value)}
                    placeholder="Hedef 1&#10;Hedef 2"
                    className="w-full h-16 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
                  />
                </div>

                {/* SEO Preferences Glass Box */}
                <div className="p-3 rounded-2xl border border-white/5 bg-black/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                      <FiGlobe size={11} className="text-emerald-400" />
                      SEO Tercihleri
                    </label>
                    <input
                      type="checkbox"
                      checked={newProjSeoEnabled}
                      onChange={(e) => setNewProjSeoEnabled(e.target.checked)}
                      className="rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500/50"
                    />
                  </div>

                  {newProjSeoEnabled && (
                    <div className="space-y-3 pt-2 border-t border-white/5 animate-fade-in">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
                          Minimum Kelime Sayısı
                        </label>
                        <input
                          type="number"
                          value={newProjSeoMinWords}
                          onChange={(e) => setNewProjSeoMinWords(Number(e.target.value))}
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>

                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400">
                          <input
                            type="checkbox"
                            checked={newProjSeoHeadings}
                            onChange={(e) => setNewProjSeoHeadings(e.target.checked)}
                            className="rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500/50"
                          />
                          Başlık Yapısı (H1-H3)
                        </label>

                        <label className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400">
                          <input
                            type="checkbox"
                            checked={newProjSeoMeta}
                            onChange={(e) => setNewProjSeoMeta(e.target.checked)}
                            className="rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500/50"
                          />
                          Meta Açıklaması
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <FiPlus size={14} />
                  Bağlamı Kaydet
                </button>
              </form>
            </section>
          </div>

          {/* Right Column: Active Project Selection & List */}
          <section className="glass-card rounded-[28px] p-5 border-white/5">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-300">Tanımlı Proje Bağlamları</h2>
                  <p className="mt-1 text-xs text-gray-500">Çalışma alanı bağlamlarını yönetin, aktif yapın veya kaldırın.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-600" size={14} />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Projelerde ara..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {projectError && (
                <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-start gap-2">
                  <span className="mt-0.5">⚠</span>
                  <span>{projectError}</span>
                </div>
              )}
              {projectSuccess && (
                <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-start gap-2">
                  <FiCheckCircle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{projectSuccess}</span>
                </div>
              )}

              {loadingProjects ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <FiLoader className="animate-spin" size={28} />
                </div>
              ) : (
                <div className="space-y-3 flex-grow overflow-y-auto max-h-[550px] pr-1">
                  {projects
                    .filter(p => 
                      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                      (p.description && p.description.toLowerCase().includes(projectSearch.toLowerCase())) ||
                      p.category.toLowerCase().includes(projectSearch.toLowerCase())
                    )
                    .map((p) => {
                      const isActive = activeProjectId === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row justify-between gap-4 animate-slide-in ${
                            isActive
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-white/5 bg-black/20 hover:bg-black/30'
                          }`}
                        >
                          <div className="min-w-0 space-y-2 flex-grow">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-300">
                                {p.category}
                              </span>
                              <span className="text-[10px] text-gray-600 font-mono">
                                ID: {p.id}
                              </span>
                              {isActive && (
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Aktif Bağlam
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-black text-white leading-tight">
                              {p.name}
                            </h3>

                            {p.description && (
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {p.description}
                              </p>
                            )}

                            {p.goals && p.goals.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Hedefler:</p>
                                <ul className="text-xs text-gray-400 space-y-0.5 list-disc pl-4">
                                  {p.goals.map((g: string, i: number) => (
                                    <li key={i}>{g}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-gray-500 font-medium">
                              {p.tone && <span>Ton: <strong className="text-gray-400">{p.tone}</strong></span>}
                              {p.language && <span>Dil: <strong className="text-gray-400">{p.language.toUpperCase()}</strong></span>}
                              {p.seoPreferences?.enabled && (
                                <span className="text-emerald-400">SEO: Etkin (Min {p.seoPreferences.minWords || 300} kelime)</span>
                              )}
                            </div>
                          </div>

                          <div className="flex md:flex-col gap-2 items-end justify-center shrink-0">
                            {/* Activate Button */}
                            {!isActive ? (
                              <button
                                type="button"
                                onClick={() => handleSelectActiveProject(p.id)}
                                className="h-8 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all"
                              >
                                <FiCheckCircle size={12} />
                                Aktif Yap
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectActiveProject(null)}
                                className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all"
                              >
                                Temizle
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(p.id, p.name)}
                              className="h-8 w-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-all"
                              title="Bağlamı sil"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {projects.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-16 text-gray-600">
                      <FiFolder size={32} />
                      <p className="text-xs">Kayıtlı proje bağlamı bulunamadı.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'distillation' && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
          {/* Left Panel: Stats and New Sample Form */}
          <div className="space-y-4">
            {/* Warning Message Card */}
            <section className="glass-card rounded-[28px] p-5 border-amber-500/20 bg-amber-500/5">
              <div className="flex gap-3">
                <FiZap className="text-amber-400 shrink-0 mt-0.5" size={16} />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-widest">Yerel Öğrenme Altyapısı</h4>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Bu panel model eğitimi başlatmaz. Yalnızca yerel, kullanıcı onaylı distillation veri örnekleri hazırlar.
                  </p>
                  <p className="text-[11px] text-amber-400 font-bold">
                    Şifre, token veya kişisel kimlik bilgisi eklemeyin. Hassas veriler otomatik maskelenir.
                  </p>
                </div>
              </div>
            </section>

            {/* Statistics */}
            <section className="glass-card rounded-[28px] p-5 border-white/5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">İstatistikler</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-black/20 rounded-2xl border border-white/5 text-center">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 block">Toplam Kayıt</span>
                  <strong className="text-2xl font-black text-white">{sampleStats.total}</strong>
                </div>
                <div className="p-3 bg-black/20 rounded-2xl border border-white/5 text-center">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 block">Routing</span>
                  <strong className="text-xl font-black text-amber-300">{sampleStats.routing || 0}</strong>
                </div>
                <div className="p-3 bg-black/20 rounded-2xl border border-white/5 text-center">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 block">Tool Use</span>
                  <strong className="text-xl font-black text-indigo-400">{sampleStats.tool_use || 0}</strong>
                </div>
                <div className="p-3 bg-black/20 rounded-2xl border border-white/5 text-center">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 block">Safety Blocks</span>
                  <strong className="text-xl font-black text-rose-400">{sampleStats.safety_block || 0}</strong>
                </div>
              </div>
            </section>

            {/* Create Manual Sample */}
            <section className="glass-card rounded-[28px] p-5 border-white/5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Manuel Örnek Ekle</h2>
              <form onSubmit={handleCreateSample} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Örnek Türü</label>
                  <select
                    value={newSampleKind}
                    onChange={(e: any) => setNewSampleKind(e.target.value)}
                    className="w-full h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-xs text-white outline-none focus:border-indigo-500/50"
                  >
                    <option value="routing">routing (Router Yönlendirme)</option>
                    <option value="tool_use">tool_use (Güvenli Araç Kullanımı)</option>
                    <option value="safety_block">safety_block (Güvenlik Engeli)</option>
                    <option value="project_context">project_context (Proje Bağlamı)</option>
                    <option value="memory_retrieval">memory_retrieval (Hafıza Sorgulama)</option>
                    <option value="chat_quality">chat_quality (Chat Yanıt Kalitesi)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Sorgu / Prompt (redactedPrompt)</label>
                  <textarea
                    required
                    placeholder="Örnek kullanıcı girdisi..."
                    value={newSamplePrompt}
                    onChange={(e) => setNewSamplePrompt(e.target.value)}
                    className="w-full min-h-[70px] rounded-xl bg-black/30 border border-white/10 p-3 text-xs text-white outline-none focus:border-indigo-500/50 resize-y"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Beklenen Çıktı (JSON Formatında)</label>
                  <textarea
                    required
                    placeholder="{\n  'intent': 'text_chat'\n}"
                    value={newSampleExpected}
                    onChange={(e) => setNewSampleExpected(e.target.value)}
                    className="w-full min-h-[90px] rounded-xl bg-black/30 border border-white/10 p-3 text-xs font-mono text-indigo-300 outline-none focus:border-indigo-500/50 resize-y"
                  />
                </div>

                {sampleError && <p className="text-[11px] text-rose-400 font-bold">{sampleError}</p>}
                {sampleSuccess && <p className="text-[11px] text-emerald-400 font-bold">{sampleSuccess}</p>}

                <button
                  type="submit"
                  className="w-full h-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Örneği Onayla ve Kaydet
                </button>
              </form>
            </section>
          </div>

          {/* Right Panel: Dataset List */}
          <section className="glass-card rounded-[28px] p-5 border-white/5 flex flex-col min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-black text-white">Yerel Distillation Dataset</h2>
                <p className="text-xs text-gray-400">Model ince ayarı (fine-tuning) için toplanan yerel veri seti.</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <a
                  href="/api/aillame/distillation/dataset/export"
                  download="aillame-distillation-dataset.jsonl"
                  className="h-9 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
                >
                  <FiDownloadCloud size={14} />
                  JSONL Export
                </a>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-3.5 text-gray-500" size={14} />
              <input
                type="text"
                placeholder="Örnekler içinde ara (kind, prompt, expected)..."
                value={sampleSearch}
                onChange={(e) => setSampleSearch(e.target.value)}
                className="w-full h-10 rounded-2xl bg-black/20 border border-white/5 pl-10 pr-4 text-xs text-white placeholder-gray-500 outline-none focus:border-white/10"
              />
            </div>

            <div className="flex-grow overflow-y-auto max-h-[600px] space-y-3">
              {loadingSamples ? (
                <div className="flex justify-center items-center py-16 text-gray-500">
                  <FiLoader className="animate-spin mr-2" size={16} />
                  <span className="text-xs">Öğrenme verileri yükleniyor...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {samples.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl border border-white/5 bg-black/20 hover:bg-black/30 transition-all flex flex-col md:flex-row justify-between gap-4 animate-slide-in"
                    >
                      <div className="min-w-0 space-y-2 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-300">
                            {s.kind}
                          </span>
                          <span className="text-[10px] text-gray-600 font-mono">
                            ID: {s.id}
                          </span>
                          <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] text-gray-400 font-mono">
                            Kaynak: {s.source}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Girdi / Prompt:</p>
                          <p className="text-xs text-white bg-black/30 p-2.5 rounded-xl border border-white/5 whitespace-pre-wrap font-mono">
                            {s.redactedPrompt}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Beklenen Yanıt (Expected Output):</p>
                          <pre className="text-[11px] text-indigo-300 bg-black/30 p-2.5 rounded-xl border border-white/5 overflow-x-auto font-mono">
                            {JSON.stringify(s.expected, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2 items-end justify-center shrink-0">
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSample(s.id)}
                          className="h-8 w-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-all"
                          title="Örneği kaldır"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {samples.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-16 text-gray-600">
                      <FiZap size={32} />
                      <p className="text-xs">Kayıtlı öğrenme verisi örneği bulunamadı.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
