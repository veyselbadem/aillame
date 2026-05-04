// [NANO-F6] Log analiz ve kalite yargıcı (Quality Judge)
import * as fs from 'fs';
import * as path from 'path';
import { generateOllamaResponse } from '../inference/ollama';

const LOG_PATH = path.join(process.cwd(), 'src', 'core', 'nano-training', 'quality-log.jsonl');

interface QualityLogEntry {
  input: string;
  v1Response: string;
  v2Response?: string;
  routingDecision: string;
  taskScore: Record<string, number>;
  v2LoadTime?: number;
}

async function judgeResponses(input: string, v1: string, v2: string): Promise<{ winner: string; reason: string }> {
  const prompt = `Aşağıda bir kullanıcı girdisi ve iki farklı modelin yanıtı bulunmaktadır. 
Hangi yanıtın daha kaliteli, doğru ve yararlı olduğunu belirle.

Kullanıcı Girdisi: "${input}"

---
Model V1 Yanıtı:
"${v1}"

---
Model V2 Yanıtı:
"${v2}"
---

Sadece şu formatta yanıt ver:
WINNER: [V1, V2 veya TIE]
REASON: [Kısa açıklama]`;

  try {
    const response = await generateOllamaResponse({
      prompt,
      model: process.env.AILLAME_OLLAMA_TEXT_MODEL || 'gemma:2b',
      maxTokens: 100,
      temperature: 0.1, // Düşük yaratıcılık, yüksek tutarlılık
    });

    const winnerMatch = response.match(/WINNER:\s*(V1|V2|TIE)/i);
    const reasonMatch = response.match(/REASON:\s*(.*)/i);

    return {
      winner: winnerMatch ? winnerMatch[1].toUpperCase() : 'UNKNOWN',
      reason: reasonMatch ? reasonMatch[1].trim() : 'Gerekçe belirtilmedi'
    };
  } catch (err) {
    return { winner: 'ERROR', reason: (err as Error).message };
  }
}

async function main() {
  if (!fs.existsSync(LOG_PATH)) {
    console.error('[NANO-F6] Log dosyası bulunamadı:', LOG_PATH);
    return;
  }

  const lines = fs.readFileSync(LOG_PATH, 'utf-8').split('\n').filter(l => l.trim());
  const entries: QualityLogEntry[] = lines.map(l => JSON.parse(l));
  const v2Entries = entries.filter(e => e.v2Response && e.v2Response.length > 5);

  console.log(`\n=== Aillame Nano V1 vs V2 Kalite Analizi ===`);
  console.log(`Toplam Log Sayısı: ${entries.length}`);
  console.log(`Analiz Edilecek V2 Yanıtı: ${v2Entries.length}`);
  console.log('--------------------------------------------\n');

  let v1Wins = 0;
  let v2Wins = 0;
  let ties = 0;
  const areaPerformance: Record<string, { v1: number, v2: number }> = {
    code: { v1: 0, v2: 0 },
    research: { v1: 0, v2: 0 },
    general: { v1: 0, v2: 0 }
  };

  for (const entry of v2Entries) {
    console.log(`> Girdi: ${entry.input.slice(0, 60)}...`);
    const result = await judgeResponses(entry.input, entry.v1Response, entry.v2Response!);
    
    console.log(`  Sonuç: ${result.winner} | ${result.reason}`);

    if (result.winner === 'V1') v1Wins++;
    else if (result.winner === 'V2') v2Wins++;
    else if (result.winner === 'TIE') ties++;

    // Alan bazlı performans takibi
    const area = entry.taskScore.code > 0 ? 'code' : (entry.taskScore.research > 0 ? 'research' : 'general');
    if (result.winner === 'V1') areaPerformance[area].v1++;
    if (result.winner === 'V2') areaPerformance[area].v2++;
  }

  console.log('\n=== FİNAL RAPORU ===');
  console.log(`V1 Kazandı: ${v1Wins}`);
  console.log(`V2 Kazandı: ${v2Wins}`);
  console.log(`Berabere: ${ties}`);
  console.log(`V2 Başarı Oranı (Win Rate): %${((v2Wins / (v2Entries.length || 1)) * 100).toFixed(1)}`);
  
  console.log('\nAlan Bazlı Kazananlar (V2):');
  Object.entries(areaPerformance).forEach(([area, score]) => {
    const total = score.v1 + score.v2;
    const rate = total > 0 ? (score.v2 / total) * 100 : 0;
    console.log(`- ${area.toUpperCase()}: %${rate.toFixed(1)} success rate (${score.v2}/${total})`);
  });

  if (v2Wins < v1Wins) {
    console.log('\n[NANO-F6] ÖNERİ: V2 henüz V1 seviyesine ulaşamadı. Artımlı eğitim şart.');
  } else {
    console.log('\n[NANO-F6] ÖNERİ: V2 performansı umut verici. Birkaç optimizasyon sonrası canlıya alınabilir.');
  }
}

main().catch(console.error);
