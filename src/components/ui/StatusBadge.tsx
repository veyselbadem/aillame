'use client';

export type StatusBadgeVariant =
  | 'active'
  | 'ready'
  | 'pending'
  | 'planned'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'suspended'
  | 'revoked'
  | 'warning'
  | 'degraded'
  | 'disabled'
  | 'not-configured'
  | 'protected'
  | 'review'
  | 'info'
  | 'neutral';

const VARIANT_STYLES: Record<StatusBadgeVariant, string> = {
  active:         'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/35',
  ready:          'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/35',
  pending:        'bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-500/30',
  planned:        'bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-500/30',
  running:        'bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/35',
  completed:      'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/35',
  failed:         'bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/35',
  cancelled:      'bg-amber-500/18 text-amber-900 dark:text-amber-200 border-amber-500/35',
  suspended:      'bg-amber-500/18 text-amber-900 dark:text-amber-200 border-amber-500/35',
  revoked:        'bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/35',
  warning:        'bg-amber-500/18 text-amber-950 dark:text-amber-200 border-amber-500/35',
  degraded:       'bg-amber-500/18 text-amber-950 dark:text-amber-200 border-amber-500/35',
  disabled:       'bg-slate-500/14 text-slate-900 dark:text-slate-200 border-slate-500/30',
  'not-configured': 'bg-slate-500/14 text-slate-900 dark:text-slate-200 border-slate-500/30',
  protected:      'bg-indigo-500/15 text-indigo-900 dark:text-indigo-200 border-indigo-500/35',
  review:         'bg-amber-500/18 text-amber-950 dark:text-amber-200 border-amber-500/35',
  info:           'bg-cyan-500/15 text-cyan-900 dark:text-cyan-200 border-cyan-500/35',
  neutral:        'bg-slate-500/15 text-slate-900 dark:text-slate-200 border-slate-500/30',
};

const VARIANT_DOT: Record<StatusBadgeVariant, string> = {
  active:    'bg-emerald-400',
  ready:     'bg-emerald-400',
  pending:   'bg-slate-400',
  planned:   'bg-slate-400',
  running:   'bg-blue-400',
  completed: 'bg-emerald-400',
  failed:    'bg-rose-400',
  cancelled: 'bg-amber-400',
  suspended: 'bg-amber-400',
  revoked:   'bg-rose-400',
  warning:   'bg-amber-400',
  degraded:  'bg-amber-400',
  disabled:  'bg-slate-500',
  'not-configured': 'bg-slate-500',
  protected: 'bg-indigo-400',
  review:    'bg-amber-400',
  info:      'bg-cyan-400',
  neutral:   'bg-slate-400',
};

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export default function StatusBadge({ variant, label, pulse = false, className = '' }: StatusBadgeProps) {
  const displayLabel = label ?? variant.charAt(0).toUpperCase() + variant.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${VARIANT_STYLES[variant]} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${VARIANT_DOT[variant]} ${pulse && variant === 'running' ? 'animate-pulse' : ''}`}
      />
      {displayLabel}
    </span>
  );
}
