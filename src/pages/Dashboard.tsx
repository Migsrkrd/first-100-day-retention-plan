import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader, SectionCard, Dot } from '@/components/primitives'
import { useNewHires, useSurveys, useSaves, useInteractions, usePortfolioRow, useBuildings, buildingShortName } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { useProfilePanel } from '@/state/profilePanel'
import { computeSignal } from '@/utils/sentiment'
import { buildScore, BAND_META, NEEDS_ATTENTION, type Band } from '@/utils/score'
import { tenureDays } from '@/utils/date'
import { cn } from '@/lib/utils'

// Worst → best, so the bar reads red → orange → yellow → teal → green.
const BAND_ORDER: Band[] = ['critical', 'atrisk', 'watch', 'stable', 'thriving']

export function Dashboard() {
  const hires = useNewHires().list()
  const surveys = useSurveys().list()
  const saves = useSaves().list()
  const interactions = useInteractions().list()
  const portfolio = usePortfolioRow()
  const buildings = useBuildings().list()
  const { inScope, scopedBuildingId, windowDays, scoreWeights } = useScope()
  const { open } = useProfilePanel()

  const building = scopedBuildingId ? buildings.find((b) => b.id === scopedBuildingId) : null

  const rows = hires
    .filter((h) => h.status === 'active' && inScope(h.buildingId) && tenureDays(h.hireDate) <= windowDays)
    .map((h) => {
      const mine = surveys.filter((s) => s.employeeId === h.id)
      const sc = buildScore(h, mine, saves.filter((s) => s.employeeId === h.id), interactions.filter((i) => i.employeeId === h.id), scoreWeights)
      return { h, sig: computeSignal(h, mine), sc }
    })

  const bandCounts = BAND_ORDER.reduce<Record<Band, number>>((acc, b) => ({ ...acc, [b]: rows.filter((r) => r.sc.band === b).length }), {} as Record<Band, number>)
  const needsAttention = rows.filter((r) => r.sc.score < NEEDS_ATTENTION).length
  const avgScore = rows.length ? Math.round(rows.reduce((n, r) => n + r.sc.score, 0) / rows.length) : 0
  const dueTotal = rows.reduce((n, r) => n + r.sig.coverageDue, 0)
  const answeredTotal = rows.reduce((n, r) => n + r.sig.coverageAnswered, 0)
  const coverage = dueTotal ? Math.round((answeredTotal / dueTotal) * 100) : 100
  const survival = building?.survival90 ?? portfolio?.survival90 ?? 71
  const waiting = rows.filter((r) => r.sc.score < NEEDS_ATTENTION && r.sc.waitingDays > 0).length
  const overdue = rows.filter((r) => r.sc.score < NEEDS_ATTENTION && r.sc.waitingDays >= 3).length
  const savedCount = saves.filter((s) => inScope(s.buildingId) && s.outcome === 'saved').length

  const topAtRisk = [...rows].sort((a, b) => a.sc.score - b.sc.score).slice(0, 6)

  const tiles: { label: string; value: string | number; sub: string; to: string; tone: 'default' | 'danger' | 'warn' | 'good' }[] = [
    { label: 'In window', value: rows.length, sub: `first ${windowDays} days`, to: '/?view=list', tone: 'default' },
    { label: 'Needs attention', value: needsAttention, sub: 'score under 65 · work these', to: '/?filter=needs-attention&view=card', tone: 'danger' },
    { label: 'Avg score', value: avgScore, sub: 'retention health', to: '/?view=list&sort=score', tone: avgScore >= 65 ? 'good' : 'warn' },
    { label: 'Coverage', value: `${coverage}%`, sub: 'due check-ins answered', to: '/?view=list&sort=coverage', tone: coverage >= 70 ? 'good' : 'warn' },
    { label: '90-day retention', value: `${survival}%`, sub: 'the risk window', to: '/pulse', tone: 'good' },
  ]
  const toneText: Record<string, string> = { default: 'text-slate-900', danger: 'text-red-600', warn: 'text-amber-600', good: 'text-emerald-600' }
  const bandTo = (b: Band) => (b === 'stable' || b === 'thriving' ? '/?view=list&sort=score' : '/?filter=needs-attention&view=list')

  return (
    <div>
      <PageHeader
        title={building ? `${building.name} · dashboard` : 'Dashboard'}
        subtitle="Your workforce at a glance — click any number to jump to those people."
      />

      {/* Clickable heads-up tiles */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t.label}</p>
            <p className={cn('mt-1 text-3xl font-semibold tabular-nums', toneText[t.tone])}>{t.value}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
              {t.sub}
              <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </p>
          </Link>
        ))}
      </div>

      {/* Retention health — the visual */}
      <SectionCard title="Retention health" subtitle="Everyone by band — how much red vs. green" className="mb-5">
        <div className="flex h-6 overflow-hidden rounded-lg bg-slate-100">
          {BAND_ORDER.map((b) =>
            bandCounts[b] > 0 ? (
              <Link
                key={b}
                to={bandTo(b)}
                title={`${BAND_META[b].label}: ${bandCounts[b]}`}
                className={cn('flex items-center justify-center text-[11px] font-semibold text-white/90 transition hover:opacity-90', BAND_META[b].dot)}
                style={{ flex: bandCounts[b] }}
              >
                {bandCounts[b]}
              </Link>
            ) : null,
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {BAND_ORDER.map((b) => (
            <Link key={b} to={bandTo(b)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
              <Dot className={BAND_META[b].dot} /> {BAND_META[b].label}
              <span className="font-semibold tabular-nums text-slate-700">{bandCounts[b]}</span>
            </Link>
          ))}
        </div>
      </SectionCard>

      {/* Work these first */}
      <SectionCard
        title="Work these first"
        subtitle={`${needsAttention} need attention · ${waiting} untouched · ${overdue} overdue · ${savedCount} saved`}
        action={
          <Link to="/?filter=needs-attention&view=card" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            Open in card view →
          </Link>
        }
        bodyClassName="p-0"
      >
        <div className="divide-y divide-slate-100">
          {topAtRisk.map(({ h, sig, sc }) => {
            const weak = sc.signals.filter((x) => x.value < 0.5).map((x) => x.label.toLowerCase())
            return (
              <button key={h.id} onClick={() => open(h.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums ring-1 ring-inset', BAND_META[sc.band].badge)}>
                  {sc.score}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{h.name}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {h.role} · {buildingShortName(h.buildingId)} · day {sig.day}
                  </p>
                </div>
                <div className="hidden text-[11px] text-slate-500 sm:block">
                  {weak.length ? `gaps: ${weak.slice(0, 3).join(', ')}` : 'healthy'}
                </div>
              </button>
            )
          })}
          {!topAtRisk.length && <p className="px-4 py-8 text-center text-sm text-slate-400">No one in view.</p>}
        </div>
      </SectionCard>
    </div>
  )
}
