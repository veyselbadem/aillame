export function extractKeywords(text: string, maxKeywords = 10): string[] {
  // Basit anahtar kelime çıkarımı: en sık geçen kelimeler
  const words = text
    .toLowerCase()
    .replace(/[^a-zğüşöçıİ0-9\s]/gi, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([w]) => w);
}
