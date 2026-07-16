import type { NewHire, Building } from '@/types'
import { TODAY, tenureDays, fmtDateLong } from '@/utils/date'

// Deterministic HR profile generator — same person always yields the same
// (made-up) record, so the demo is stable across reloads. Seeded off the id.

function seedFrom(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
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
const pick = <T>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]
const int = (r: () => number, min: number, max: number) => Math.floor(r() * (max - min + 1)) + min
const pad = (n: number, len: number) => String(n).padStart(len, '0')

const COMP_BAND: Record<string, [number, number]> = {
  CNA: [18, 22],
  LPN: [27, 32],
  RN: [35, 43],
  Dietary: [15, 18],
  Housekeeping: [14, 17],
  Therapy: [31, 39],
}
const DEPARTMENT: Record<string, string> = {
  CNA: 'Nursing',
  LPN: 'Nursing',
  RN: 'Nursing',
  Dietary: 'Dietary',
  Housekeeping: 'Environmental Services',
  Therapy: 'Rehabilitation',
}
const NURSING_UNITS = ['Memory Care', 'Skilled Unit 2', 'Rehab Wing', 'LTC Hall A', 'LTC Hall B', 'Short-Stay Unit']
const SHIFTS = ['Days · 7a–7p', 'Days · 7a–3p', 'Evenings · 3p–11p', 'Nights · 7p–7a', 'Nights · 11p–7a']
const EMERGENCY_NAMES = ['Marcus Reed', 'Elena Ortiz', 'Grace Kim', 'David Okoro', 'Sandra Lee', 'Tomás Rivera', 'Nadia Haddad', 'Curtis Bell']
const RELATIONS = ['Spouse', 'Mother', 'Father', 'Sibling', 'Partner', 'Friend']
const STREETS = ['E Camelback Rd', 'W Baseline Rd', 'N Scottsdale Ave', 'S Mill Ave', 'E University Dr', 'W Guadalupe Rd', 'N Alma School Rd']
const SOURCES = ['Indeed', 'Employee referral', 'Nursing school partnership', 'Walk-in', 'Agency-to-hire', 'Company career site']

export interface Credential {
  name: string
  detail: string
  status: 'valid' | 'expiring' | 'complete' | 'pending'
}

export interface HrProfile {
  employeeNo: string
  ssnMasked: string
  badge: string
  contact: { workEmail: string; personalEmail: string; phone: string; address: string }
  personal: { dob: string; age: number; pronouns: string; languages: string[]; marital: string; dependents: number }
  employment: {
    status: string
    type: string
    fte: string
    shift: string
    unit: string
    department: string
    classification: string
    workLocation: string
    manager: string
    reportsTo: string
    startDate: string
    seniority: string
    source: string
  }
  comp: { baseRate: string; shiftDiff: string; payGroup: string; frequency: string; lastAdjustment: string; nextReview: string }
  credentials: Credential[]
  onboarding: { label: string; done: boolean }[]
  attendance: { pto: number; sick: number; points: number; occurrences: number; lastAbsence: string; perfect: boolean }
  emergency: { name: string; relation: string; phone: string }
  benefits: { medical: string; dental: string; vision: string; retirement: string }
}

function phone(r: () => number): string {
  const area = pick(r, ['602', '480', '623'])
  return `(${area}) ${int(r, 200, 989)}-${pad(int(r, 0, 9999), 4)}`
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildProfile(hire: NewHire, building?: Building): HrProfile {
  const r = makeRng(seedFrom(hire.id + hire.name))
  const day = tenureDays(hire.hireDate)
  const [first, ...rest] = hire.name.split(' ')
  const last = rest[rest.length - 1] ?? ''
  const handle = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '')

  const dept = DEPARTMENT[hire.role] ?? 'Operations'
  const unit =
    dept === 'Nursing' ? pick(r, NURSING_UNITS) : dept === 'Dietary' ? 'Dietary / Kitchen' : dept === 'Rehabilitation' ? 'Therapy Gym' : 'Housekeeping'
  const shift = pick(r, SHIFTS)
  const nightEve = /Evenings|Nights/.test(shift)
  const type = pick(r, ['Full-time', 'Full-time', 'Full-time', 'Part-time', 'PRN'])
  const fte = type === 'Full-time' ? '1.0' : type === 'Part-time' ? pick(r, ['0.6', '0.8']) : '0.4'

  const [lo, hi] = COMP_BAND[hire.role] ?? [15, 20]
  const base = int(r, lo, hi) + pick(r, [0, 0.25, 0.5, 0.75])
  const diff = nightEve ? pick(r, [1.5, 2, 2.5, 3]) : 0

  const age = int(r, 22, 58)
  const [mm, dd] = hire.birthday.split('-')
  const dobIso = `${TODAY.getFullYear() - age}-${mm}-${dd}`

  const licenseCreds: Credential[] =
    hire.role === 'RN' || hire.role === 'LPN'
      ? [{ name: `${hire.role} License (AZ)`, detail: `Lic. #${pick(r, ['RN', 'LN'])}${int(r, 600000, 699999)} · exp ${fmtDateLong(addDays(hire.hireDate, int(r, 300, 640)))}`, status: 'valid' }]
      : hire.role === 'CNA'
        ? [{ name: 'CNA Certification (AZ)', detail: `Cert #C${int(r, 100000, 199999)} · exp ${fmtDateLong(addDays(hire.hireDate, int(r, 250, 600)))}`, status: 'valid' }]
        : []

  const cprExpiryDays = int(r, -20, 400)
  const credentials: Credential[] = [
    ...licenseCreds,
    {
      name: 'CPR / BLS',
      detail: cprExpiryDays < 45 ? `exp ${fmtDateLong(addDays(TODAY.toISOString().slice(0, 10), cprExpiryDays))}` : `valid through ${fmtDateLong(addDays(TODAY.toISOString().slice(0, 10), cprExpiryDays))}`,
      status: cprExpiryDays < 0 ? 'pending' : cprExpiryDays < 45 ? 'expiring' : 'valid',
    },
    { name: 'TB Screening', detail: `cleared ${fmtDateLong(addDays(hire.hireDate, -int(r, 2, 14)))}`, status: 'complete' },
    { name: 'Background Check', detail: 'cleared at hire', status: 'complete' },
    { name: 'I-9 / E-Verify', detail: 'verified', status: 'complete' },
    { name: 'Flu Vaccination', detail: pick(r, ['on file', 'declined — mask policy']), status: 'complete' },
  ]

  const onboarding = [
    { label: 'Offer accepted & signed', done: true },
    { label: 'I-9 / direct deposit', done: true },
    { label: 'Uniform & badge issued', done: day >= 1 },
    { label: 'Unit orientation completed', done: day >= 5 },
    { label: 'Buddy assigned (first 10 shifts)', done: day >= 3 },
    { label: '30-day check-in', done: day >= 30 },
    { label: '90-day review scheduled', done: day >= 60 },
  ]

  const perfect = r() < 0.55
  const occurrences = perfect ? 0 : int(r, 1, 3)

  return {
    employeeNo: `CH-${pad(int(r, 10000, 99999), 5)}`,
    ssnMasked: `•••-••-${pad(int(r, 0, 9999), 4)}`,
    badge: `#${int(r, 1000, 9999)}`,
    contact: {
      workEmail: `${handle}@copperhillscare.com`,
      personalEmail: `${handle}${int(r, 1, 89)}@${pick(r, ['gmail.com', 'outlook.com', 'icloud.com'])}`,
      phone: phone(r),
      address: `${int(r, 100, 9899)} ${pick(r, STREETS)}, ${building?.city ?? 'Phoenix'}, ${building?.state ?? 'AZ'} 85${pad(int(r, 1, 399), 3)}`,
    },
    personal: {
      dob: fmtDateLong(dobIso),
      age,
      pronouns: pick(r, ['she/her', 'he/him', 'they/them']),
      languages: pick(r, [['English'], ['English', 'Spanish'], ['English', 'Tagalog'], ['English', 'Spanish'], ['English', 'Vietnamese']]),
      marital: pick(r, ['Single', 'Married', 'Domestic partner', 'Single']),
      dependents: int(r, 0, 3),
    },
    employment: {
      status: hire.status === 'active' ? 'Active' : 'Separated',
      type,
      fte,
      shift,
      unit,
      department: dept,
      classification: 'Non-exempt · Hourly',
      workLocation: building?.name ?? 'Copper Hills',
      manager: hire.manager,
      reportsTo: `${hire.manager} (Charge Nurse) → ${building?.don ?? 'DON'}`,
      startDate: fmtDateLong(hire.hireDate),
      seniority: `${day} days`,
      source: pick(r, SOURCES),
    },
    comp: {
      baseRate: `$${base.toFixed(2)}/hr`,
      shiftDiff: diff ? `+$${diff.toFixed(2)}/hr (${nightEve ? 'shift diff' : 'none'})` : 'None',
      payGroup: pick(r, ['Biweekly · AZ-01', 'Biweekly · AZ-02']),
      frequency: 'Biweekly',
      lastAdjustment: day >= 90 ? fmtDateLong(addDays(hire.hireDate, 90)) : 'At hire',
      nextReview: fmtDateLong(addDays(hire.hireDate, day < 90 ? 90 : 365)),
    },
    credentials,
    onboarding,
    attendance: {
      pto: int(r, 0, 40),
      sick: int(r, 0, 24),
      points: occurrences,
      occurrences,
      lastAbsence: perfect ? 'None on record' : fmtDateLong(addDays(hire.hireDate, int(r, 5, Math.max(6, day)))),
      perfect,
    },
    emergency: {
      name: pick(r, EMERGENCY_NAMES),
      relation: pick(r, RELATIONS),
      phone: phone(r),
    },
    benefits: {
      medical: pick(r, ['PPO — enrolled', 'HDHP — enrolled', 'Waived']),
      dental: pick(r, ['Enrolled', 'Enrolled', 'Waived']),
      vision: pick(r, ['Enrolled', 'Waived']),
      retirement: pick(r, ['401(k) 3%', '401(k) 5%', 'Not enrolled']),
    },
  }
}
