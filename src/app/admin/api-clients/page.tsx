'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiRefreshCw, FiCopy, FiAlertTriangle, FiKey, FiCode, FiShield } from 'react-icons/fi';
import StatusBadge from '@components/ui/StatusBadge';
import type { AillameApiKey, ApiKeyPermission, ApiKeyStatus, SecurityDiagnostics } from '@core/security/models';

const PROJECT_PRESETS = ['general', 'aillame', 'boss-ai', 'doomsgame-engine', 'badem-akademi'] as const;
const PERMISSION_SCOPES: ApiKeyPermission[] = [
  'chat:read', 'chat:write', 'project:read', 'memory:read', 'memory:write', 'task:create', 'task:read', 'runtime:read'
];

const INITIAL_FORM = {
  label: '',
  projectIds: 'general',
  permissions: 'chat:write,project:read',
  expiresInDays: '30',
};

function formatList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
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
  const [keys, setKeys] = useState<AillameApiKey[]>([]);
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [rawKey, setRawKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setAuthorized(true);
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [keysRes, statusRes] = await Promise.all([
        fetch('/api/admin/api-keys', { cache: 'no-store' }),
        fetch('/api/admin/security/status', { cache: 'no-store' })
      ]);
      
      const keysData = await keysRes.json();
      const statusData = await statusRes.json();
      
      if (keysData.success) setKeys(keysData.keys || []);
      if (statusData.success) setSecurityStatus(statusData.status);
    } catch {
      setError('Veriler yüklenirken bir hata oluştu.');
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
      label: form.label.trim(),
      projectIds: formatList(form.projectIds),
      permissions: formatList(form.permissions) as ApiKeyPermission[],
      expiresInDays: parseInt(form.expiresInDays) || undefined,
    };

    if (!payload.label) {
      setError('Label alanı zorunludur.');
      return;
    }

    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('API key başarıyla oluşturuldu.');
        setRawKey(data.plaintextKey || '');
        setForm(INITIAL_FORM);
        loadData();
      } else {
        setError(data.error || 'Oluşturulamadı.');
      }
    } catch {
      setError('Oluşturma sırasında bir hata oluştu.');
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Bu anahtarı iptal etmek istediğinize emin misiniz?')) return;
    
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/api-keys/${keyId}/revoke`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Anahtar iptal edildi.');
        loadData();
      } else {
        setError(data.error || 'İptal edilemedi.');
      }
    } catch {
      setError('İptal sırasında hata oluştu.');
    }
  };

  const copyRawKey = async () => {
    if (rawKey) {
      await navigator.clipboard.writeText(rawKey);
      setMessage('Plaintext key kopyalandı.');
    }
  };

  if (!authorized) return null;

  return (
    <div className="theme-admin-page min-h-screen bg-transparent relative p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
      <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>


          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FiKey size={12} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] theme-muted">Security · API Management</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight theme-title">API Anahtarları ve Güvenlik</h1>
          <p className="text-sm theme-muted mt-2 max-w-2xl font-medium">
            External uygulamalar için API anahtarı yönetimi ve güvenlik denetimi.
          </p>
        </div>
        <button onClick={() => loadData()} className="group flex items-center gap-2 rounded-2xl border theme-divider bg-white/5 dark:bg-white/[0.03] px-5 py-3 text-xs font-bold theme-secondary hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
          <FiRefreshCw className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} /> Yenile
        </button>
      </header>

      <div className="grid gap-4 mb-8 lg:grid-cols-2">
        <InfoPanel icon={<FiShield />} title="Security & Permission Foundation (Phase 5)">
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Auth Enforcement</p>
              <StatusBadge 
                variant={securityStatus?.authEnabled ? 'active' : 'warning'} 
                label={securityStatus?.authEnabled ? 'STRICT' : 'DEVELOPMENT'} 
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Active API Keys</p>
              <span className="text-xl font-black">{securityStatus?.apiKeyStore?.activeKeys || 0}</span>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Rate Limit State</p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-emerald-300">✓ In-Memory Store Active</span>
                <span className="text-[11px] text-emerald-300">✓ {securityStatus?.rateLimit?.activeBuckets || 0} Active Buckets</span>
              </div>
            </div>
          </div>
        </InfoPanel>
        
        <InfoPanel icon={<FiCode />} title="Audit Log & Rate Limit Visibility">
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Audit Log Store</p>
              <span className="text-[11px] text-indigo-300">✓ JSONL Persistent ({securityStatus?.audit?.totalEvents || 0} events)</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">API Key Store</p>
              <span className="text-[11px] text-indigo-300">✓ Persistent Hash Store</span>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Storage Root</p>
              <code className="text-[10px] text-gray-500">.aillame-data/api-keys.jsonl</code>
            </div>
          </div>
        </InfoPanel>
      </div>

      <section className="mb-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-5 h-5 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <FiRefreshCw size={10} className="text-emerald-400" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Provider Integration Readiness (E2E)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'boss-ai', name: 'BOSS AI', mode: 'Economy', scopes: 'chat:write, memory:read' },
            { id: 'doomsgame', name: 'Doomsgame Engine', mode: 'Code', scopes: 'chat:write, task:create' },
            { id: 'badem', name: 'Badem Akademi', mode: 'Education', scopes: 'chat:write, memory:read' },
            { id: 'openai', name: 'Generic OpenAI', mode: 'Chat', scopes: 'chat:write' }
          ].map((int) => (
            <div key={int.id} className="glass-card border border-white/10 p-4 rounded-2xl bg-white/[0.02]">
              <h3 className="text-sm font-bold mb-1">{int.name}</h3>
              <p className="text-[10px] text-gray-500 mb-3">{int.id === 'openai' ? '/api/v1/chat' : '/api/external/v1'}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Mode:</span>
                  <span className="text-indigo-300 font-bold">{int.mode}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Status:</span>
                  <span className="text-emerald-400 font-bold">Contract Ready</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1fr_1.8fr]">
        <section className="glass-card border border-white/10 p-6 rounded-[24px]">
          <div className="mb-6">
            <h2 className="text-xl font-black">Generate New API Key</h2>
            <p className="text-sm text-gray-500">Anahtar oluşturulduktan sonra hashlenir ve plaintext hali bir daha gösterilmez.</p>
          </div>

          {error && <div className="mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-200">{error}</div>}
          {message && <div className="mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-200">{message}</div>}

          <form onSubmit={handleCreate} className="space-y-4">
            <label className="space-y-2 block text-sm text-gray-300">
              Key Label (Örn: BOSS AI Integration)
              <input value={form.label} onChange={(e) => handleChange('label', e.target.value)} placeholder="Label..." className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none focus:border-indigo-500 transition" />
            </label>
            <label className="space-y-2 block text-sm text-gray-300">
              Project IDs (Comma separated)
              <input value={form.projectIds} onChange={(e) => handleChange('projectIds', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none" />
              <p className="text-[10px] text-gray-500">Örn: general, boss-ai, badem-akademi</p>
            </label>
            <label className="space-y-2 block text-sm text-gray-300">
              Permissions (Scopes)
              <input value={form.permissions} onChange={(e) => handleChange('permissions', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none" />
              <p className="text-[10px] text-gray-500">Örn: chat:write, project:read, memory:read</p>
            </label>
            <label className="space-y-2 block text-sm text-gray-300">
              Expires In (Days)
              <input type="number" value={form.expiresInDays} onChange={(e) => handleChange('expiresInDays', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-gray-200 outline-none" />
            </label>
            
            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white hover:bg-indigo-500 transition">
              <FiPlus /> Generate Key
            </button>
          </form>

          {rawKey ? (
            <div className="mt-6 rounded-[20px] border border-amber-500/30 bg-amber-500/[0.06] p-5 animate-slide-up">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-2">
                  <FiAlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-black text-amber-200">API Key - COPY NOW</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">This will never be shown again.</p>
                  </div>
                </div>
                <button onClick={copyRawKey} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/15 transition flex-shrink-0">
                  <FiCopy size={12} /> Copy
                </button>
              </div>
              <div className="rounded-xl bg-black/30 border border-amber-500/15 p-4 font-mono text-sm text-amber-100 break-all select-all">{rawKey}</div>
            </div>
          ) : null}
        </section>

        <section className="glass-card border border-white/10 p-6 rounded-[24px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black">Aktif API Anahtarları</h2>
            <span className="rounded-2xl bg-white/5 px-4 py-2 text-xs text-gray-400">{keys.length} keys</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : keys.length === 0 ? (
            <div className="p-8 text-center text-gray-500 italic">No API keys found. Create one to start.</div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => (
                <div key={key.id} className={`rounded-[24px] border p-5 space-y-4 transition-all ${key.status === 'revoked' ? 'border-white/5 bg-white/[0.01] opacity-50' : 'border-white/8 bg-white/[0.03]'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-black truncate">{key.label}</h3>
                        <StatusBadge 
                          variant={key.status === 'active' ? 'active' : 'suspended'} 
                          label={key.status} 
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono truncate">ID: {key.id}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {key.status === 'active' && (
                        <button onClick={() => handleRevoke(key.id)} className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-[10px] font-bold text-rose-300 hover:bg-rose-500/20 transition">Revoke</button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-black/10 p-3 space-y-1.5 text-[11px] text-gray-400">
                      <p><span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">Masked Key:</span> <span className="font-mono text-indigo-300">{key.maskedKey}</span></p>
                      <p><span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">Created:</span> {new Date(key.createdAt).toLocaleString('tr-TR')}</p>
                      {key.expiresAt && (
                        <p><span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">Expires:</span> {new Date(key.expiresAt).toLocaleString('tr-TR')}</p>
                      )}
                      {key.lastUsedAt && (
                        <p><span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">Last Used:</span> {new Date(key.lastUsedAt).toLocaleString('tr-TR')}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-1">Project Access</p>
                        <ChipList items={key.projectIds} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-300" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-1">Permissions</p>
                        <ChipList items={key.permissions} color="bg-indigo-500/10 border-indigo-500/20 text-indigo-300" />
                      </div>
                    </div>
                  </div>
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
    <section className="glass-card rounded-[24px] border theme-divider p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-indigo-600 dark:text-indigo-300">{icon}</span>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] theme-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}
