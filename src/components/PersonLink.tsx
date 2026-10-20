import { useProfilePanel } from '@/state/profilePanel'
import { cn } from '@/lib/utils'

// Clicking a name slides in their profile drawer (no route change). Falls back to
// plain text when there's no person record (anonymous/historical/staff names).
export function PersonLink({ id, name, className }: { id?: string | null; name: string; className?: string }) {
  const { open } = useProfilePanel()
  if (!id) return <span className={className}>{name}</span>
  return (
    <button type="button" onClick={() => open(id)} className={cn('text-left transition hover:text-blue-600 hover:underline', className)}>
      {name}
    </button>
  )
}
