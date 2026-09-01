import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import AuthGate from '@/components/auth/AuthGate'
import Landing from '@/pages/Landing'
import Command from '@/pages/Command'
import MapView from '@/pages/MapView'
import Team from '@/pages/Team'
import Kit from '@/pages/Kit'
import Finances from '@/pages/Finances'
import Logistics from '@/pages/Logistics'
import Emergency from '@/pages/Emergency'
import Rafting from '@/pages/Rafting'
import Boats from '@/pages/Boats'

export default function App() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route element={<AuthGate><AppShell /></AuthGate>}>
        <Route path="command" element={<Command />} />
        <Route path="map" element={<MapView />} />
        <Route path="team" element={<Team />} />
        <Route path="boats" element={<Boats />} />
        <Route path="gear" element={<Kit />} />
        <Route path="finances" element={<Finances />} />
        <Route path="logistics" element={<Logistics />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="rafting" element={<Rafting />} />
      </Route>
    </Routes>
  )
}
