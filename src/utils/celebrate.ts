import { TODAY, parseDate, tenureDays } from '@/utils/date'
import { computeSignal } from '@/utils/sentiment'
import { isConcerning, type Signal } from '@/utils/ui'
import type { NewHire, Survey, Tenured } from '@/types'

const MS = 86400000
// Day-1 is already fired at hire; these are the "you made it" celebrate marks.
const CELEBRATE_MILESTONES = [30, 60, 90, 100]

export type CelebrateKind = 'milestone' | 'birthday' | 'anniversary'

export interface CelebrateItem {
  key: string
  linkId?: string // profile-drawer id (first-100-day hires only)
  name: string
  role: string
  buildingId: string
  kind: CelebrateKind
  label: string
  daysUntil: number
  dateIso: string
  held: boolean
  holdReason?: string
  signal?: Signal
}

function today0(): number {
  return new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 12).getTime()
}
function nextAnnual(month: number, day: number): { t: number; daysUntil: number } {
  const t0 = today0()
  let t = new Date(TODAY.getFullYear(), month - 1, day, 12).getTime()
  if (t < t0) t = new Date(TODAY.getFullYear() + 1, month - 1, day, 12).getTime()
  return { t, daysUntil: Math.round((t - t0) / MS) }
}
const isoOf = (t: number) => new Date(t).toISOString().slice(0, 10)
const mmdd = (s: string): [number, number] => {
  const [m, d] = s.split('-').map(Number)
  return [m, d]
}

// Every upcoming Celebrate moment within the horizon, each carrying a "hold"
// flag from the roster signal — the engine never auto-congratulates someone
// who is currently at-risk (sorting is the strategy).
export function buildCelebrateItems(
  hires: NewHire[],
  surveys: Survey[],
  tenured: Tenured[],
  horizon = 14,
): CelebrateItem[] {
  const items: CelebrateItem[] = []

  for (const h of hires) {
    const day = tenureDays(h.hireDate)
    const sig = computeSignal(
      h,
      surveys.filter((s) => s.employeeId === h.id),
    )
    const held = isConcerning(sig.state)
    const holdReason = held ? sig.detail : undefined

    for (const m of CELEBRATE_MILESTONES) {
      const du = m - day
      if (du >= 0 && du <= horizon) {
        items.push({
          key: `${h.id}-m${m}`,
          linkId: h.id,
          name: h.name,
          role: h.role,
          buildingId: h.buildingId,
          kind: 'milestone',
          label: `${m}-day milestone`,
          daysUntil: du,
          dateIso: isoOf(parseDate(h.hireDate).getTime() + m * MS),
          held,
          holdReason,
          signal: sig.state,
        })
      }
    }

    const [bm, bd] = mmdd(h.birthday)
    const b = nextAnnual(bm, bd)
    if (b.daysUntil <= horizon) {
      items.push({
        key: `${h.id}-b`,
        linkId: h.id,
        name: h.name,
        role: h.role,
        buildingId: h.buildingId,
        kind: 'birthday',
        label: 'Birthday',
        daysUntil: b.daysUntil,
        dateIso: isoOf(b.t),
        held,
        holdReason,
        signal: sig.state,
      })
    }
  }

  for (const p of tenured) {
    const held = p.risk === 'at-risk'
    const holdReason = held ? 'Flagged at-risk in the last workforce pulse' : undefined

    const [bm, bd] = mmdd(p.birthday)
    const b = nextAnnual(bm, bd)
    if (b.daysUntil <= horizon) {
      items.push({
        key: `${p.id}-b`,
        name: p.name,
        role: p.role,
        buildingId: p.buildingId,
        kind: 'birthday',
        label: 'Birthday',
        daysUntil: b.daysUntil,
        dateIso: isoOf(b.t),
        held,
        holdReason,
      })
    }

    const [, amS, adS] = p.hireDate.split('-')
    const a = nextAnnual(Number(amS), Number(adS))
    if (a.daysUntil <= horizon) {
      const years = new Date(a.t).getFullYear() - Number(p.hireDate.slice(0, 4))
      items.push({
        key: `${p.id}-a`,
        name: p.name,
        role: p.role,
        buildingId: p.buildingId,
        kind: 'anniversary',
        label: `${years}-year work anniversary`,
        daysUntil: a.daysUntil,
        dateIso: isoOf(a.t),
        held,
        holdReason,
      })
    }
  }

  return items.sort((x, y) => x.daysUntil - y.daysUntil || Number(x.held) - Number(y.held))
}
