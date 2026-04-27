/**
 * Faz 2.3: Aillame Tool-Calling Engine
 * Aillame'in dış dünyayla etkileşime geçmesini sağlayan araç sistemi.
 * Her araç bağımsız, test edilebilir ve genişletilebilir yapıdadır.
 */

export type ToolName =
  | 'web_search'
  | 'memory_search'
  | 'code_execute'
  | 'calculate'
  | 'learn_content';

export interface Tool {
  name: ToolName;
  description: string;
  parameters: Record<string, string>;
  execute: (params: Record<string, string>) => Promise<ToolResult>;
}

export interface ToolResult {
  tool: ToolName;
  success: boolean;
  output: string;
  metadata?: Record<string, any>;
}

// ─────────────────────────────────────────────
// ARAÇ 1: Web Araması
// ─────────────────────────────────────────────
const webSearchTool: Tool = {
  name: 'web_search',
  description: 'İnternette arama yapar ve sonuçları getirir.',
  parameters: { query: 'Aranacak sorgu metni' },
  execute: async ({ query }) => {
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, llmMode: 'hybrid' }),
      });
      const data = await res.json();
      const output = typeof data === 'string' ? data : data?.summary ?? JSON.stringify(data);
      return { tool: 'web_search', success: true, output, metadata: { query, sources: data?.sources ?? [] } };
    } catch (e: any) {
      return { tool: 'web_search', success: false, output: `Web arama hatası: ${e.message}` };
    }
  },
};

// ─────────────────────────────────────────────
// ARAÇ 2: Hafıza Araması (Rust RAG)
// ─────────────────────────────────────────────
const memorySearchTool: Tool = {
  name: 'memory_search',
  description: 'Aillame\'nin uzun süreli Rust vektör hafızasında arama yapar.',
  parameters: { query: 'Hafızada aranacak içerik' },
  execute: async ({ query }) => {
    try {
      const res = await fetch('/api/core/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_memory', query }),
      });
      const data = await res.json();
      const results: string[] = data.results ?? [];
      const output = results.length > 0
        ? `Hafızadan ${results.length} sonuç bulundu:\n${results.join('\n---\n')}`
        : 'Hafızada bu konuyla ilgili kayıt bulunamadı.';
      return { tool: 'memory_search', success: true, output, metadata: { count: results.length } };
    } catch (e: any) {
      return { tool: 'memory_search', success: false, output: `Hafıza arama hatası: ${e.message}` };
    }
  },
};

// ─────────────────────────────────────────────
// ARAÇ 3: Güvenli Hesaplama
// ─────────────────────────────────────────────
const calculateTool: Tool = {
  name: 'calculate',
  description: 'Matematiksel ifadeleri güvenli şekilde hesaplar.',
  parameters: { expression: 'Hesaplanacak matematik ifadesi (örn: 2 + 2 * 10)' },
  execute: async ({ expression }) => {
    try {
      // Güvenli değerlendirme - sadece matematiksel operatörlere izin ver
      const sanitized = expression.replace(/[^0-9+\-*/().,\s%^]/g, '');
      if (!sanitized.trim()) throw new Error('Geçersiz ifade');
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${sanitized})`)();
      return {
        tool: 'calculate',
        success: true,
        output: `${expression} = ${result}`,
        metadata: { expression, result },
      };
    } catch (e: any) {
      return { tool: 'calculate', success: false, output: `Hesaplama hatası: ${e.message}` };
    }
  },
};

// ─────────────────────────────────────────────
// ARAÇ 4: İçerik Öğrenme (Live Learning)
// ─────────────────────────────────────────────
const learnContentTool: Tool = {
  name: 'learn_content',
  description: 'Bir metni Aillame\'nin kalıcı hafızasına ve eğitim verisine ekler.',
  parameters: { content: 'Öğrenilecek içerik', source: 'Kaynak tipi: document | research' },
  execute: async ({ content, source }) => {
    try {
      const res = await fetch('/api/core/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_memory', content }),
      });
      await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: 'LEARN', assistantMessage: content }),
      });
      return {
        tool: 'learn_content',
        success: true,
        output: `✅ İçerik öğrenildi ve hafızaya eklendi. (${content.substring(0, 60)}...)`,
        metadata: { source, length: content.length },
      };
    } catch (e: any) {
      return { tool: 'learn_content', success: false, output: `Öğrenme hatası: ${e.message}` };
    }
  },
};

// ─────────────────────────────────────────────
// ARAÇ KAYIT DEFTERİ
// ─────────────────────────────────────────────
export const TOOLS: Record<ToolName, Tool> = {
  web_search: webSearchTool,
  memory_search: memorySearchTool,
  code_execute: calculateTool, // v1: calculate alias (gerçek sandbox Faz 3'te)
  calculate: calculateTool,
  learn_content: learnContentTool,
};

// ─────────────────────────────────────────────
// ARAÇ TESPİT MOTORU
// Kullanıcının mesajını analiz edip hangi araçların kullanılacağına karar verir.
// ─────────────────────────────────────────────
export interface ToolCall {
  tool: ToolName;
  params: Record<string, string>;
  reasoning: string;
}

export function detectTools(input: string): ToolCall[] {
  const lower = input.toLowerCase();
  const calls: ToolCall[] = [];

  // Web araması tespiti
  if (/araştır|search|web'?de|internette|güncel|haber/i.test(lower)) {
    calls.push({
      tool: 'web_search',
      params: { query: input },
      reasoning: 'Kullanıcı güncel web bilgisi istiyor.',
    });
  }

  // Hafıza araması
  if (/hatırla|hafızanda|daha önce|geçmişte|söylemiştin|not al/i.test(lower)) {
    calls.push({
      tool: 'memory_search',
      params: { query: input },
      reasoning: 'Kullanıcı geçmiş konuşma/bilgiye atıfta bulunuyor.',
    });
  }

  // Hesaplama
  if (/hesapla|kaç|toplam|çarp|böl|[0-9]+\s*[+\-*/x÷]\s*[0-9]+/i.test(lower)) {
    const match = input.match(/[\d\s+\-*/().%^]+/);
    if (match) {
      calls.push({
        tool: 'calculate',
        params: { expression: match[0].trim() },
        reasoning: 'Matematiksel ifade tespit edildi.',
      });
    }
  }

  // Öğrenme talebi
  if (/öğren|kaydet|not al|bunu hatırla|hafızana ekle/i.test(lower)) {
    calls.push({
      tool: 'learn_content',
      params: { content: input, source: 'conversation' },
      reasoning: 'Kullanıcı bilginin kaydedilmesini istiyor.',
    });
  }

  return calls;
}
