import type { NewHire, Survey, Save } from '@/types'
import { computeSignal } from '@/utils/sentiment'
import { tenureDays, daysBetween, parseDate, MILESTONES } from '@/utils/date'

// ---------------------------------------------------------------------------
// Retention score — a composite of relationship signals, not just sentiment.
// "Is this person heard, seen, and connected — by their manager, by leadership,
// by peers — and are they reaching back?" Every weak signal both lowers the
// score and produces a concrete suggested action.
// ---------------------------------------------------------------------------

export type Band = 'thriving' | 'stable' | 'watch' | 'atrisk' | 'critical'
export type SignalKey = 'heard' | 'seen' | 'manager' | 'leadership' | 'voice' | 'belonging'
export type ScoreWeights = Record<SignalKey, number>

export const SIGNAL_LABEL: Record<SignalKey, string> = {
  heard: 'Heard',
  seen: 'Seen',
  manager: 'Manager',
  leadership: 'Leadership',
  voice: 'Voice',
  belonging: 'Belonging',
}
export const SIGNAL_ASK: Record<SignalKey, string> = {
  heard: 'Did they respond, and how do they feel?',
  seen: 'Are we actually measuring them?',
  manager: 'Has their manager sat down with them?',
  leadership: 'Has a leader reached them?',
  voice: 'Are they reaching back to us?',
  belonging: 'Do they have a peer, and were they recognized?',
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  heard: 0.28,
  seen: 0.16,
  manager: 0.22,
  leadership: 0.1,
  voice: 0.1,
  belonging: 0.14,
}

// Heat scale: the danger end is bold/solid so it can't be missed; it graduates
// up to calm tints of green at the healthy end.
export const BAND_META: Record<Band, { label: string; badge: string; dot: string; text: string }> = {
  thriving: { label: 'Thriving', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  stable: { label: 'Stable', badge: 'bg-teal-50 text-teal-700 ring-teal-600/20', dot: 'bg-teal-500', text: 'text-teal-600' },
  watch: { label: 'Watch', badge: 'bg-amber-100 text-amber-800 ring-amber-600/30', dot: 'bg-amber-500', text: 'text-amber-700' },
  atrisk: { label: 'At risk', badge: 'bg-orange-500 text-white ring-orange-600/30', dot: 'bg-orange-500', text: 'text-orange-600' },
  critical: { label: 'Critical', badge: 'bg-red-600 text-white ring-red-700/40', dot: 'bg-red-600', text: 'text-red-700' },
}

/** Bar fill for a 0..1 signal — darker red at the bad end, green at the good. */
export function scoreBarColor(v: number): string {
  if (v >= 0.66) return 'bg-emerald-500'
  if (v >= 0.4) return 'bg-amber-500'
  return 'bg-red-600'
}

export function bandOf(score: number): Band {
  if (score >= 80) return 'thriving'
  if (score >= 65) return 'stable'
  if (score >= 50) return 'watch'
  if (score >= 30) return 'atrisk'
  return 'critical'
}
/** "Problem children" — everyone who needs attention. */
export const NEEDS_ATTENTION = 65

export type LogForm = 'survey' | 'manager' | 'leadership' | 'peer' | 'recognition' | 'reachout' | 'welcome' | 'alert'

export interface LogEntry {
  day: number
  form: LogForm
  title: string
  detail: string
  sentiment?: string
}
export interface ScoreSignal {
  key: SignalKey
  label: string
  value: number // 0..1
  weight: number
  pts: number // weighted contribution, 0..100
  note: string
}
export interface Action {
  label: string
  why: string
  tone: 'urgent' | 'soon' | 'nice'
}
export interface ScoreResult {
  score: number
  band: Band
  signals: ScoreSignal[]
  actions: Action[]
  log: LogEntry[]
}

// Tiny deterministic RNG so each person's generated touches are stable.
function seedOf(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function makeRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export function buildScore(hire: NewHire, surveys: Survey[], saves: Save[], weights: ScoreWeights = DEFAULT_WEIGHTS): ScoreResult {
  const day = tenureDays(hire.hireDate)
  const sig = computeSignal(hire, surveys)
  const concern = sig.state === 'negative' || sig.state === 'silent'
  const r = makeRng(seedOf(hire.id + hire.name))
  const log: LogEntry[] = []

  // --- Real interactions from data ---
  log.push({ day: 1, form: 'welcome', title: 'Day-1 welcome sent', detail: 'First-shift welcome auto-sent.' })
  const milestonesPassed = MILESTONES.filter((m) => day >= m)
  // Recognition is held for at-risk people (the celebrate guard) — a belonging gap by design.
  const recognitionSent = concern ? [] : milestonesPassed
  for (const m of recognitionSent) log.push({ day: m, form: 'recognition', title: `${m}-day milestone recognized`, detail: '“You made it” note sent.' })

  for (const sv of surveys) {
    if (sv.status !== 'completed') continue
    const d = Math.max(0, daysBetween(hire.hireDate, parseDate(sv.deployedDate)))
    log.push({ day: d, form: 'survey', title: `${sv.type} survey responded`, detail: sv.response, sentiment: sv.sentiment })
  }

  const managerDays: number[] = []
  let leadershipTouched = false
  for (const s of saves) {
    log.push({ day: s.dayInTenure, form: 'alert', title: `Save alert · ${s.assignedRole}`, detail: `${s.triggerType} came back ${s.triggerSentiment}` })
    if (s.status !== 'new') {
      const cday = s.conversationDate ? Math.max(s.dayInTenure, daysBetween(hire.hireDate, parseDate(s.conversationDate))) : s.dayInTenure
      const leader = s.assignedRole === 'DON' || s.assignedRole === 'Administrator'
      if (leader) leadershipTouched = true
      else managerDays.push(cday)
      log.push({
        day: cday,
        form: leader ? 'leadership' : 'manager',
        title: `Stay conversation — ${s.assignedTo}`,
        detail: s.note || s.quote,
      })
    }
  }

  // --- Generated relationship touches (deterministic) ---
  if (day > 20 && r() < (concern ? 0.35 : 0.62)) {
    const d = Math.min(day - 1, 18 + Math.floor(r() * Math.max(1, day - 20)))
    managerDays.push(d)
    log.push({ day: d, form: 'manager', title: 'Manager 1:1', detail: 'Direct manager check-in on how the role is going.' })
  }
  if (!leadershipTouched && r() < (concern ? 0.22 : 0.3)) {
    const d = Math.min(day - 1, 25 + Math.floor(r() * 40))
    if (d >= 1 && d <= day) {
      leadershipTouched = true
      log.push({ day: d, form: 'leadership', title: 'Leadership outreach', detail: 'People Operations connected personally.' })
    }
  }
  const buddy = r() < (concern ? 0.5 : 0.78)
  if (buddy) log.push({ day: Math.min(day, 3), form: 'peer', title: 'Peer buddy assigned', detail: 'Paired with a unit buddy for the first 10 shifts.' })
  const reachedOut = r() < (concern ? 0.25 : 0.4)
  if (reachedOut) {
    const d = Math.min(day, 10 + Math.floor(r() * Math.max(1, day - 10)))
    log.push({ day: d, form: 'reachout', title: 'Reached out via Ask Here', detail: 'Asked a scheduling question — a sign the door feels open.' })
  }

  log.sort((a, b) => b.day - a.day)

  // --- Signals (0..1) ---
  const heard = { positive: 0.95, neutral: 0.55, negative: 0.15, silent: 0.2, awaiting: 0.6 }[sig.state]
  const seen = sig.coverageDue ? clamp01(sig.coverageAnswered / sig.coverageDue) : 0.65
  const lastManager = managerDays.length ? Math.max(...managerDays) : null
  const manager = lastManager == null ? 0 : day - lastManager <= 21 ? 1 : day - lastManager <= 45 ? 0.6 : 0.35
  const leadership = leadershipTouched ? 1 : 0.5
  const voice = reachedOut ? 1 : 0.5
  const belonging = (buddy ? 0.5 : 0) + (recognitionSent.length > 0 ? 0.5 : 0)

  const raw: Record<SignalKey, { value: number; note: string }> = {
    heard: {
      value: heard,
      note:
        sig.state === 'awaiting'
          ? 'No signal yet — too early'
          : sig.state === 'silent'
            ? 'Gone quiet on a due check-in'
            : `${sig.state[0].toUpperCase()}${sig.state.slice(1)} on their last check-in`,
    },
    seen: { value: seen, note: sig.coverageDue ? `${sig.coverageAnswered}/${sig.coverageDue} check-ins answered` : 'Nothing due yet' },
    manager: { value: manager, note: lastManager == null ? 'No manager conversation on record' : `Last manager touch: day ${lastManager}` },
    leadership: { value: leadership, note: leadershipTouched ? 'A leader has connected' : 'No leadership contact yet' },
    voice: { value: voice, note: reachedOut ? 'Has reached out to us' : 'Hasn’t reached out yet' },
    belonging: { value: belonging, note: `${buddy ? 'Buddy assigned' : 'No buddy'} · ${recognitionSent.length} recognitions` },
  }

  const totalWeight = (Object.keys(weights) as SignalKey[]).reduce((n, k) => n + weights[k], 0) || 1
  const signals: ScoreSignal[] = (Object.keys(SIGNAL_LABEL) as SignalKey[]).map((key) => {
    const w = weights[key] / totalWeight
    return { key, label: SIGNAL_LABEL[key], value: raw[key].value, weight: weights[key], pts: raw[key].value * w * 100, note: raw[key].note }
  })
  const score = Math.round(signals.reduce((n, s) => n + s.pts, 0))
  const band = bandOf(score)

  // --- Suggested actions from weak signals ---
  const actions: Action[] = []
  if (sig.state === 'negative') actions.push({ label: 'Have a stay conversation', why: raw.heard.note, tone: 'urgent' })
  else if (sig.state === 'silent') actions.push({ label: 'Reach out — they’ve gone quiet', why: sig.detail, tone: 'urgent' })
  if (manager < 0.5) actions.push({ label: 'Schedule a manager 1:1', why: raw.manager.note, tone: lastManager == null ? 'urgent' : 'soon' })
  if (seen < 0.5 && sig.coverageDue > 0) actions.push({ label: 'Re-send the check-in', why: raw.seen.note, tone: 'soon' })
  if (!leadershipTouched && (band === 'atrisk' || band === 'critical')) actions.push({ label: 'Loop in People Operations', why: 'At-risk with no leadership contact', tone: 'soon' })
  if (!buddy) actions.push({ label: 'Assign a peer buddy', why: 'No buddy on record', tone: 'soon' })
  if (!reachedOut && score < NEEDS_ATTENTION) actions.push({ label: 'Open a door — invite to Ask Here', why: 'Make it easy for them to reach back', tone: 'nice' })
  if (concern && milestonesPassed.length > recognitionSent.length)
    actions.push({ label: 'Recognize once stabilized', why: `Recognition held while at-risk (${milestonesPassed[milestonesPassed.length - 1]}-day milestone)`, tone: 'nice' })

  const toneRank = { urgent: 0, soon: 1, nice: 2 }
  actions.sort((a, b) => toneRank[a.tone] - toneRank[b.tone])

  return { score, band, signals, actions, log }
}
