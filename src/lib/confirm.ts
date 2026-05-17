'use client';

interface SafeConfirmOptions {
  title?: string;
  kind?: 'info' | 'warning' | 'error';
}

export async function safeConfirm(message: string, options: SafeConfirmOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const { confirm } = await import('@tauri-apps/plugin-dialog');
    return await confirm(message, {
      title: options.title ?? 'Aillame',
      kind: options.kind ?? 'warning',
    });
  } catch (error) {
    console.warn('[Aillame] Tauri confirm unavailable, falling back to window.confirm.', error);
    return window.confirm(message);
  }
}
