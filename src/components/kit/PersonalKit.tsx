import { useMemo, useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import IncludedGear from './IncludedGear'
import {
  TRIP_DAYS,
  MEMBER_KEY,
  STATUSES,
  money,
  lineTotal,
  unitLabel,
  type CatalogueRecord,
  type PersonalKitRecord,
  type TeamMemberLite,
} from './personalKit.shared'

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'
const selectClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer'

interface ItemDraft {
  qty: string
  days: string
  status: string
  notes: string
  name: string
  unit_price: string
}

interface BespokeDraft {
  name: string
  unit_price: string
  unit_type: string
  qty: string
  days: string
  notes: string
}

function blankBespoke(): BespokeDraft {
  return { name: '', unit_price: '', unit_type: 'flat', qty: '1', days: String(TRIP_DAYS), notes: '' }
}

const statusStyle: Record<string, string> = {
  Planned: 'bg-surface-container text-on-surface-variant',
  Packed: 'bg-tertiary-container text-on-tertiary',
  'On-river': 'bg-primary-container text-on-primary-container',
  Consumed: 'bg-surface-container text-outline',
  Lost: 'bg-error-container text-error',
}

export default function PersonalKit() {
  const { records: team, loading: teamLoading } = useCollection<TeamMemberLite>('team_members', { sort: 'last_name' })
  const { records: catalogue, loading: catLoading } = useCollection<CatalogueRecord>('gear_catalogue', { sort: 'sort' })
  const { records: allKit, loading: kitLoading, create, update, remove } = useCollection<PersonalKitRecord>('personal_kit')

  const [member, setMember] = useState<string>(() => localStorage.getItem(MEMBER_KEY) || '')
  const [adding, setAdding] = useState<'catalogue' | 'bespoke' | null>(null)
  const [search, setSearch] = useState('')
  const [bespoke, setBespoke] = useState<BespokeDraft>(blankBespoke)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null)
  const [saving, setSaving] = useState(false)

  const loading = teamLoading || catLoading || kitLoading

  // Only un-bundled items are personally chargeable; the rest live in the Included reference.
  const pickable = useMemo(
    () => catalogue.filter((c) => !c.included_in),
    [catalogue]
  )

  const myKit = useMemo(
    () => allKit.filter((k) => k.member === member),
    [allKit, member]
  )

  const total = useMemo(() => myKit.reduce((sum, k) => sum + lineTotal(k), 0), [myKit])

  function selectMember(id: string) {
    setMember(id)
    setAdding(null)
    setEditingId(null)
    if (id) localStorage.setItem(MEMBER_KEY, id)
    else localStorage.removeItem(MEMBER_KEY)
  }

  async function addFromCatalogue(item: CatalogueRecord) {
    if (!member) return
    setSaving(true)
    try {
      await create({
        member,
        catalogue_item: item.id,
        name: item.name,
        section: item.section,
        unit_price: item.unit_price,
        unit_type: item.unit_type,
        qty: 1,
        days: item.unit_type === 'day' ? TRIP_DAYS : 1,
        status: 'Planned',
        is_bespoke: false,
        notes: item.notes || '',
      })
    } catch (err) {
      console.error('Failed to add catalogue item', err)
    } finally {
      setSaving(false)
    }
  }

  async function addBespoke() {
    if (!member || !bespoke.name.trim()) return
    setSaving(true)
    try {
      await create({
        member,
        catalogue_item: '',
        name: bespoke.name.trim(),
        section: 'Custom',
        unit_price: parseFloat(bespoke.unit_price) || 0,
        unit_type: bespoke.unit_type,
        qty: parseFloat(bespoke.qty) || 1,
        days: bespoke.unit_type === 'day' ? parseFloat(bespoke.days) || TRIP_DAYS : 1,
        status: 'Planned',
        is_bespoke: true,
        notes: bespoke.notes.trim(),
      })
      setBespoke(blankBespoke())
      setAdding(null)
    } catch (err) {
      console.error('Failed to add custom item', err)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: PersonalKitRecord) {
    setEditingId(item.id)
    setItemDraft({
      qty: String(item.qty ?? 1),
      days: String(item.days ?? TRIP_DAYS),
      status: item.status || 'Planned',
      notes: item.notes || '',
      name: item.name,
      unit_price: String(item.unit_price ?? 0),
    })
  }

  async function saveEdit(item: PersonalKitRecord) {
    if (!itemDraft) return
    setSaving(true)
    try {
      const patch: Partial<PersonalKitRecord> = {
        qty: parseFloat(itemDraft.qty) || 1,
        days: item.unit_type === 'day' ? parseFloat(itemDraft.days) || TRIP_DAYS : 1,
        status: itemDraft.status,
        notes: itemDraft.notes,
      }
      if (item.is_bespoke) {
        patch.name = itemDraft.name.trim() || item.name
        patch.unit_price = parseFloat(itemDraft.unit_price) || 0
      }
      await update(item.id, patch)
    } catch (err) {
      console.error('Failed to update item', err)
    } finally {
      setSaving(false)
      setEditingId(null)
      setItemDraft(null)
    }
  }

  async function removeItem(id: string) {
    try { await remove(id) } catch (err) { console.error('Failed to remove item', err) }
    if (editingId === id) setEditingId(null)
  }

  // Catalogue picker, grouped by section, filtered by the search box.
  const filteredCatalogue = useMemo(() => {
    const q = search.trim().toLowerCase()
    const items = q ? pickable.filter((c) => c.name.toLowerCase().includes(q) || c.section.toLowerCase().includes(q)) : pickable
    const groups: Record<string, CatalogueRecord[]> = {}
    for (const item of items) {
      const key = item.section || 'Other'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    return groups
  }, [pickable, search])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
          <span className="tactical-label">Loading personal kit...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Member selector + tally */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-8">
        <div className="md:w-80">
          <label className="tactical-label block mb-2">Whose kit?</label>
          <div className="relative">
            <select
              className={selectClasses + ' pr-8'}
              value={member}
              onChange={(e) => selectMember(e.target.value)}
            >
              <option value="">— Select a team member —</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.last_name || '?'}, {m.first_name || '?'}{m.role ? ` · ${m.role}` : ''}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-1 top-1.5 text-on-surface-variant pointer-events-none">expand_more</span>
          </div>
        </div>

        {member && (
          <div className="flex gap-3">
            <div className="surface-card-elevated border border-outline-variant/20 min-w-[140px]">
              <span className="tactical-label">Personal Expense</span>
              <p className="font-mono text-3xl text-on-surface font-bold mt-1 leading-none">{money(total)}</p>
              <p className="font-label text-[10px] uppercase tracking-widest text-outline mt-1">
                est. over {TRIP_DAYS} days
              </p>
            </div>
            <div className="surface-card-elevated border border-outline-variant/20 min-w-[90px]">
              <span className="tactical-label">Items</span>
              <p className="font-mono text-3xl text-on-surface font-bold mt-1 leading-none">
                {String(myKit.length).padStart(2, '0')}
              </p>
            </div>
          </div>
        )}
      </div>

      {!member ? (
        <div className="surface-card border border-outline-variant/20 text-center py-16">
          <span className="material-symbols-outlined text-4xl text-outline">hiking</span>
          <p className="tactical-label mt-3">Select your name above to build your kit list</p>
        </div>
      ) : (
        <>
          {/* Add controls */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setAdding(adding === 'catalogue' ? null : 'catalogue')}
              className={`flex items-center gap-1.5 px-3 py-2 border transition-colors ${adding === 'catalogue' ? 'border-primary bg-surface-container-high' : 'border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-base text-tertiary">list_alt</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add from catalogue</span>
            </button>
            <button
              onClick={() => { setAdding(adding === 'bespoke' ? null : 'bespoke'); setBespoke(blankBespoke()) }}
              className={`flex items-center gap-1.5 px-3 py-2 border transition-colors ${adding === 'bespoke' ? 'border-primary bg-surface-container-high' : 'border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-base text-tertiary">add</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add custom item</span>
            </button>
          </div>

          {/* Catalogue picker */}
          {adding === 'catalogue' && (
            <div className="surface-card border border-outline-variant/20 mb-6">
              <input
                className={inputClasses + ' mb-3'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search gear (e.g. kayak, paco, tent)..."
                autoFocus
              />
              <div className="max-h-[360px] overflow-y-auto flex flex-col gap-4">
                {Object.entries(filteredCatalogue).map(([section, items]) => (
                  <div key={section}>
                    <p className="tactical-label mb-1.5">{section}</p>
                    <div className="flex flex-col">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addFromCatalogue(item)}
                          disabled={saving}
                          className="flex items-center justify-between gap-3 px-2 py-2 text-left border-b border-outline-variant/10 hover:bg-surface-container-high/60 transition-colors disabled:opacity-50"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-base text-tertiary flex-shrink-0">add_circle</span>
                            <span className="font-body text-sm text-on-surface truncate">
                              {item.name}
                              {item.nps_required && <span className="ml-2 font-label text-[9px] uppercase tracking-widest text-error">NPS</span>}
                            </span>
                          </span>
                          <span className="font-mono text-xs text-on-surface-variant flex-shrink-0">
                            {money(item.unit_price)}<span className="text-outline ml-0.5">{unitLabel(item.unit_type)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(filteredCatalogue).length === 0 && (
                  <p className="tactical-label text-center py-6">No matching gear</p>
                )}
              </div>
            </div>
          )}

          {/* Bespoke form */}
          {adding === 'bespoke' && (
            <div className="surface-card border border-outline-variant/20 mb-6">
              <p className="tactical-label mb-3">Custom Item</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="tactical-label block mb-1">Name</label>
                  <input className={inputClasses} value={bespoke.name} onChange={(e) => setBespoke({ ...bespoke, name: e.target.value })} placeholder="e.g. Personal drysuit" autoFocus />
                </div>
                <div>
                  <label className="tactical-label block mb-1">Unit price ($)</label>
                  <input className={inputClasses} type="number" value={bespoke.unit_price} onChange={(e) => setBespoke({ ...bespoke, unit_price: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label className="tactical-label block mb-1">Priced</label>
                  <select className={selectClasses} value={bespoke.unit_type} onChange={(e) => setBespoke({ ...bespoke, unit_type: e.target.value })}>
                    <option value="flat">Flat / one-off</option>
                    <option value="each">Per unit</option>
                    <option value="day">Per day</option>
                  </select>
                </div>
                <div>
                  <label className="tactical-label block mb-1">Qty</label>
                  <input className={inputClasses} type="number" value={bespoke.qty} onChange={(e) => setBespoke({ ...bespoke, qty: e.target.value })} />
                </div>
                {bespoke.unit_type === 'day' && (
                  <div>
                    <label className="tactical-label block mb-1">Days</label>
                    <input className={inputClasses} type="number" value={bespoke.days} onChange={(e) => setBespoke({ ...bespoke, days: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={addBespoke}
                  disabled={saving || !bespoke.name.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-label text-xs uppercase tracking-widest hover:brightness-90 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Add item
                </button>
                <button
                  onClick={() => setAdding(null)}
                  className="px-4 py-2 bg-surface-container-high text-on-surface-variant font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* My Kit list */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-bold text-primary tracking-tight">My Kit</h2>
          </div>

          {myKit.length === 0 ? (
            <div className="surface-card border border-outline-variant/20 text-center py-12 mb-10">
              <p className="tactical-label">No items yet — add gear from the catalogue or a custom item</p>
            </div>
          ) : (
            <div className="border border-outline-variant/20 overflow-hidden mb-10">
              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-[1fr_96px_92px_104px_84px_56px] gap-x-3 bg-surface-container-lowest px-4 py-2.5 border-b border-outline-variant/20">
                <span className="tactical-label">Item</span>
                <span className="tactical-label text-right">Qty × Days</span>
                <span className="tactical-label text-right">Unit</span>
                <span className="tactical-label text-right">Line Total</span>
                <span className="tactical-label text-right">Status</span>
                <span />
              </div>

              {myKit.map((item) => {
                const isEditing = editingId === item.id
                const perDay = item.unit_type === 'day'
                return (
                  <div key={item.id} className="border-b border-outline-variant/10">
                    {isEditing && itemDraft ? (
                      <div className="px-4 py-3 bg-surface-container-high/50 flex flex-col gap-2">
                        {item.is_bespoke && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input className={inputClasses} value={itemDraft.name} onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })} placeholder="Name" />
                            <input className={inputClasses + ' sm:w-32'} type="number" value={itemDraft.unit_price} onChange={(e) => setItemDraft({ ...itemDraft, unit_price: e.target.value })} placeholder="Unit price" />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="w-20">
                            <label className="tactical-label block mb-1">Qty</label>
                            <input className={inputClasses} type="number" value={itemDraft.qty} onChange={(e) => setItemDraft({ ...itemDraft, qty: e.target.value })} />
                          </div>
                          {perDay && (
                            <div className="w-20">
                              <label className="tactical-label block mb-1">Days</label>
                              <input className={inputClasses} type="number" value={itemDraft.days} onChange={(e) => setItemDraft({ ...itemDraft, days: e.target.value })} />
                            </div>
                          )}
                          <div className="w-36">
                            <label className="tactical-label block mb-1">Status</label>
                            <select className={selectClasses} value={itemDraft.status} onChange={(e) => setItemDraft({ ...itemDraft, status: e.target.value })}>
                              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="flex-1 min-w-[160px]">
                            <label className="tactical-label block mb-1">Notes</label>
                            <input className={inputClasses} value={itemDraft.notes} onChange={(e) => setItemDraft({ ...itemDraft, notes: e.target.value })} placeholder="Optional" />
                          </div>
                          <div className="flex gap-1 pb-1">
                            <button onClick={() => saveEdit(item)} disabled={saving} className="p-1.5 hover:bg-surface-container-high transition-colors">
                              <span className="material-symbols-outlined text-base text-tertiary">check</span>
                            </button>
                            <button onClick={() => { setEditingId(null); setItemDraft(null) }} className="p-1.5 hover:bg-surface-container-high transition-colors">
                              <span className="material-symbols-outlined text-base text-outline">close</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Desktop row */}
                        <div className="hidden md:grid grid-cols-[1fr_96px_92px_104px_84px_56px] gap-x-3 px-4 py-3 items-center hover:bg-surface-container-high/40 transition-colors group">
                          <div className="min-w-0">
                            <p className="font-body text-sm text-on-surface truncate">
                              {item.name}
                              {item.is_bespoke && <span className="ml-2 font-label text-[9px] uppercase tracking-widest text-tertiary">custom</span>}
                            </p>
                            <p className="font-label text-[10px] uppercase tracking-widest text-outline mt-0.5">
                              {item.section}{item.notes ? ` · ${item.notes}` : ''}
                            </p>
                          </div>
                          <span className="font-mono text-xs text-on-surface-variant text-right">
                            {item.qty}{perDay ? ` × ${item.days}d` : ''}
                          </span>
                          <span className="font-mono text-xs text-on-surface-variant text-right">
                            {money(item.unit_price)}<span className="text-outline">{unitLabel(item.unit_type)}</span>
                          </span>
                          <span className="font-mono text-sm text-on-surface text-right font-medium">{money(lineTotal(item))}</span>
                          <div className="flex justify-end">
                            <span className={`inline-block px-1.5 py-0.5 font-label text-[9px] uppercase tracking-widest whitespace-nowrap ${statusStyle[item.status] || statusStyle.Planned}`}>
                              {item.status || 'Planned'}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => startEdit(item)} className="p-1 opacity-0 group-hover:opacity-100 hover:bg-surface-container-high transition-all">
                              <span className="material-symbols-outlined text-base text-outline">edit</span>
                            </button>
                            <button onClick={() => removeItem(item.id)} className="p-1 opacity-0 group-hover:opacity-100 hover:bg-surface-container-high transition-all">
                              <span className="material-symbols-outlined text-base text-error">close</span>
                            </button>
                          </div>
                        </div>
                        {/* Mobile card */}
                        <div className="md:hidden px-4 py-3 hover:bg-surface-container-high/40 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-body text-sm text-on-surface">
                                {item.name}
                                {item.is_bespoke && <span className="ml-2 font-label text-[9px] uppercase tracking-widest text-tertiary">custom</span>}
                              </p>
                              <p className="font-mono text-xs text-on-surface-variant mt-1">
                                {item.qty}{perDay ? ` × ${item.days}d` : ''} @ {money(item.unit_price)}{unitLabel(item.unit_type)}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="font-mono text-sm text-on-surface font-medium">{money(lineTotal(item))}</span>
                                <span className={`inline-block px-1.5 py-0.5 font-label text-[9px] uppercase tracking-widest ${statusStyle[item.status] || statusStyle.Planned}`}>
                                  {item.status || 'Planned'}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => startEdit(item)} className="p-1 hover:bg-surface-container-high transition-colors">
                                <span className="material-symbols-outlined text-base text-outline">edit</span>
                              </button>
                              <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                                <span className="material-symbols-outlined text-base text-error">close</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {/* Total footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-surface-container-lowest border-t border-outline-variant/20">
                <span className="tactical-label">Total Personal Expense</span>
                <span className="font-mono text-lg text-on-surface font-bold">{money(total)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Included-with-trip reference */}
      <IncludedGear catalogue={catalogue} />
    </div>
  )
}
