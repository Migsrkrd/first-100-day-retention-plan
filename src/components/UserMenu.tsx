import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, ChevronsUpDown } from 'lucide-react'
import { Avatar } from '@/components/primitives'
import { SettingsDialog } from '@/components/SettingsDialog'
import { useScope } from '@/state/scope'
import { buildingShortName } from '@/hooks/useData'

export function UserMenu() {
  const { session, role, logout } = useScope()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  if (!session) return null

  const roleLabel = role === 'people-ops' ? 'People Admin' : 'Building Admin'
  const scopeLabel = role === 'people-ops' ? 'Portfolio' : buildingShortName(session.buildingId ?? '')

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/')
  }

  return (
    <div className="relative border-t border-white/10 p-3">
      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
      {open && (
        <div className="absolute bottom-full left-3 right-3 z-30 mb-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          <button
            onClick={() => {
              setOpen(false)
              setSettingsOpen(true)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Settings className="h-4 w-4 text-slate-400" /> Settings
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4 text-slate-400" /> Log out
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-white/5"
      >
        <Avatar name={session.name} size="sm" />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-white">{session.name}</p>
          <p className="truncate text-[11px] text-slate-400">
            {roleLabel} · {scopeLabel}
          </p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
