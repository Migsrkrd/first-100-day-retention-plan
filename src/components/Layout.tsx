import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Users,
  HeartHandshake,
  HeartPulse,
  PartyPopper,
  Activity,
  Sparkles,
  MessageSquare,
  Calculator,
  ShieldCheck,
  Map,
  Building2,
  Network,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/UserMenu'
import { ProfileDrawer } from '@/components/ProfileDrawer'
import { useScope } from '@/state/scope'
import { useBuildings, useNewHires, useSurveys, useSaves } from '@/hooks/useData'
import { buildScore, NEEDS_ATTENTION } from '@/utils/score'
import { TODAY, tenureDays } from '@/utils/date'

const NAV = [
  { to: '/', label: 'People', icon: Users, end: true },
  { to: '/save-loop', label: 'Needs attention', icon: HeartHandshake, hero: true },
  { to: '/celebrate', label: 'Celebrate', icon: PartyPopper },
  { to: '/pulse', label: 'Pulse', icon: Activity },
  { to: '/touchpoints', label: 'Touchpoint Engine', icon: Sparkles },
  { to: '/listening', label: 'Listening', icon: MessageSquare },
  { to: '/roi', label: 'ROI Model', icon: Calculator },
  { to: '/safety', label: 'Safety Rails', icon: ShieldCheck },
  { to: '/program', label: 'Program', icon: Map },
]

function SaveBadge() {
  const { inScope, windowDays, scoreWeights } = useScope()
  const hires = useNewHires().list()
  const surveys = useSurveys().list()
  const saves = useSaves().list()
  const count = hires
    .filter((h) => h.status === 'active' && inScope(h.buildingId) && tenureDays(h.hireDate) <= windowDays)
    .filter(
      (h) =>
        buildScore(
          h,
          surveys.filter((s) => s.employeeId === h.id),
          saves.filter((s) => s.employeeId === h.id),
          scoreWeights,
        ).score < NEEDS_ATTENTION,
    ).length
  if (!count) return null
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
      {count}
    </span>
  )
}

// People Admin's facility filter; Building Admins are pinned, so this hides for them.
function FacilityFilter() {
  const { role, focusBuildingId, setFocusBuilding } = useScope()
  const buildings = useBuildings().list()
  if (role !== 'people-ops') return null
  return (
    <div className="relative">
      <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <select
        value={focusBuildingId ?? ''}
        onChange={(e) => setFocusBuilding(e.target.value || null)}
        title="Filter to a facility"
        className="rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        <option value="">All buildings</option>
        {buildings.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { scopedBuildingId } = useScope()
  const buildings = useBuildings().list()
  const asOf = TODAY.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // Single source of truth for "what am I looking at" — drives the header title.
  const scopedBuilding = scopedBuildingId ? buildings.find((b) => b.id === scopedBuildingId) : null
  const title = scopedBuilding ? scopedBuilding.name : 'Copper Hills Care Portfolio'
  const subtitle = scopedBuilding
    ? `${scopedBuilding.city}, ${scopedBuilding.state} · as of ${asOf}`
    : `All ${buildings.length} buildings · as of ${asOf}`
  const ScopeIcon = scopedBuilding ? Building2 : Network

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fb] text-slate-800">
      {/* Fixed sidebar */}
      <aside className="hidden h-full w-60 shrink-0 flex-col bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Retention Engine</p>
            <p className="text-[11px] text-slate-400">First 100 Days</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 scrollbar-thin">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-blue-500/15 text-white ring-1 ring-inset ring-blue-400/30'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.hero && <SaveBadge />}
            </NavLink>
          ))}
        </nav>
        <UserMenu />
      </aside>

      {/* Main column — the only scrolling region */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700">
              <ScopeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
              <p className="truncate text-[11px] text-slate-400">{subtitle} · demo data</p>
            </div>
          </div>
          <FacilityFilter />
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-6xl px-5 py-6">{children}</div>
        </main>
      </div>

      <ProfileDrawer />
    </div>
  )
}
