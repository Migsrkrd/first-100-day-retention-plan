import { useState, useEffect } from 'react'
import { ThumbsUp, Clock, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { NewHire } from '@/types'

export type Outcome = 'saved' | 'atrisk' | 'lost'

const OUTCOMES: { key: Outcome; label: string; help: string; icon: typeof ThumbsUp; on: string }[] = [
  { key: 'saved', label: 'Retained', help: 'Addressed — staying', icon: ThumbsUp, on: 'data-[on=true]:border-emerald-400 data-[on=true]:bg-emerald-50 data-[on=true]:text-emerald-700' },
  { key: 'atrisk', label: 'Still at-risk', help: 'Talked — keep on it', icon: Clock, on: 'data-[on=true]:border-amber-400 data-[on=true]:bg-amber-50 data-[on=true]:text-amber-700' },
  { key: 'lost', label: 'Departing', help: 'Leaving — capture why', icon: XCircle, on: 'data-[on=true]:border-slate-400 data-[on=true]:bg-slate-100 data-[on=true]:text-slate-700' },
]

export function LogStayDialog({
  person,
  onOpenChange,
  onSubmit,
}: {
  person: NewHire | null
  onOpenChange: (o: boolean) => void
  onSubmit: (h: NewHire, outcome: Outcome, note: string) => void
}) {
  const [outcome, setOutcome] = useState<Outcome>('saved')
  const [note, setNote] = useState('')
  useEffect(() => {
    if (person) {
      setOutcome('saved')
      setNote('')
    }
  }, [person])
  if (!person) return null
  return (
    <Dialog open={!!person} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log stay conversation</DialogTitle>
          <DialogDescription>
            {person.name} · {person.role} — closes the loop and records the touch
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label className="text-xs text-slate-500">Outcome</Label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.key}
                type="button"
                data-on={outcome === o.key}
                onClick={() => setOutcome(o.key)}
                className={cn('flex flex-col items-center gap-1 rounded-lg border border-slate-200 px-2 py-3 text-center transition hover:border-slate-300', o.on)}
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
            placeholder="e.g. Moved to a fixed AM rotation; recheck at 60-day."
            className="mt-1.5 min-h-20"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(person, outcome, note)}>{outcome === 'atrisk' ? 'Log & keep open' : 'Log & close the loop'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
