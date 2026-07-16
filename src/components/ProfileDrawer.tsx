import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useProfilePanel } from '@/state/profilePanel'
import { ProfileView } from '@/components/ProfileView'
import { cn } from '@/lib/utils'

export function ProfileDrawer() {
  const { id, close } = useProfilePanel()
  const [shownId, setShownId] = useState<string | null>(null)
  const open = !!id

  // Retain the last id during the slide-out so content doesn't vanish mid-animation.
  useEffect(() => {
    if (id) setShownId(id)
  }, [id])

  // Esc to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <div className={cn('fixed inset-0 z-40', open ? '' : 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cn('absolute inset-0 bg-slate-900/30 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        onClick={close}
      />
      <div
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-[#f4f7fb] shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-semibold text-slate-800">Employee profile</span>
          <button
            onClick={close}
            title="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">{shownId && <ProfileView id={shownId} />}</div>
      </div>
    </div>
  )
}
