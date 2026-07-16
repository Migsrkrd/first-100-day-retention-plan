import { useState, useEffect } from 'react'
import {
  Search,
  List,
  LayoutGrid,
  ScatterChart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  VolumeX,
  AlertTriangle,
  Circle,
  ExternalLink,
  Send,
} from 'lucide-react'
import { PageHeader, SectionCard, Pill } from '@/components/primitives'
import { Ring } from '@/components/charts'
import {
  useNewHires,
  useSurveys,
  useSaves,
  useComments,
  usePortfolioRow,
  useBuildings,
  buildingShortName,
} from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { useProfilePanel } from '@/state/profilePanel'
import { computeSignal, type SignalResult } from '@/utils/sentiment'
import { signalBadge, signalDot, signalLabel, signalRank, isConcerning, type Signal } from '@/utils/ui'
import { buildScore, BAND_META, NEEDS_ATTENTION, scoreBarColor, type ScoreResult, type Band } from '@/utils/score'
import { tenureDays, TODAY } from '@/utils/date'
import { cn } from '@/lib/utils'
import type { NewHire } from '@/types'

const ORDER: Signal[] = ['negative', 'silent', 'neutral', 'awaiting', 'positive']
const BAND_HEX: Record<Band, string> = { thriving: '#10b981', stable: '#14b8a6', watch: '#f59e0b', atrisk: '#f97316', critical: '#dc2626' }
const TONE: Record<'urgent' | 'soon' | 'nice', { badge: string; label: string }> = {
  urgent: { badge: 'bg-red-600 text-white ring-red-700/30', label: 'Now' },
  soon: { badge: 'bg-amber-100 text-amber-800 ring-amber-600/30', label: 'Soon' },
  nice: { badge: 'bg-slate-100 text-slate-500 ring-slate-400/20', label: 'When you can' },
}

type Row = { h: NewHire; sig: SignalResult; sc: ScoreResult }
type Lens = 'score' | 'concern' | 'newest' | 'longest' | 'coverage'

const LENSES: { key: Lens; label: string; caption: string }[] = [
  { key: 'score', label: 'Retention score', caption: 'lowest score — most at-risk — first' },
  { key: 'concern', label: 'Biggest concern', caption: 'negatives and silence first' },
  { key: 'newest', label: 'Newest arrival', caption: 'most recent hires first' },
  { key: 'longest', label: 'Longest tenure', caption: 'closest to day 100 first' },
  { key: 'coverage', label: 'Least measured', caption: 'lowest survey coverage first' },
]

const covRatio = (r: Row) => (r.sig.coverageDue ? r.sig.coverageAnswered / r.sig.coverageDue : 1)
const COMPARATORS: Record<Lens, (a: Row, b: Row) => number> = {
  score: (a, b) => a.sc.score - b.sc.score || a.sig.day - b.sig.day,
  concern: (a, b) => signalRank(a.sig.state) - signalRank(b.sig.state) || b.sig.overdueDays - a.sig.overdueDays || a.sig.day - b.sig.day,
  newest: (a, b) => a.sig.day - b.sig.day,
  longest: (a, b) => b.sig.day - a.sig.day,
  coverage: (a, b) => covRatio(a) - covRatio(b) || signalRank(a.sig.state) - signalRank(b.sig.state),
}

// Small styled dropdown to replace noisy button rows.
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

// ---- Tenure × sentiment plot ------------------------------------------------
const PLOT_LANES: Signal[] = ['positive', 'neutral', 'negative', 'awaiting', 'silent']
const PLOT_FILL: Record<Signal, string> = { positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444', awaiting: '#cbd5e1', silent: '#f97316' }
const jitter = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 100) / 100 - 0.5
}

function SentimentPlot({ items }: { items: Row[] }) {
  const { open } = useProfilePanel()
  const w = 760
  const h = 320
  const padL = 104
  const padR = 18
  const padT = 14
  const padB = 28
  const plotH = h - padT - padB
  const laneH = plotH / PLOT_LANES.length
  const x = (day: number) => padL + (Math.max(0, Math.min(100, day)) / 100) * (w - padL - padR)
  const laneY = (i: number) => padT + (i + 0.5) * laneH
  const milestones = [15, 30, 60, 90]
  const noSignalTop = padT + 3 * laneH

  return (
    <SectionCard bodyClassName="p-3">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" className="overflow-visible">
        <rect x={padL} y={noSignalTop} width={w - padL - padR} height={2 * laneH} fill="#f8fafc" />
        <line x1={padL} y1={noSignalTop} x2={w - padR} y2={noSignalTop} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" />
        <text x={w - padR} y={noSignalTop - 4} textAnchor="end" className="fill-slate-400 text-[9px]">
          no signal — unmeasured
        </text>
        {PLOT_LANES.map((s, i) => (
          <g key={s}>
            <circle cx={padL - 90} cy={laneY(i)} r={3.5} fill={PLOT_FILL[s]} />
            <text x={padL - 80} y={laneY(i) + 3} className="fill-slate-500 text-[10px]">
              {signalLabel(s)}
            </text>
          </g>
        ))}
        {milestones.map((m) => (
          <g key={m}>
            <line x1={x(m)} y1={padT} x2={x(m)} y2={h - padB} stroke="#eef2f7" strokeWidth={1} />
            <text x={x(m)} y={h - 10} textAnchor="middle" className="fill-slate-400 text-[9px]">
              d{m}
            </text>
          </g>
        ))}
        <text x={padL} y={h - 10} textAnchor="middle" className="fill-slate-400 text-[9px]">d0</text>
        <text x={x(100)} y={h - 10} textAnchor="middle" className="fill-slate-400 text-[9px]">d100</text>
        {items.map(({ h: hire, sig }) => {
          const i = PLOT_LANES.indexOf(sig.state)
          const cy = laneY(i) + jitter(hire.id) * laneH * 0.55
          return (
            <circle
              key={hire.id}
              cx={x(sig.day)}
              cy={cy}
              r={5}
              fill={PLOT_FILL[sig.state]}
              stroke="#fff"
              strokeWidth={1.5}
              className="cursor-pointer transition-[r] hover:stroke-slate-400"
              onClick={() => open(hire.id)}
            >
              <title>{`${hire.name} · ${hire.role} · d${sig.day}\n${sig.detail}`}</title>
            </circle>
          )
        })}
      </svg>
      <p className="mt-1 text-center text-[11px] text-slate-400">Each dot is one new hire · x = tenure, y = signal · click to open the profile</p>
    </SectionCard>
  )
}

// ---- Card view: cycle through people one at a time --------------------------
function CardView({ items }: { items: Row[] }) {
  const { open } = useProfilePanel()
  const { session } = useScope()
  const comments = useComments()
  const [idx, setIdx] = useState(0)
  const [text, setText] = useState('')

  const pos = Math.min(idx, Math.max(0, items.length - 1))
  const cur = items[pos]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(items.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items.length])

  if (!cur) return <SectionCard><p className="py-10 text-center text-sm text-slate-400">No one in this view.</p></SectionCard>

  const { h, sc } = cur
  const first = h.name.split(' ')[0]
  const mine = comments.list((c) => c.employeeId === h.id).sort((a, b) => b.date.localeCompare(a.date))

  function addComment() {
    if (!text.trim()) return
    comments.create({ employeeId: h.id, author: session?.name ?? 'You', text: text.trim(), date: TODAY.toISOString().slice(0, 10) })
    setText('')
  }

  return (
    <div>
      {/* Cycle nav */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          onClick={() => setIdx(pos - 1)}
          disabled={pos === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="text-xs text-slate-400">
          <span className="font-medium text-slate-600">{pos + 1}</span> of {items.length} · use ← →
        </span>
        <button
          onClick={() => setIdx(pos + 1)}
          disabled={pos === items.length - 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* The person — reasoning is primary */}
      <SectionCard>
        <div className="flex flex-wrap items-center gap-4">
          <Ring value={sc.score} size={92} stroke={9} color={BAND_HEX[sc.band]} label={`${sc.score}`} sublabel={BAND_META[sc.band].label} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => open(h.id)} className="text-xl font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                {h.name}
              </button>
              <Pill className={BAND_META[sc.band].badge}>{BAND_META[sc.band].label}</Pill>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {h.role} · {buildingShortName(h.buildingId)} · day {tenureDays(h.hireDate)} of 100 · manager {h.manager}
            </p>
          </div>
          <button
            onClick={() => open(h.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Full profile
          </button>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-800">Why {first} scores {sc.score}</p>
          <div className="mt-3 space-y-2">
            {sc.signals.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <span className={cn('w-24 shrink-0 text-xs', s.value < 0.5 ? 'font-semibold text-slate-800' : 'font-medium text-slate-500')}>{s.label}</span>
                <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full', scoreBarColor(s.value))} style={{ width: `${Math.max(5, s.value * 100)}%` }} />
                </div>
                <span className={cn('min-w-0 flex-1 text-xs', s.value < 0.5 ? 'text-slate-700' : 'text-slate-400')}>{s.note}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Secondary — actions + notes */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SectionCard title="Do next" subtitle="Suggested from what's missing">
          {sc.actions.length ? (
            <div className="space-y-2">
              {sc.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-slate-100 p-2.5">
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{a.label}</p>
                    <p className="text-[11px] text-slate-400">{a.why}</p>
                  </div>
                  <Pill className={TONE[a.tone].badge}>{TONE[a.tone].label}</Pill>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-slate-400">Nothing pressing — keep it up.</p>
          )}
        </SectionCard>

        <SectionCard title="Notes" subtitle="What you and the team have logged">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              placeholder="Add a note…"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <button onClick={addComment} className="inline-flex items-center rounded-lg bg-blue-600 px-2.5 text-white transition hover:bg-blue-700">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2.5">
            {mine.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">{c.author}</span>
                  <span className="text-[10px] text-slate-400">{c.date}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{c.text}</p>
              </div>
            ))}
            {!mine.length && <p className="text-xs text-slate-400">No notes yet — add the first.</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// ---- Page -------------------------------------------------------------------
export function People() {
  const hires = useNewHires().list()
  const surveys = useSurveys().list()
  const saves = useSaves().list()
  const portfolio = usePortfolioRow()
  const buildings = useBuildings().list()
  const { inScope, scopedBuildingId, windowDays, setWindowDays, scoreWeights } = useScope()
  const { open } = useProfilePanel()
  const [filter, setFilter] = useState<'all' | 'concerning' | Signal>('all')
  const [lens, setLens] = useState<Lens>('score')
  const [view, setView] = useState<'list' | 'card' | 'plot'>('list')
  const [q, setQ] = useState('')

  const building = scopedBuildingId ? buildings.find((b) => b.id === scopedBuildingId) : null

  const rows: Row[] = hires
    .filter((h) => h.status === 'active' && inScope(h.buildingId) && tenureDays(h.hireDate) <= windowDays)
    .map((h) => {
      const mine = surveys.filter((s) => s.employeeId === h.id)
      return { h, sig: computeSignal(h, mine), sc: buildScore(h, mine, saves.filter((s) => s.employeeId === h.id), scoreWeights) }
    })

  const counts = ORDER.reduce<Record<Signal, number>>((acc, s) => ({ ...acc, [s]: rows.filter((r) => r.sig.state === s).length }), {} as Record<Signal, number>)
  const concerning = counts.negative + counts.silent
  const dueTotal = rows.reduce((n, r) => n + r.sig.coverageDue, 0)
  const answeredTotal = rows.reduce((n, r) => n + r.sig.coverageAnswered, 0)
  const coverage = dueTotal ? Math.round((answeredTotal / dueTotal) * 100) : 100
  const needsAttention = rows.filter((r) => r.sc.score < NEEDS_ATTENTION).length
  const avgScore = rows.length ? Math.round(rows.reduce((n, r) => n + r.sc.score, 0) / rows.length) : 0
  const survival = building?.survival90 ?? portfolio?.survival90 ?? 71

  const needle = q.trim().toLowerCase()
  const filtered = rows
    .filter((r) => (filter === 'all' ? true : filter === 'concerning' ? isConcerning(r.sig.state) : r.sig.state === filter))
    .filter((r) => !needle || `${r.h.name} ${r.h.role} ${buildingShortName(r.h.buildingId)}`.toLowerCase().includes(needle))
  const displayed = [...filtered].sort(COMPARATORS[lens])
  const activeLens = LENSES.find((l) => l.key === lens)!

  const filterOptions = [
    { value: 'all', label: `All people (${rows.length})` },
    { value: 'concerning', label: `Concerning (${concerning})` },
    { value: 'negative', label: `Negative (${counts.negative})` },
    { value: 'silent', label: `Silent (${counts.silent})` },
    { value: 'neutral', label: `Neutral (${counts.neutral})` },
    { value: 'awaiting', label: `Awaiting (${counts.awaiting})` },
    { value: 'positive', label: `Positive (${counts.positive})` },
  ]
  const metrics = [
    { label: 'in window', value: rows.length, danger: false },
    { label: 'need attention', value: needsAttention, danger: needsAttention > 0 },
    { label: 'avg score', value: avgScore, danger: false },
    { label: 'coverage', value: `${coverage}%`, danger: false },
    { label: '90-day', value: `${survival}%`, danger: false },
  ]

  return (
    <div>
      <PageHeader
        title={building ? building.name : 'People'}
        subtitle={`Everyone ${building ? 'in this building' : 'across all facilities'} inside their first ${windowDays} days.`}
        actions={
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 shadow-sm">
            Window
            <select value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} className="bg-transparent font-medium text-slate-700 focus:outline-none">
              {[30, 60, 90, 100, 120, 150].map((d) => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
          </label>
        }
      />

      {/* Big search — find anyone fast, any view */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for anyone — name, role, or facility"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* Slim metrics strip */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-baseline gap-1.5">
            <span className={cn('text-lg font-semibold tabular-nums', m.danger ? 'text-red-600' : 'text-slate-800')}>{m.value}</span>
            <span className="text-[11px] text-slate-400">{m.label}</span>
          </div>
        ))}
        <div className="ml-auto hidden h-2 w-40 overflow-hidden rounded-full bg-slate-100 sm:flex">
          {ORDER.map((s) => counts[s] > 0 && <div key={s} className={signalDot(s)} style={{ flex: counts[s] }} />)}
        </div>
      </div>

      {/* Controls — dropdowns, not button rows */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Show</span>
            <Select value={filter} onChange={(v) => setFilter(v as typeof filter)} options={filterOptions} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Sort</span>
            <Select value={lens} onChange={(v) => setLens(v as Lens)} options={LENSES.map((l) => ({ value: l.key, label: l.label }))} />
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {([
            { key: 'list', icon: List, label: 'List' },
            { key: 'card', icon: LayoutGrid, label: 'Card' },
            { key: 'plot', icon: ScatterChart, label: 'Plot' },
          ] as const).map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                view === v.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <v.icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-[11px] text-slate-400">
        Showing <span className="font-medium text-slate-600">{displayed.length}</span> people · sorted by{' '}
        <span className="font-medium text-slate-600">{activeLens.label.toLowerCase()}</span> — {activeLens.caption}
      </p>

      {/* Views */}
      {view === 'plot' && <SentimentPlot items={filtered} />}
      {view === 'card' && <CardView items={displayed} />}
      {view === 'list' && (
        <SectionCard bodyClassName="p-0">
          <div className="divide-y divide-slate-100">
            {displayed.map(({ h, sig, sc }) => (
              <button key={h.id} onClick={() => open(h.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                <span
                  title={`Retention score ${sc.score} · ${BAND_META[sc.band].label}`}
                  className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums ring-1 ring-inset', BAND_META[sc.band].badge)}
                >
                  {sc.score}
                </span>
                <div className="w-48 min-w-0 shrink-0">
                  <p className="truncate text-sm font-medium text-slate-800">{h.name}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {h.role}
                    {!scopedBuildingId && ` · ${buildingShortName(h.buildingId)}`} · day {sig.day}
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Pill className={signalBadge(sig.state)}>
                    {sig.state === 'silent' && <VolumeX className="h-3 w-3" />}
                    {sig.state === 'negative' && <AlertTriangle className="h-3 w-3" />}
                    {signalLabel(sig.state)}
                  </Pill>
                  <span className="truncate text-xs text-slate-500">{sig.detail}</span>
                </div>
                <div className="hidden w-16 shrink-0 text-right text-[11px] text-slate-400 sm:block">
                  {sig.coverageDue ? `${sig.coverageAnswered}/${sig.coverageDue} cov` : '—'}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            ))}
            {!displayed.length && <p className="px-4 py-8 text-center text-sm text-slate-400">No one in this view.</p>}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
