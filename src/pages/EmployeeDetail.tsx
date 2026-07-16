import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ProfileView } from '@/components/ProfileView'

// Deep-link fallback for /people/:id. Internal clicks use the slide-over drawer.
export function EmployeeDetail() {
  const { id } = useParams()
  return (
    <div>
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4" /> People
      </Link>
      <ProfileView id={id} />
    </div>
  )
}
