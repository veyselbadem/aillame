export const LOCAL_FIRST_DISABLED_MESSAGE =
  'This feature is disabled in the Local-First Final RC version.';

type EnvLike = Record<string, string | undefined>;

function readEnv(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: EnvLike };
  };
  return runtime.process?.env?.[name];
}

export function isLegacyProvidersEnabled(env?: EnvLike): boolean {
  const value = env?.AILLAME_ENABLE_LEGACY_PROVIDERS
    ?? env?.NEXT_PUBLIC_AILLAME_ENABLE_LEGACY_PROVIDERS
    ?? readEnv('AILLAME_ENABLE_LEGACY_PROVIDERS')
    ?? readEnv('NEXT_PUBLIC_AILLAME_ENABLE_LEGACY_PROVIDERS');

  return value?.trim().toLowerCase() === 'true';
}

export function getLegacyProviderPolicy() {
  return {
    enabled: isLegacyProvidersEnabled(),
    disabledMessage: LOCAL_FIRST_DISABLED_MESSAGE,
  };
}
