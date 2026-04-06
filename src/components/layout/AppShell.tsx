import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'

const navItems = [
  { to: '/command', label: 'Timeline', icon: 'explore' },
  { to: '/map', label: 'Waypoints', icon: 'map' },
  { to: '/team', label: 'Team', icon: 'groups' },
  { to: '/gear', label: 'Gear', icon: 'inventory_2' },
  { to: '/finances', label: 'Finances', icon: 'payments' },
  { to: '/logistics', label: 'Logistics', icon: 'local_shipping' },
  { to: '/emergency', label: 'Safety', icon: 'emergency' },
]

export default function AppShell() {
  const location = useLocation()
  const isMapView = location.pathname === '/map'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex-shrink-0 bg-surface-container-lowest border-b border-outline-variant/20 z-30">
        <div className="flex items-center justify-between px-4 md:px-6 h-12">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden flex items-center justify-center w-8 h-8 text-on-surface-variant hover:text-on-surface transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="material-symbols-outlined text-xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            <h1 className="font-display text-sm font-bold text-primary tracking-wider uppercase">
              GKC <span className="text-outline">|</span> GC-2027
            </h1>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0">
              <div className="h-4 w-px bg-outline-variant/30 mr-2" />
              <nav className="flex items-center">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `nav-tab ${isActive ? 'nav-tab-active' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="material-symbols-outlined text-lg">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden bg-surface-container-lowest border-t border-outline-variant/20 px-2 py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 transition-colors ${
                    isActive
                      ? 'bg-surface-container-high text-primary'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                  }`
                }
              >
                <span className="material-symbols-outlined text-base">{item.icon}</span>
                <span className="font-label text-xs uppercase tracking-widest">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden ${isMapView ? '' : 'overflow-y-auto'}`}>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex-shrink-0 bg-surface-container-lowest border-t border-outline-variant/20 flex items-center justify-around py-1">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 min-w-0 ${
                isActive ? 'text-tertiary' : 'text-on-surface-variant'
              }`
            }
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
            <span className="font-label text-[8px] uppercase tracking-wider truncate">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-on-surface-variant"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_horiz</span>
          <span className="font-label text-[8px] uppercase tracking-wider">More</span>
        </button>
      </nav>

      {/* Desktop footer */}
      <footer className="hidden md:flex flex-shrink-0 bg-surface-container-lowest px-6 py-2 items-center justify-between border-t border-outline-variant/20">
        <span className="tactical-label">GKC Grand Canyon Expedition Planner</span>
      </footer>
    </div>
  )
}
