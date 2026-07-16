import { useMemo, useState } from 'react'
import {
  Search,
  CheckCircle2,
  Circle,
  ExternalLink,
  MessageSquareText,
  HeartHandshake,
  Briefcase,
  Users,
  MessageCircle,
  Sparkles,
  BellRing,
  ArrowRight,
} from 'lucide-react'
import { PageHeader, SectionCard, Pill, Dot } from '@/components/primitives'
import { Ring } from '@/components/charts'
import { useNewHires, useSurveys, useSaves, buildingShortName } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { useProfilePanel } from '@/state/profilePanel'
import { buildScore, BAND_META, NEEDS_ATTENTION, scoreBarColor, type Band, type LogForm } from '@/utils/score'
import { tenureDays } from '@/utils/date'
import { cn } from '@/lib/utils'

const BAND_HEX: Record<Band, string> = {
  thriving: '#10b981',
  stable: '#14b8a6',
  watch: '#f59e0b',
  atrisk: '#f97316',
  critical: '#ef4444',
}

const LOG_META: Record<LogForm, { icon: typeof Sparkles; tile: string; low: boolean }> = {
  survey: { icon: MessageSquareText, tile: 'bg-blue-50 text-blue-600', low: false },
  manager: { icon: HeartHandshake, tile: 'bg-blue-50 text-blue-600', low: false },
  leadership: { icon: Briefcase, tile: 'bg-indigo-50 text-indigo-600', low: false },
  peer: { icon: Users, tile: 'bg-teal-50 text-teal-600', low: false },
  reachout: { icon: MessageCircle, tile: 'bg-emerald-50 text-emerald-600', low: false },
  recognition: { icon: Sparkles, tile: 'bg-violet-50 text-violet-400', low: true },
  welcome: { icon: Sparkles, tile: 'bg-violet-50 text-violet-400', low: true },
  alert: { icon: BellRing, tile: 'bg-amber-50 text-amber-500', low: true },
}

const TONE: Record<'urgent' | 'soon' | 'nice', { badge: string; label: string }> = {
  urgent: { badge: 'bg-red-50 text-red-700 ring-red-600/20', label: 'Now' },
  soon: { badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', label: 'Soon' },
  nice: { badge: 'bg-slate-100 text-slate-500 ring-slate-400/20', label: 'When you can' },
}

export function SaveLoop() {
  const hires = useNewHires().list()
  const surveys = useSurveys().list()
  const saves = useSaves().list()
  const { inScope, scopedBuildingId, windowDays, scoreWeights } = useScope()
  const { open: openProfile } = useProfilePanel()

  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'attention' | 'all'>('attention')
  const [sortKey, setSortKey] = useState<'score' | 'name'>('score')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})

  const scored = useMemo(
    () =>
      hires
        .filter((h) => h.status === 'active' && inScope(h.buildingId) && tenureDays(h.hireDate) <= windowDays)
        .map((h) => ({
          h,
          ...buildScore(
            h,
            surveys.filter((s) => s.employeeId === h.id),
            saves.filter((s) => s.employeeId === h.id),
            scoreWeights,
          ),
        })),
    [hires, surveys, saves, inScope, windowDays, scoreWeights],
  )

  const attentionCount = scored.filter((s) => s.score < NEEDS_ATTENTION).length

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scored
      .filter((s) => (mode === 'all' ? true : s.score < NEEDS_ATTENTION))
      .filter((s) =>
        !q ? true : `${s.h.name} ${s.h.role} ${buildingShortName(s.h.buildingId)}`.toLowerCase().includes(q),
      )
      .sort((a, b) => (sortKey === 'name' ? a.h.name.localeCompare(b.h.name) : a.score - b.score))
  }, [scored, query, mode, sortKey])

  const selected = list.find((s) => s.h.id === selectedId) ?? list[0]

  return (
    <div>
      <PageHeader
        title="Needs attention"
        subtitle="The people to worry about — worst retention score first, with what's happened and what to do next."
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left — the caseload */}
        <div className="lg:w-80 lg:shrink-0">
          <SectionCard bodyClassName="p-0">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                  {(['attention', 'all'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        'rounded px-2 py-0.5 font-medium capitalize transition',
                        mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                      )}
                    >
                      {m === 'attention' ? `Needs attention (${attentionCount})` : `Everyone (${scored.length})`}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSortKey((k) => (k === 'score' ? 'name' : 'score'))}
                  className="whitespace-nowrap font-medium text-slate-500 hover:text-slate-700"
                >
                  sort: {sortKey}
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] divide-y divide-slate-50 overflow-y-auto scrollbar-thin">
              {list.map((s) => {
                const meta = BAND_META[s.band]
                const active = selected?.h.id === s.h.id
                return (
                  <button
                    key={s.h.id}
                    onClick={() => setSelectedId(s.h.id)}
                    className={cn('flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition', active ? 'bg-blue-50' : 'hover:bg-slate-50')}
                  >
                    <span
                      className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums', meta.badge)}
                    >
                      {s.score}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{s.h.name}</span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {s.h.role}
                        {!scopedBuildingId && ` · ${buildingShortName(s.h.buildingId)}`} · day {tenureDays(s.h.hireDate)}
                      </span>
                    </span>
                    <Dot className={cn('shrink-0', meta.dot)} />
                  </button>
                )
              })}
              {!list.length && <p className="px-3 py-8 text-center text-sm text-slate-400">No one here — nice.</p>}
            </div>
          </SectionCard>
        </div>

        {/* Right — the case */}
        <div className="min-w-0 flex-1">{selected ? <Case key={selected.h.id} data={selected} done={done} setDone={setDone} openProfile={openProfile} /> : null}</div>
      </div>
    </div>
  )
}

function Case({
  data,
  done,
  setDone,
  openProfile,
}: {
  data: ReturnType<typeof buildScore> & { h: import('@/types').NewHire }
  done: Record<string, boolean>
  setDone: (fn: (d: Record<string, boolean>) => Record<string, boolean>) => void
  openProfile: (id: string) => void
}) {
  const { h, score, band, signals, actions, log } = data
  const meta = BAND_META[band]
  const weak = signals.filter((s) => s.value < 0.5)

  return (
    <div className="space-y-4">
      {/* Header */}
      <SectionCard>
        <div className="flex flex-wrap items-center gap-4">
          <Ring value={score} size={84} stroke={8} color={BAND_HEX[band]} label={`${score}`} sublabel={meta.label} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => openProfile(h.id)} className="text-lg font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                {h.name}
              </button>
              <Pill className={meta.badge}>{meta.label}</Pill>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {h.role} · {buildingShortName(h.buildingId)} · day {tenureDays(h.hireDate)} of 100 · manager {h.manager}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Why: </span>
              {weak.length ? weak.map((w) => w.note.toLowerCase()).join(' · ') : 'all signals healthy'}
            </p>
          </div>
          <button
            onClick={() => openProfile(h.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Full profile
          </button>
        </div>
        {/* Signal bars */}
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
          {signals.map((s) => (
            <div key={s.key}>
              <div className="flex items-center justify-between text-[11px]">
                <span className={s.value < 0.5 ? 'font-medium text-slate-700' : 'text-slate-500'}>{s.label}</span>
                <span className="tabular-nums text-slate-400">{Math.round(s.value * 100)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={cn('h-full rounded-full', scoreBarColor(s.value))} style={{ width: `${Math.max(4, s.value * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Do next */}
      <SectionCard title="Do next" subtitle="Suggested from what's missing — check them off as you go">
        {actions.length ? (
          <div className="space-y-2">
            {actions.map((a) => {
              const key = `${h.id}::${a.label}`
              const isDone = done[key]
              const tone = TONE[a.tone]
              return (
                <button
                  key={key}
                  onClick={() => setDone((d) => ({ ...d, [key]: !d[key] }))}
                  className="flex w-full items-start gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:border-slate-200"
                >
                  {isDone ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', isDone ? 'text-slate-400 line-through' : 'text-slate-800')}>{a.label}</p>
                    <p className="text-xs text-slate-400">{a.why}</p>
                  </div>
                  {!isDone && <Pill className={tone.badge}>{tone.label}</Pill>}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-400">Nothing pressing — keep the recognition going.</p>
        )}
      </SectionCard>

      {/* Log */}
      <SectionCard title="What's happened" subtitle="Most recent first">
        <div className="space-y-3.5">
          {log.map((e, i) => {
            const lm = LOG_META[e.form]
            const Icon = lm.icon
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn('flex shrink-0 items-center justify-center rounded-lg', lm.low ? 'h-6 w-6' : 'h-7 w-7', lm.tile)}>
                    <Icon className={lm.low ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                  </span>
                  {i < log.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('text-xs', lm.low ? 'font-medium text-slate-500' : 'font-semibold text-slate-800')}>{e.title}</span>
                    <span className="text-[10px] text-slate-400">day {e.day}</span>
                  </div>
                  {e.detail && <p className={cn('mt-0.5 text-xs', lm.low ? 'text-slate-400' : 'text-slate-500')}>{e.detail}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <div className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-slate-400">
        <ArrowRight className="h-3 w-3" /> Pick the next person on the left to work the caseload
      </div>
    </div>
  )
}
