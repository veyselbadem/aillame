// [NANO-F4C] Dataset durum kontrolü — eğitimden önce çalıştır
import { checkDatasetStatus } from '../engine/train-v2';

console.log('--- [NANO-F4C] Dataset Status Check ---');
checkDatasetStatus().then(() => {
  console.log('[NANO-F4C] Kontrol tamamlandı');
}).catch(err => {
  console.error('[NANO-F4C] Hata:', err);
});
