import { Info } from 'lucide-react'
import { PageHeader, SectionCard, Pill, Dot } from '@/components/primitives'
import { useTouchpointTypes, useActivity, usePaycomBuild, buildingShortName } from '@/hooks/useData'
import { useScope } from '@/state/scope'
import { jobBadge, jobDot, type Job } from '@/utils/ui'
import { fmtDate } from '@/utils/date'
import { cn } from '@/lib/utils'

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
  const paycomBuild = usePaycomBuild().list()
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
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Pill className={jobBadge(job)}>{t.timing}</Pill>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                            t.confirm === 'Auto now'
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                              : 'bg-amber-50 text-amber-700 ring-amber-600/20',
                          )}
                        >
                          {t.confirm}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* The build — what lives where in Paycom */}
      <SectionCard
        title="The build — what lives where in Paycom"
        subtitle="The engine consolidates into Paycom, retiring the separate feedback tool"
        className="mb-4"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-medium">Touchpoint</th>
                <th className="px-4 py-2.5 font-medium">How it lives in Paycom</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">What to confirm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paycomBuild.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.touchpoint}</td>
                  <td className="px-4 py-3 text-slate-600">{r.livesIn}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                        r.status === 'Auto now'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : r.status === 'Confirm setup'
                            ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                            : 'bg-slate-100 text-slate-600 ring-slate-500/20',
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.confirm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">One open question gates the Celebrate layer:</span> confirm with the Paycom rep
          that it can auto-send a message on each person’s individual date and trigger anniversary surveys off each hire
          date. If yes, the amber touchpoints are flip-a-switch; if no, a monthly date report feeds a building-leader
          action list — either way the separate tool is retired.
        </p>
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
