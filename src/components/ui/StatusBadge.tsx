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
  active:         'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  ready:          'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  pending:        'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/25',
  planned:        'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/25',
  running:        'bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25',
  completed:      'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  failed:         'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25',
  cancelled:      'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25',
  suspended:      'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25',
  revoked:        'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25',
  warning:        'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25',
  degraded:       'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25',
  disabled:       'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  'not-configured': 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  protected:      'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
  review:         'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25',
  info:           'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
  neutral:        'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/25',
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
