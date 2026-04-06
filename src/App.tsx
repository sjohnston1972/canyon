import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Landing from '@/pages/Landing'
import Command from '@/pages/Command'
import MapView from '@/pages/MapView'
import Team from '@/pages/Team'
import Kit from '@/pages/Kit'
import Finances from '@/pages/Finances'
import Logistics from '@/pages/Logistics'
import Emergency from '@/pages/Emergency'

export default function App() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route element={<AppShell />}>
        <Route path="command" element={<Command />} />
        <Route path="map" element={<MapView />} />
        <Route path="team" element={<Team />} />
        <Route path="gear" element={<Kit />} />
        <Route path="finances" element={<Finances />} />
        <Route path="logistics" element={<Logistics />} />
        <Route path="emergency" element={<Emergency />} />
      </Route>
    </Routes>
  )
}
