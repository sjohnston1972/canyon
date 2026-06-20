import { useState } from 'react'
import PersonalKit from '@/components/kit/PersonalKit'
import ExpeditionGear from '@/components/kit/ExpeditionGear'

type Tab = 'personal' | 'expedition'

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'personal', label: 'Personal Kit', icon: 'backpack' },
  { key: 'expedition', label: 'Expedition Gear', icon: 'inventory_2' },
]

export default function Kit() {
  const [tab, setTab] = useState<Tab>('personal')

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header + tabs */}
      <div className="px-4 md:px-8 pt-4 md:pt-8 border-b border-outline-variant/20">
        <h1 className="font-display text-2xl md:text-4xl font-bold text-primary tracking-tight mb-1">
          KIT & SUPPLY
        </h1>
        <p className="tactical-label mb-4">Personal Kit & Expedition Manifest</p>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              <span className="font-label text-xs uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active tab */}
      <div className="flex-1">
        {tab === 'personal' ? <PersonalKit /> : <ExpeditionGear />}
      </div>
    </div>
  )
}
