import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { initials, avatarTint } from '@/utils/format'

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' }[size]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', dim, avatarTint(name))}
      title={name}
    >
      {initials(name)}
    </span>
  )
}

export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn('inline-block h-1.5 w-1.5 rounded-full', className)} />
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </div>
  )
}

export function StatTile({
  label,
  value,
  unit,
  delta,
  deltaGood,
  hint,
  accent,
}: {
  label: string
  value: string | number
  unit?: string
  delta?: string
  deltaGood?: boolean
  hint?: string
  accent?: 'default' | 'danger' | 'good' | 'warn'
}) {
  const accentText =
    accent === 'danger'
      ? 'text-red-600'
      : accent === 'good'
        ? 'text-emerald-600'
        : accent === 'warn'
          ? 'text-amber-600'
          : 'text-slate-900'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cn('text-2xl font-semibold tabular-nums', accentText)}>{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {delta && (
          <span className={cn('text-xs font-medium', deltaGood ? 'text-emerald-600' : 'text-red-600')}>{delta}</span>
        )}
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
    </div>
  )
}
