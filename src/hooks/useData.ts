import { useTable, db } from '@/lib/database'
import type {
  Portfolio,
  Building,
  NewHire,
  Tenured,
  Survey,
  Save,
  TouchpointType,
  Activity,
  AskHere,
  YouSaidWeDid,
  Termination,
  Trend,
  SurvivalPoint,
  Roi,
  PaycomBuildRow,
  RolloutPhase,
  RoleRow,
  Ask,
  Comment,
  Interaction,
} from '@/types'

export const usePortfolio = () => useTable<Portfolio>('portfolio')
export const useBuildings = () => useTable<Building>('buildings')
export const useNewHires = () => useTable<NewHire>('newHires')
export const useTenured = () => useTable<Tenured>('tenured')
export const useSurveys = () => useTable<Survey>('surveys')
export const useSaves = () => useTable<Save>('saves')
export const useTouchpointTypes = () => useTable<TouchpointType>('touchpointTypes')
export const useActivity = () => useTable<Activity>('activity')
export const useAskHere = () => useTable<AskHere>('askHere')
export const useYouSaidWeDid = () => useTable<YouSaidWeDid>('youSaidWeDid')
export const useTerminations = () => useTable<Termination>('terminations')
export const useTrends = () => useTable<Trend>('trends')
export const useSurvivalCurve = () => useTable<SurvivalPoint>('survivalCurve')
export const useRoi = () => useTable<Roi>('roi')
export const usePaycomBuild = () => useTable<PaycomBuildRow>('paycomBuild')
export const useRollout = () => useTable<RolloutPhase>('rollout')
export const useRoles = () => useTable<RoleRow>('roles')
export const useAsks = () => useTable<Ask>('asks')
export const useComments = () => useTable<Comment>('comments')
export const useInteractions = () => useTable<Interaction>('interactions')

// The single portfolio row — every screen reads the same headline stats.
export function usePortfolioRow(): Portfolio | undefined {
  return usePortfolio().list()[0]
}

export function useRoiRow(): Roi | undefined {
  return useRoi().list()[0]
}

// Non-reactive lookups for helpers that just need a name.
export function buildingName(id: string): string {
  if (id === 'portfolio') return 'Entire portfolio'
  return db.table<Building>('buildings').get(id)?.name ?? 'Unknown building'
}

export function buildingShortName(id: string): string {
  return buildingName(id).replace(/ (Health & Rehab|Post-Acute|Care Center|Skilled Nursing)$/, '')
}
