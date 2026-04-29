'use client';

import { useEffect, useRef } from 'react';

export default function GemmaWarmupOnBoot() {
  const didRequestWarmup = useRef(false);

  useEffect(() => {
    if (didRequestWarmup.current) return;
    didRequestWarmup.current = true;

    void fetch('/api/core/gemma-runtime/warmup', { method: 'POST' }).catch(() => undefined);
  }, []);

  return null;
}
