import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HeartPulse, Lock, ArrowRight, Info, User, ChevronDown } from 'lucide-react'
import { useScope, type Persona } from '@/state/scope'
import { useBuildings, usePortfolioRow } from '@/hooks/useData'
import { cn } from '@/lib/utils'

export function Login() {
  const { login } = useScope()
  const navigate = useNavigate()
  const location = useLocation()
  const buildings = useBuildings().list()

  // Logged out on a deep link (e.g. /save-loop) — keep the URL honest.
  useEffect(() => {
    if (location.pathname !== '/') navigate('/', { replace: true })
  }, [location.pathname, navigate])
  const portfolio = usePortfolioRow()
  const [selectedId, setSelectedId] = useState('')

  const peopleAdmin: Persona = {
    id: 'people-admin',
    kind: 'people-ops',
    name: 'Alex Rivera',
    title: 'People Operations',
    buildingId: null,
  }
  const buildingAdmins: Persona[] = buildings.map((b) => ({
    id: `admin-${b.id}`,
    kind: 'building',
    name: b.administrator,
    title: 'Building Administrator',
    buildingId: b.id,
  }))
  const all = [peopleAdmin, ...buildingAdmins]
  const selected = all.find((p) => p.id === selectedId) ?? null

  function signIn() {
    if (!selected) return
    login(selected)
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1fr_1.1fr]">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white md:flex">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-indigo-400/20 blur-2xl" />
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <HeartPulse className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold leading-tight">
              First-100-Day
              <br />
              Retention Engine
            </h1>
            <p className="mt-2 max-w-xs text-sm text-blue-100">
              Catch the early signal. Make the save. Every new hire, every touchpoint — inside one login.
            </p>
          </div>
          <div className="relative mt-8 grid grid-cols-2 gap-3">
            {[
              { label: '90-day retention', value: `${portfolio?.survival90 ?? 71}%` },
              { label: 'Save closure', value: `${portfolio?.saveClosureRate ?? 74}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2.5 backdrop-blur">
                <p className="text-lg font-semibold">{s.value}</p>
                <p className="text-[11px] text-blue-100">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="relative mt-8 text-[11px] text-blue-200">Runs inside Paycom · one employee login</p>
        </div>

        {/* Sign-in form */}
        <div className="p-7 sm:p-9">
          <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
          <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-700">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Demo environment — this is an auto-login. Choose a persona below; no password required.</span>
          </div>

          {/* "Username" = persona dropdown, nothing pre-selected */}
          <div className="mt-5">
            <label htmlFor="persona" className="text-xs font-medium text-slate-500">
              Username · choose a persona
            </label>
            <div className="relative mt-2">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                id="persona"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className={cn(
                  'w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                  selectedId ? 'text-slate-800' : 'text-slate-400',
                )}
              >
                <option value="" disabled>
                  Select a persona…
                </option>
                <optgroup label="Portfolio">
                  <option value={peopleAdmin.id}>Alex Rivera — People Admin (all buildings)</option>
                </optgroup>
                <optgroup label="Building admins · locked to one facility">
                  {buildingAdmins.map((p) => {
                    const b = buildings.find((x) => x.id === p.buildingId)!
                    return (
                      <option key={p.id} value={p.id}>
                        {b.name} — {p.name}
                      </option>
                    )
                  })}
                </optgroup>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* "Password" — decorative, to complete the login look */}
          <div className="mt-4">
            <label className="text-xs font-medium text-slate-500">Password</label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Lock className="h-4 w-4 text-slate-300" />
              <input
                type="password"
                value="demo-access"
                readOnly
                disabled
                className="flex-1 bg-transparent text-sm tracking-widest text-slate-400 outline-none"
              />
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">demo</span>
            </div>
          </div>

          <button
            onClick={signIn}
            disabled={!selected}
            className={cn(
              'mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
              selected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'cursor-not-allowed bg-slate-100 text-slate-400',
            )}
          >
            {selected ? `Sign in as ${selected.name}` : 'Select a persona to continue'}
            {selected && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-4 text-center text-[11px] text-slate-400">
            You can switch personas anytime from the top bar.
          </p>
        </div>
      </div>
    </div>
  )
}
