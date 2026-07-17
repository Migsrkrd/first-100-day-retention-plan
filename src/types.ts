import type { Risk, Sentiment, Job, SaveStatus } from './utils/ui'

export type { Risk, Sentiment, Job, SaveStatus }

export interface Portfolio {
  id: string
  name: string
  annualizedTurnover: number
  priorTurnover: number
  benchmark: number
  medianTenureAtExit: number
  pctUnder90: number
  pctNoReason: number
  failedRehires: number
  survival90: number
  survival100: number
  saveClosureRate: number
  reasonCaptureRate: number
  responseRate: number
  asOf: string
}

export interface Building {
  id: string
  name: string
  city: string
  state: string
  beds: number
  administrator: string
  don: string
  chargeNurse: string
  annualizedTurnover: number
  benchmark: number
  survival90: number
  responseRate: number
  saveClosureRate: number
}

export interface NewHire {
  id: string
  name: string
  role: string
  buildingId: string
  hireDate: string
  birthday: string
  manager: string
  status: 'active' | 'resigned'
  risk: Risk
  latestSentiment: Sentiment
}

export interface Tenured {
  id: string
  name: string
  role: string
  buildingId: string
  hireDate: string
  birthday: string
  manager: string
  risk: Risk
}

export interface Survey {
  id: string
  employeeId: string
  type: '15-day' | '30-day' | '60-day' | '90-day'
  deployedDate: string
  status: 'pending' | 'completed'
  sentiment: Sentiment
  score: number
  theme: string
  response: string
}

export interface Save {
  id: string
  employeeId: string
  name: string
  role: string
  buildingId: string
  dayInTenure: number
  triggerType: string
  triggerSentiment: 'negative' | 'flat'
  theme: string
  quote: string
  alertedDate: string
  assignedRole: 'Charge Nurse' | 'DON' | 'Administrator'
  assignedTo: string
  status: SaveStatus
  slaHours: number
  dueDate: string
  conversationDate: string
  disposition: string
  note: string
  closedDate: string
  outcome: '' | 'saved' | 'lost'
}

export interface TouchpointType {
  id: string
  name: string
  job: Job
  timing: string
  automation: string
  description: string
  confirm: string
}

export interface Activity {
  id: string
  employeeName: string
  buildingId: string
  type: string
  job: Job
  date: string
  status: 'sent' | 'scheduled' | 'flagged'
  detail: string
}

export interface AskHere {
  id: string
  buildingId: string
  submittedDate: string
  category: string
  sensitive: boolean
  anonymous: boolean
  excerpt: string
  routedTo: string
  status: 'open' | 'in-progress' | 'closed'
  responseHours: number
  slaHours: number
}

export interface YouSaidWeDid {
  id: string
  buildingId: string
  theme: string
  said: string
  did: string
  publishedDate: string
  sourceCount: number
}

export interface Termination {
  id: string
  name: string
  role: string
  buildingId: string
  hireDate: string
  exitDate: string
  tenureDays: number
  reasonCaptured: boolean
  reason: string | null
  category: string
  agencyBackfill: boolean
  failedRehire: boolean
}

export interface Trend {
  id: string
  key: string
  label: string
  unit: string
  direction: 'up' | 'down'
  points: { m: string; v: number }[]
}

export interface SurvivalPoint {
  id: string
  day: number
  withEngine: number
  baseline: number
}

export interface Roi {
  id: string
  earlyExitsPerYear: number
  costPerReplacement: number
  costLow: number
  costHigh: number
  reductionTargetPct: number
  downsidePct: number
  yearOneInvestment: number
}

export interface PaycomBuildRow {
  id: string
  touchpoint: string
  livesIn: string
  status: 'Auto now' | 'Confirm setup' | 'Human'
  confirm: string
}

export interface RolloutPhase {
  id: string
  phase: string
  state: 'complete' | 'active' | 'upcoming'
  what: string
  output: string
}

export interface RoleRow {
  id: string
  role: string
  tag: string
  responsibility: string
}

export interface Ask {
  id: string
  ask: string
  note: string
  status: 'open' | 'in-progress' | 'done'
}

export interface Comment {
  id: string
  employeeId: string
  author: string
  text: string
  date: string
}

export interface Interaction {
  id: string
  employeeId: string
  kind: 'manager' | 'leadership' | 'peer' | 'recognition' | 'reachout'
  date: string
  note: string
}
