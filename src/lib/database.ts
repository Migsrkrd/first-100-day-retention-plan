import { useSyncExternalStore } from 'react'
import seed from '../../database/seed.json'

export type Row = { id: string } & Record<string, unknown>
type Tables = Record<string, Row[]>

const STORAGE_KEY = 'clarity-app-db'

function cloneSeed(): Tables {
  return structuredClone(seed) as Tables
}

function readStored(): Tables | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Tables
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function loadInitial(): Tables {
  if (typeof window === 'undefined') return cloneSeed()
  return readStored() ?? cloneSeed()
}

let state: Tables = loadInitial()
const listeners = new Set<() => void>()

function emit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function nextId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function tableApi<T extends { id: string }>(tableName: string) {
  const rows = () => (state[tableName] ?? []) as T[]

  return {
    list(predicate?: (row: T) => boolean): T[] {
      const all = rows()
      return predicate ? all.filter(predicate) : [...all]
    },
    get(id: string): T | undefined {
      return rows().find((r) => r.id === id)
    },
    create(partial: Partial<T> & Record<string, unknown>): T {
      const id = (typeof partial.id === 'string' && partial.id) || nextId()
      const row = { ...partial, id } as T
      state = {
        ...state,
        [tableName]: [...(state[tableName] ?? []), row as Row],
      }
      emit()
      return row
    },
    update(id: string, patch: Partial<T>): T | undefined {
      const current = rows()
      let updated: T | undefined
      const next = current.map((r) => {
        if (r.id !== id) return r
        updated = { ...r, ...patch, id }
        return updated
      })
      if (!updated) return undefined
      state = { ...state, [tableName]: next as Row[] }
      emit()
      return updated
    },
    remove(id: string): boolean {
      const current = rows()
      const next = current.filter((r) => r.id !== id)
      if (next.length === current.length) return false
      state = { ...state, [tableName]: next as Row[] }
      emit()
      return true
    },
  }
}

/** Imperative, non-reactive access for helpers. */
export const db = {
  table<T extends { id: string }>(tableName: string) {
    return tableApi<T>(tableName)
  },
  reset() {
    state = cloneSeed()
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    emit()
  },
}

/** Reactive table hook — re-renders on create/update/remove. */
export function useTable<T extends { id: string }>(tableName: string) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  // Touch snapshot so React tracks the store version; tableApi reads live state.
  void snapshot
  return tableApi<T>(tableName)
}
