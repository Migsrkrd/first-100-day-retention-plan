import { useState, type ReactNode } from 'react'
import {
  CalendarDays,
  UserCog,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  ClipboardList,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ShieldCheck,
  Building2,
  HeartPulse,
  Sparkles,
  MessageSquareText,
  BellRing,
  HeartHandshake,
} from 'lucide-react'
import { SectionCard, Avatar, Pill } from '@/components/primitives'
import { Ring } from '@/components/charts'
import { useNewHires, useSurveys, useSaves, useInteractions, useBuildings } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { buildScore, BAND_META, scoreBarColor, type Band } from '@/utils/score'
import { roleBadge, sentimentBadge, saveStatusBadge, saveStatusLabel, isOpenSave } from '@/utils/ui'
import { computeSignal } from '@/utils/sentiment'
import { tenureDays, daysBetween, parseDate, fmtDate, MILESTONES } from '@/utils/date'
import { buildProfile, type Credential } from '@/utils/profile'
import { cn } from '@/lib/utils'

// The FORM of an activity — surveys (the employee's own voice) and human
// manager actions carry weight; automated recognition and system alerts recede.
type Form = 'celebrate' | 'survey' | 'alert' | 'human'

interface Event {
  day: number
  order: number
  form: Form
  title: string
  detail: string
  sentiment?: string
}

const FORM_META: Record<Form, { icon: typeof Sparkles; tile: string; low: boolean }> = {
  survey: { icon: MessageSquareText, tile: '', low: false }, // tile colored by sentiment
  human: { icon: HeartHandshake, tile: 'bg-blue-50 text-blue-600', low: false },
  alert: { icon: BellRing, tile: 'bg-amber-50 text-amber-500', low: true },
  celebrate: { icon: Sparkles, tile: 'bg-violet-50 text-violet-400', low: true },
}

const SURVEY_TILE: Record<string, string> = {
  positive: 'bg-emerald-50 text-emerald-600',
  flat: 'bg-amber-50 text-amber-600',
  negative: 'bg-red-50 text-red-600',
  none: 'bg-slate-100 text-slate-500',
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm text-slate-700">{value}</p>
    </div>
  )
}

const CRED_STYLE: Record<Credential['status'], { badge: string; label: string }> = {
  valid: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', label: 'Valid' },
  complete: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', label: 'Complete' },
  expiring: { badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', label: 'Expiring' },
  pending: { badge: 'bg-red-50 text-red-700 ring-red-600/20', label: 'Action needed' },
}


type Tab = 'retention' | 'employment' | 'credentials' | 'personal'
const TABS: { key: Tab; label: string }[] = [
  { key: 'retention', label: 'Retention' },
  { key: 'employment', label: 'Employment' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'personal', label: 'Personal' },
]

const BAND_HEX: Record<Band, string> = {
  thriving: '#10b981',
  stable: '#14b8a6',
  watch: '#f59e0b',
  atrisk: '#f97316',
  critical: '#ef4444',
}

export function ProfileView({ id }: { id?: string }) {
  const [tab, setTab] = useState<Tab>('retention')
  const { scoreWeights } = useScope()
  const hire = useNewHires().list().find((h) => h.id === id)
  const surveys = useSurveys().list().filter((s) => s.employeeId === id)
  const saves = useSaves().list().filter((s) => s.employeeId === id)
  const interactions = useInteractions().list().filter((i) => i.employeeId === id)
  const building = useBuildings().list().find((b) => b.id === hire?.buildingId)

  if (!hire) return <p className="text-sm text-slate-500">Person not found.</p>

  const p = buildProfile(hire, building)
  const day = tenureDays(hire.hireDate)
  const pct = Math.min(100, day)
  const sig = computeSignal(hire, surveys)
  const openSave = saves.find((s) => isOpenSave(s.status))
  const lastCompleted = surveys
    .filter((s) => s.status === 'completed')
    .sort((a, b) => a.deployedDate.localeCompare(b.deployedDate))
    .slice(-1)[0]
  const sc = buildScore(hire, surveys, saves, interactions, scoreWeights)
  const weak = sc.signals.filter((s) => s.value < 0.5)

  const events: Event[] = []
  events.push({ day: 1, order: 0, form: 'celebrate', title: 'Day-1 welcome', detail: 'First-shift welcome auto-sent.' })
  for (const m of MILESTONES) {
    if (day >= m) events.push({ day: m, order: 2, form: 'celebrate', title: `${m}-day milestone`, detail: '“You made it” recognition auto-sent.' })
  }
  for (const sv of surveys) {
    if (sv.status !== 'completed') continue
    const d = Math.max(0, daysBetween(hire.hireDate, parseDate(sv.deployedDate)))
    events.push({ day: d, order: 0, form: 'survey', title: `${sv.type} survey`, detail: sv.response, sentiment: sv.sentiment })
  }
  for (const s of saves) {
    // System alert (automated) — recedes …
    events.push({
      day: s.dayInTenure,
      order: 1,
      form: 'alert',
      title: `Save alert · routed to ${s.assignedRole}`,
      detail: `${s.triggerType} came back ${s.triggerSentiment}`,
    })
    // … and the human stay conversation — full weight.
    if (s.status !== 'new') {
      const label =
        s.status === 'closed-saved'
          ? 'Stay conversation — retained'
          : s.status === 'closed-lost'
            ? 'Stay conversation — lost'
            : `Stay conversation — ${saveStatusLabel(s.status).toLowerCase()}`
      const cday = s.conversationDate
        ? Math.max(s.dayInTenure, daysBetween(hire.hireDate, parseDate(s.conversationDate)))
        : s.dayInTenure
      events.push({ day: cday, order: 3, form: 'human', title: label, detail: s.note || s.quote })
    }
  }
  events.sort((a, b) => a.day - b.day || a.order - b.order)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={hire.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{hire.name}</h1>
              <Pill className={roleBadge(hire.role)}>{hire.role}</Pill>
              <Pill className={BAND_META[sc.band].badge}>
                {BAND_META[sc.band].label} · {sc.score}
              </Pill>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
              <span>Employee {p.employeeNo}</span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> {p.employment.unit} · {building?.name}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Hired {p.employment.startDate} · day {day} of 100
              </span>
              <span className="flex items-center gap-1.5">
                <UserCog className="h-3.5 w-3.5" /> {hire.manager}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="relative h-2.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
            {MILESTONES.map((m) => (
              <div key={m} className="absolute -top-0.5" style={{ left: `${m}%` }}>
                <span className={`block h-3.5 w-0.5 rounded ${day >= m ? 'bg-blue-700' : 'bg-slate-300'}`} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            {MILESTONES.map((m) => (
              <span key={m} className={day >= m ? 'font-medium text-blue-600' : ''}>
                d{m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition',
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Retention (default) — the WHY, first */}
      {tab === 'retention' && (
        <div className="space-y-4">
          {/* Retention score — the composite and its why */}
          <SectionCard>
            <div className="flex flex-wrap items-center gap-4">
              <Ring value={sc.score} size={80} stroke={8} color={BAND_HEX[sc.band]} label={`${sc.score}`} sublabel={BAND_META[sc.band].label} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">Retention score</span>
                  <Pill className={BAND_META[sc.band].badge}>{BAND_META[sc.band].label}</Pill>
                  <Pill className="bg-slate-100 text-slate-500 ring-slate-400/20">
                    coverage {sig.coverageDue ? `${sig.coverageAnswered}/${sig.coverageDue}` : 'n/a'}
                  </Pill>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Why: </span>
                  {weak.length ? weak.map((w) => w.note.toLowerCase()).join(' · ') : 'all signals healthy'}
                </p>
                {lastCompleted?.response && (
                  <p className="mt-1.5 text-xs italic text-slate-500">
                    “{lastCompleted.response}” <span className="not-italic text-slate-400">— {lastCompleted.type}</span>
                  </p>
                )}
                {openSave && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <HeartPulse className="h-3.5 w-3.5 text-red-500" /> Active save · {saveStatusLabel(openSave.status)} · {openSave.assignedRole}
                  </p>
                )}
              </div>
            </div>
            {/* Signal bars */}
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
              {sc.signals.map((s) => (
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
            {/* Do next */}
            {sc.actions.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Do next</p>
                <div className="space-y-1.5">
                  {sc.actions.slice(0, 3).map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                      <span className="text-slate-700">
                        <span className="font-medium">{a.label}</span> <span className="text-slate-400">— {a.why}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Survey activity" subtitle="Early-tenure listening">
            <div className="space-y-3">
              {surveys.map((sv) => (
                <div key={sv.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">{sv.type}</span>
                    {sv.status === 'pending' ? (
                      <Pill className="bg-slate-100 text-slate-500 ring-slate-400/20">pending · {fmtDate(sv.deployedDate)}</Pill>
                    ) : (
                      <Pill className={sentimentBadge(sv.sentiment)}>
                        {sv.sentiment} · {sv.score}/10
                      </Pill>
                    )}
                  </div>
                  {sv.response && <p className="mt-1 text-[11px] italic text-slate-500">“{sv.response}”</p>}
                </div>
              ))}
              {!surveys.length && <p className="text-xs text-slate-400">No surveys deployed yet.</p>}
            </div>
          </SectionCard>

          {saves.length > 0 && (
            <SectionCard title="Save history">
              <div className="space-y-2">
                {saves.map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-100 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">{s.triggerType}</span>
                      <Pill className={saveStatusBadge(s.status)}>{saveStatusLabel(s.status)}</Pill>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{s.note || s.quote}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title="First-100-day journey" subtitle="Every touchpoint, in order — by form of activity">
            {/* Legend — what the icons mean */}
            <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <MessageSquareText className="h-3 w-3 text-slate-500" /> employee voice
              </span>
              <span className="flex items-center gap-1">
                <HeartHandshake className="h-3 w-3 text-blue-500" /> manager action
              </span>
              <span className="flex items-center gap-1">
                <BellRing className="h-3 w-3 text-amber-500" /> system alert
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-violet-400" /> automated recognition
              </span>
            </div>
            <div className="space-y-3.5">
              {events.map((e, i) => {
                const meta = FORM_META[e.form]
                const Icon = meta.icon
                const tile = e.form === 'survey' ? SURVEY_TILE[e.sentiment || 'none'] : meta.tile
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'flex shrink-0 items-center justify-center rounded-lg',
                          meta.low ? 'h-6 w-6' : 'h-7 w-7',
                          tile,
                        )}
                      >
                        <Icon className={meta.low ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                      </span>
                      {i < events.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('text-xs', meta.low ? 'font-medium text-slate-500' : 'font-semibold text-slate-800')}>
                          {e.title}
                        </span>
                        <span className="text-[10px] text-slate-400">day {e.day}</span>
                        {e.form === 'survey' && e.sentiment && e.sentiment !== 'none' && (
                          <Pill className={sentimentBadge(e.sentiment as never)}>{e.sentiment}</Pill>
                        )}
                      </div>
                      {e.detail && <p className={cn('mt-0.5 text-xs', meta.low ? 'text-slate-400' : 'text-slate-500')}>{e.detail}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Employment */}
      {tab === 'employment' && (
        <SectionCard title="Employment & compensation">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Field label="Status" value={p.employment.status} />
            <Field label="Type" value={`${p.employment.type} · ${p.employment.fte} FTE`} />
            <Field label="Shift" value={p.employment.shift} />
            <Field label="Department" value={p.employment.department} />
            <Field label="Unit" value={p.employment.unit} />
            <Field label="Classification" value={p.employment.classification} />
            <Field label="Base rate" value={p.comp.baseRate} />
            <Field label="Shift differential" value={p.comp.shiftDiff} />
            <Field label="Pay group" value={p.comp.payGroup} />
            <Field label="Reports to" value={p.employment.reportsTo} />
            <Field label="Hire source" value={p.employment.source} />
            <Field label="Next review" value={p.comp.nextReview} />
          </div>
        </SectionCard>
      )}

      {/* Credentials */}
      {tab === 'credentials' && (
        <div className="space-y-4">
          <SectionCard title="Credentials & compliance" subtitle="Licensure and pre-employment" action={<ShieldCheck className="h-4 w-4 text-emerald-500" />}>
            <div className="space-y-2">
              {p.credentials.map((c) => {
                const st = CRED_STYLE[c.status]
                return (
                  <div key={c.name} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                    <BadgeCheck className={cn('h-4 w-4 shrink-0', c.status === 'pending' ? 'text-red-400' : c.status === 'expiring' ? 'text-amber-400' : 'text-emerald-400')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800">{c.name}</p>
                      <p className="truncate text-[11px] text-slate-400">{c.detail}</p>
                    </div>
                    <Pill className={st.badge}>{st.label}</Pill>
                  </div>
                )
              })}
            </div>
          </SectionCard>
          <SectionCard title="Onboarding checklist" subtitle="Documents & Checklists progress" action={<ClipboardList className="h-4 w-4 text-slate-400" />}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {p.onboarding.map((o) => (
                <div key={o.label} className="flex items-center gap-2 text-sm">
                  {o.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                  <span className={o.done ? 'text-slate-600' : 'text-slate-400'}>{o.label}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Personal */}
      {tab === 'personal' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SectionCard title="Contact">
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> {p.contact.phone}
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate">{p.contact.workEmail}</span>
                  <span className="block truncate text-xs text-slate-400">{p.contact.personalEmail}</span>
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> {p.contact.address}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Personal">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Date of birth" value={p.personal.dob} />
              <Field label="Age" value={p.personal.age} />
              <Field label="Pronouns" value={p.personal.pronouns} />
              <Field label="Marital status" value={p.personal.marital} />
              <Field label="Dependents" value={p.personal.dependents} />
              <Field label="Languages" value={p.personal.languages.join(', ')} />
              <Field label="SSN" value={p.ssnMasked} />
            </div>
          </SectionCard>

          <SectionCard title="Time & attendance">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="PTO balance" value={`${p.attendance.pto} hrs`} />
              <Field label="Sick balance" value={`${p.attendance.sick} hrs`} />
              <Field label="Attendance points" value={p.attendance.points} />
              <Field label="Occurrences" value={p.attendance.occurrences} />
              <Field label="Last absence" value={p.attendance.lastAbsence} />
            </div>
            {p.attendance.perfect ? (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Perfect attendance so far
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" /> {p.attendance.occurrences} attendance occurrence(s)
              </div>
            )}
          </SectionCard>

          <SectionCard title="Emergency contact">
            <p className="text-sm font-medium text-slate-800">{p.emergency.name}</p>
            <p className="text-xs text-slate-500">{p.emergency.relation}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
              <Phone className="h-3.5 w-3.5 text-slate-400" /> {p.emergency.phone}
            </p>
          </SectionCard>

          <SectionCard title="Benefits" className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <Field label="Medical" value={p.benefits.medical} />
              <Field label="Dental" value={p.benefits.dental} />
              <Field label="Vision" value={p.benefits.vision} />
              <Field label="Retirement" value={p.benefits.retirement} />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
