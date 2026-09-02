import { cn } from '@/lib/format';

/** Крупная плитка с ключевой метрикой. */
export function StatCard({
  label,
  value,
  hint,
  accent = false,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  icon?: string;
}) {
  return (
    <div
      className={cn(
        'surface surface-hover group relative overflow-hidden p-5',
        accent && 'border-accent/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
        {icon && (
          <span
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm transition-transform duration-300 group-hover:scale-110',
              accent ? 'bg-accent/15 text-accent' : 'bg-ink-800 text-zinc-500',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className={cn(
          'mt-3 text-3xl font-semibold tracking-tight',
          accent ? 'text-accent' : 'text-white',
        )}
      >
        {value}
      </div>
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
