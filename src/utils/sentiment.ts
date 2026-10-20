import type { NewHire, Survey } from '@/types'
import { tenureDays } from '@/utils/date'

// The listen-survey milestones. 100 is a celebrate milestone, not a survey.
export const SURVEY_MILESTONES = [15, 30, 60, 90]
// Response window before an unanswered due survey counts as "silent".
const GRACE = 7

export type Signal = 'positive' | 'neutral' | 'negative' | 'silent' | 'awaiting'

export interface SignalResult {
  state: Signal
  detail: string
  overdueDays: number
  coverageDue: number
  coverageAnswered: number
  day: number
}

const milestoneOf = (type: string) => parseInt(type, 10)

// Sentiment × coverage for one hire. Silence is graded: a blank before day 15
// is benign ("awaiting"), but a milestone that came due and went unanswered is
// "silent" — the concerning signal of someone going quiet.
export function computeSignal(hire: NewHire, surveys: Survey[]): SignalResult {
  const day = tenureDays(hire.hireDate)
  const completed = surveys
    .filter((s) => s.status === 'completed')
    .sort((a, b) => a.deployedDate.localeCompare(b.deployedDate))
  const latest = completed[completed.length - 1]
  const answered = new Set(completed.map((s) => milestoneOf(s.type)))

  const coverageDueList = SURVEY_MILESTONES.filter((m) => day >= m + GRACE)
  const coverageAnswered = coverageDueList.filter((m) => answered.has(m)).length
  const latestAnsweredMilestone = answered.size ? Math.max(...answered) : -1
  const mostRecentDue = coverageDueList.length ? Math.max(...coverageDueList) : -1
  // "Silent" = a check-in came due more recently than the last one they answered
  // (they've gone quiet). Historical gaps are the coverage metric's job, not this.
  const silent = mostRecentDue > latestAnsweredMilestone
  const overdueDays = silent ? day - mostRecentDue : 0

  let state: Signal
  if (silent) state = 'silent'
  else if (latest?.sentiment === 'negative') state = 'negative'
  else if (day < 15 && completed.length === 0) state = 'awaiting'
  else if (latest?.sentiment === 'flat') state = 'neutral'
  else if (latest?.sentiment === 'positive') state = 'positive'
  else state = 'awaiting'

  let detail: string
  if (state === 'negative') detail = `Negative · ${latest.theme || latest.type} (${latest.type})`
  else if (state === 'silent') detail = `Silent · ${mostRecentDue}-day unanswered — ${overdueDays}d overdue`
  else if (state === 'neutral') detail = `Neutral · ${latest.theme || latest.type} (${latest.type})`
  else if (state === 'positive') detail = `Positive · ${latest.type}`
  else {
    const pending = surveys.find((s) => s.status === 'pending')
    detail =
      completed.length === 0 && day < 15
        ? 'Awaiting first check-in · 15-day upcoming'
        : pending
          ? `Awaiting response · ${pending.type}`
          : 'Awaiting next check-in'
  }

  return { state, detail, overdueDays, coverageDue: coverageDueList.length, coverageAnswered, day }
}
