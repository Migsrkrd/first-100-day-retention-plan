// Fixed "today" so tenure math and SLA aging stay deterministic regardless of
// when the demo is opened. Matches the seed's asOf date.
export const TODAY = new Date('2026-07-07T12:00:00')

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function parseDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

export function daysBetween(fromIso: string, to: Date = TODAY): number {
  const from = parseDate(fromIso)
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

export function tenureDays(hireDateIso: string): number {
  return Math.max(0, daysBetween(hireDateIso))
}

export function hoursSince(iso: string): number {
  const from = parseDate(iso)
  return Math.max(0, Math.round((TODAY.getTime() - from.getTime()) / (60 * 60 * 1000)))
}

export function relativeDay(iso: string): string {
  const d = daysBetween(iso)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 0) return `in ${Math.abs(d)}d`
  if (d < 30) return `${d}d ago`
  const months = Math.round(d / 30)
  return `${months}mo ago`
}

export function fmtDate(iso: string): string {
  if (!iso) return '—'
  return parseDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtDateLong(iso: string): string {
  if (!iso) return '—'
  return parseDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// The four early-tenure survey milestones and where a hire sits against them.
export const MILESTONES = [15, 30, 60, 90, 100]

export function nextMilestone(day: number): number | null {
  for (const m of MILESTONES) if (day < m) return m
  return null
}
