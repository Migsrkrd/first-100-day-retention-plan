import { useState, type ReactNode } from 'react'
import { ArrowRight, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import { PageHeader, SectionCard, Pill, Dot } from '@/components/primitives'
import { jobDot, type Job } from '@/utils/ui'
import { cn } from '@/lib/utils'

interface Rule {
  when: string
  then: string
  chips: string[]
  guard?: boolean
}

const GROUPS: { job: Job; blurb: string; rules: Rule[] }[] = [
  {
    job: 'Listen',
    blurb: 'Surface friction while the person is still winnable.',
    rules: [
      { when: 'A new hire reaches day 15 / 30 / 60 / 90', then: 'Auto-assign the check-in survey via Documents & Checklists', chips: ['tied to onboarding'] },
      { when: 'A scheduled date or a hire anniversary arrives', then: 'Deploy the bi-annual / anniversary survey (anonymous option on)', chips: ['whole workforce'] },
      { when: 'Feedback is submitted to Ask Here', then: 'Route by category to the right leader; track response time', chips: ['always-on'] },
    ],
  },
  {
    job: 'Intervene',
    blurb: 'The save — the one move most likely to prevent an early exit.',
    rules: [
      { when: 'A 15 / 30 / 60 / 90 survey comes back flat or negative', then: 'Open a save and alert the Charge Nurse / DON', chips: ['within 4 hours', 'route to leader'] },
      { when: 'A due check-in goes unanswered for 7 days', then: 'Flag the person “silent” and surface them in the caseload', chips: ['silence = concern'] },
      { when: 'A save is untouched past its 24-hour SLA', then: 'Escalate to the Building Administrator', chips: ['aging → escalate'] },
    ],
  },
  {
    job: 'Acknowledge',
    blurb: 'Prove feedback produces change.',
    rules: [
      { when: 'A survey comes back positive', then: 'Send an immediate, warm, human-sounding thank-you', chips: ['auto thank-you'] },
      { when: 'A theme recurs across responses', then: 'Surface it for a “You Said, We Did” post', chips: ['message human-written'] },
    ],
  },
  {
    job: 'Celebrate',
    blurb: 'Recognize the moments that build belonging — but never the wrong moment.',
    rules: [
      { when: 'A hire works their first shift', then: 'Send the day-1 welcome', chips: ['day 1'] },
      { when: '30 / 60 / 90 / 100-day milestone is reached', then: 'Send a “you made it” recognition', chips: ['milestones'] },
      { when: 'A person’s birthday or work anniversary arrives', then: 'Send a dated recognition off the Paycom date', chips: ['date-based'] },
      {
        when: 'A person is at-risk (low score, negative, or silent)',
        then: 'HOLD all automated recognition until they stabilize',
        chips: ['the guard', 'sorting is the strategy'],
        guard: true,
      },
    ],
  },
]

const SAFETY: Rule[] = [
  { when: 'Feedback implicates abuse, neglect, or a safety event', then: 'Route to Compliance on a real-time clock and log it', chips: ['≤ 4 hours', 'mandated report'] },
  { when: 'Feedback is about a leader', then: 'Route around that leader — one level up', chips: ['anonymity protected'] },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cn('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition', on ? 'bg-blue-600' : 'bg-slate-200')}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'left-4' : 'left-0.5')} />
    </button>
  )
}

function Picker({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function Threshold({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
      <span className="text-xs text-slate-600">{label}</span>
      {children}
    </div>
  )
}

function RuleRow({ rule }: { rule: Rule }) {
  const [on, setOn] = useState(true)
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-3 transition', rule.guard ? 'border-violet-200 bg-violet-50/50' : 'border-slate-100')}>
      <Toggle on={on} onChange={setOn} />
      <div className={cn('min-w-0 flex-1', !on && 'opacity-50')}>
        <p className="text-sm text-slate-700">
          <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">When</span>
          {rule.when}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-sm">
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
          <span>
            <span className="mr-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">Then</span>
            <span className={cn('font-medium', rule.guard ? 'text-violet-800' : 'text-slate-800')}>{rule.then}</span>
          </span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rule.chips.map((c) => (
            <Pill key={c} className={rule.guard && c === 'the guard' ? 'bg-violet-100 text-violet-700 ring-violet-600/20' : 'bg-slate-100 text-slate-500 ring-slate-400/20'}>
              {c}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Rules() {
  const [attn, setAttn] = useState('under 65')
  const [saveSla, setSaveSla] = useState('4 hours')
  const [escSla, setEscSla] = useState('24 hours')
  const [silence, setSilence] = useState('7 days')
  const [sensitivity, setSensitivity] = useState('Flat & negative')

  return (
    <div>
      <PageHeader
        title="Rules engine"
        subtitle="The automation behind the engine — every trigger, its action, and where it routes. Sorting the right moment into the right job is the strategy."
      />

      {/* Global thresholds */}
      <SectionCard
        title="Thresholds"
        subtitle="The dials every rule reads from"
        action={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
        className="mb-4"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Threshold label="Needs-attention score">
            <Picker value={attn} onChange={setAttn} options={['under 60', 'under 65', 'under 70']} />
          </Threshold>
          <Threshold label="Save alert — contact within">
            <Picker value={saveSla} onChange={setSaveSla} options={['2 hours', '4 hours', '12 hours']} />
          </Threshold>
          <Threshold label="Escalate stalled save after">
            <Picker value={escSla} onChange={setEscSla} options={['12 hours', '24 hours', '48 hours']} />
          </Threshold>
          <Threshold label="Silence flagged after">
            <Picker value={silence} onChange={setSilence} options={['5 days', '7 days', '10 days']} />
          </Threshold>
          <Threshold label="Save trigger sensitivity">
            <Picker value={sensitivity} onChange={setSensitivity} options={['Flat & negative', 'Negative only']} />
          </Threshold>
        </div>
      </SectionCard>

      {/* Rules by job */}
      <div className="space-y-4">
        {GROUPS.map((g) => (
          <SectionCard key={g.job}>
            <div className="mb-3 flex items-center gap-2">
              <Dot className={jobDot(g.job)} />
              <span className="text-sm font-semibold text-slate-800">{g.job}</span>
              <span className="text-xs text-slate-400">· {g.blurb}</span>
              <span className="ml-auto text-[11px] text-slate-400">{g.rules.length} rules</span>
            </div>
            <div className="space-y-2">
              {g.rules.map((r, i) => (
                <RuleRow key={i} rule={r} />
              ))}
            </div>
          </SectionCard>
        ))}

        {/* Safety rails */}
        <SectionCard>
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-slate-800">Safety rails</span>
            <span className="text-xs text-slate-400">· the floor under every rule — over-escalation by design</span>
            <span className="ml-auto text-[11px] text-slate-400">{SAFETY.length} rules</span>
          </div>
          <div className="space-y-2">
            {SAFETY.map((r, i) => (
              <RuleRow key={i} rule={r} />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
