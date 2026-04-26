'use client';

export type StatusBadgeVariant =
  | 'active'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'suspended'
  | 'revoked'
  | 'warning'
  | 'disabled'
  | 'protected'
  | 'review';

const VARIANT_STYLES: Record<StatusBadgeVariant, string> = {
  active:    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  pending:   'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/20',
  running:   'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/20',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  failed:    'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/20',
  cancelled: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  suspended: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  revoked:   'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/20',
  warning:   'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  disabled:  'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/10',
  protected: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/20',
  review:    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
};

const VARIANT_DOT: Record<StatusBadgeVariant, string> = {
  active:    'bg-emerald-400',
  pending:   'bg-slate-400',
  running:   'bg-blue-400',
  completed: 'bg-emerald-400',
  failed:    'bg-rose-400',
  cancelled: 'bg-amber-400',
  suspended: 'bg-amber-400',
  revoked:   'bg-rose-400',
  warning:   'bg-amber-400',
  disabled:  'bg-slate-500',
  protected: 'bg-indigo-400',
  review:    'bg-amber-400',
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
