import { useState } from 'react'
import { RotateCcw, Search, Award, AlertTriangle } from 'lucide-react'
import { PageHeader, SectionCard } from '@/components/primitives'
import { Button } from '@/components/ui/button'
import { useRoiRow } from '@/hooks/useData'
import { fmtUsd, fmtNum } from '@/utils/format'
import { cn } from '@/lib/utils'

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
      />
    </div>
  )
}

export function Roi() {
  const roi = useRoiRow()
  const [exits, setExits] = useState(roi?.earlyExitsPerYear ?? 214)
  const [cost, setCost] = useState(roi?.costPerReplacement ?? 4500)
  const [reduction, setReduction] = useState(roi?.reductionTargetPct ?? 20)
  const investment = roi?.yearOneInvestment ?? 24000
  const downsidePct = roi?.downsidePct ?? 5

  const annualCost = exits * cost
  const savings = annualCost * (reduction / 100)
  const downside = annualCost * (downsidePct / 100)
  const bcr = savings / investment
  const paybackMonths = savings > 0 ? investment / (savings / 12) : 0

  const reset = () => {
    setExits(roi?.earlyExitsPerYear ?? 214)
    setCost(roi?.costPerReplacement ?? 4500)
    setReduction(roi?.reductionTargetPct ?? 20)
  }

  const maxBar = Math.max(annualCost, savings, investment)
  const bar = (v: number) => `${Math.max(2, (v / maxBar) * 100)}%`

  return (
    <div>
      <PageHeader
        title="ROI Model"
        subtitle="Near-zero incremental cost against cost-avoidance — the case doesn't depend on a large retention lift."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Inputs */}
        <SectionCard
          title="Assumptions"
          subtitle="Adjust to your portfolio"
          action={
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          }
          className="lg:col-span-1"
        >
          <div className="space-y-5">
            <Slider label="First-100-day exits / year" value={exits} min={50} max={400} step={2} onChange={setExits} format={(v) => fmtNum(v)} />
            <Slider label="Cost per replacement" value={cost} min={3000} max={6000} step={100} onChange={setCost} format={(v) => fmtUsd(v)} />
            <Slider label="Targeted reduction" value={reduction} min={0} max={40} step={1} onChange={setReduction} format={(v) => `${v}%`} />
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              Year-1 investment held at <span className="font-medium text-slate-700">{fmtUsd(investment)}</span> — mostly
              configuration time; the engine runs on tooling already owned.
            </div>
          </div>
        </SectionCard>

        {/* Outputs */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Annual turnover cost</p>
              <p className="mt-1 text-2xl font-semibold text-red-600">{fmtUsd(annualCost, true)}</p>
              <p className="text-[11px] text-slate-400">first-100-day exits</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Value of {reduction}% cut</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{fmtUsd(savings, true)}</p>
              <p className="text-[11px] text-emerald-600/70">annual cost avoided</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Downside ({downsidePct}%)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-700">{fmtUsd(downside, true)}</p>
              <p className="text-[11px] text-slate-400">still clears investment</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Year-1 investment</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{fmtUsd(investment, true)}</p>
              <p className="text-[11px] text-slate-400">no new software</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Benefit : cost</p>
              <p className="mt-1 text-2xl font-semibold text-blue-700">{bcr.toFixed(1)}×</p>
              <p className="text-[11px] text-blue-600/70">at target reduction</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Payback</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{paybackMonths.toFixed(1)} mo</p>
              <p className="text-[11px] text-slate-400">to recover year-1 cost</p>
            </div>
          </div>

          <SectionCard title="Cost avoided vs. invested">
            <div className="space-y-3">
              {[
                { label: 'Annual turnover cost', value: annualCost, color: 'bg-red-400' },
                { label: `Savings at ${reduction}% reduction`, value: savings, color: 'bg-emerald-500' },
                { label: 'Year-1 investment', value: investment, color: 'bg-slate-400' },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="font-medium text-slate-500">{fmtUsd(r.value)}</span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', r.color)} style={{ width: bar(r.value) }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Dividends + caveat */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Search className="mt-0.5 h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800">The diagnosis dividend</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Closing the 39% “no reason” gap means next year’s decisions run on real causes, not estimates.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Award className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800">The quality dividend</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Lower turnover correlates with fewer citations and better inspections — protecting star ratings and census.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">The honest caveat:</span> the engine doesn’t retain anyone by itself. It’s the
          early-warning and routing layer — the stay conversation and the fixes behind it (schedule, supervisor support,
          pay) do the retaining. Sold as the nervous system of a retention program, the numbers hold up under scrutiny.
        </p>
      </div>
    </div>
  )
}
