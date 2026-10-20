import { ShieldCheck, UserCheck, Siren, Lock, FileCheck2, ShieldAlert } from 'lucide-react'
import { PageHeader, SectionCard, StatTile, Pill } from '@/components/primitives'
import { useAskHere, buildingShortName } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { fmtDate } from '@/utils/date'
import { cn } from '@/lib/utils'

const PRINCIPLES = [
  { icon: UserCheck, title: 'AI triages and drafts; humans decide', body: 'Nothing serious is ever auto-resolved or auto-answered. The engine speeds the signal; a person makes every consequential call.' },
  { icon: Siren, title: 'Reportable matters escalate in real time', body: 'Anything implicating safety, law, or a mandated report routes to Compliance on a real-time clock — over-escalation by design.' },
  { icon: Lock, title: 'Feedback is protected', body: 'Feedback about a leader never routes to that leader; anonymity, where offered, is protected against re-identification.' },
  { icon: FileCheck2, title: 'Everything is logged and closed', body: 'A defensibility asset — and the same closure discipline the save loop depends on.' },
]

const MATRIX = [
  { trigger: 'Resident abuse / neglect', route: 'Compliance + mandated report', clock: 'Immediate', tone: 'red' },
  { trigger: 'Safety event (falls, ratios)', route: 'Compliance', clock: 'Real-time (≤4h)', tone: 'red' },
  { trigger: 'Harassment / hostile conduct', route: 'Administrator + Compliance', clock: 'Same day', tone: 'orange' },
  { trigger: 'Concern about a leader', route: 'Skips that leader → one level up', clock: '≤24h', tone: 'amber' },
  { trigger: 'Pay / scheduling', route: 'People Ops / DON', clock: '24–48h', tone: 'blue' },
  { trigger: 'Recognition / kudos', route: 'Building leader', clock: 'Routine', tone: 'slate' },
]

const TONE: Record<string, string> = {
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

export function SafetyRails() {
  const { inScope, scopedBuildingId } = useScope()
  const sensitive = useAskHere()
    .list()
    .filter((a) => a.sensitive && inScope(a.buildingId))
    .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate))

  const routedToCompliance = sensitive.filter((a) => a.routedTo === 'Compliance').length
  const closed = sensitive.filter((a) => a.status === 'closed').length
  const withinSla = sensitive.filter((a) => a.responseHours <= a.slaHours).length

  return (
    <div>
      <PageHeader
        title="Safety Rails"
        subtitle="Because we operate skilled nursing, some feedback is a reportable matter. Governance is the floor under the retention engine — not the headline."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sensitive items" value={sensitive.length} hint="in this view" />
        <StatTile label="To Compliance" value={routedToCompliance} accent="danger" hint="real-time clock" />
        <StatTile label="Within SLA" value={sensitive.length ? `${Math.round((withinSla / sensitive.length) * 100)}%` : '—'} accent="good" hint="escalation timeliness" />
        <StatTile label="Logged & closed" value={`${closed}/${sensitive.length}`} hint="defensibility trail" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700">
              <p.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{p.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Mandated-reporting & routing matrix" subtitle="What routes where, and how fast">
          <div className="space-y-2">
            {MATRIX.map((m) => (
              <div key={m.trigger} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800">{m.trigger}</p>
                  <p className="text-[11px] text-slate-400">{m.route}</p>
                </div>
                <Pill className={TONE[m.tone]}>{m.clock}</Pill>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent sensitive items" subtitle="Routed on the mandated-reporting path" action={<ShieldCheck className="h-4 w-4 text-emerald-500" />}>
          <div className="space-y-2.5">
            {sensitive.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className={cn('ring-inset', TONE.red)}>
                    <ShieldAlert className="h-3 w-3" /> {a.category}
                  </Pill>
                  <span className="text-[11px] font-medium text-slate-500">→ {a.routedTo}</span>
                  {!scopedBuildingId && <span className="text-[11px] text-slate-400">{buildingShortName(a.buildingId)}</span>}
                  <span className="ml-auto text-[11px] text-slate-300">{fmtDate(a.submittedDate)}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">{a.excerpt}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Actioned in {a.responseHours}h (SLA {a.slaHours}h) · <span className="capitalize">{a.status}</span>
                </p>
              </div>
            ))}
            {!sensitive.length && <p className="py-4 text-center text-sm text-slate-400">No sensitive items in this view.</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
