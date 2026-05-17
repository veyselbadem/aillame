import fs from 'fs';
import path from 'path';

export type AillameProjectContext = {
  id: string;
  name: string;
  description?: string;
  category: "website" | "software" | "content" | "legal" | "psychology" | "social" | "other";
  goals: string[];
  tone?: string;
  language?: "tr" | "en" | "mixed";
  seoPreferences?: {
    enabled: boolean;
    minWords?: number;
    headings?: boolean;
    metaDescription?: boolean;
  };
  linkedMemoryTags: string[];
  createdAt: string;
  updatedAt: string;
};

export class AillameProjectContextService {
  private static readonly STORE_DIR = path.join(process.cwd(), '.aillame-data', 'stores');
  private static readonly STORE_PATH = path.join(AillameProjectContextService.STORE_DIR, 'aillame-projects.json');
  private static readonly ACTIVE_PATH = path.join(AillameProjectContextService.STORE_DIR, 'active-project.json');

  private static activeProjectId: string | null = null;

  /**
   * Safe atomic write with self-healing loaded validation.
   */
  private static writeStore(projects: AillameProjectContext[]) {
    try {
      if (!fs.existsSync(this.STORE_DIR)) {
        fs.mkdirSync(this.STORE_DIR, { recursive: true });
      }
      
      const tempPath = `${this.STORE_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(projects, null, 2), 'utf8');
      
      if (fs.existsSync(this.STORE_PATH)) {
        fs.renameSync(tempPath, this.STORE_PATH);
      } else {
        fs.renameSync(tempPath, this.STORE_PATH);
      }
    } catch (error) {
      console.error('[ProjectContextService] Store write failed:', error);
    }
  }

  /**
   * Safe read of projects store with self-healing backup on corruption.
   */
  public static listProjects(): AillameProjectContext[] {
    try {
      if (!fs.existsSync(this.STORE_PATH)) {
        const defaultTemplates = this.getDefaultTemplates();
        this.writeStore(defaultTemplates);
        return defaultTemplates;
      }

      const raw = fs.readFileSync(this.STORE_PATH, 'utf8');
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (jsonErr) {
        console.warn('[ProjectContextService] JSON corrupted, self-healing in progress...');
        try {
          fs.renameSync(this.STORE_PATH, `${this.STORE_PATH}.bak`);
        } catch {}
        const defaultTemplates = this.getDefaultTemplates();
        this.writeStore(defaultTemplates);
        return defaultTemplates;
      }
      return [];
    } catch (error) {
      console.error('[ProjectContextService] Store read failed:', error);
      return [];
    }
  }

  public static getProject(id: string): AillameProjectContext | null {
    const list = this.listProjects();
    return list.find(p => p.id === id) || null;
  }

  public static createProject(project: Omit<AillameProjectContext, 'createdAt' | 'updatedAt'>): AillameProjectContext {
    const list = this.listProjects();
    const newProject: AillameProjectContext = {
      ...project,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newProject);
    this.writeStore(list);
    return newProject;
  }

  public static updateProject(id: string, patch: Partial<Omit<AillameProjectContext, 'id' | 'createdAt' | 'updatedAt'>>): AillameProjectContext | null {
    const list = this.listProjects();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const updated = {
      ...list[idx],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    
    list[idx] = updated;
    this.writeStore(list);
    return updated;
  }

  public static deleteProject(id: string): boolean {
    const list = this.listProjects();
    const filtered = list.filter(p => p.id !== id);
    if (filtered.length === list.length) return false;

    this.writeStore(filtered);
    
    // Reset active if the deleted project was active
    if (this.getActiveProjectId() === id) {
      this.setActiveProject(null);
    }
    return true;
  }

  public static getActiveProjectId(): string | null {
    if (this.activeProjectId) return this.activeProjectId;
    try {
      if (fs.existsSync(this.ACTIVE_PATH)) {
        const raw = fs.readFileSync(this.ACTIVE_PATH, 'utf8').trim();
        const parsed = JSON.parse(raw);
        this.activeProjectId = parsed?.activeProjectId || null;
      }
    } catch {
      this.activeProjectId = null;
    }
    return this.activeProjectId;
  }

  public static setActiveProject(id: string | null): void {
    this.activeProjectId = id;
    try {
      if (!fs.existsSync(this.STORE_DIR)) {
        fs.mkdirSync(this.STORE_DIR, { recursive: true });
      }
      fs.writeFileSync(this.ACTIVE_PATH, JSON.stringify({ activeProjectId: id }), 'utf8');
    } catch (error) {
      console.error('[ProjectContextService] Active save failed:', error);
    }
  }

  public static getActiveProject(): AillameProjectContext | null {
    const id = this.getActiveProjectId();
    if (!id) return null;
    return this.getProject(id);
  }

  public static linkMemoryToProject(projectId: string, tagOrMemoryId: string): boolean {
    const project = this.getProject(projectId);
    if (!project) return false;

    const tags = project.linkedMemoryTags || [];
    if (!tags.includes(tagOrMemoryId)) {
      tags.push(tagOrMemoryId);
      this.updateProject(projectId, { linkedMemoryTags: tags });
    }
    return true;
  }

  /**
   * Generates prompt-ready project context block. Keep it clean and under 150 words.
   */
  public static getProjectContextForPrompt(prompt: string): string {
    try {
      const active = this.getActiveProject();
      if (!active) return '';

      const lines = [
        `[Aktif Proje Bağlamı]`,
        `- Adı: ${active.name}`,
        active.description ? `- Açıklama: ${active.description}` : '',
        `- Kategori: ${active.category}`,
        `- İletişim Dili: ${active.language || 'tr'}`,
        active.tone ? `- Dil Üslubu: ${active.tone}` : '',
      ];

      if (active.goals && active.goals.length > 0) {
        lines.push(`- Hedefler: ${active.goals.slice(0, 3).join(', ')}`);
      }

      if (active.seoPreferences?.enabled) {
        const seo = active.seoPreferences;
        lines.push(`- SEO Tercihleri: Etkin (En az ${seo.minWords || 300} kelime${seo.headings ? ', Başlık yapısı' : ''}${seo.metaDescription ? ', Meta Açıklaması' : ''})`);
      }

      return lines.filter(Boolean).join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Static template list defined for Aillame startup preset initialization.
   */
  private static getDefaultTemplates(): AillameProjectContext[] {
    return [
      {
        id: 'psikoloji-sitesi',
        name: 'Psikoloji Sitesi',
        description: 'Psikolojik danışmanlık, terapi ve ruh sağlığı farkındalık platformu.',
        category: 'psychology',
        goals: ['Ruh sağlığı farkındalığı yaratmak', 'Online seans başvurusu almak', 'Bilgilendirici makaleler sunmak'],
        tone: 'anlaşılır, güven veren, sade Türkçe',
        language: 'tr',
        seoPreferences: {
          enabled: true,
          minWords: 300,
          headings: true,
          metaDescription: true
        },
        linkedMemoryTags: ['psikoloji', 'terapi'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'hukuk-sitesi',
        name: 'Hukuk Sitesi',
        description: 'Hukuki danışmanlık, makaleler ve avukatlık bilgilendirme portalı.',
        category: 'legal',
        goals: ['Hukuki farkındalık oluşturmak', 'Danışmanlık talebi toplamak', 'Yargı kararları özeti paylaşmak'],
        tone: 'resmi, ciddi, dikkatli ve bilgilendirici',
        language: 'tr',
        seoPreferences: {
          enabled: true,
          minWords: 300,
          headings: true,
          metaDescription: true
        },
        linkedMemoryTags: ['hukuk', 'avukat'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'sosyal-paylasim-sitesi',
        name: 'Sosyal Paylaşım Sitesi',
        description: 'Topluluk etkileşimi, forum ve içerik paylaşım sosyal mecrası.',
        category: 'social',
        goals: ['Kullanıcı etkileşimini artırmak', 'Hızlı içerik paylaşımı sağlamak', 'Görsel trendleri yakalamak'],
        tone: 'samimi, kısa, enerjik ve etkileşim odaklı',
        language: 'tr',
        seoPreferences: {
          enabled: false
        },
        linkedMemoryTags: ['sosyal-medya', 'topluluk'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'aillame-gelistirme',
        name: 'Aillame Uygulama Geliştirme',
        description: 'Aillame yerel AI asistanı çekirdek geliştirme ve entegrasyon projesi.',
        category: 'software',
        goals: [
          'Yerel AI mimarisini geliştirmek',
          'Güvenli router/tool-use sistemini korumak',
          'Qwen3-VL 4B ve SDXL Turbo entegrasyonunu stabil tutmak'
        ],
        tone: 'teknik ama son derece anlaşılır, geliştirici dostu',
        language: 'tr',
        seoPreferences: {
          enabled: false
        },
        linkedMemoryTags: ['yazilim', 'ai', 'nano'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
  }
}
