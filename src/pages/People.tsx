import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  CheckCircle2,
  Clock,
  MessageSquarePlus,
  ExternalLink,
  Send,
} from 'lucide-react'
import { PageHeader, SectionCard, Pill } from '@/components/primitives'
import { Ring } from '@/components/charts'
import { LogStayDialog, type Outcome } from '@/components/LogStayDialog'
import { useNewHires, useSurveys, useSaves, useComments, useInteractions, useBuildings, buildingShortName } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { useProfilePanel } from '@/state/profilePanel'
import { computeSignal, type SignalResult } from '@/utils/sentiment'
import { signalBadge, signalLabel, signalRank, isConcerning, type Signal } from '@/utils/ui'
import { buildScore, BAND_META, NEEDS_ATTENTION, scoreBarColor, urgencyOf, type ScoreResult, type Band, type Action } from '@/utils/score'
import { tenureDays, TODAY } from '@/utils/date'
import { cn } from '@/lib/utils'
import type { NewHire, Save } from '@/types'

type FilterKey = 'all' | 'concerning' | 'needs-attention' | Signal
const ORDER: Signal[] = ['negative', 'silent', 'neutral', 'awaiting', 'positive']
const BAND_HEX: Record<Band, string> = { thriving: '#10b981', stable: '#14b8a6', watch: '#f59e0b', atrisk: '#f97316', critical: '#dc2626' }
// Subtle band tint so the card "pops" without shouting.
const BAND_CARD: Record<Band, string> = {
  thriving: 'border-emerald-200 bg-emerald-50/60',
  stable: 'border-teal-200 bg-teal-50/50',
  watch: 'border-amber-200 bg-amber-50/50',
  atrisk: 'border-orange-200 bg-orange-50/60',
  critical: 'border-red-200 bg-red-50/60',
}
const TONE_BADGE: Record<'urgent' | 'soon' | 'nice', { badge: string; label: string }> = {
  urgent: { badge: 'bg-red-100 text-red-700 ring-red-600/20', label: 'Now' },
  soon: { badge: 'bg-amber-100 text-amber-800 ring-amber-600/20', label: 'Soon' },
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
const ACTION_VERB: Record<Action['does'], string> = {
  conversation: 'Log',
  manager: 'Log 1:1',
  leadership: 'Notify',
  peer: 'Assign',
  recognition: 'Send',
  reachout: 'Invite',
  checkin: 'Mark done',
}

function CardView({ items }: { items: Row[] }) {
  const { open } = useProfilePanel()
  const { session } = useScope()
  const comments = useComments()
  const interactionsTable = useInteractions()
  const savesTable = useSaves()
  const [idx, setIdx] = useState(0)
  const [text, setText] = useState('')
  const [logFor, setLogFor] = useState<NewHire | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

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
  const u = urgencyOf(sc.waitingDays)
  const mine = comments.list((c) => c.employeeId === h.id).sort((a, b) => b.date.localeCompare(a.date))
  const today = TODAY.toISOString().slice(0, 10)

  function addComment() {
    if (!text.trim()) return
    comments.create({ employeeId: h.id, author: session?.name ?? 'You', text: text.trim(), date: today })
    setText('')
  }

  // Action buttons persist a touch that raises the score (or open the log dialog).
  function doAction(a: Action) {
    if (a.does === 'conversation') return setLogFor(h)
    if (a.does === 'checkin') return setChecked((d) => ({ ...d, [a.label]: true }))
    interactionsTable.create({ employeeId: h.id, kind: a.does, date: today, note: '' })
  }

  function logConversation(person: NewHire, outcome: Outcome, note: string) {
    savesTable.create({
      employeeId: person.id,
      name: person.name,
      role: person.role,
      buildingId: person.buildingId,
      dayInTenure: tenureDays(person.hireDate),
      triggerType: 'stay conversation',
      triggerSentiment: 'negative',
      theme: 'stay conversation',
      quote: '',
      alertedDate: today,
      assignedRole: 'Charge Nurse',
      assignedTo: person.manager,
      status: outcome === 'saved' ? 'closed-saved' : outcome === 'lost' ? 'closed-lost' : 'contacted',
      slaHours: 24,
      dueDate: today,
      conversationDate: today,
      disposition: outcome === 'saved' ? 'Retained' : outcome === 'lost' ? 'Departing' : 'Still at-risk',
      note,
      closedDate: outcome === 'atrisk' ? '' : today,
      outcome: outcome === 'atrisk' ? '' : outcome,
    } as Partial<Save>)
    setLogFor(null)
  }

  return (
    <div>
      {/* One encapsulated, band-tinted card */}
      <div className={cn('rounded-xl border shadow-sm', BAND_CARD[sc.band])}>
        {/* Header + why */}
        <div className="p-4">
          <div className="flex flex-wrap items-start gap-4">
            <Ring value={sc.score} size={72} stroke={8} color={BAND_HEX[sc.band]} label={`${sc.score}`} sublabel={BAND_META[sc.band].label} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => open(h.id)} className="text-lg font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                  {h.name}
                </button>
                <Pill className={BAND_META[sc.band].badge}>{BAND_META[sc.band].label}</Pill>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {h.role} · {buildingShortName(h.buildingId)} · day {tenureDays(h.hireDate)} of 100 · manager {h.manager}
              </p>
              {u && (
                <p className={cn('mt-1 inline-flex items-center gap-1.5 text-xs font-medium', sc.waitingDays >= 3 ? 'text-red-600' : 'text-amber-700')}>
                  <Clock className="h-3.5 w-3.5" /> Has gone {sc.waitingDays} days without a human touch{sc.waitingDays >= 3 ? ' — escalate' : ' — reach out before the next shift'}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setLogFor(h)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700">
                <MessageSquarePlus className="h-3.5 w-3.5" /> Log
              </button>
              <button onClick={() => open(h.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white">
                <ExternalLink className="h-3.5 w-3.5" /> Profile
              </button>
            </div>
          </div>

          {/* Why — two columns */}
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Why {first} scores {sc.score}</p>
            <div className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {sc.signals.map((s) => (
                <div key={s.key} className="flex items-center gap-2.5">
                  <span className={cn('w-20 shrink-0 text-xs', s.value < 0.5 ? 'font-semibold text-slate-800' : 'font-medium text-slate-500')}>{s.label}</span>
                  <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200/70">
                    <div className={cn('h-full rounded-full', scoreBarColor(s.value))} style={{ width: `${Math.max(6, s.value * 100)}%` }} />
                  </div>
                  <span className={cn('min-w-0 flex-1 truncate text-[11px]', s.value < 0.5 ? 'text-slate-700' : 'text-slate-400')}>{s.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Do next — horizontal carousel */}
        <div className="border-t border-slate-200/70 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Do next · do it right here</p>
            {sc.actions.length > 2 && <span className="text-[10px] text-slate-400">scroll for more →</span>}
          </div>
          {sc.actions.length ? (
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
              {sc.actions.map((a, i) => {
                const isDone = checked[a.label]
                const tone = TONE_BADGE[a.tone]
                return (
                  <div key={i} className="flex w-52 shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium leading-snug', isDone ? 'text-slate-400 line-through' : 'text-slate-800')}>{a.label}</p>
                      {isDone ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <Pill className={tone.badge}>{tone.label}</Pill>}
                    </div>
                    <p className="mt-1 flex-1 text-[11px] leading-snug text-slate-400">{a.why}</p>
                    {!isDone && (
                      <button
                        onClick={() => doAction(a)}
                        className={cn(
                          'mt-2 w-full rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                          a.tone === 'urgent' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-200 text-slate-700 hover:bg-slate-50',
                        )}
                      >
                        {ACTION_VERB[a.does]}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-2 text-sm text-slate-400">Nothing pressing — keep it up.</p>
          )}
        </div>

        {/* Notes — slim */}
        <div className="border-t border-slate-200/70 px-4 py-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              placeholder="Add a note…"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <button onClick={addComment} className="inline-flex items-center rounded-lg bg-blue-600 px-2.5 text-white transition hover:bg-blue-700">
              <Send className="h-4 w-4" />
            </button>
          </div>
          {mine.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {mine.slice(0, 3).map((c) => (
                <span key={c.id} className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">
                  <span className="font-medium text-slate-700">{c.author}:</span> {c.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cycle nav — below the card */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          onClick={() => setIdx(pos - 1)}
          disabled={pos === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="text-xs text-slate-400">
          <span className="font-medium text-slate-600">{pos + 1}</span> of {items.length} · use ← →
        </span>
        <button
          onClick={() => setIdx(pos + 1)}
          disabled={pos === items.length - 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <LogStayDialog person={logFor} onOpenChange={(o) => !o && setLogFor(null)} onSubmit={logConversation} />
    </div>
  )
}

// ---- Page -------------------------------------------------------------------
export function People() {
  const hires = useNewHires().list()
  const surveys = useSurveys().list()
  const saves = useSaves().list()
  const interactions = useInteractions().list()
  const buildings = useBuildings().list()
  const { inScope, scopedBuildingId, windowDays, setWindowDays, scoreWeights } = useScope()
  const { open } = useProfilePanel()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [lens, setLens] = useState<Lens>('score')
  const [view, setView] = useState<'list' | 'card' | 'plot'>('card')
  const [q, setQ] = useState('')

  // The Dashboard links here with ?filter=/?sort=/?view= to drill into a slice.
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const f = searchParams.get('filter')
    if (f) setFilter(f as FilterKey)
    const s = searchParams.get('sort')
    if (s) setLens(s as Lens)
    const v = searchParams.get('view')
    if (v === 'list' || v === 'card' || v === 'plot') setView(v)
  }, [searchParams])

  const building = scopedBuildingId ? buildings.find((b) => b.id === scopedBuildingId) : null

  const rows: Row[] = hires
    .filter((h) => h.status === 'active' && inScope(h.buildingId) && tenureDays(h.hireDate) <= windowDays)
    .map((h) => {
      const mine = surveys.filter((s) => s.employeeId === h.id)
      const sc = buildScore(h, mine, saves.filter((s) => s.employeeId === h.id), interactions.filter((i) => i.employeeId === h.id), scoreWeights)
      return { h, sig: computeSignal(h, mine), sc }
    })

  const counts = ORDER.reduce<Record<Signal, number>>((acc, s) => ({ ...acc, [s]: rows.filter((r) => r.sig.state === s).length }), {} as Record<Signal, number>)
  const concerning = counts.negative + counts.silent
  const needsAttention = rows.filter((r) => r.sc.score < NEEDS_ATTENTION).length

  const needle = q.trim().toLowerCase()
  const filtered = rows
    .filter((r) =>
      filter === 'all'
        ? true
        : filter === 'needs-attention'
          ? r.sc.score < NEEDS_ATTENTION
          : filter === 'concerning'
            ? isConcerning(r.sig.state)
            : r.sig.state === filter,
    )
    .filter((r) => !needle || `${r.h.name} ${r.h.role} ${buildingShortName(r.h.buildingId)}`.toLowerCase().includes(needle))
  const displayed = [...filtered].sort(COMPARATORS[lens])
  const activeLens = LENSES.find((l) => l.key === lens)!

  const filterOptions = [
    { value: 'all', label: `All people (${rows.length})` },
    { value: 'needs-attention', label: `Needs attention (${needsAttention})` },
    { value: 'concerning', label: `Concerning (${concerning})` },
    { value: 'negative', label: `Negative (${counts.negative})` },
    { value: 'silent', label: `Silent (${counts.silent})` },
    { value: 'neutral', label: `Neutral (${counts.neutral})` },
    { value: 'awaiting', label: `Awaiting (${counts.awaiting})` },
    { value: 'positive', label: `Positive (${counts.positive})` },
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

      {/* Controls — dropdowns, not button rows */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Show</span>
            <Select value={filter} onChange={(v) => setFilter(v as FilterKey)} options={filterOptions} />
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
      {view !== 'card' && (
        <p className="mb-3 text-[11px] text-slate-400">
          Showing <span className="font-medium text-slate-600">{displayed.length}</span> people · sorted by{' '}
          <span className="font-medium text-slate-600">{activeLens.label.toLowerCase()}</span> — {activeLens.caption}
        </p>
      )}
      {view === 'card' && <div className="mb-3" />}

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
                {urgencyOf(sc.waitingDays) ? (
                  <Pill className={urgencyOf(sc.waitingDays)!.badge}>{urgencyOf(sc.waitingDays)!.label}</Pill>
                ) : (
                  <div className="hidden w-16 shrink-0 text-right text-[11px] text-slate-400 sm:block">
                    {sig.coverageDue ? `${sig.coverageAnswered}/${sig.coverageDue} cov` : '—'}
                  </div>
                )}
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
