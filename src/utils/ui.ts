// Shared class-map helpers so badges and dots read consistently across screens.

export type Risk = 'on-track' | 'watch' | 'at-risk'
export type Sentiment = 'positive' | 'flat' | 'negative' | 'none'
export type Job = 'Celebrate' | 'Listen' | 'Acknowledge' | 'Intervene'
export type SaveStatus =
  | 'new'
  | 'contacted'
  | 'scheduled'
  | 'escalated'
  | 'closed-saved'
  | 'closed-lost'

const FALLBACK = 'bg-slate-100 text-slate-600 ring-slate-500/20'

export function riskBadge(risk: Risk): string {
  return (
    {
      'on-track': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      watch: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      'at-risk': 'bg-red-50 text-red-700 ring-red-600/20',
    }[risk] ?? FALLBACK
  )
}

export function riskDot(risk: Risk): string {
  return { 'on-track': 'bg-emerald-500', watch: 'bg-amber-500', 'at-risk': 'bg-red-500' }[risk] ?? 'bg-slate-400'
}

export function riskLabel(risk: Risk): string {
  return { 'on-track': 'On track', watch: 'Watch', 'at-risk': 'At risk' }[risk] ?? risk
}

export function sentimentBadge(s: Sentiment): string {
  return (
    {
      positive: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      flat: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      negative: 'bg-red-50 text-red-700 ring-red-600/20',
      none: 'bg-slate-100 text-slate-500 ring-slate-400/20',
    }[s] ?? FALLBACK
  )
}

export function jobBadge(job: Job): string {
  return (
    {
      Celebrate: 'bg-violet-50 text-violet-700 ring-violet-600/20',
      Listen: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      Acknowledge: 'bg-teal-50 text-teal-700 ring-teal-600/20',
      Intervene: 'bg-red-50 text-red-700 ring-red-600/20',
    }[job] ?? FALLBACK
  )
}

export function jobDot(job: Job): string {
  return (
    { Celebrate: 'bg-violet-500', Listen: 'bg-blue-500', Acknowledge: 'bg-teal-500', Intervene: 'bg-red-500' }[job] ??
    'bg-slate-400'
  )
}

export function saveStatusBadge(s: SaveStatus): string {
  return (
    {
      new: 'bg-red-50 text-red-700 ring-red-600/20',
      contacted: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      scheduled: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
      escalated: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      'closed-saved': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      'closed-lost': 'bg-slate-100 text-slate-600 ring-slate-500/20',
    }[s] ?? FALLBACK
  )
}

export function saveStatusLabel(s: SaveStatus): string {
  return (
    {
      new: 'New alert',
      contacted: 'Contacted',
      scheduled: 'Conversation set',
      escalated: 'Escalated',
      'closed-saved': 'Saved',
      'closed-lost': 'Lost',
    }[s] ?? s
  )
}

export function roleBadge(role: string): string {
  return (
    {
      CNA: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      LPN: 'bg-violet-50 text-violet-700 ring-violet-600/20',
      RN: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
      Dietary: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      Housekeeping: 'bg-teal-50 text-teal-700 ring-teal-600/20',
      Therapy: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
    }[role] ?? FALLBACK
  )
}

// Roster signal states (sentiment × coverage) — see utils/sentiment.ts.
export type Signal = 'positive' | 'neutral' | 'negative' | 'silent' | 'awaiting'

const SIGNAL: Record<Signal, { label: string; badge: string; dot: string; rank: number }> = {
  negative: { label: 'Negative', badge: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500', rank: 0 },
  silent: { label: 'Silent', badge: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500', rank: 1 },
  neutral: { label: 'Neutral', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500', rank: 2 },
  awaiting: { label: 'Awaiting', badge: 'bg-slate-100 text-slate-500 ring-slate-400/20', dot: 'bg-slate-300', rank: 3 },
  positive: { label: 'Positive', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', rank: 4 },
}

export const signalLabel = (s: Signal) => SIGNAL[s].label
export const signalBadge = (s: Signal) => SIGNAL[s].badge
export const signalDot = (s: Signal) => SIGNAL[s].dot
export const signalRank = (s: Signal) => SIGNAL[s].rank
export const isConcerning = (s: Signal) => s === 'negative' || s === 'silent'

// Open (still-actionable) save states, used for counts and filtering.
export const OPEN_SAVE_STATES: SaveStatus[] = ['new', 'contacted', 'scheduled', 'escalated']
export const CLOSED_SAVE_STATES: SaveStatus[] = ['closed-saved', 'closed-lost']

export function isOpenSave(s: string): boolean {
  return OPEN_SAVE_STATES.includes(s as SaveStatus)
}
