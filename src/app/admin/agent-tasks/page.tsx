'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ExternalApiMode } from '@core/external-api/types';
import type {
  AgentExecutionLog,
  AgentTask,
  AgentTaskStatus,
  AgentTaskStep,
  AgentTaskStepStatus,
} from '@core/agent-tasks/types';
import { FiClipboard, FiRefreshCw, FiShield, FiFileText, FiCheckSquare } from 'react-icons/fi';
import StatusBadge from '@components/ui/StatusBadge';
import type { StatusBadgeVariant } from '@components/ui/StatusBadge';

const STATUS_OPTIONS: Array<{ value: AgentTaskStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'planning', label: 'Planlanıyor' },
  { value: 'running', label: 'Önizleniyor' },
  { value: 'waiting_for_tool', label: 'Araç Onayı Bekliyor' },
  { value: 'testing', label: 'Doğrulama Önizlemesi' },
  { value: 'reviewing', label: 'İnceleniyor' },
  { value: 'fixing', label: 'Düzeltme Planı' },
  { value: 'waiting_for_user', label: 'Kullanıcı Onayı Bekliyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'failed', label: 'Başarısız' },
  { value: 'cancelled', label: 'İptal Edildi' },
];

const STEP_STATUS_LABELS: Record<AgentTaskStepStatus, string> = {
  queued: 'Kuyrukta',
  running: 'Önizleniyor',
  success: 'Başarılı',
  failed: 'Başarısız',
  skipped: 'Atlandı',
  retrying: 'Yeniden Deneniyor',
};

const TASK_STATUS_LABELS: Record<AgentTaskStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => [option.value, option.label])
) as Record<AgentTaskStatus, string>;

const MODE_OPTIONS: Array<{ value: ExternalApiMode | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'general', label: 'general' },
  { value: 'code', label: 'code' },
  { value: 'education', label: 'education' },
  { value: 'economy', label: 'economy' },
  { value: 'image_generation', label: 'image_generation' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'low', label: 'Düşük' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Yüksek' },
] as const;

const CODE_AGENT_FLOW = [
  { label: 'Scan', desc: 'Proje haritası ve dosya özeti, secret içerik okunmadan.' },
  { label: 'Plan', desc: 'Görev adımları risk ve approval metadata ile çıkarılır.' },
  { label: 'Patch Proposal', desc: 'Gerçek yazma yerine diff/patch önerisi üretilir.' },
  { label: 'Verify', desc: 'Allowlist doğrulama komutları preview olarak temsil edilir.' },
  { label: 'Approval', desc: 'Dosya yazma ve komut çalıştırma için kullanıcı onayı gerekir.' },
  { label: 'Safety', desc: 'Secret, delete, dependency ve network riskleri merkezi guard’dan geçer.' },
] as const;

const SENSITIVE_CONTEXT_KEYS = ['apiKey', 'apikey', 'secret', 'token', 'password', 'credential', 'credentials', 'auth', 'authorization'];

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null) return '-';
  if (typeof value === 'string') return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.length === 0 ? '[]' : `[${value.slice(0, 5).map(formatValue).join(', ')}${value.length > 5 ? ', ...' : ''}]`;
  try {
    const json = JSON.stringify(value);
    return json.length > 120 ? `${json.slice(0, 120)}...` : json;
  } catch {
    return '-';
  }
};

const getSafeContextEntries = (context?: Record<string, unknown>) => {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return [] as [string, unknown][];
  return Object.entries(context).filter(([key]) => !SENSITIVE_CONTEXT_KEYS.includes(key.toLowerCase())).slice(0, 8);
};

const reduceSafetyFlags = (flags?: Record<string, unknown>) => {
  if (!flags || typeof flags !== 'object') return '-';
  const keys = Object.entries(flags).filter(([, value]) => value === true).map(([key]) => key);
  return keys.length > 0 ? keys.join(', ') : '-';
};

const taskStatusLabel = (status: AgentTaskStatus) => TASK_STATUS_LABELS[status] ?? status;

function taskStatusVariant(status: AgentTaskStatus): StatusBadgeVariant {
  switch (status) {
    case 'completed': return 'completed';
    case 'failed':    return 'failed';
    case 'cancelled': return 'cancelled';
    case 'running':   return 'running';
    case 'pending':   return 'pending';
    default:          return 'warning';
  }
}

function priorityVariant(priority: string): StatusBadgeVariant {
  switch (priority) {
    case 'high':   return 'failed';
    case 'normal': return 'protected';
    default:       return 'disabled';
  }
}

export default function AdminAgentTasksPage() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [steps, setSteps] = useState<AgentTaskStep[]>([]);
  const [logs, setLogs] = useState<AgentExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<AgentTaskStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');
  const [modeFilter, setModeFilter] = useState<ExternalApiMode | 'all'>('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | string>('all');
  const [priorityFilter, setPriorityFilter] = useState<(typeof PRIORITY_OPTIONS[number])['value']>('all');

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
    loadTasks(token);
  }, [router]);

  const loadTasks = async (token?: string) => {
    setLoading(true);
    setError(null);
    const authToken = token ?? adminToken;
    if (!authToken) {
      setError('Admin token bulunamadı. Lütfen /admin/login sayfasından token girin.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/aillame/tasks', { headers: { 'x-aillame-admin-token': authToken } });
      const body = await response.json();
      if (!response.ok || !body?.success || !Array.isArray(body.tasks)) throw new Error(body?.error || 'Agent görevleri yüklenemedi.');
      setTasks(body.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent görevleri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadTaskDetails = async (taskId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedTask(null);
    setSteps([]);
    setLogs([]);
    const authToken = adminToken || localStorage.getItem('aillame_admin_token');
    if (!authToken) {
      setDetailError('Admin token bulunamadı. Lütfen /admin/login sayfasından token girin.');
      setDetailLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/aillame/tasks/${taskId}`, { headers: { 'x-aillame-admin-token': authToken } });
      const body = await response.json();
      if (!response.ok || !body?.success || !body?.task) throw new Error(body?.error || 'Task detayı yüklenemedi.');
      setSelectedTask(body.task);
      setSteps(Array.isArray(body.steps) ? body.steps : []);
      setLogs(Array.isArray(body.logs) ? body.logs : []);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Task detayı yüklenirken hata oluştu.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: AgentTaskStatus) => {
    setActionError(null);
    setActionLoading(taskId);
    let failedReason: string | undefined;
    if (status === 'failed') {
      const reason = window.prompt('Başarısız işaretlemek için kısa bir neden girin:', 'Hata nedeni');
      if (reason === null) {
        setActionLoading(null);
        return;
      }
      failedReason = reason.trim() || undefined;
    }
    const authToken = adminToken || localStorage.getItem('aillame_admin_token');
    if (!authToken) {
      setActionError('Admin token bulunamadı. Lütfen /admin/login sayfasından token girin.');
      setActionLoading(null);
      return;
    }

    try {
      const response = await fetch(`/api/aillame/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-aillame-admin-token': authToken },
        body: JSON.stringify({ status, failedReason }),
      });
      const body = await response.json();
      if (!response.ok || !body?.success || !body?.task) throw new Error(body?.error || 'Durum güncellemesi başarısız oldu.');
      setTasks((current) => current.map((task) => (task.id === taskId ? body.task : task)));
      if (selectedTask?.id === taskId) setSelectedTask(body.task);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Durum güncellenirken hata oluştu.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => statusFilter === 'all' || task.status === statusFilter)
        .filter((task) => projectFilter === 'all' || task.projectId === projectFilter)
        .filter((task) => modeFilter === 'all' || task.mode === modeFilter)
        .filter((task) => taskTypeFilter === 'all' || task.taskType === taskTypeFilter)
        .filter((task) => priorityFilter === 'all' || task.priority === priorityFilter)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [tasks, statusFilter, projectFilter, modeFilter, taskTypeFilter, priorityFilter]
  );

  const projectOptions = useMemo(() => [{ value: 'all', label: 'Tümü' }, ...Array.from(new Set(tasks.map((task) => task.projectId))).map((projectId) => ({ value: projectId, label: projectId }))], [tasks]);
  const taskTypeOptions = useMemo(() => [{ value: 'all', label: 'Tümü' }, ...Array.from(new Set(tasks.map((task) => task.taskType))).map((taskType) => ({ value: taskType, label: taskType }))], [tasks]);

  const renderContextPreview = (context?: Record<string, unknown>) => {
    const entries = getSafeContextEntries(context);
    if (entries.length === 0) return <span className="text-sm text-gray-400">Gizli, hassas veya görüntülenemiyor.</span>;
    return (
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4 text-sm text-gray-200">
            <span className="text-gray-400">{key}:</span>
            <span className="font-mono text-gray-100 truncate">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!authorized) return null;

  return (
    <div className="theme-admin-page min-h-screen relative p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FiClipboard size={12} className="text-indigo-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Plan-only · Approval-gated</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">Code Agent Workspace</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-3xl font-medium">
            Code Agent şu an plan-only ve güvenlik kontrollü çalışır; dosya yazma veya komut çalıştırma kullanıcı onayı olmadan yapılmaz.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadTasks()}
          className="group flex items-center gap-2 rounded-2xl bg-white/[0.03] border border-white/10 px-6 py-3.5 text-xs font-bold text-white hover:border-indigo-500/50 hover:text-indigo-400 transition-all active:scale-95"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
          Yenile
        </button>
      </header>

      <section className="grid gap-3 mb-8 md:grid-cols-3 xl:grid-cols-6">
        {CODE_AGENT_FLOW.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
              {item.label === 'Safety' ? <FiShield /> : item.label === 'Verify' ? <FiCheckSquare /> : <FiFileText />}
            </div>
            <p className="text-sm font-black text-white">{item.label}</p>
            <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 mb-6 md:grid-cols-2 xl:grid-cols-5">
        <FilterBox label="Durum"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AgentTaskStatus | 'all')} className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white">{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></FilterBox>
        <FilterBox label="Proje"><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value as 'all' | string)} className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white">{projectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></FilterBox>
        <FilterBox label="Mod"><select value={modeFilter} onChange={(event) => setModeFilter(event.target.value as ExternalApiMode | 'all')} className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white">{MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></FilterBox>
        <FilterBox label="Task Type"><select value={taskTypeFilter} onChange={(event) => setTaskTypeFilter(event.target.value as 'all' | string)} className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white">{taskTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></FilterBox>
        <FilterBox label="Öncelik"><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as (typeof PRIORITY_OPTIONS[number])['value'])} className="w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white">{PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></FilterBox>
      </div>

      {error ? <Alert tone="rose">{error}</Alert> : null}
      {actionError ? <Alert tone="rose">{actionError}</Alert> : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">Henüz Code Agent görevi yok.</div>
      ) : (
        <div className="space-y-6">
          {filteredTasks.map((task) => (
            <article key={task.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-indigo-200">{task.projectId}</span>
                    <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-slate-200">{task.mode}</span>
                    <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-slate-200">{task.taskType}</span>
                    <StatusBadge variant={taskStatusVariant(task.status)} label={taskStatusLabel(task.status)} pulse={task.status === 'running'} />
                    <StatusBadge variant={priorityVariant(task.priority)} label={`risk: ${task.priority}`} />
                    <StatusBadge variant="protected" label="approvalRequired" />
                    <StatusBadge variant="review" label="safety checked" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">{task.title}</h2>
                  <p className="text-sm text-gray-300">{task.description ?? 'Açıklama yok.'}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-400">
                    <div className="space-y-2">
                      <TaskField label="Durum" value={taskStatusLabel(task.status)} />
                      <TaskField label="Patch Proposal" value="preview only" />
                      <TaskField label="Verifier" value="allowlist preview" />
                      <TaskField label="Target Files" value="context summary" />
                    </div>
                    <div className="space-y-2">
                      <TaskField label="Created" value={formatTimestamp(task.createdAt)} />
                      <TaskField label="Updated" value={formatTimestamp(task.updatedAt)} />
                      <TaskField label="Completed" value={formatTimestamp(task.completedAt)} />
                      <TaskField label="Source Request" value={task.sourceRequestId ?? '-'} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 text-sm text-gray-300">
                    <div className="mb-2 text-xs uppercase tracking-[0.3em] text-gray-500">Güvenli Context Önizleme</div>
                    {renderContextPreview(task.context)}
                  </div>
                </div>

                <div className="flex flex-col gap-3 shrink-0 w-full max-w-xs">
                  <button type="button" onClick={() => loadTaskDetails(task.id)} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:border-indigo-400 hover:text-indigo-300 transition">
                    Detayları Göster
                  </button>
                  <button type="button" disabled className="rounded-2xl bg-slate-500/10 border border-slate-500/20 px-4 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed">
                    Patch Uygula - Kapalı
                  </button>
                  <button type="button" disabled className="rounded-2xl bg-slate-500/10 border border-slate-500/20 px-4 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed">
                    Komut Çalıştır - Kapalı
                  </button>
                  <button type="button" onClick={() => updateTaskStatus(task.id, 'cancelled')} disabled={actionLoading === task.id} className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/15 transition disabled:opacity-50">
                    İptal Et
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedTask ? (
        <section className="mt-10 space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-gray-400 uppercase tracking-[0.3em]">Task Detayları</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedTask.title}</h2>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-gray-400">Durum</p>
                <p className="text-lg font-black text-white">{taskStatusLabel(selectedTask.status)}</p>
              </div>
            </div>

            <div className="grid gap-4 mt-6 md:grid-cols-2">
              <DetailField label="ID" value={selectedTask.id} />
              <DetailField label="Project" value={selectedTask.projectId} />
              <DetailField label="Mode" value={selectedTask.mode} />
              <DetailField label="Task Type" value={selectedTask.taskType} />
              <DetailField label="Risk Level" value={selectedTask.priority} />
              <DetailField label="Approval Required" value="true for file writes and commands" />
              <DetailField label="Current Step" value={selectedTask.currentStepId ?? '-'} />
              <DetailField label="Safety Flags" value={reduceSafetyFlags(selectedTask.safetyFlags)} />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/20 p-4 text-sm text-gray-300">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">Güvenli Context Önizleme</p>
              {renderContextPreview(selectedTask.context)}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-400 uppercase tracking-[0.3em]">Patch Proposal Preview (Foundation)</p>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Proposed Changes</h3>
                  </div>
                  <StatusBadge variant="review" label="Awaiting Approval" />
                </div>
                
                <div className="space-y-4">
                  {[
                    { path: 'src/core/example.ts', type: 'update', additions: 12, deletions: 4, risk: 'low' },
                    { path: 'src/app/page.tsx', type: 'update', additions: 5, deletions: 0, risk: 'low' }
                  ].map((file) => (
                    <div key={file.path} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FiFileText className="text-indigo-400" />
                          <span className="text-sm font-bold">{file.path}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-black">{file.type}</span>
                        </div>
                        <div className="flex gap-2 text-[10px] font-mono">
                          <span className="text-emerald-400">+{file.additions}</span>
                          <span className="text-rose-400">-{file.deletions}</span>
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-950/40 p-3 font-mono text-[11px] text-gray-500 overflow-x-auto whitespace-pre">
                        {`--- ${file.path}\n+++ ${file.path}\n@@ -1,4 +1,12 @@\n+ // Updated by Aillame Code Agent\n+ export const foundation = true;\n- // old content`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-400 uppercase tracking-[0.3em]">Plan Adımları</p>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{steps.length} adım</h3>
                  </div>
                </div>
                {detailLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-6 text-sm text-gray-400">Detay yükleniyor...</div>
                ) : steps.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-6 text-sm text-gray-400">Adım kaydı yok.</div>
                ) : (
                  <div className="space-y-4">
                    {steps.map((step) => (
                      <div key={step.id} className="rounded-3xl border border-white/10 bg-slate-950/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-sm text-gray-400">{step.type}</p>
                            <h4 className="text-lg font-bold text-white">{step.title}</h4>
                          </div>
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">{STEP_STATUS_LABELS[step.status]}</span>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-300">
                          <DetailField label="Tool" value={step.toolName ?? '-'} />
                          <DetailField label="Input" value={step.inputSummary ? formatValue(step.inputSummary) : '-'} />
                          <DetailField label="Output" value={step.outputSummary ? formatValue(step.outputSummary) : '-'} />
                          <DetailField label="Error" value={step.error ?? '-'} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="mb-6">
                  <p className="text-sm text-gray-400 uppercase tracking-[0.3em]">Approval Flow & Safety</p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Security Guards</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5">
                    <span className="text-xs text-gray-400">Sensitive Path Guard</span>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5">
                    <span className="text-xs text-gray-400">Approval Token Requirement</span>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">STRICT</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5">
                    <span className="text-xs text-gray-400">Verifier Allowlist</span>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">PREVIEW</span>
                  </div>
                  <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <FiShield className="text-amber-400" size={14} />
                      <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">Safety Policy Warning</span>
                    </div>
                    <p className="text-[10px] text-amber-100/70 leading-relaxed">
                      Herhangi bir dosya yazma işlemi öncesinde explicit kullanıcı onayı (Approval Token) gereklidir.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="mb-6">
                  <p className="text-sm text-gray-400 uppercase tracking-[0.3em]">Execution Log</p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{logs.length} kayıt</h3>
                </div>
                {logs.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-6 text-sm text-gray-400">Log kaydı yok.</div>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id} className="rounded-3xl border border-white/10 bg-slate-950/20 p-4 text-sm text-gray-300">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">{log.level}</span>
                          <span className="text-xs text-gray-500">{formatTimestamp(log.createdAt)}</span>
                        </div>
                        <p className="text-sm text-white mb-2">{log.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {detailError ? <Alert tone="rose">{detailError}</Alert> : null}
    </div>
  );
}

function Alert({ children }: { tone: 'rose'; children: React.ReactNode }) {
  return <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100 mb-6">{children}</div>;
}

function FilterBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.34em] text-gray-500 mb-3">{label}</p>
      {children}
    </div>
  );
}

function TaskField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-gray-300">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/10 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{label}</p>
      <p className="mt-2 text-sm text-white break-words">{value}</p>
    </div>
  );
}
