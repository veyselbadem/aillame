import { AillameToolDefinition, AillameToolResult, AillameToolContext } from './types';
import { AillameMemoryService } from '../memory/aillame-memory.service';
import { getQwenReadiness, getSdxlReadiness } from '../model-management/status';
import { formatBytes, getModelPathHealth } from '../models/model-path-health';
import { resolveProjectRelative } from '../project-root';
import fs from 'fs';
import path from 'path';

export const TOOL_REGISTRY: Record<string, AillameToolDefinition> = {
  'memory.search': {
    id: 'memory.search',
    name: 'Hafıza Arama',
    description: 'Aillame yerel hafızasında arama yapar.',
    category: 'memory',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Arama kelimesi' }
      },
      required: ['query']
    },
    async execute(input: any, context: AillameToolContext): Promise<AillameToolResult> {
      try {
        const query = typeof input === 'object' && input !== null ? input.query : String(input || '');
        if (!query) {
          return { ok: false, errors: ['Arama sorgusu boş olamaz.'] };
        }
        
        const results = await AillameMemoryService.searchMemories(query);
        // Security filter: ensure no sensitive content leaks
        const safeResults = results.filter(r => !r.sensitive);
        
        return {
          ok: true,
          data: safeResults,
          message: `Arama tamamlandı. ${safeResults.length} ilgili kayıt bulundu.`
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'memory.list': {
    id: 'memory.list',
    name: 'Hafıza Listeleme',
    description: 'Kullanıcı yerel hafıza kayıtlarını listeler.',
    category: 'memory',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    async execute(input: any, context: AillameToolContext): Promise<AillameToolResult> {
      try {
        const results = await AillameMemoryService.listMemories();
        const safeResults = results.filter(r => !r.sensitive);
        
        return {
          ok: true,
          data: safeResults,
          message: `Yerel hafızada kayıtlı ${safeResults.length} adet bilgi listelendi.`
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'system.health': {
    id: 'system.health',
    name: 'Sistem Sağlığı',
    description: 'Sistem durumunu, GPU kilidini ve genel hazır olma raporunu sorgular.',
    category: 'system',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    async execute(input: any, context: AillameToolContext): Promise<AillameToolResult> {
      try {
        const gpuLock = (globalThis as any)[Symbol.for('aillame.gpuHeavyLock')];
        const isLocked = !!gpuLock;
        
        return {
          ok: true,
          data: {
            gpuHeavyLock: isLocked ? 'locked' : 'unlocked',
            gpuHeavyLockOwner: isLocked ? String(gpuLock) : null,
            platform: process.platform,
            nodeVersion: process.version,
            status: 'healthy'
          },
          message: isLocked 
            ? 'Sistem çalışır durumda ancak ağır bir GPU işlemi (Inference) yürütülüyor.' 
            : 'Sistem tamamen sağlıklı ve yeni görevler için hazır.'
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'project.docs': {
    id: 'project.docs',
    name: 'Proje Dokümanları',
    description: 'Aillame yerel AI mimari ve sistem dokümanlarının varlığını kontrol eder ve kısa özetlerini döner.',
    category: 'project',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    async execute(input: any, context: AillameToolContext): Promise<AillameToolResult> {
      try {
        const docs = [
          { path: 'docs/LOCAL_AI_ARCHITECTURE.md', name: 'Yerel AI Mimarisi' },
          { path: 'docs/LOCAL_MEMORY_SYSTEM.md', name: 'Yerel Hafıza Sistemi' }
        ];

        const results = docs.map(doc => {
          const fullPath = resolveProjectRelative(doc.path);
          const exists = fs.existsSync(fullPath);
          let summary = '';
          let sizeBytes = 0;

          if (exists) {
            const stats = fs.statSync(fullPath);
            sizeBytes = stats.size;
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Extract the first 3 lines (e.g. titles or brief intro)
            summary = content.split('\n').slice(0, 4).join('\n').trim();
          }

          return {
            id: doc.path,
            name: doc.name,
            exists,
            sizeBytes,
            summary: exists ? summary : 'Doküman bulunamadı.'
          };
        });

        return {
          ok: true,
          data: results,
          message: 'Yerel AI dokümanları kontrol edildi.'
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'models.status': {
    id: 'models.status',
    name: 'Model Durumları',
    description: 'Kurulu ve aktif yerel AI modellerinin durumunu raporlar.',
    category: 'ai',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    async execute(input: any, context: AillameToolContext): Promise<AillameToolResult> {
      try {
        // Fetch statuses without triggering heavy load or downloads
        const [qwenReady, sdxlReady] = await Promise.all([
          getQwenReadiness().catch(() => null),
          getSdxlReadiness().catch(() => null)
        ]);

        const statuses = {
          aillame_nano: {
            id: 'aillame-nano-v1',
            name: 'Aillame Nano',
            status: 'active',
            purpose: 'Cognitive Brain, Router, Text Assistant',
            builtIn: true
          },
          qwen3_vl: {
            id: qwenReady?.modelId || 'qwen3-vl-4b-instruct-q4-k-m',
            name: 'Qwen3-VL 4B Vision',
            status: qwenReady?.isReady ? 'active' : 'inactive',
            isReady: qwenReady?.isReady || false,
            message: qwenReady?.message || 'Yüklü değil veya eksik.'
          },
          sdxl_turbo: {
            id: sdxlReady?.modelId || 'stabilityai/stable-diffusion-xl-base-1.0',
            name: 'SDXL Turbo',
            status: sdxlReady?.isReady ? 'active' : 'inactive',
            isReady: sdxlReady?.isReady || false,
            message: sdxlReady?.message || 'Yüklü değil veya inaktif.'
          },
          tiny_sd: {
            id: 'tiny-sd',
            name: 'Tiny SD',
            status: 'removed',
            message: 'Sistem temizliği kapsamında kalıcı olarak çıkarılmıştır.'
          },
          qwen2_5_0_5b: {
            id: 'qwen2.5-0.5b',
            name: 'Qwen2.5 0.5B Instruct',
            status: 'removed',
            message: 'Sistem temizliği kapsamında kalıcı olarak silinmiştir.'
          }
        };

        return {
          ok: true,
          data: statuses,
          message: 'Aktif yerel AI model hazır olma raporu alındı.'
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'project.list': {
    id: 'project.list',
    name: 'Proje Listesi',
    description: 'Aillame üzerinde kayıtlı tüm yerel proje bağlamlarını listeler.',
    category: 'project',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    async execute(input: any, context: AillameToolContext): Promise<AillameToolResult> {
      try {
        const { AillameProjectContextService } = await import('../projects/project-context.service');
        const list = AillameProjectContextService.listProjects();
        return {
          ok: true,
          data: list.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            goals: p.goals
          })),
          message: `Toplam ${list.length} adet proje bağlamı bulundu.`
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'project.active': {
    id: 'project.active',
    name: 'Aktif Proje',
    description: 'Şu anda aktif olan proje bağlamının özetini getirir.',
    category: 'project',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    async execute(input: any, context: AillameToolContext): Promise<AillameToolResult> {
      try {
        const { AillameProjectContextService } = await import('../projects/project-context.service');
        const active = AillameProjectContextService.getActiveProject();
        return {
          ok: true,
          data: active,
          message: active ? `Aktif proje: "${active.name}"` : 'Aktif bir proje bağlamı seçilmemiş.'
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'project.search': {
    id: 'project.search',
    name: 'Proje Arama',
    description: 'Proje bağlamlarında anahtar kelimeye göre arama yapar.',
    category: 'project',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Aranacak kelime' }
      },
      required: ['query']
    },
    async execute(input: any, context: AillameToolContext): Promise<AillameToolResult> {
      try {
        const query = typeof input === 'object' && input !== null ? input.query : String(input || '');
        if (!query) {
          return { ok: false, errors: ['Arama kelimesi boş olamaz.'] };
        }
        const { AillameProjectContextService } = await import('../projects/project-context.service');
        const list = AillameProjectContextService.listProjects();
        const filtered = list.filter(p => 
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(query.toLowerCase())) ||
          p.category.toLowerCase().includes(query.toLowerCase())
        );
        return {
          ok: true,
          data: filtered,
          message: `Proje arama sonucunda ${filtered.length} adet eşleşen proje bulundu.`
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'distillation.stats': {
    id: 'distillation.stats',
    name: 'Öğrenme Verisi İstatistikleri',
    description: 'Aillame local distillation dataset örnek sayılarını kategorize şekilde listeler.',
    category: 'distillation',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    async execute(input: any, context: any): Promise<any> {
      try {
        const { AillameDistillationDatasetService } = await import('../distillation/distillation-dataset.service');
        const stats = AillameDistillationDatasetService.getStats();
        return {
          ok: true,
          data: stats,
          message: `Toplam ${stats.total} adet öğrenme verisi kaydı mevcut.`
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'distillation.search': {
    id: 'distillation.search',
    name: 'Öğrenme Verisi Arama',
    description: 'Aillame local distillation dataset içinde arama yapar.',
    category: 'distillation',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Aranacak kelime' }
      },
      required: ['query']
    },
    async execute(input: any, context: any): Promise<any> {
      try {
        const query = typeof input === 'object' && input !== null ? input.query : String(input || '');
        if (!query) {
          return { ok: false, errors: ['Arama kelimesi boş olamaz.'] };
        }
        const { AillameDistillationDatasetService } = await import('../distillation/distillation-dataset.service');
        const results = AillameDistillationDatasetService.searchSamples(query);
        return {
          ok: true,
          data: results,
          message: `Öğrenme verisi aramasında ${results.length} adet eşleşen kayıt bulundu.`
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'distillation.list': {
    id: 'distillation.list',
    name: 'Öğrenme Verisi Listesi',
    description: 'Aillame local distillation dataset örneklerini listeler.',
    category: 'distillation',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    async execute(input: any, context: any): Promise<any> {
      try {
        const { AillameDistillationDatasetService } = await import('../distillation/distillation-dataset.service');
        const list = AillameDistillationDatasetService.listSamples();
        return {
          ok: true,
          data: list,
          message: `Öğrenme verisinde kayıtlı ${list.length} adet veri örneği listelendi.`
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  },

  'models.pathHealth': {
    id: 'models.pathHealth',
    name: 'Model Yolları Doğrulaması',
    description: 'Aillame yerel model dosyalarının doğru yerde olup olmadığını read-only olarak denetler.',
    category: 'system',
    riskLevel: 'safe',
    requiresUserConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    async execute(input: any, context: any): Promise<any> {
      try {
        const data = getModelPathHealth();
        const statusLabels: Record<string, string> = {
          ready: 'Hazır',
          missing: 'Eksik',
          warning: 'Uyarı',
          optional_missing: 'Opsiyonel eksik',
          legacy_absent: 'Legacy yok',
        };
        const missingRequired = data.models
          .filter((model) => model.required && model.status === 'missing')
          .flatMap((model) => model.paths
            .filter((item) => !item.exists)
            .map((item) => `${model.name} / ${item.label}`));

        let message = 'Model Yolu Doğrulama Sonuçları:\n\n';
        if (missingRequired.length === 0) {
          message += 'Qwen3-VL 4B, SDXL Turbo ve Aillame Nano dosyaları hazır görünüyor. Tiny SD artık aktif model olmadığı için eksik olması sorun değildir.\n\n';
        } else {
          message += `Bazı gerekli model dosyaları eksik. Eksik olanlar: ${missingRequired.join(', ')}\n\n`;
        }

        for (const model of data.models) {
          message += `* ${model.name}: ${statusLabels[model.status] || model.status} - ${model.role}\n`;
          for (const item of model.paths) {
            message += `  - ${item.label}: ${item.exists ? 'Mevcut' : 'Dosya bulunamadı'} (${formatBytes(item.sizeBytes)})\n`;
          }
          if (model.note) message += `  - Not: ${model.note}\n`;
        }

        return {
          ok: true,
          data,
          message: `${message}\nBu araç yalnızca okuma yapar; dosya indirmez, silmez veya taşımaz.`
        };
      } catch (err: any) {
        return { ok: false, errors: [err.message] };
      }
    }
  }
};
