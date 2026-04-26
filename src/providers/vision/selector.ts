import { LocalVisionProvider } from './local-vision';
import type { VisionProvider } from './base';

export type VisionProviderType = 'local';

const providers: Record<VisionProviderType, VisionProvider> = {
  local: new LocalVisionProvider(),
};

export function getVisionProvider(type: VisionProviderType): VisionProvider {
  return providers[type];
}

export function getAvailableVisionProviders(): VisionProviderType[] {
  return Object.keys(providers) as VisionProviderType[];
}
