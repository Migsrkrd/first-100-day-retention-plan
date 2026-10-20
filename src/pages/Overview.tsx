import { Link } from 'react-router-dom'
import { TrendingDown, AlertTriangle, Sparkles, Radio, ThumbsUp } from 'lucide-react'
import { PageHeader, SectionCard, StatTile, Avatar, Pill, Dot } from '@/components/primitives'
import { PersonLink } from '@/components/PersonLink'
import { SurvivalCurve, TrendLine, HBars, Ring } from '@/components/charts'
import {
  usePortfolioRow,
  useBuildings,
  useSaves,
  useNewHires,
  useTerminations,
  useActivity,
  useTrends,
  useSurvivalCurve,
  buildingShortName,
} from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { isOpenSave, jobDot } from '@/utils/ui'
import { hoursSince, relativeDay, fmtDate } from '@/utils/date'
import { fmtUsd } from '@/utils/format'

export function Overview() {
  const portfolio = usePortfolioRow()
  const buildings = useBuildings().list()
  const { inScope, scopedBuildingId } = useScope()
  const saves = useSaves().list().filter((s) => inScope(s.buildingId))
  const hires = useNewHires().list().filter((h) => inScope(h.buildingId))
  const terms = useTerminations().list().filter((t) => inScope(t.buildingId))
  const activity = useActivity().list().filter((a) => inScope(a.buildingId))
  const trends = useTrends().list()
  const curve = useSurvivalCurve().list().sort((a, b) => a.day - b.day)

  if (!portfolio) return null
  const building = scopedBuildingId ? buildings.find((b) => b.id === scopedBuildingId) : null

  const survival90 = building?.survival90 ?? portfolio.survival90
  const turnover = building?.annualizedTurnover ?? portfolio.annualizedTurnover
  const responseRate = building?.responseRate ?? portfolio.responseRate

  const openSaves = saves.filter((s) => isOpenSave(s.status))
  const overdue = openSaves.filter((s) => s.status !== 'scheduled' && hoursSince(s.alertedDate) > s.slaHours)
  const closed = saves.filter((s) => !isOpenSave(s.status))
  const closureRate = closed.length
    ? Math.round((closed.filter((s) => s.outcome === 'saved').length / closed.length) * 100)
    : building?.saveClosureRate ?? portfolio.saveClosureRate
  const atRisk = hires.filter((h) => h.risk === 'at-risk')

  // Portfolio scope reports the canonical headline stats; a single building
  // reports figures computed from its own exits.
  const reasonCaptured = terms.filter((t) => t.reasonCaptured).length
  const under90 = terms.filter((t) => t.tenureDays < 90).length
  const reasonCapture = building
    ? terms.length
      ? Math.round((reasonCaptured / terms.length) * 100)
      : portfolio.reasonCaptureRate
    : portfolio.reasonCaptureRate
  const pctUnder90 = building
    ? terms.length
      ? Math.round((under90 / terms.length) * 100)
      : portfolio.pctUnder90
    : portfolio.pctUnder90

  const reasonGroups = Object.entries(
    terms.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + 1
      return acc
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const earlyTurnoverTrend = trends.find((t) => t.key === 'earlyTurnover')
  const responseTrend = trends.find((t) => t.key === 'responseRate')
  const sentimentTrend = trends.find((t) => t.key === 'sentiment')

  return (
    <div>
      <PageHeader
        title={building ? building.name : 'Portfolio overview'}
        subtitle={
          building
            ? `${building.city}, ${building.state} · ${building.beds} beds · Admin ${building.administrator} · DON ${building.don}`
            : 'The first-100-day window across all four buildings — where the turnover is, and whether we are catching it in time.'
        }
      />

      {/* Problem banner */}
      <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-300">The number we exist to bend</p>
            <p className="mt-1 text-2xl font-semibold">
              ~{fmtUsd(963000, true)}/yr in first-100-day turnover
            </p>
            <p className="mt-1 text-sm text-slate-300">
              The most expensive turnover is also the most fixable — it lives in a short, observable window where a single
              conversation can change the outcome.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>
                <span className="font-semibold text-white">{portfolio.medianTenureAtExit}d</span> median tenure at exit
              </span>
              <span>
                <span className="font-semibold text-white">{portfolio.pctUnder90}%</span> exit under 90 days
              </span>
              <span>
                <span className="font-semibold text-white">{portfolio.failedRehires}</span> failed rehires
              </span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <Ring
                value={Math.round((portfolio.benchmark / turnover) * 100)}
                size={96}
                color="hsl(0 72% 60%)"
                track="#334155"
                label={`${turnover}%`}
                sublabel="turnover"
                labelColor="#ffffff"
                sublabelColor="#94a3b8"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                vs {portfolio.benchmark}% benchmark · down from {portfolio.priorTurnover}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="90-day retention" value={`${survival90}%`} delta="+10 pts YoY" deltaGood hint="risk window" accent="good" />
        <StatTile label="Early turnover" value={`${pctUnder90}%`} hint="exits under 90 days" accent="danger" />
        <StatTile label="Save closure" value={`${closureRate}%`} hint={`${openSaves.length} open now`} accent="good" />
        <StatTile label="Reason capture" value={`${reasonCapture}%`} delta="+13 pts" deltaGood hint="closing the blind spot" accent="warn" />
        <StatTile label="Response rate" value={`${responseRate}%`} delta="+19 pts" deltaGood hint="one Paycom login" accent="default" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Retention curve */}
        <SectionCard
          title="New-hire retention through the risk window"
          subtitle="Engine cohort vs the pre-engine baseline"
          className="lg:col-span-2"
        >
          <SurvivalCurve data={curve} />
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-blue-600" /> With engine
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded border-t-2 border-dashed border-slate-400" /> Baseline
            </span>
            <span className="ml-auto text-slate-400">+16 pts retained by day 100</span>
          </div>
        </SectionCard>

        {/* At-risk snapshot */}
        <SectionCard
          title="At-risk right now"
          subtitle={`${atRisk.length} flagged · ${overdue.length} overdue`}
          action={
            <Link to="/save-loop" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Save Loop →
            </Link>
          }
        >
          <div className="space-y-2">
            {openSaves.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-2.5">
                <Avatar name={s.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    <PersonLink id={s.employeeId} name={s.name} />
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    day {s.dayInTenure} · {s.theme}
                    {!scopedBuildingId && ` · ${buildingShortName(s.buildingId)}`}
                  </p>
                </div>
                {s.status !== 'scheduled' && hoursSince(s.alertedDate) > s.slaHours ? (
                  <Pill className="bg-orange-50 text-orange-700 ring-orange-600/20">
                    <AlertTriangle className="h-3 w-3" /> overdue
                  </Pill>
                ) : (
                  <span className="text-[11px] text-slate-400">{relativeDay(s.alertedDate)}</span>
                )}
              </div>
            ))}
            {!openSaves.length && <p className="py-4 text-center text-sm text-slate-400">No open saves — all clear.</p>}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Program trends */}
        <SectionCard title="Program trend (12 mo)" className="lg:col-span-1">
          <div className="space-y-4">
            {earlyTurnoverTrend && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <TrendingDown className="h-3.5 w-3.5 text-emerald-500" /> {earlyTurnoverTrend.label}
                </div>
                <TrendLine points={earlyTurnoverTrend.points} suffix="%" color="hsl(160 84% 39%)" />
              </div>
            )}
            {responseTrend && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <TrendingDown className="h-3.5 w-3.5 rotate-180 text-blue-500" /> {responseTrend.label}
                </div>
                <TrendLine points={responseTrend.points} suffix="%" />
              </div>
            )}
            {sentimentTrend && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <TrendingDown className="h-3.5 w-3.5 rotate-180 text-violet-500" /> {sentimentTrend.label}
                </div>
                <TrendLine points={sentimentTrend.points} suffix="%" color="hsl(262 83% 58%)" />
              </div>
            )}
          </div>
        </SectionCard>

        {/* Exit reasons */}
        <SectionCard
          title="Why they leave"
          subtitle={`${pctUnder90}% under 90 days · ${100 - reasonCapture}% still undocumented`}
          className="lg:col-span-1"
        >
          <HBars items={reasonGroups} />
        </SectionCard>

        {/* Activity feed */}
        <SectionCard title="Engine activity" subtitle="Automated touchpoints and saves" className="lg:col-span-1">
          <div className="space-y-2.5">
            {activity.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <span className="mt-1.5"><Dot className={jobDot(a.job)} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">{a.employeeName}</span> · {a.type}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">{a.detail}</p>
                </div>
                <span className="whitespace-nowrap text-[11px] text-slate-300">{fmtDate(a.date)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Three jobs footer */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { icon: Sparkles, job: 'Celebrate', color: 'text-violet-600', desc: 'Automatically recognize the moments that build belonging.' },
          { icon: Radio, job: 'Intervene', color: 'text-red-600', desc: 'Route a flat/negative early survey to a stay conversation within hours.' },
          { icon: ThumbsUp, job: 'Acknowledge', color: 'text-teal-600', desc: 'Thank positive feedback and prove it with You Said, We Did.' },
        ].map((j) => (
          <div key={j.job} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <j.icon className={`mt-0.5 h-5 w-5 ${j.color}`} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{j.job}</p>
              <p className="mt-0.5 text-xs text-slate-500">{j.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
