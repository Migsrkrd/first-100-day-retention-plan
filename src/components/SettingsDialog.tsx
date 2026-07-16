import { useState, type ReactNode } from 'react'
import { Bell, SlidersHorizontal, Monitor, CalendarRange, Gauge, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useScope } from '@/state/scope'
import { SIGNAL_LABEL, SIGNAL_ASK, type SignalKey } from '@/utils/score'
import { resetDemo } from '@/utils/reset'
import { cn } from '@/lib/utils'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-blue-600' : 'bg-slate-200')}
    >
      <span
        className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-4' : 'left-0.5')}
      />
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

function Group({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="mt-1.5 divide-y divide-slate-50 rounded-lg border border-slate-100">{children}</div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-slate-700">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

const WINDOW_OPTIONS: Record<string, number> = { '60 days': 60, '90 days': 90, '100 days': 100, '120 days': 120 }

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { session, role, windowDays, setWindowDays, scoreWeights, setScoreWeight, resetScoreWeights } = useScope()
  const weightTotal = (Object.keys(scoreWeights) as SignalKey[]).reduce((n, k) => n + scoreWeights[k], 0) || 1
  const [windowLabel, setWindowLabel] = useState(`${windowDays} days`)
  const [saveAlerts, setSaveAlerts] = useState(true)
  const [digest, setDigest] = useState(role === 'people-ops')
  const [anonAlerts, setAnonAlerts] = useState(true)
  const [channel, setChannel] = useState('Email')
  const [sensitivity, setSensitivity] = useState('Flat & negative')
  const [sla, setSla] = useState('24 hours')
  const [density, setDensity] = useState('Comfortable')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            {session?.name} · {role === 'people-ops' ? 'People Admin' : 'Building Admin'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Group icon={CalendarRange} title="Early-tenure window">
            <Row label="Roster range" hint="How many days of tenure count as 'early-tenure'">
              <Picker value={windowLabel} onChange={setWindowLabel} options={Object.keys(WINDOW_OPTIONS)} />
            </Row>
          </Group>

          <Group icon={Bell} title="Notifications">
            <Row label="Save-alert notifications" hint="When an at-risk survey comes in">
              <Toggle checked={saveAlerts} onChange={setSaveAlerts} />
            </Row>
            <Row label="Daily digest" hint="Morning summary of open saves">
              <Toggle checked={digest} onChange={setDigest} />
            </Row>
            <Row label="Sensitive-item alerts" hint="Compliance-routed feedback">
              <Toggle checked={anonAlerts} onChange={setAnonAlerts} />
            </Row>
            <Row label="Delivery channel">
              <Picker value={channel} onChange={setChannel} options={['Email', 'SMS', 'Paycom inbox']} />
            </Row>
          </Group>

          <Group icon={SlidersHorizontal} title="Save Loop">
            <Row label="Alert sensitivity" hint="Which survey results trigger a save">
              <Picker value={sensitivity} onChange={setSensitivity} options={['Flat & negative', 'Negative only']} />
            </Row>
            <Row label="Escalation SLA" hint="Age before it escalates to the administrator">
              <Picker value={sla} onChange={setSla} options={['12 hours', '24 hours', '48 hours']} />
            </Row>
          </Group>

          <Group icon={Gauge} title="Retention score weights">
            {(Object.keys(SIGNAL_LABEL) as SignalKey[]).map((key) => (
              <div key={key} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{SIGNAL_LABEL[key]}</p>
                    <p className="text-[11px] text-slate-400">{SIGNAL_ASK[key]}</p>
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
                    {Math.round((scoreWeights[key] / weightTotal) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={Math.round(scoreWeights[key] * 100)}
                  onChange={(e) => setScoreWeight(key, Number(e.target.value) / 100)}
                  className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
                />
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[11px] text-slate-400">Shown as share of total · applies live</span>
              <button
                onClick={resetScoreWeights}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
          </Group>

          <Group icon={Monitor} title="Display">
            <Row label="Density">
              <Picker value={density} onChange={setDensity} options={['Comfortable', 'Compact']} />
            </Row>
          </Group>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              if (window.confirm('Reset all demo data to the original seed? This clears logged conversations, notes, and any settings changes.')) {
                resetDemo()
              }
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset demo data
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setWindowDays(WINDOW_OPTIONS[windowLabel] ?? 100)
              onOpenChange(false)
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
