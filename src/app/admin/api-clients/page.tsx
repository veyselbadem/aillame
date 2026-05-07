'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiRefreshCw, FiCopy, FiAlertTriangle, FiKey, FiCode, FiShield } from 'react-icons/fi';
import StatusBadge from '@components/ui/StatusBadge';
import type { ApiClient, ApiClientOwnerType, ApiClientRateLimitProfile, ApiClientMemoryPolicy, ApiClientStatus } from '@core/api-clients/types';

const DEFAULT_OWNER_TYPE: ApiClientOwnerType = 'internal_project';
const DEFAULT_RATE_LIMIT_PROFILE: ApiClientRateLimitProfile = 'standard';

const PROJECT_PRESETS = ['general', 'aillame', 'boss-ai', 'doomsgame-engine', 'badem-akademi'] as const;
const PROVIDER_ENDPOINTS = [
  'POST /api/external/v1/chat',
  'POST /api/external/v1/projects/[projectId]/chat',
  'POST /api/external/v1/tasks',
  'GET /api/external/v1/runtime/status',
  'GET /api/external/v1/projects',
  'POST /api/v1/chat/completions',
] as const;

const INITIAL_FORM = {
  projectId: 'aillame',
  displayName: '',
  description: '',
  ownerType: DEFAULT_OWNER_TYPE,
  allowedModes: 'general,code,education,economy',
  allowedTasks: 'chat,task,code-agent-plan,memory-read,memory-write',
  allowedTools: 'providerChat,projectMemory,codeAgentPreview',
  rateLimitProfile: DEFAULT_RATE_LIMIT_PROFILE,
  notes: '',
};

function formatList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function formatPolicy(policy: ApiClientMemoryPolicy) {
  return [
    `Global Read: ${policy.allowGlobalRead ? 'Yes' : 'No'}`,
    `Global Write: ${policy.allowGlobalWrite ? 'Yes' : 'No'}`,
    `Project Memory: ${policy.allowProjectMemory ? 'Yes' : 'No'}`,
    `Client Memory: ${policy.allowClientMemory ? 'Yes' : 'No'}`,
    `Session Memory: ${policy.allowSessionMemory ? 'Yes' : 'No'}`,
    `Task Memory: ${policy.allowTaskMemory ? 'Yes' : 'No'}`,
    `Queue Write Only: ${policy.allowMemoryWriteQueueOnly ? 'Yes' : 'No'}`,
  ].join(' · ');
}

function ChipList({ items, color }: { items: string[]; color: string }) {
  if (!items || items.length === 0) return <span className="text-gray-600 text-xs">-</span>;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((item) => (
        <span key={item} className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold border ${color}`}>{item}</span>
      ))}
    </div>
  );
}

export default function AdminApiClientsPage() {
  const [authorized, setAuthorized] = useState(false);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [rawKey, setRawKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    const token = localStorage.getItem('aillame_admin_token');
    if (!auth) {
      router.push('/admin/login');
      return;
    }

    setAuthorized(true);
    setAdminToken(token);

    if (!token) {
      setError('Admin token bulunamadı. Lütfen /admin/login sayfasından token girin.');
      return;
    }

    loadClients(token);
  }, [router]);

  const loadClients = async (token?: string) => {
    setLoading(true);
    setError('');
    const authToken = token ?? adminToken;
    if (!authToken) {
      setError('Admin token bulunamadı. Lütfen /admin/login sayfasından token girin.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/api-clients', {
        cache: 'no-store',
        headers: { 'x-aillame-admin-token': authToken },
      });
      const data = await res.json();
      if (data.success) {
        setClients(data.clients || []);
      } else {
        setError(data.error || 'Liste yüklenemedi.');
      }
    } catch {
      setError('Liste yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setRawKey('');

    const payload = {
      projectId: form.projectId.trim(),
      displayName: form.displayName.trim(),
      description: form.description.trim(),
      ownerType: form.ownerType,
      allowedModes: formatList(form.allowedModes),
      allowedTasks: formatList(form.allowedTasks),
      allowedTools: formatList(form.allowedTools),
      rateLimitProfile: form.rateLimitProfile,
      notes: form.notes.trim(),
    };

    if (!payload.projectId || !payload.displayName) {
      setError('Project ID ve Display Name alanları zorunludur.');
      return;
    }

    const authToken = adminToken || localStorage.getItem('aillame_admin_token');
    if (!authToken) {
      setError('Admin token bulunamadı. Lütfen /admin/login sayfasından token girin.');
      return;
    }

    try {
      const res = await fetch('/api/admin/api-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-aillame-admin-token': authToken },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('API client başarıyla oluşturuldu.');
        setRawKey(data.rawApiKey || '');
        setForm(INITIAL_FORM);
        loadClients();
      } else {
        setError(data.error || 'Oluşturulamadı.');
      }
    } catch {
      setError('Oluşturma sırasında bir hata oluştu.');
    }
  };

  const handleStatusChange = async (clientId: string, status: ApiClientStatus) => {
    setError('');
    setMessage('');
    const authToken = adminToken || localStorage.getItem('aillame_admin_token');
    if (!authToken) {
      setError('Admin token bulunamadı. Lütfen /admin/login sayfasından token girin.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/api-clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-aillame-admin-token': authToken },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Durum güncellendi.');
        setClients((prev) => prev.map((item) => (item.id === clientId ? data.client : item)));
      } else {
        setError(data.error || 'Durum güncellenemedi.');
      }
    } catch {
      setError('Durum güncellenirken hata oluştu.');
    }
  };

  const copyRawKey = async () => {
    if (rawKey) {
      await navigator.clipboard.writeText(rawKey);
      setMessage('Raw key kopyalandı.');
    }
  };

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-transparent relative p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
      <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FiKey size={12} className="text-indigo-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Provider API · External Apps</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">External Provider API</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl font-medium">
            BOSS AI, Doomsgame Engine, Badem Akademi ve diğer uygulamaların Aillame'e proje kimliğiyle bağlanacağı provider yüzeyi.
          </p>
        </div>
        <button onClick={() => loadClients()} className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-indigo-400 transition-all">
          <FiRefreshCw className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} /> Yenile
        </button>
      </header>

      <div className="grid gap-4 mb-8 lg:grid-cols-[1fr_1fr_1.1fr]">
        <InfoPanel icon={<FiCode />} title="Provider Endpoints">
          <div className="space-y-2">
            {PROVIDER_ENDPOINTS.map((endpoint) => (
              <code key={endpoint} className="block rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-indigo-200">{endpoint}</code>
            ))}
          </div>
        </InfoPanel>
        <InfoPanel icon={<FiShield />} title="Project Presetleri">
          <div className="flex flex-wrap gap-2">
            {PROJECT_PRESETS.map((projectId) => (
              <span key={projectId} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">{projectId}</span>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">Development ortamında API key opsiyonel olabilir; production zorunlu güvenlik sertleştirmesi Faz 5 kapsamındadır.</p>
        </InfoPanel>
        <InfoPanel icon={<FiCode />} title="SDK Kullanım Taslağı">
          <pre className="rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] text-slate-300 overflow-x-auto">{`const client = new AillameClient({
  baseUrl: 'http://localhost:3000',
  projectId: 'boss-ai',
  mode: 'economy',
  sourceApp: 'boss-ai'
});

await client.chat({
  taskType: 'market-analysis',
  message: 'Bugünkü piyasa sinyallerini analiz et'
});`}</pre>
        </InfoPanel>
      </div>

      <div className="grid gap-4 mb-8 lg:grid-cols-2">
        <InfoPanel icon={<FiShield />} title="Security & Permission Foundation (Phase 5)">
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Auth Mode</p>
              <span className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">development optional / production required</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">API Key Status</p>
              <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">configured</span>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Permission Scopes</p>
              <div className="flex flex-wrap gap-2">
                {['chat:read', 'chat:write', 'project:read', 'memory:read', 'memory:write', 'task:create'].map(scope => (
                  <span key={scope} className="rounded-lg bg-black/20 border border-white/5 px-2 py-0.5 text-[10px] text-gray-300">{scope}</span>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Production Guards</p>
              <div className="space-y-1">
                <p className="text-[11px] text-rose-300">⚠️ autonomous actions disabled</p>
                <p className="text-[11px] text-rose-300">⚠️ dangerous tools disabled</p>
                <p className="text-[11px] text-emerald-300">✓ model path exposure guard active</p>
              </div>
            </div>
          </div>
        </InfoPanel>
        
        <InfoPanel icon={<FiCode />} title="Audit Log & Rate Limit Visibility">
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Audit Logging</p>
              <span className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">enabled (in-memory foundation)</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Rate Limit Policy</p>
              <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">relaxed (stricter in production)</span>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Last Audit Event (Preview)</p>
              <div className="rounded-xl bg-black/20 border border-white/5 p-3 font-mono text-[10px] text-gray-400">
                <span className="text-indigo-400">INFO</span> | actor: api-key (ak_live_****) <br/>
                action: <span className="text-amber-200">external.chat.request</span> | target: project(boss-ai)<br/>
                <span className="text-emerald-400">data sanitized</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">Not: In-memory audit log uzun vadede kalıcı değildir.</p>
            </div>
          </div>
        </InfoPanel>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_1.9fr]">
        <section className="glass-card border border-white/10 p-6 rounded-[24px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Yeni Provider Client</h2>
              <p className="text-sm text-gray-500 dark:text-gray-300">Raw API anahtarı sadece bir kez gösterilir.</p>
            </div>
          </div>

          {error && <div className="mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-200">{error}</div>}
          {message && <div className="mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-200">{message}</div>}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-300">
                Project ID
                <select value={form.projectId} onChange={(e) => handleChange('projectId', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none">
                  {PROJECT_PRESETS.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm text-gray-300">
                Display Name
                <input value={form.displayName} onChange={(e) => handleChange('displayName', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none" />
              </label>
            </div>
            <label className="space-y-2 text-sm text-gray-300">
              Description
              <input value={form.description} onChange={(e) => handleChange('description', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-300">
                Owner Type
                <select value={form.ownerType} onChange={(e) => handleChange('ownerType', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none">
                  <option value="personal">personal</option>
                  <option value="internal_project">internal_project</option>
                  <option value="external_app">external_app</option>
                  <option value="third_party">third_party</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-gray-300">
                Rate Limit Profile
                <select value={form.rateLimitProfile} onChange={(e) => handleChange('rateLimitProfile', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none">
                  <option value="low">low</option>
                  <option value="standard">standard</option>
                  <option value="trusted">trusted</option>
                  <option value="unlimited_local">unlimited_local</option>
                </select>
              </label>
            </div>
            <label className="space-y-2 text-sm text-gray-300">
              Allowed Modes
              <input value={form.allowedModes} onChange={(e) => handleChange('allowedModes', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none" />
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              Allowed Tasks
              <input value={form.allowedTasks} onChange={(e) => handleChange('allowedTasks', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none" />
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              Allowed Tools
              <input value={form.allowedTools} onChange={(e) => handleChange('allowedTools', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none" />
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              Notes
              <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none" />
            </label>
            <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white hover:bg-indigo-500 transition">
              <FiPlus /> Client Oluştur
            </button>
          </form>

          {rawKey ? (
            <div className="mt-6 rounded-[20px] border border-amber-500/30 bg-amber-500/[0.06] p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-2">
                  <FiAlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-black text-amber-200">API Key - Sadece Bir Kez Gösterilir</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Bu ekrandan sonra tekrar görüntülenemez. Güvenli bir yere kopyalayın.</p>
                  </div>
                </div>
                <button onClick={copyRawKey} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/15 transition flex-shrink-0">
                  <FiCopy size={12} /> Kopyala
                </button>
              </div>
              <div className="rounded-xl bg-black/30 border border-amber-500/15 p-4 font-mono text-sm text-amber-100 break-all select-all">{rawKey}</div>
            </div>
          ) : null}
        </section>

        <section className="glass-card border border-white/10 p-6 rounded-[24px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Provider Client Listesi</h2>
              <p className="text-sm text-gray-500 dark:text-gray-300">Mevcut istemcileri, projectId ve memory policy ayrımıyla inceleyin.</p>
            </div>
            <span className="rounded-2xl bg-white/5 px-4 py-2 text-xs text-gray-400">{clients.length} client</span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-black/10 p-8 text-center text-gray-400">Yükleniyor...</div>
          ) : clients.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/10 p-8 text-center text-gray-400">Henüz client yok.</div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => (
                <div key={client.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-gray-600 dark:text-gray-400 mb-1">{client.projectId} · {client.ownerType}</p>
                      <h3 className="text-base font-black text-slate-900 dark:text-white truncate">{client.displayName}</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate mt-0.5">ID: {client.clientId}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <StatusBadge
                        variant={client.status === 'active' ? 'active' : client.status === 'suspended' ? 'suspended' : 'revoked'}
                        label={client.status}
                      />
                      <button onClick={() => handleStatusChange(client.id, 'active')} className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition">Aktif Et</button>
                      <button onClick={() => handleStatusChange(client.id, 'suspended')} className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20 transition">Duraklat</button>
                      <button onClick={() => handleStatusChange(client.id, 'revoked')} className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-[10px] font-bold text-rose-300 hover:bg-rose-500/20 transition">Revoke</button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-black/10 p-3 space-y-1.5 text-xs text-gray-400">
                      <p><span className="text-gray-300 font-semibold">API Prefix:</span> <span className="font-mono">{client.apiKeyPrefix}....</span></p>
                      <p><span className="text-gray-300 font-semibold">Rate Limit:</span> {client.rateLimitProfile}</p>
                      <p><span className="text-gray-300 font-semibold">Created:</span> {new Date(client.createdAt).toLocaleString('tr-TR')}</p>
                      <p><span className="text-gray-300 font-semibold">Updated:</span> {new Date(client.updatedAt).toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/10 p-3 space-y-2 text-xs">
                      <div>
                        <p className="text-gray-500 mb-1">Allowed Modes</p>
                        <ChipList items={client.allowedModes} color="bg-indigo-500/10 border-indigo-500/20 text-indigo-300" />
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Allowed Tasks</p>
                        <ChipList items={client.allowedTasks} color="bg-blue-500/10 border-blue-500/20 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Allowed Tools</p>
                        <ChipList items={client.allowedTools} color="bg-purple-500/10 border-purple-500/20 text-purple-300" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-gray-600 mb-2">Memory Policy</p>
                    <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{formatPolicy(client.memoryPolicy)}</p>
                  </div>

                  {client.notes && (
                    <p className="text-xs text-gray-500"><span className="font-semibold text-gray-400">Not:</span> {client.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoPanel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-[24px] border border-white/10 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-indigo-300">{icon}</span>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}
