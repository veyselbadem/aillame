import { AillameToolDefinition, AillameToolResult, AillameToolContext } from './types';
import { AillameMemoryService } from '../memory/aillame-memory.service';
import { getQwenReadiness, getSdxlReadiness } from '../model-management/status';
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
  }
};
