import { ShieldAlert, EyeOff, Clock, CheckCircle2, Megaphone, CalendarClock, Users } from 'lucide-react'
import { PageHeader, SectionCard, StatTile, Pill } from '@/components/primitives'
import { useAskHere, useYouSaidWeDid, useNewHires, useTenured, buildingShortName } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { fmtDate, fmtDateLong } from '@/utils/date'
import { cn } from '@/lib/utils'

const CATEGORY_TINT: Record<string, string> = {
  'Staffing / Safety': 'bg-red-50 text-red-700 ring-red-600/20',
  Safety: 'bg-red-50 text-red-700 ring-red-600/20',
  Manager: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  Pay: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Scheduling: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Equipment: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Kudos: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
}

export function Listening() {
  const askHere = useAskHere().list()
  const ysd = useYouSaidWeDid().list()
  const { inScope, scopedBuildingId } = useScope()
  const workforce =
    useNewHires().list().filter((h) => inScope(h.buildingId)).length +
    useTenured().list().filter((t) => inScope(t.buildingId)).length

  const items = askHere.filter((a) => inScope(a.buildingId)).sort((a, b) => b.submittedDate.localeCompare(a.submittedDate))
  const wins = ysd.filter((y) => y.buildingId === 'portfolio' || inScope(y.buildingId))

  const withinSla = items.filter((a) => a.responseHours <= a.slaHours).length
  const slaRate = items.length ? Math.round((withinSla / items.length) * 100) : 0
  const sensitive = items.filter((a) => a.sensitive).length
  const avgResponse = items.length ? Math.round(items.reduce((s, a) => s + a.responseHours, 0) / items.length) : 0

  return (
    <div>
      <PageHeader
        title="Listening"
        subtitle="The always-on channel that catches the concern that doesn't wait for a survey — and the proof that feedback produces change."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open + recent" value={items.length} hint="Ask Here items" />
        <StatTile label="Within SLA" value={`${slaRate}%`} accent="good" hint="routed & answered on time" />
        <StatTile label="Avg response" value={`${avgResponse}h`} hint="to first action" />
        <StatTile label="Sensitive routed" value={sensitive} accent="danger" hint="to Compliance / admin" />
      </div>

      {/* Bi-annual & anniversary surveys — the whole-workforce loop */}
      <SectionCard
        title="Bi-annual & anniversary surveys"
        subtitle="Extends the listen-and-respond loop beyond the first 100 days to the whole workforce"
        className="mb-5"
        action={<Pill className="bg-blue-50 text-blue-700 ring-blue-600/20">Listen</Pill>}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 h-4 w-4 text-slate-400" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Next bi-annual round</p>
              <p className="text-sm font-medium text-slate-700">Sep 1, 2026</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 text-slate-400" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Population tracked</p>
              <p className="text-sm font-medium text-slate-700">{workforce} in view</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-slate-400" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Last-round response</p>
              <p className="text-sm font-medium text-slate-700">61%</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <EyeOff className="mt-0.5 h-4 w-4 text-slate-400" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Anonymous option</p>
              <p className="text-sm font-medium text-slate-700">On</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Anniversary surveys fire off each person’s hire date; the bi-annual pulse deploys on a schedule with the
          anonymous option on. Flat or negative results fork into the same save loop as the early-tenure surveys.
        </p>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Ask Here feed */}
        <SectionCard title="Ask Here" subtitle="Sensitive items route to Compliance on a real-time clock — over-escalation by design." className="lg:col-span-2" bodyClassName="p-0">
          <div className="divide-y divide-slate-100">
            {items.map((a) => (
              <div key={a.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className={CATEGORY_TINT[a.category] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20'}>{a.category}</Pill>
                  {a.sensitive && (
                    <Pill className="bg-red-50 text-red-700 ring-red-600/20">
                      <ShieldAlert className="h-3 w-3" /> sensitive
                    </Pill>
                  )}
                  {a.anonymous && (
                    <Pill className="bg-slate-100 text-slate-500 ring-slate-400/20">
                      <EyeOff className="h-3 w-3" /> anonymous
                    </Pill>
                  )}
                  {!scopedBuildingId && <span className="text-[11px] text-slate-400">{buildingShortName(a.buildingId)}</span>}
                  <span className="ml-auto text-[11px] text-slate-300">{fmtDate(a.submittedDate)}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-700">{a.excerpt}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Routed to <span className="font-medium text-slate-500">{a.routedTo}</span></span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      a.responseHours <= a.slaHours ? 'text-emerald-600' : 'text-orange-600',
                    )}
                  >
                    <Clock className="h-3 w-3" /> {a.responseHours}h (SLA {a.slaHours}h)
                  </span>
                  <span className="inline-flex items-center gap-1 capitalize">
                    {a.status === 'closed' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* You Said We Did */}
        <SectionCard
          title="You Said, We Did"
          subtitle="The keystone — proves responding is worth it"
          className="lg:col-span-1"
          action={<Megaphone className="h-4 w-4 text-teal-500" />}
        >
          <div className="space-y-3">
            {wins.map((y) => (
              <div key={y.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-teal-700">{y.theme}</span>
                  <span className="text-[10px] text-slate-400">{fmtDateLong(y.publishedDate)}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">You said</p>
                <p className="text-xs text-slate-600">“{y.said}”</p>
                <p className="mt-1.5 text-[11px] text-teal-600">We did</p>
                <p className="text-xs font-medium text-slate-700">{y.did}</p>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  from {y.sourceCount} pieces of feedback · {y.buildingId === 'portfolio' ? 'portfolio-wide' : buildingShortName(y.buildingId)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
