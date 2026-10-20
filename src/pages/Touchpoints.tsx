import { PageHeader, SectionCard, Pill, Dot } from '@/components/primitives'
import { useTouchpointTypes, useActivity, buildingShortName } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { jobBadge, jobDot, type Job } from '@/utils/ui'
import { fmtDate } from '@/utils/date'

const JOBS: { job: Job; blurb: string }[] = [
  { job: 'Celebrate', blurb: 'Recognize the moments that build belonging. Fully automated.' },
  { job: 'Listen', blurb: 'Surface friction while the person is still winnable.' },
  { job: 'Intervene', blurb: 'Route a flat/negative early survey to a stay conversation.' },
  { job: 'Acknowledge', blurb: 'Thank positive feedback and prove change with You Said, We Did.' },
]

// Where the scheduled touchpoints land across the first 100 days.
const CELEBRATE_MARKS = [
  { day: 1, label: 'Welcome' },
  { day: 30, label: '30d' },
  { day: 60, label: '60d' },
  { day: 90, label: '90d' },
  { day: 100, label: '100d' },
]
const LISTEN_MARKS = [
  { day: 15, label: '15d' },
  { day: 30, label: '30d' },
  { day: 60, label: '60d' },
  { day: 90, label: '90d' },
]

function JourneyStrip() {
  return (
    <div className="px-2 py-6">
      {/* Celebrate lane (above) */}
      <div className="relative mb-2 h-6">
        {CELEBRATE_MARKS.map((m) => (
          <div key={m.day} className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${m.day}%` }}>
            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
              {m.label}
            </span>
            <span className="mt-0.5 h-2 w-px bg-violet-300" />
          </div>
        ))}
      </div>
      {/* Axis */}
      <div className="relative h-1 rounded-full bg-gradient-to-r from-blue-400 via-blue-500 to-emerald-400">
        {[0, 25, 50, 75, 100].map((d) => (
          <span key={d} className="absolute top-2 -translate-x-1/2 text-[10px] text-slate-400" style={{ left: `${d}%` }}>
            day {d}
          </span>
        ))}
      </div>
      {/* Listen lane (below) */}
      <div className="relative mt-7 h-6">
        {LISTEN_MARKS.map((m) => (
          <div key={m.day} className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${m.day}%` }}>
            <span className="mb-0.5 h-2 w-px bg-blue-300" />
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
              {m.label} survey
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-5 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><Dot className="bg-violet-500" /> Celebrate</span>
        <span className="flex items-center gap-1.5"><Dot className="bg-blue-500" /> Listen</span>
      </div>
    </div>
  )
}

export function Touchpoints() {
  const types = useTouchpointTypes().list()
  const { inScope, scopedBuildingId } = useScope()
  const activity = useActivity().list().filter((a) => inScope(a.buildingId))

  return (
    <div>
      <PageHeader
        title="Touchpoint Engine"
        subtitle="Every lifecycle moment sorted into one of four jobs — sorting the wrong moment into the wrong job is how this backfires, so the sorting is the strategy."
      />

      <SectionCard title="The first 100 days" subtitle="When each scheduled touchpoint fires" className="mb-4">
        <JourneyStrip />
      </SectionCard>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {JOBS.map(({ job, blurb }) => {
          const jobTypes = types.filter((t) => t.job === job)
          return (
            <div key={job} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
                <Dot className={jobDot(job)} />
                <span className="text-sm font-semibold text-slate-800">{job}</span>
                <span className="ml-auto text-[11px] text-slate-400">{jobTypes.length}</span>
              </div>
              <div className="p-3">
                <p className="mb-3 text-[11px] leading-snug text-slate-500">{blurb}</p>
                <div className="space-y-2.5">
                  {jobTypes.map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                      <p className="text-xs font-semibold text-slate-800">{t.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{t.description}</p>
                      <div className="mt-2">
                        <Pill className={jobBadge(job)}>{t.timing}</Pill>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <SectionCard title="Recent engine activity" subtitle="Automated touchpoints firing across the portfolio">
        <div className="space-y-2.5">
          {activity.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <span className="mt-1.5"><Dot className={jobDot(a.job)} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-700">
                  <span className="font-medium">{a.employeeName}</span> · {a.type}
                  {!scopedBuildingId && <span className="text-slate-400"> · {buildingShortName(a.buildingId)}</span>}
                </p>
                <p className="text-[11px] text-slate-400">{a.detail}</p>
              </div>
              <Pill className={jobBadge(a.job)}>{a.job}</Pill>
              <span className="whitespace-nowrap text-[11px] text-slate-300">{fmtDate(a.date)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
