import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Save } from '@/types'

export type Outcome = 'saved' | 'at-risk' | 'lost'

const OPTIONS: { key: Outcome; label: string; help: string; icon: typeof CheckCircle2; classes: string }[] = [
  { key: 'saved', label: 'Retained', help: 'Concern addressed — staying', icon: CheckCircle2, classes: 'data-[on=true]:border-emerald-400 data-[on=true]:bg-emerald-50 data-[on=true]:text-emerald-700' },
  { key: 'at-risk', label: 'Still at risk', help: 'Talked — keep the loop open', icon: Clock, classes: 'data-[on=true]:border-amber-400 data-[on=true]:bg-amber-50 data-[on=true]:text-amber-700' },
  { key: 'lost', label: 'Lost', help: 'Departing — capture the reason', icon: XCircle, classes: 'data-[on=true]:border-slate-400 data-[on=true]:bg-slate-100 data-[on=true]:text-slate-700' },
]

export function LogConversationDialog({
  save,
  open,
  onOpenChange,
  onSubmit,
}: {
  save: Save | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (outcome: Outcome, note: string) => void
}) {
  const [outcome, setOutcome] = useState<Outcome>('saved')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setOutcome('saved')
      setNote('')
    }
  }, [open, save?.id])

  if (!save) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log stay conversation</DialogTitle>
          <DialogDescription>
            {save.name} · {save.role} · day {save.dayInTenure} — triggered by {save.triggerType} ({save.theme})
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm italic text-slate-600">
          “{save.quote}”
        </div>

        <div>
          <Label className="text-xs text-slate-500">Outcome</Label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                data-on={outcome === o.key}
                onClick={() => setOutcome(o.key)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border border-slate-200 px-2 py-3 text-center transition hover:border-slate-300',
                  o.classes,
                )}
              >
                <o.icon className="h-5 w-5" />
                <span className="text-xs font-semibold">{o.label}</span>
                <span className="text-[10px] leading-tight text-slate-400">{o.help}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="note" className="text-xs text-slate-500">
            What was agreed / captured
          </Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Moved to fixed AM rotation with two guaranteed weekends off; will recheck at 60-day."
            className="mt-1.5 min-h-24"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(outcome, note)}>
            {outcome === 'at-risk' ? 'Save note, keep open' : 'Close the loop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
