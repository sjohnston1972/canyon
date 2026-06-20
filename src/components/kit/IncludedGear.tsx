import { useMemo, useState } from 'react'
import { BUNDLES, type CatalogueRecord } from './personalKit.shared'

interface Props {
  catalogue: CatalogueRecord[]
}

// Read-only reference: gear covered by the trip fee, grouped by outfitter bundle.
// These are NOT part of anyone's personal tally — they're shown so the team knows
// what's already provided before they go buying or renting their own.
export default function IncludedGear({ catalogue }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const grouped = useMemo(() => {
    const map: Record<string, CatalogueRecord[]> = {}
    for (const item of catalogue) {
      if (!item.included_in) continue
      if (!map[item.included_in]) map[item.included_in] = []
      map[item.included_in].push(item)
    }
    return map
  }, [catalogue])

  const bundlesWithItems = BUNDLES.filter((b) => (grouped[b.code]?.length ?? 0) > 0)
  if (bundlesWithItems.length === 0) return null

  return (
    <section className="mt-4">
      <h2 className="font-display text-xl font-bold text-primary tracking-tight mb-1">Included With Your Trip</h2>
      <p className="tactical-label mb-4">Covered by the trip fee — not part of your personal tally</p>

      <div className="flex flex-col gap-2">
        {bundlesWithItems.map((bundle) => {
          const items = grouped[bundle.code]
          const isOpen = open[bundle.code] ?? false
          return (
            <div key={bundle.code} className="border border-outline-variant/20">
              <button
                onClick={() => setOpen((prev) => ({ ...prev, [bundle.code]: !isOpen }))}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-high/50 transition-colors"
              >
                <span className="material-symbols-outlined text-base text-tertiary">{bundle.icon}</span>
                <span className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">{bundle.label}</span>
                <span className="font-mono text-xs text-outline">{items.length} items</span>
                <span className={`material-symbols-outlined text-lg text-on-surface-variant ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {isOpen && (
                <ul className="border-t border-outline-variant/10 divide-y divide-outline-variant/10">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 px-4 py-2">
                      <span className="material-symbols-outlined text-[14px] text-outline flex-shrink-0">check</span>
                      <span className="font-body text-sm text-on-surface-variant">{item.name}</span>
                      {item.nps_required && (
                        <span className="font-label text-[9px] uppercase tracking-widest text-error">NPS</span>
                      )}
                      {item.notes && (
                        <span className="font-label text-[10px] uppercase tracking-widest text-outline ml-auto truncate hidden sm:inline">
                          {item.notes}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
