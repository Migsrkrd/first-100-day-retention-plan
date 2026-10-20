import { CheckCircle2, CircleDot, Circle, ArrowRight, Clock } from 'lucide-react'
import { PageHeader, SectionCard, Pill } from '@/components/primitives'
import { useRollout, useRoles, useAsks } from '@/hooks/useData'
import { cn } from '@/lib/utils'

const STATE_META: Record<string, { label: string; icon: typeof CheckCircle2; dot: string; badge: string }> = {
  complete: { label: 'Complete', icon: CheckCircle2, dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  active: { label: 'In progress', icon: CircleDot, dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  upcoming: { label: 'Upcoming', icon: Circle, dot: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500 ring-slate-400/20' },
}

const ASK_META: Record<string, string> = {
  done: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'in-progress': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  open: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

export function Program() {
  const rollout = useRollout().list()
  const roles = useRoles().list()
  const asks = useAsks().list()

  return (
    <div>
      <PageHeader
        title="Program"
        subtitle="The plan behind the engine — how it rolls out, who owns what, and what's needed to move."
      />

      {/* Rollout */}
      <SectionCard title="Rollout" subtitle="Phased so the save loop is proven before it scales" className="mb-4">
        <ol className="relative space-y-5">
          {rollout.map((p, i) => {
            const meta = STATE_META[p.state] ?? STATE_META.upcoming
            return (
              <li key={p.id} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span className={cn('mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white', meta.dot)}>
                    <meta.icon className="h-3.5 w-3.5" />
                  </span>
                  {i < rollout.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{p.phase}</span>
                    <Pill className={meta.badge}>{meta.label}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{p.what}</p>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <ArrowRight className="h-3 w-3" /> Output: {p.output}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Roles */}
        <SectionCard title="Roles & ownership" subtitle="Who owns each part of the engine">
          <div className="space-y-2.5">
            {roles.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{r.role}</span>
                  <Pill className="bg-blue-50 text-blue-700 ring-blue-600/20">{r.tag}</Pill>
                </div>
                <p className="mt-1 text-xs text-slate-500">{r.responsibility}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Asks */}
        <SectionCard title="What I need to move" subtitle="The decisions and inputs that unblock the pilot">
          <div className="space-y-2.5">
            {asks.map((a, i) => (
              <div key={a.id} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{a.ask}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{a.note}</p>
                </div>
                <Pill className={cn('h-fit', ASK_META[a.status] ?? ASK_META.open)}>
                  {a.status === 'in-progress' && <Clock className="h-3 w-3" />}
                  {a.status === 'in-progress' ? 'in progress' : a.status}
                </Pill>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
