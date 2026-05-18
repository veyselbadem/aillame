'use client';

import { useState, useEffect } from 'react';
import { FiFolder, FiPlus, FiTrash2, FiActivity, FiGlobe, FiTag, FiBookOpen } from 'react-icons/fi';
import { aillameFetch } from '@/lib/aillame-api-client';
import { safeConfirm } from '@/lib/confirm';

interface Project {
  id: string;
  name: string;
  description?: string;
  category: string;
  goals?: string[];
  tone?: string;
  language?: string;
  seoPreferences?: {
    enabled?: boolean;
    primaryKeywords?: string[];
  };
  linkedMemoryTags?: string[];
  createdAt?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('software-engineering');
  const [tone, setTone] = useState('technical');
  const [language, setLanguage] = useState('tr');
  const [goalsInput, setGoalsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aillameFetch('/api/aillame/projects');
      if (res.success) {
        setProjects(res.projects || []);
      } else {
        setError(res.error || 'Projeler yüklenemedi.');
      }
    } catch (err: any) {
      setError(err.message || 'Projeler yüklenirken bir ağ hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim() || !category.trim()) return;

    const newProject = {
      id: id.toLowerCase().trim().replace(/\s+/g, '-'),
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      tone: tone.trim(),
      language: language.trim(),
      goals: goalsInput.split(',').map(g => g.trim()).filter(Boolean),
      linkedMemoryTags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      const res = await aillameFetch('/api/aillame/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      if (res.success) {
        setProjects(prev => [...prev, res.project || newProject]);
        setIsModalOpen(false);
        // Reset form
        setId('');
        setName('');
        setDescription('');
        setCategory('software-engineering');
        setTone('technical');
        setLanguage('tr');
        setGoalsInput('');
        setTagsInput('');
      } else {
        alert(res.error || 'Proje oluşturulamadı.');
      }
    } catch (err: any) {
      alert(err.message || 'Proje oluşturulurken hata oluştu.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = await safeConfirm(
      'Bu proje bağlamını silmek istediğinize emin misiniz? Bu işlem fiziksel dosyalara dokunmaz, sadece Aillame bağlamını kaldırır.',
      { title: 'Projeyi Sil' }
    );
    if (!confirmed) return;

    try {
      const res = await aillameFetch(`/api/aillame/projects?id=${projectId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } else {
        alert(res.error || 'Proje silinemedi.');
      }
    } catch (err: any) {
      alert(err.message || 'Proje silinirken hata oluştu.');
    }
  };

  return (
    <div className="min-h-screen theme-shell px-6 md:px-12 py-12 md:py-20 animate-fade-in">
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <FiFolder size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-700 dark:text-indigo-400">
              Proje Bağlam Yönetimi
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-950 dark:text-white">
            Projeler
          </h1>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl font-medium">
            Yerel AI motorunun kod tabanlarını, SEO stratejilerini ve hafıza bağlamlarını optimize ettiği aktif projelerinizi yönetin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 font-black uppercase tracking-[0.2em] text-xs text-white transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 shrink-0"
        >
          <FiPlus size={16} />
          Yeni Proje Ekle
        </button>
      </header>

      {error && (
        <div className="mb-8 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-6 py-4 text-sm text-rose-800 dark:text-rose-200 font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Yükleniyor...
            </p>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <section className="glass-card rounded-[28px] border border-zinc-200 dark:border-white/5 p-12 text-center">
          <FiFolder size={64} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            Kayıtlı Proje Bulunmuyor
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Aillame yerel AI motoru henüz bir projeye odaklanmamış. Yeni bir proje oluşturarak başlayın.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white dark:bg-white/5 px-5 text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 transition-all"
          >
            İlk Projeyi Oluştur
          </button>
        </section>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="glass-card rounded-[28px] border border-zinc-200 dark:border-white/5 p-6 flex flex-col justify-between hover:translate-y-[-4px] transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-300">
                    {project.category.replace(/-/g, ' ')}
                  </span>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
                    title="Bağlamı Sil"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2 truncate">
                  {project.name}
                </h3>
                <p className="text-xs text-zinc-700 dark:text-zinc-400 font-medium leading-relaxed mb-4 line-clamp-3">
                  {project.description || 'Açıklama belirtilmedi.'}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <FiGlobe /> Dil
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 uppercase">{project.language}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <FiActivity /> Ton
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 capitalize">{project.tone}</span>
                </div>
                {project.linkedMemoryTags && project.linkedMemoryTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {project.linkedMemoryTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded bg-zinc-100 dark:bg-white/5 px-2 py-0.5 text-[9px] font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-transparent"
                      >
                        <FiTag size={8} /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Modern Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-[32px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 md:p-8 shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6">
              Yeni Proje Bağlamı Ekle
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 dark:text-gray-400 mb-2">
                  Proje Kodu / ID (Küçük harf, benzersiz)
                </label>
                <input
                  type="text"
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="örn: my-e-commerce"
                  className="w-full rounded-2xl bg-zinc-100/50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 dark:text-gray-400 mb-2">
                  Proje Adı
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="örn: E-Ticaret Entegrasyonu"
                  className="w-full rounded-2xl bg-zinc-100/50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 dark:text-gray-400 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Projenin amacı, kapsamı ve temel özellikleri..."
                  className="w-full rounded-2xl bg-zinc-100/50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 dark:text-gray-400 mb-2">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-100/50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500/40"
                  >
                    <option value="software-engineering">Yazılım Mühendisliği</option>
                    <option value="copywriting">Metin Yazarlığı</option>
                    <option value="digital-marketing">Dijital Pazarlama</option>
                    <option value="data-analysis">Veri Analizi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 dark:text-gray-400 mb-2">
                    İletişim Tonu
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-100/50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500/40"
                  >
                    <option value="technical">Teknik / Akademik</option>
                    <option value="creative">Yaratıcı / Esnek</option>
                    <option value="professional">Profesyonel / Resmi</option>
                    <option value="casual">Gündelik / Samimi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 dark:text-gray-400 mb-2">
                    Dil
                  </label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="tr, en..."
                    className="w-full rounded-2xl bg-zinc-100/50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 dark:text-gray-400 mb-2">
                    Etiketler (Virgülle ayırın)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="react, api, auth..."
                    className="w-full rounded-2xl bg-zinc-100/50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 dark:text-gray-400 mb-2">
                  Proje Hedefleri (Virgülle ayırın)
                </label>
                <input
                  type="text"
                  value={goalsInput}
                  onChange={(e) => setGoalsInput(e.target.value)}
                  placeholder="hız, güvenlik, SEO uyumu..."
                  className="w-full rounded-2xl bg-zinc-100/50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-[0.18em] transition-all hover:bg-indigo-700 active:scale-95"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
