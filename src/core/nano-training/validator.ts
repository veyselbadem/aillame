import type { NanoTrainingRecord } from './types';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  blockedReasons: string[];
}

const UNSAFE_PATTERNS = [
  /api[_-]key/i,
  /secret/i,
  /password/i,
  /token/i,
  /İşlem durduruldu/i,
  /hata oluştu/i,
  /yatırım tavsiyesi/i,
  /finansal tavsiye/i,
  /borsa tüyo/i,
];

/**
 * Nano Training Veri Doğrulayıcı (MVP)
 * Gerçek eğitime girmeden önce veriyi kurallara göre denetler.
 */
export function validateNanoTrainingRecord(record: NanoTrainingRecord): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    warnings: [],
    blockedReasons: [],
  };

  // 1. Temel Alan Kontrolleri
  if (!record.instruction || record.instruction.trim().length < 3) {
    result.blockedReasons.push('Instruction çok kısa veya boş.');
  }

  if (!record.output || record.output.trim().length < 5) {
    result.blockedReasons.push('Output çok kısa veya boş.');
  }

  // 2. Güvenlik ve Kalite Kontrolleri
  if (record.riskLevel === 'high') {
    result.blockedReasons.push('Yüksek risk seviyeli kayıtlar otomatik bloklanır.');
  }

  if (!record.approved) {
    result.blockedReasons.push('Onaylanmamış kayıt.');
  }

  // 3. İçerik Desen Kontrolleri (Secret/Error leakage)
  const combinedText = `${record.instruction} ${record.input || ''} ${record.output}`;
  
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(combinedText)) {
      result.blockedReasons.push(`Güvensiz veya bozuk içerik deseni tespit edildi: ${pattern.source}`);
    }
  }

  // 4. AI Lab Kaynak/Alıntı Kontrolü
  if (record.source === 'ai_lab' && record.output.includes('araştırma') && !record.output.includes('http')) {
    result.blockedReasons.push('AI Lab araştırma mesajı kaynak/URL içermiyor. Eğitim için yetersiz.');
  }

  // 5. Image Output Kontrolü
  if (record.source === 'ai_lab' && record.output.includes('Görsel Üretimi Tamamlandı')) {
    result.blockedReasons.push('Görsel üretim çıktıları doğrudan metin eğitimine dahil edilemez. Sadece prompt kütüphanesi adayı olabilir.');
  }

  // 6. Uzunluk Uyarıları
  if (record.output && record.output.length > 2000) {
    result.warnings.push('Output çok uzun (2000+ karakter). Nano model için optimize edilmemiş olabilir.');
  }

  // Final Karar
  if (result.blockedReasons.length > 0) {
    result.valid = false;
  }

  return result;
}
