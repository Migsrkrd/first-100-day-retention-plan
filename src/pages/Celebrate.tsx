import { useState } from 'react'
import { Award, Cake, PartyPopper, CheckCircle2, PauseCircle, ShieldAlert, Sparkles, CalendarRange } from 'lucide-react'
import { PageHeader, SectionCard, StatTile, Avatar, Pill, Dot } from '@/components/primitives'
import { PersonLink } from '@/components/PersonLink'
import { useNewHires, useSurveys, useTenured, useActivity, buildingShortName } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { buildCelebrateItems, type CelebrateKind } from '@/utils/celebrate'
import { jobDot } from '@/utils/ui'
import { fmtDate } from '@/utils/date'
import { cn } from '@/lib/utils'

const KIND: Record<CelebrateKind, { icon: typeof Award; tint: string }> = {
  milestone: { icon: Award, tint: 'bg-blue-50 text-blue-700' },
  birthday: { icon: Cake, tint: 'bg-violet-50 text-violet-700' },
  anniversary: { icon: PartyPopper, tint: 'bg-teal-50 text-teal-700' },
}

function whenLabel(d: number): string {
  if (d <= 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  return `in ${d}d`
}

export function Celebrate() {
  const { inScope, scopedBuildingId } = useScope()
  const [horizon, setHorizon] = useState(14)

  const hires = useNewHires().list().filter((h) => h.status === 'active' && inScope(h.buildingId))
  const surveys = useSurveys().list()
  const tenured = useTenured().list().filter((t) => inScope(t.buildingId))
  const activity = useActivity()
    .list()
    .filter((a) => a.job === 'Celebrate' && inScope(a.buildingId))

  const items = buildCelebrateItems(hires, surveys, tenured, horizon)
  const held = items.filter((i) => i.held)
  const queued = items.filter((i) => !i.held)

  return (
    <div>
      <PageHeader
        title="Celebrate"
        subtitle="Recognition that builds belonging — auto-sent, unless the moment would land wrong."
        actions={
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 shadow-sm">
            <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
            Horizon
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            >
              {[7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>
        }
      />

      {/* The guard — sorting is the strategy */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Sorting is the strategy.</span> The engine auto-holds any celebration for a hire
          who is currently <span className="font-medium">Negative</span> or <span className="font-medium">Silent</span> on
          the roster — so a canned “congrats” never lands on someone who’s about to quit.{' '}
          {held.length > 0 && (
            <span className="font-medium">
              {held.length} recognition{held.length === 1 ? '' : 's'} on hold right now.
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Upcoming" value={items.length} hint={`next ${horizon} days`} />
        <StatTile label="Auto-send queued" value={queued.length} accent="good" hint="belonging, on autopilot" />
        <StatTile label="On hold" value={held.length} accent={held.length ? 'warn' : 'default'} hint="at-risk — intervene first" />
        <StatTile label="Sent recently" value={activity.length} hint="celebrate touchpoints" />
      </div>

      {/* Queue */}
      <SectionCard title="Recognition queue" subtitle="Soonest first · held moments flagged" bodyClassName="p-0">
        <div className="divide-y divide-slate-100">
          {items.map((it) => {
            const meta = KIND[it.kind]
            return (
              <div key={it.key} className="flex items-center gap-3 px-4 py-3">
                <div className="w-16 shrink-0 text-center">
                  <span
                    className={cn(
                      'inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                      it.daysUntil <= 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {whenLabel(it.daysUntil)}
                  </span>
                  <p className="mt-0.5 text-[10px] text-slate-400">{fmtDate(it.dateIso)}</p>
                </div>
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.tint)}>
                  <meta.icon className="h-5 w-5" />
                </span>
                <Avatar name={it.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    <PersonLink id={it.linkId} name={it.name} />
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {it.label} · {it.role}
                    {!scopedBuildingId && ` · ${buildingShortName(it.buildingId)}`}
                  </p>
                </div>
                {it.held ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <Pill className="bg-amber-50 text-amber-700 ring-amber-600/20">
                      <PauseCircle className="h-3 w-3" /> On hold
                    </Pill>
                    <span className="max-w-[220px] truncate text-[10px] text-amber-600/80">{it.holdReason}</span>
                  </div>
                ) : (
                  <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">
                    <CheckCircle2 className="h-3 w-3" /> Auto-send queued
                  </Pill>
                )}
              </div>
            )
          })}
          {!items.length && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No recognition moments in the next {horizon} days.</p>
          )}
        </div>
      </SectionCard>

      {/* Recently sent */}
      <SectionCard title="Recently sent" subtitle="Celebrate touchpoints that already fired" className="mt-4">
        <div className="space-y-2.5">
          {activity.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5">
              <span className="mt-1.5">
                <Dot className={jobDot('Celebrate')} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-700">
                  <span className="font-medium">{a.employeeName}</span> · {a.type}
                  {!scopedBuildingId && <span className="text-slate-400"> · {buildingShortName(a.buildingId)}</span>}
                </p>
                <p className="text-[11px] text-slate-400">{a.detail}</p>
              </div>
              <span className="whitespace-nowrap text-[11px] text-slate-300">{fmtDate(a.date)}</span>
            </div>
          ))}
          {!activity.length && <p className="text-sm text-slate-400">Nothing sent recently in this view.</p>}
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
            <Sparkles className="h-3.5 w-3.5" /> Day-1 welcome, milestones, birthdays and anniversaries all fire automatically.
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
