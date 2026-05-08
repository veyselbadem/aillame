'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiSearch, FiActivity, FiCode, FiShield, FiCheckCircle, 
  FiInfo, FiAlertTriangle, FiArrowRight, FiRotateCw, 
  FiFileText, FiCpu, FiExternalLink, FiLock, FiDatabase
} from 'react-icons/fi';
import StatusBadge from '@/components/ui/StatusBadge';

export default function AgentCommandCenter() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Workflow State
  const [workspacePath, setWorkspacePath] = useState('');
  const [userTask, setUserTask] = useState('');
  const [currentStep, setCurrentStep] = useState<'idle' | 'scanning' | 'planning' | 'reading' | 'proposing' | 'verifying' | 'auditing'>('idle');
  
  // Results
  const [scanResult, setScanResult] = useState<any>(null);
  const [planResult, setPlanResult] = useState<any>(null);
  const [deepContextResult, setDeepContextResult] = useState<any>(null);
  const [patchProposalResult, setPatchProposalResult] = useState<any>(null);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [auditResult, setAuditResult] = useState<any>(null);

  // UI Control
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalText, setApprovalText] = useState('');
  const [isDryRunDone, setIsDryRunDone] = useState(false);
  const [memorySummary, setMemorySummary] = useState<any>(null);
  const [memoryCards, setMemoryCards] = useState<any[]>([]);

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    const token = localStorage.getItem('aillame_admin_token');
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setAuthorized(true);
    setAdminToken(token);
    loadMemory(token);
  }, [router]);

  const loadMemory = async (token?: string | null) => {
    try {
      const response = await fetch('/api/admin/agent/memory/summary', {
        headers: { 'x-aillame-admin-token': token || adminToken || '' }
      });
      const data = await response.json();
      if (data.success) setMemorySummary(data.summary);

      const cardsRes = await fetch('/api/admin/agent/memory/cards?limit=5', {
        headers: { 'x-aillame-admin-token': token || adminToken || '' }
      });
      const cardsData = await cardsRes.json();
      if (cardsData.success) setMemoryCards(cardsData.cards);
    } catch {}
  };

  const apiCall = async (endpoint: string, body: any) => {
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-aillame-admin-token': adminToken || ''
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'İşlem başarısız oldu.');
      }
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const handleScan = async () => {
    if (!workspacePath) { setError('Lütfen bir workspace yolu girin.'); return; }
    setLoading(true);
    setCurrentStep('scanning');
    const result = await apiCall('/api/admin/agent/workspace/scan', { workspacePath });
    if (result) setScanResult(result);
    setLoading(false);
  };

  const handlePlan = async () => {
    setLoading(true);
    setCurrentStep('planning');
    const result = await apiCall('/api/admin/agent/plan', { workspacePath, userTask, workspaceContext: scanResult });
    if (result) setPlanResult(result);
    setLoading(false);
  };

  const handleDeepContext = async () => {
    setLoading(true);
    setCurrentStep('reading');
    const result = await apiCall('/api/admin/agent/deep-context', { workspacePath, plan: planResult });
    if (result) setDeepContextResult(result);
    setLoading(false);
  };

  const handleProposal = async () => {
    setLoading(true);
    setCurrentStep('proposing');
    const result = await apiCall('/api/admin/agent/patch-proposal', { workspacePath, userTask, deepContext: deepContextResult });
    if (result) setPatchProposalResult(result);
    setLoading(false);
  };

  const handleDryRun = async () => {
    setLoading(true);
    const result = await apiCall('/api/admin/agent/apply-patch', { 
      workspacePath, 
      proposal: patchProposalResult,
      options: { dryRun: true, backup: true },
      approval: { approved: true, approvalText: 'DRY RUN' }
    });
    if (result) {
      setDryRunResult(result);
      setIsDryRunDone(true);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    if (!approvalText || approvalText.length < 5) {
      setError('Lütfen geçerli bir onay metni girin.');
      return;
    }
    setLoading(true);
    const result = await apiCall('/api/admin/agent/apply-patch', { 
      workspacePath, 
      proposal: patchProposalResult,
      options: { dryRun: false, backup: true },
      approval: { approved: true, approvalText }
    });
    if (result) setApplyResult(result);
    setLoading(false);
  };

  const handleAudit = async () => {
    setLoading(true);
    setCurrentStep('auditing');
    const result = await apiCall('/api/admin/agent/execution-audit', { 
      workspacePath, 
      applyResult: applyResult || dryRunResult,
      originalProposal: patchProposalResult,
      userTask
    });
    if (result) {
      setAuditResult(result);
      // Auto-learn if successful
      if (result.status === 'verified' || result.status === 'partially-verified') {
        await apiCall('/api/admin/agent/memory/learn', {
          audit: result,
          userTask,
          safeRootName: scanResult?.safeRootName || 'unknown'
        });
        loadMemory();
      }
    }
    setLoading(false);
  };

  if (!authorized) return null;

  return (
    <div className="theme-admin-page min-h-screen p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <FiCpu size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Agent Command Center</h1>
            <p className="text-sm text-slate-400 font-medium tracking-wide">Otonom Kod Analizi ve Güvenli Müdahale İstasyonu (Absolute path'ler maskelenmiştir)</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        {/* Main Workflow Column */}
        <div className="space-y-6">
          
          {/* Input Panel */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <FiSearch className="text-indigo-400" />
              Görev Başlat
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Workspace Dizini</label>
                <div className="relative group">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="text" 
                    value={workspacePath}
                    onChange={(e) => setWorkspacePath(e.target.value)}
                    placeholder="C:\Users\veyse\...\aillame"
                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Görev Metni</label>
                <textarea 
                  value={userTask}
                  onChange={(e) => setUserTask(e.target.value)}
                  placeholder="Hangi kod değişikliğini yapmak istiyorsun?"
                  rows={3}
                  className="w-full bg-black/20 border border-white/5 rounded-2xl py-3.5 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button 
                  onClick={handleScan}
                  disabled={loading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                  {loading && currentStep === 'scanning' ? <FiRotateCw className="animate-spin" /> : <FiSearch />}
                  Workspace Tara
                </button>
                {scanResult && (
                  <button 
                    onClick={handlePlan}
                    disabled={loading}
                    className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 px-6 py-3 rounded-2xl text-sm font-bold transition-all"
                  >
                    {loading && currentStep === 'planning' ? <FiRotateCw className="animate-spin" /> : <FiActivity />}
                    Plan Oluştur
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Results Area */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-200 text-sm animate-shake">
              <FiAlertTriangle className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Scan Results */}
          {scanResult && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2 italic">
                  <FiCheckCircle className="text-indigo-400" />
                  TARAMA SONUCU
                </h3>
                <StatusBadge variant="protected" label={scanResult.projectType} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataCard label="Root Name" value={scanResult.safeRootName} />
                <DataCard label="Frameworks" value={scanResult.detectedFrameworks.join(', ') || 'N/A'} />
                <DataCard label="Languages" value={scanResult.detectedLanguages.join(', ') || 'N/A'} />
                <DataCard label="Ignored" value={`${scanResult.ignoredCounts.total} files`} />
              </div>
            </div>
          )}

          {/* Plan Results */}
          {planResult && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold flex items-center gap-2 italic">
                  <FiActivity className="text-indigo-400" />
                  AGENT PLANI
                </h3>
                <div className="flex gap-2">
                  <StatusBadge variant={planResult.task.intent.riskLevel === 'high' ? 'failed' : 'warning'} label={`Risk: ${planResult.task.intent.riskLevel}`} />
                  <StatusBadge variant="running" label={`Conf: %${Math.round(planResult.task.intent.confidence * 100)}`} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                  <p className="text-indigo-200 text-sm leading-relaxed">{planResult.plan.summary}</p>
                </div>
                <div className="space-y-2">
                  {planResult.plan.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                      {step.title}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={handleDeepContext}
                  disabled={loading}
                  className="w-full bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl text-sm font-bold border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  {loading && currentStep === 'reading' ? <FiRotateCw className="animate-spin" /> : <FiCode />}
                  Deep Context Analizi Başlat
                </button>
              </div>
            </div>
          )}

          {/* Deep Context Results */}
          {deepContextResult && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-slide-up">
              <h3 className="text-white font-bold flex items-center gap-2 italic mb-4">
                <FiFileText className="text-indigo-400" />
                DEEP CONTEXT (ANALİZ EDİLEN DOSYALAR)
              </h3>
              <div className="space-y-3 mb-6">
                {deepContextResult.selectedFiles.map((file: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-black/10 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 truncate">
                      <FiFileText className="text-slate-500" />
                      <span className="text-xs text-slate-300 truncate">{file.relativePath}</span>
                    </div>
                    <StatusBadge variant="review" label={file.language} />
                  </div>
                ))}
              </div>
              <button 
                onClick={handleProposal}
                disabled={loading}
                className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-6 py-3 rounded-2xl text-sm font-bold border border-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading && currentStep === 'proposing' ? <FiRotateCw className="animate-spin" /> : <FiCode />}
                Yama Önerisi (Patch Proposal) Oluştur
              </button>
            </div>
          )}

          {/* Patch Proposal Results (Diff View) */}
          {patchProposalResult && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold flex items-center gap-2 italic">
                  <FiCode className="text-indigo-400" />
                  YAMA ÖNERİSİ (PATCH PROPOSAL)
                </h3>
                <StatusBadge variant="failed" label="Human Approval Gated" />
              </div>
              <div className="space-y-6">
                {patchProposalResult.changes.map((change: any, idx: number) => (
                  <div key={idx} className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden shadow-inner">
                    <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-300 font-mono tracking-tighter">{change.relativePath}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">{change.changeType}</span>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <pre className="text-[11px] font-mono leading-relaxed">
                        {change.unifiedDiff.split('\n').map((line: string, lIdx: number) => (
                          <div key={lIdx} className={line.startsWith('+') ? 'text-emerald-400/80 bg-emerald-400/5' : line.startsWith('-') ? 'text-rose-400/80 bg-rose-400/5' : 'text-slate-400'}>
                            {line}
                          </div>
                        ))}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Panel */}
              <div className="mt-8 pt-8 border-t border-white/10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Geri Bildirim / Onay Metni</label>
                    <input 
                      type="text" 
                      value={approvalText}
                      onChange={(e) => setApprovalText(e.target.value)}
                      placeholder="Örn: Değişiklikleri onaylıyorum."
                      className="w-full bg-black/20 border border-white/5 rounded-2xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                    />
                    <p className="text-[10px] text-slate-500 px-1 italic">Not: Yüksek riskli işlemlerde 'ONAYLIYORUM' yazılması gerekebilir.</p>
                  </div>
                  <div className="flex flex-col justify-end gap-3">
                    <button 
                      onClick={handleDryRun}
                      disabled={loading}
                      className="w-full bg-white/5 hover:bg-white/10 text-white px-6 py-3.5 rounded-2xl text-sm font-bold border border-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      {loading && isDryRunDone === false ? <FiRotateCw className="animate-spin" /> : <FiShield />}
                      Önce Dry Run Yap (Yazmadan Test Et)
                    </button>
                    <button 
                      onClick={handleApply}
                      disabled={loading || !isDryRunDone || !approvalText}
                      className="w-full bg-rose-600/80 hover:bg-rose-600 text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                    >
                      {loading && isDryRunDone ? <FiRotateCw className="animate-spin" /> : <FiShield />}
                      Değişiklikleri Onaylı Uygula
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Results */}
          {auditResult && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-slide-up">
               <h3 className="text-white font-bold flex items-center gap-2 italic mb-6">
                <FiActivity className="text-indigo-400" />
                EXECUTION AUDIT & VERIFICATION
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Durum</p>
                    <p className="text-xl font-black text-white">{auditResult.status.toUpperCase()}</p>
                  </div>
                  <div className="flex-1 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Backup</p>
                    <p className="text-xl font-black text-white">{auditResult.backups.length} Adet</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Önerilen Doğrulama Komutları</h4>
                  <div className="space-y-3">
                    {auditResult.verificationPlan.suggestedCommands.map((cmd: any, idx: number) => (
                      <div key={idx} className="group bg-black/30 border border-white/5 rounded-2xl p-4 hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-indigo-300 font-mono text-sm">{cmd.command}</code>
                          <StatusBadge variant={cmd.risk === 'high' ? 'failed' : 'warning'} label={cmd.risk} />
                        </div>
                        <p className="text-xs text-slate-400">{cmd.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
                  <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <FiShield /> Rollback Rehberi
                  </h4>
                  <div className="space-y-2">
                    {auditResult.backups.map((bk: any, idx: number) => (
                      <div key={idx} className="text-[10px] text-amber-200/60 font-mono">
                        {bk.relativePath} {'->'} {bk.backupId}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Learning Cards (Memory) */}
          {memoryCards.length > 0 && (
            <section className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-slide-up">
               <h3 className="text-white font-bold flex items-center gap-2 italic mb-6">
                <FiDatabase className="text-emerald-400" />
                SON ÖĞRENME KARTLARI (AGENT MEMORY)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memoryCards.map((card) => (
                  <div key={card.id} className="p-4 bg-black/30 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge variant={card.outcome === 'success' ? 'active' : 'warning'} label={card.taskCategory} />
                      <span className="text-[9px] text-slate-500 font-mono">{new Date(card.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-white font-medium mb-3 line-clamp-2">{card.taskSummary}</p>
                    <div className="flex flex-wrap gap-1">
                      {card.changedAreas.map((area: string, i: number) => (
                        <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">{area}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Sidebar Status Column */}
        <div className="space-y-6">
          
          {/* Workflow Stepper */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 px-1">İşlem Adımları</h2>
            <div className="space-y-6 relative">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-white/10" />
              <StepItem label="Workspace Tarama" active={currentStep === 'scanning'} done={!!scanResult} />
              <StepItem label="Agent Planlama" active={currentStep === 'planning'} done={!!planResult} />
              <StepItem label="Deep Context Analizi" active={currentStep === 'reading'} done={!!deepContextResult} />
              <StepItem label="Patch Önerisi" active={currentStep === 'proposing'} done={!!patchProposalResult} />
              <StepItem label="Dry Run Denetimi" active={isDryRunDone} done={isDryRunDone} />
              <StepItem label="Audit & Doğrulama" active={currentStep === 'auditing'} done={!!auditResult} />
            </div>
            
            {(applyResult || (dryRunResult && isDryRunDone)) && !auditResult && (
              <button 
                onClick={handleAudit}
                className="w-full mt-8 bg-indigo-500 text-white py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20 animate-pulse hover:animate-none transition-all"
              >
                Audit Raporu Oluştur
              </button>
            )}
          </section>

          {/* Safety Status */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
             <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 px-1">Güvenlik Durumu</h2>
             <div className="space-y-3">
                <SafetyFlag label="Read-Only First" active={true} />
                <SafetyFlag label="Human Approval Gate" active={true} />
                <SafetyFlag label="Automatic Backup" active={true} />
                <SafetyFlag label="Secret Redaction" active={true} />
                <SafetyFlag label="Command Execution" active={false} />
                <SafetyFlag label="Network Access" active={false} />
             </div>
             <div className="mt-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex gap-3">
                <FiInfo className="shrink-0 text-indigo-400 mt-0.5" />
                <p className="text-[10px] text-indigo-200/70 leading-relaxed italic">
                  Aillame Agent, bu fazda terminal komutlarını kendisi çalıştırmaz. Sadece doğrulanmış komutları kullanıcıya önerir.
                </p>
             </div>
          </section>

        </div>
      </div>
      
      {/* Footer / Info */}
      <footer className="mt-12 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">
        Aillame Project · Secure Agent Workflow v1.3
      </footer>
    </div>
  );
}

function StepItem({ label, active, done }: { label: string, active: boolean, done: boolean }) {
  return (
    <div className={`flex items-center gap-4 transition-all duration-300 ${active ? 'translate-x-2' : ''}`}>
      <div className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        done ? 'bg-indigo-500 border-indigo-500' : 
        active ? 'bg-black border-indigo-400 animate-pulse' : 
        'bg-black border-white/10'
      }`}>
        {done && <FiCheckCircle className="text-white" size={10} />}
      </div>
      <span className={`text-[11px] font-bold uppercase tracking-wider ${
        done ? 'text-indigo-400' : 
        active ? 'text-white' : 
        'text-slate-600'
      }`}>{label}</span>
    </div>
  );
}

function DataCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-black/20 border border-white/5 rounded-2xl p-3">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xs font-bold text-white truncate">{value}</p>
    </div>
  );
}

function SafetyFlag({ label, active }: { label: string, active: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-black/10 border border-white/5">
      <span className="text-[10px] font-bold text-slate-400">{label}</span>
      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
        active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
      }`}>
        {active ? 'AKTİF' : 'KAPALI'}
      </span>
    </div>
  );
}
