import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ScopeProvider, useScope } from '@/state/scope'
import { ProfilePanelProvider } from '@/state/profilePanel'
import { Login } from '@/components/Login'
import { Layout } from '@/components/Layout'
import { People } from '@/pages/People'
import { Dashboard } from '@/pages/Dashboard'
import { Rules } from '@/pages/Rules'
import { Overview } from '@/pages/Overview'
import { Celebrate } from '@/pages/Celebrate'
import { EmployeeDetail } from '@/pages/EmployeeDetail'
import { Touchpoints } from '@/pages/Touchpoints'
import { Listening } from '@/pages/Listening'
import { Roi } from '@/pages/Roi'
import { SafetyRails } from '@/pages/SafetyRails'
import { Program } from '@/pages/Program'

function AppInner() {
  const { session } = useScope()
  if (!session) return <Login />
  return (
    <ProfilePanelProvider>
      <Layout>
      <Routes>
        <Route path="/" element={<People />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/people/:id" element={<EmployeeDetail />} />
        <Route path="/pulse" element={<Overview />} />
        <Route path="/celebrate" element={<Celebrate />} />
        <Route path="/touchpoints" element={<Touchpoints />} />
        <Route path="/listening" element={<Listening />} />
        <Route path="/roi" element={<Roi />} />
        <Route path="/safety" element={<SafetyRails />} />
        <Route path="/program" element={<Program />} />
      </Routes>
    </Layout>
    </ProfilePanelProvider>
  )
}

// index.html is platform-owned in Preview, so set the favicon at runtime instead
// of editing the document head file. A brand-matching heart on a blue tile.
function useFavicon() {
  useEffect(() => {
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
      "<rect width='32' height='32' rx='7' fill='#2563eb'/>" +
      "<path d='M16 25s-7-4.6-7-9.6A4.4 4.4 0 0 1 16 12a4.4 4.4 0 0 1 7 3.4c0 5-7 9.6-7 9.6z' fill='#fff'/>" +
      '</svg>'
    const href = `data:image/svg+xml,${encodeURIComponent(svg)}`
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.type = 'image/svg+xml'
    link.href = href
  }, [])
}

export default function App() {
  useFavicon()
  return (
    <ScopeProvider>
      <AppInner />
    </ScopeProvider>
  )
}
