import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_WEIGHTS, type ScoreWeights, type SignalKey } from '@/utils/score'

export type Role = 'people-ops' | 'building'

/** A demo persona you "log in" as from the pseudo-login screen. */
export interface Persona {
  id: string
  kind: Role
  name: string
  title: string
  /** Fixed building for a Building Admin; null for the portfolio-wide People Admin. */
  buildingId: string | null
}

interface ScopeValue {
  session: Persona | null
  role: Role
  /** null → portfolio (all buildings); else the focused building id. */
  scopedBuildingId: string | null
  /** People Admin's optional facility filter (ignored for Building Admins). */
  focusBuildingId: string | null
  /** Early-tenure window in days — the roster shows hires within this range. */
  windowDays: number
  /** Retention-score signal weights (tunable in Settings). */
  scoreWeights: ScoreWeights
  login: (p: Persona) => void
  logout: () => void
  setFocusBuilding: (id: string | null) => void
  setWindowDays: (n: number) => void
  setScoreWeight: (key: SignalKey, value: number) => void
  resetScoreWeights: () => void
  /** True when a building's data belongs in the current view. */
  inScope: (buildingId: string) => boolean
}

const ScopeContext = createContext<ScopeValue | null>(null)

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Persona | null>(null)
  const [focusBuildingId, setFocusBuildingId] = useState<string | null>(null)
  const [windowDays, setWindowDays] = useState(100)
  const [scoreWeights, setScoreWeights] = useState<ScoreWeights>({ ...DEFAULT_WEIGHTS })

  const value = useMemo<ScopeValue>(() => {
    const role: Role = session?.kind ?? 'people-ops'
    // Building Admins are pinned to their building; People Admin may focus one.
    const scopedBuildingId = session?.kind === 'building' ? session.buildingId : focusBuildingId
    return {
      session,
      role,
      focusBuildingId,
      scopedBuildingId,
      windowDays,
      scoreWeights,
      login: (p) => {
        setSession(p)
        setFocusBuildingId(null)
      },
      logout: () => {
        setSession(null)
        setFocusBuildingId(null)
      },
      setFocusBuilding: (id) => setFocusBuildingId(id),
      setWindowDays,
      setScoreWeight: (key, val) => setScoreWeights((w) => ({ ...w, [key]: val })),
      resetScoreWeights: () => setScoreWeights({ ...DEFAULT_WEIGHTS }),
      inScope: (bId) => (scopedBuildingId ? bId === scopedBuildingId : true),
    }
  }, [session, focusBuildingId, windowDays, scoreWeights])

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

export function useScope(): ScopeValue {
  const ctx = useContext(ScopeContext)
  if (!ctx) throw new Error('useScope must be used within ScopeProvider')
  return ctx
}
