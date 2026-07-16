import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { PageHeader, SectionCard, Avatar, Pill, Dot } from '@/components/primitives'
import { useNewHires, useSaves, buildingShortName } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { riskBadge, riskDot, riskLabel, sentimentBadge, isOpenSave, type Risk } from '@/utils/ui'
import { tenureDays, MILESTONES, nextMilestone } from '@/utils/date'
import { cn } from '@/lib/utils'

function TenureBar({ day }: { day: number }) {
  const pct = Math.min(100, day)
  return (
    <div className="w-40">
      <div className="relative h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
        {MILESTONES.filter((m) => m <= 100).map((m) => (
          <span
            key={m}
            className={cn(
              'absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded',
              day >= m ? 'bg-blue-700' : 'bg-slate-300',
            )}
            style={{ left: `${m}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>day {day}</span>
        <span>{nextMilestone(day) ? `next: d${nextMilestone(day)}` : '100-day ✓'}</span>
      </div>
    </div>
  )
}

export function NewHires() {
  const hires = useNewHires().list()
  const saves = useSaves().list()
  const { inScope, scopedBuildingId } = useScope()
  const [risk, setRisk] = useState<Risk | 'all'>('all')

  const rows = hires
    .filter((h) => inScope(h.buildingId))
    .filter((h) => risk === 'all' || h.risk === risk)
    .map((h) => ({ ...h, day: tenureDays(h.hireDate) }))
    .sort((a, b) => a.day - b.day)

  const counts = {
    all: hires.filter((h) => inScope(h.buildingId)).length,
    'at-risk': hires.filter((h) => inScope(h.buildingId) && h.risk === 'at-risk').length,
    watch: hires.filter((h) => inScope(h.buildingId) && h.risk === 'watch').length,
    'on-track': hires.filter((h) => inScope(h.buildingId) && h.risk === 'on-track').length,
  }

  return (
    <div>
      <PageHeader
        title="New Hires"
        subtitle="Everyone inside their first 100 days — the population this engine is built to protect."
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {(['all', 'at-risk', 'watch', 'on-track'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRisk(r)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
              risk === r ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 ring-1 ring-inset ring-slate-200 hover:text-slate-700',
            )}
          >
            {r !== 'all' && <Dot className={riskDot(r as Risk)} />}
            {r === 'all' ? 'All' : riskLabel(r as Risk)} ({counts[r]})
          </button>
        ))}
      </div>

      <SectionCard bodyClassName="p-0">
        <div className="divide-y divide-slate-100">
          {rows.map((h) => {
            const openSave = saves.find((s) => s.employeeId === h.id && isOpenSave(s.status))
            return (
              <Link
                key={h.id}
                to={`/new-hires/${h.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
              >
                <Avatar name={h.name} size="md" />
                <div className="w-44 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{h.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {h.role}
                    {!scopedBuildingId && ` · ${buildingShortName(h.buildingId)}`}
                  </p>
                </div>
                <TenureBar day={h.day} />
                <div className="ml-auto flex items-center gap-2">
                  {h.latestSentiment !== 'none' && (
                    <Pill className={sentimentBadge(h.latestSentiment)}>{h.latestSentiment}</Pill>
                  )}
                  {openSave && <Pill className="bg-red-50 text-red-700 ring-red-600/20">save open</Pill>}
                  <Pill className={riskBadge(h.risk)}>
                    <Dot className={riskDot(h.risk)} />
                    {riskLabel(h.risk)}
                  </Pill>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </Link>
            )
          })}
          {!rows.length && <p className="px-4 py-8 text-center text-sm text-slate-400">No new hires in this view.</p>}
        </div>
      </SectionCard>
    </div>
  )
}
