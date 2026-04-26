import type { VisionProvider } from './base';
import type { VisionInput, VisionResult } from '@apptypes/vision';

// Not: Gerçek entegrasyon için transformers.js ile görsel analiz modeli kullanılmalı.
// Burada örnek/mock bir yapı sunulmuştur.

export class LocalVisionProvider implements VisionProvider {
  async analyze(input: VisionInput): Promise<VisionResult> {
    // Burada transformers.js ile görsel işleme yapılabilir
    // Şimdilik örnek bir sonuç dönülüyor
    return {
      label: 'Örnek Görsel',
      description: 'Bu bir örnek görsel açıklamasıdır.',
    };
  }
}
