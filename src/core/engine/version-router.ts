// [NANO-F5] V1/V2 yönlendirici — taskScore'a göre hangi model çalışacak
// İlk 2 hafta: paralel mod (her iki sonuç loglanır, kullanıcıya V1 gider)
// 2 hafta sonra: V2 production'a alınır

export type ModelVersion = 'v1' | 'v2';

export interface RoutingDecision {
  version: ModelVersion;
  reason: string;
  taskScore: Record<string, number>;
}

// Paralel mod: true iken kullanıcıya V1 gider, V2 sadece loglanır
export const PARALLEL_MODE = process.env.NANO_PARALLEL_MODE !== 'false';

export function routeToVersion(taskScore: {
  complexity: number;
  research: number;
  code: number;
  creative: number;
}): RoutingDecision {

  // V2 tetikleyicileri
  const shouldUseV2 =
    taskScore.complexity >= 2 ||
    taskScore.code >= 2 ||
    taskScore.research >= 2;

  if (shouldUseV2) {
    return {
      version: 'v2',
      reason: `Yüksek görev skoru: complexity=${taskScore.complexity} code=${taskScore.code} research=${taskScore.research}`,
      taskScore,
    };
  }

  return {
    version: 'v1',
    reason: 'Basit görev — V1 yeterli',
    taskScore,
  };
}

export function resolveActiveVersion(decision: RoutingDecision): ModelVersion {
  if (PARALLEL_MODE) {
    // Paralel modda kullanıcıya her zaman V1 gider
    return 'v1';
  }
  return decision.version;
}
