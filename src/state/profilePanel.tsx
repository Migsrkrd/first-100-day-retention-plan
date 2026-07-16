import { createContext, useContext, useState, type ReactNode } from 'react'

interface ProfilePanelValue {
  id: string | null
  open: (id: string) => void
  close: () => void
}

const Ctx = createContext<ProfilePanelValue | null>(null)

export function ProfilePanelProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null)
  return <Ctx.Provider value={{ id, open: setId, close: () => setId(null) }}>{children}</Ctx.Provider>
}

export function useProfilePanel(): ProfilePanelValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProfilePanel must be used within ProfilePanelProvider')
  return ctx
}
