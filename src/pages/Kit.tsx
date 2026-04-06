import { useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'

interface EquipmentRecord extends RecordModel {
  item_name: string
  category: string
  stowed_location: string
  responsible: string
  weight: string
  allocation: string
  is_group_gear: boolean
  notes: string
  qty: string
  expiry: string
  custodian: string
}

interface RaftRecord extends RecordModel {
  name: string
  tag: string
  weight_kg: number
}

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'
const selectClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer'

export default function Kit() {
  const { records: equipment, loading: equipLoading, create: createEquip, update: updateEquip, remove: removeEquip } = useCollection<EquipmentRecord>('equipment')
  const { records: rafts, loading: raftsLoading, update: updateRaft } = useCollection<RaftRecord>('rafts')

  // Derived filtered lists
  const kitchenItems = equipment.filter((e) => e.category === 'kitchen')
  const repairItems = equipment.filter((e) => e.category === 'repair')
  const commsDevices = equipment.filter((e) => e.category === 'comms')
  const firstAidItems = equipment.filter((e) => e.category === 'first_aid')

  // Editing state
  const [editingKitchen, setEditingKitchen] = useState<string | null>(null)
  const [editingRepair, setEditingRepair] = useState<string | null>(null)
  const [editingComms, setEditingComms] = useState<string | null>(null)
  const [editingFirstAid, setEditingFirstAid] = useState<string | null>(null)
  const [editingRaft, setEditingRaft] = useState<string | null>(null)

  // Edit drafts for inline editing
  const [kitchenDraft, setKitchenDraft] = useState<Partial<EquipmentRecord>>({})
  const [repairDraft, setRepairDraft] = useState<Partial<EquipmentRecord>>({})
  const [commsDraft, setCommsDraft] = useState<Partial<EquipmentRecord>>({})
  const [firstAidDraft, setFirstAidDraft] = useState<Partial<EquipmentRecord>>({})
  const [raftDraft, setRaftDraft] = useState<Partial<RaftRecord>>({})

  const [saving, setSaving] = useState(false)

  const loading = equipLoading || raftsLoading

  // --- Kitchen CRUD ---
  function startEditKitchen(item: EquipmentRecord) {
    setKitchenDraft({ item_name: item.item_name, stowed_location: item.stowed_location, responsible: item.responsible, weight: item.weight, allocation: item.allocation })
    setEditingKitchen(item.id)
  }
  async function addKitchenItem() {
    setKitchenDraft({ item_name: '', stowed_location: '', responsible: '', weight: '0', allocation: 'Staged', category: 'kitchen' })
    setEditingKitchen('__new__')
  }
  async function saveKitchen() {
    setSaving(true)
    try {
      if (editingKitchen === '__new__') {
        await createEquip({ ...kitchenDraft, category: 'kitchen' })
      } else if (editingKitchen) {
        await updateEquip(editingKitchen, kitchenDraft)
      }
    } catch (err) {
      console.error('Failed to save kitchen item', err)
    } finally {
      setSaving(false)
      setEditingKitchen(null)
      setKitchenDraft({})
    }
  }
  async function removeKitchenItem(id: string) {
    try { await removeEquip(id) } catch (err) { console.error('Failed to remove kitchen item', err) }
    if (editingKitchen === id) setEditingKitchen(null)
  }

  // --- Repair CRUD ---
  function startEditRepair(item: EquipmentRecord) {
    setRepairDraft({ item_name: item.item_name, notes: item.notes, stowed_location: item.stowed_location, allocation: item.allocation })
    setEditingRepair(item.id)
  }
  async function addRepairItem() {
    setRepairDraft({ item_name: '', notes: '', stowed_location: '', allocation: 'ok', category: 'repair' })
    setEditingRepair('__new__')
  }
  async function saveRepair() {
    setSaving(true)
    try {
      if (editingRepair === '__new__') {
        await createEquip({ ...repairDraft, category: 'repair' })
      } else if (editingRepair) {
        await updateEquip(editingRepair, repairDraft)
      }
    } catch (err) {
      console.error('Failed to save repair item', err)
    } finally {
      setSaving(false)
      setEditingRepair(null)
      setRepairDraft({})
    }
  }
  async function removeRepairItem(id: string) {
    try { await removeEquip(id) } catch (err) { console.error('Failed to remove repair item', err) }
    if (editingRepair === id) setEditingRepair(null)
  }

  // --- Comms CRUD ---
  function startEditComms(item: EquipmentRecord) {
    setCommsDraft({ item_name: item.item_name, responsible: item.responsible, allocation: item.allocation, notes: item.notes, stowed_location: item.stowed_location })
    setEditingComms(item.id)
  }
  async function addCommsDevice() {
    setCommsDraft({ item_name: '', responsible: '', allocation: '', notes: '', stowed_location: '', category: 'comms' })
    setEditingComms('__new__')
  }
  async function saveComms() {
    setSaving(true)
    try {
      if (editingComms === '__new__') {
        await createEquip({ ...commsDraft, category: 'comms' })
      } else if (editingComms) {
        await updateEquip(editingComms, commsDraft)
      }
    } catch (err) {
      console.error('Failed to save comms device', err)
    } finally {
      setSaving(false)
      setEditingComms(null)
      setCommsDraft({})
    }
  }
  async function removeCommsDevice(id: string) {
    try { await removeEquip(id) } catch (err) { console.error('Failed to remove comms device', err) }
    if (editingComms === id) setEditingComms(null)
  }

  // --- First Aid CRUD ---
  function startEditFirstAid(item: EquipmentRecord) {
    setFirstAidDraft({ item_name: item.item_name, qty: item.qty, expiry: item.expiry, stowed_location: item.stowed_location, custodian: item.custodian, notes: item.notes })
    setEditingFirstAid(item.id)
  }
  async function addFirstAidItem() {
    setFirstAidDraft({ item_name: '', qty: '', expiry: '', stowed_location: '', custodian: '', notes: '', category: 'first_aid' })
    setEditingFirstAid('__new__')
  }
  async function saveFirstAid() {
    setSaving(true)
    try {
      if (editingFirstAid === '__new__') {
        await createEquip({ ...firstAidDraft, category: 'first_aid' })
      } else if (editingFirstAid) {
        await updateEquip(editingFirstAid, firstAidDraft)
      }
    } catch (err) {
      console.error('Failed to save first aid item', err)
    } finally {
      setSaving(false)
      setEditingFirstAid(null)
      setFirstAidDraft({})
    }
  }
  async function removeFirstAidItem(id: string) {
    try { await removeEquip(id) } catch (err) { console.error('Failed to remove first aid item', err) }
    if (editingFirstAid === id) setEditingFirstAid(null)
  }

  // --- Raft editing ---
  function startEditRaft(raft: RaftRecord) {
    setRaftDraft({ name: raft.name, tag: raft.tag, weight_kg: raft.weight_kg })
    setEditingRaft(raft.id)
  }
  async function saveRaft() {
    if (!editingRaft) return
    setSaving(true)
    try {
      await updateRaft(editingRaft, raftDraft)
    } catch (err) {
      console.error('Failed to save raft', err)
    } finally {
      setSaving(false)
      setEditingRaft(null)
      setRaftDraft({})
    }
  }

  // Group first aid items by their stowed_location (used as kit grouping key)
  // Each unique stowed_location acts as a "kit". The custodian and notes fields carry kit-level metadata.
  const firstAidKits = firstAidItems.reduce<Record<string, EquipmentRecord[]>>((acc, item) => {
    const key = item.stowed_location || 'Unassigned'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
          <span className="tactical-label">Loading kit manifest...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar — desktop only */}
      <aside className="hidden lg:flex w-[240px] flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant/20 p-5 flex-col gap-6">
        <div>
          <div className="flex flex-col gap-2">
            {[
              { icon: 'emergency', label: 'Emergency', count: 12 },
              { icon: 'settings', label: 'Settings', count: null },
              { icon: 'sync', label: 'Sync Status', count: null },
            ].map((node) => (
              <button
                key={node.label}
                className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-container-high transition-colors group w-full"
              >
                <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-on-surface transition-colors">
                  {node.icon}
                </span>
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant group-hover:text-on-surface transition-colors flex-1">
                  {node.label}
                </span>
                {node.count !== null && (
                  <span className="font-mono text-xs text-outline">{node.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <div className="border-t border-outline-variant/20 pt-4">
            <span className="tactical-label">Last Sync</span>
            <p className="font-mono text-xs text-on-surface mt-1">2024-11-14 08:42Z</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col xl:flex-row">
          {/* Center Column */}
          <div className="flex-1 p-4 md:p-8">
            {/* Page Title */}
            <h1 className="font-display text-2xl md:text-4xl font-bold text-primary tracking-tight mb-1">
              KIT & SUPPLY
            </h1>
            <p className="tactical-label mb-8">Manifest & Allocation Tracking</p>

            {/* Raft Manifest Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              {rafts.map((raft, idx) => (
                <div
                  key={raft.id}
                  className="surface-card-elevated border border-outline-variant/20 cursor-pointer"
                  onClick={() => editingRaft === raft.id ? saveRaft() : startEditRaft(raft)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="tactical-label">Raft {idx + 1}</span>
                    <span className="material-symbols-outlined text-[16px] text-outline">
                      directions_boat
                    </span>
                  </div>
                  {editingRaft === raft.id ? (
                    <>
                      <input
                        className={inputClasses + ' mb-1'}
                        value={raftDraft.tag ?? raft.tag}
                        onChange={(e) => setRaftDraft({ ...raftDraft, tag: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Role"
                      />
                      <input
                        className={inputClasses}
                        type="number"
                        value={raftDraft.weight_kg ?? raft.weight_kg}
                        onChange={(e) => setRaftDraft({ ...raftDraft, weight_kg: parseFloat(e.target.value) || 0 })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </>
                  ) : (
                    <>
                      <p className="font-label text-xs uppercase tracking-widest text-tertiary mb-1">
                        {raft.tag}
                      </p>
                      <p className="font-mono text-2xl text-on-surface font-bold">
                        {raft.weight_kg}
                        <span className="text-sm text-outline ml-1">kg</span>
                      </p>
                    </>
                  )}
                  <div className="mt-3 h-1 bg-surface-container">
                    <div
                      className="h-full bg-tertiary-container"
                      style={{ width: `${(raft.weight_kg / 700) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Group Kitchen */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-xl font-bold text-primary tracking-tight">
                  Group Kitchen
                </h2>
                <div className="flex items-center gap-4">
                  <span className="tactical-label">
                    Item Count: <span className="font-mono text-on-surface">{kitchenItems.length}</span>
                  </span>
                  <button
                    onClick={addKitchenItem}
                    disabled={saving}
                    className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-tertiary">add</span>
                    <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add</span>
                  </button>
                </div>
              </div>
              <p className="tactical-label mb-4">
                Central Hub Inventory — Raft 3 Primary
              </p>

              <div className="border border-outline-variant/20 overflow-hidden">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-[1fr_200px_120px_80px_100px_50px] bg-surface-container-lowest px-4 py-2.5 border-b border-outline-variant/20">
                  <span className="tactical-label">Item Nomenclature</span>
                  <span className="tactical-label">Stowed Location</span>
                  <span className="tactical-label">Responsible</span>
                  <span className="tactical-label text-right">Weight</span>
                  <span className="tactical-label text-right">Allocation</span>
                  <span className="tactical-label text-right">Actions</span>
                </div>

                {editingKitchen === '__new__' && (
                  <>
                    {/* Desktop new row */}
                    <div className="hidden md:grid grid-cols-[1fr_200px_120px_80px_100px_50px] px-4 py-3 border-b border-outline-variant/10 bg-surface-container-high/50 items-center">
                      <input className={inputClasses} value={kitchenDraft.item_name ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, item_name: e.target.value })} placeholder="Item name" />
                      <input className={inputClasses} value={kitchenDraft.stowed_location ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, stowed_location: e.target.value })} placeholder="Location" />
                      <input className={inputClasses} value={kitchenDraft.responsible ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, responsible: e.target.value })} placeholder="Name" />
                      <input className={`${inputClasses} text-right`} value={kitchenDraft.weight ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, weight: e.target.value })} />
                      <select className={selectClasses} value={kitchenDraft.allocation ?? 'Staged'} onChange={(e) => setKitchenDraft({ ...kitchenDraft, allocation: e.target.value })}>
                        <option value="Staged">Staged</option>
                        <option value="Priority">Priority</option>
                        <option value="Packed">Packed</option>
                      </select>
                      <div className="flex justify-end">
                        <button onClick={saveKitchen} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-base text-tertiary">check</span>
                        </button>
                      </div>
                    </div>
                    {/* Mobile new card */}
                    <div className="md:hidden px-4 py-3 border-b border-outline-variant/10 bg-surface-container-high/50 flex flex-col gap-2">
                      <input className={inputClasses} value={kitchenDraft.item_name ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, item_name: e.target.value })} placeholder="Item name" />
                      <input className={inputClasses} value={kitchenDraft.stowed_location ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, stowed_location: e.target.value })} placeholder="Location" />
                      <input className={inputClasses} value={kitchenDraft.responsible ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, responsible: e.target.value })} placeholder="Name" />
                      <input className={`${inputClasses} text-right`} value={kitchenDraft.weight ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, weight: e.target.value })} />
                      <select className={selectClasses} value={kitchenDraft.allocation ?? 'Staged'} onChange={(e) => setKitchenDraft({ ...kitchenDraft, allocation: e.target.value })}>
                        <option value="Staged">Staged</option>
                        <option value="Priority">Priority</option>
                        <option value="Packed">Packed</option>
                      </select>
                      <div className="flex justify-end">
                        <button onClick={saveKitchen} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-base text-tertiary">check</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {kitchenItems.map((item) => {
                  const isEditing = editingKitchen === item.id
                  return (
                    <div key={item.id}>
                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-[1fr_200px_120px_80px_100px_50px] px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors items-center">
                        {isEditing ? (
                          <>
                            <input className={inputClasses} value={kitchenDraft.item_name ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, item_name: e.target.value })} placeholder="Item name" />
                            <input className={inputClasses} value={kitchenDraft.stowed_location ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, stowed_location: e.target.value })} placeholder="Location" />
                            <input className={inputClasses} value={kitchenDraft.responsible ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, responsible: e.target.value })} placeholder="Name" />
                            <input className={`${inputClasses} text-right`} value={kitchenDraft.weight ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, weight: e.target.value })} />
                            <select className={selectClasses} value={kitchenDraft.allocation ?? 'Staged'} onChange={(e) => setKitchenDraft({ ...kitchenDraft, allocation: e.target.value })}>
                              <option value="Staged">Staged</option>
                              <option value="Priority">Priority</option>
                              <option value="Packed">Packed</option>
                            </select>
                            <div className="flex justify-end">
                              <button onClick={saveKitchen} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                                <span className="material-symbols-outlined text-base text-tertiary">check</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="font-body text-sm text-on-surface">{item.item_name}</span>
                            <span className="font-mono text-xs text-on-surface-variant">{item.stowed_location}</span>
                            <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">{item.responsible}</span>
                            <span className="font-mono text-sm text-on-surface text-right">
                              {item.weight}<span className="text-outline ml-0.5">kg</span>
                            </span>
                            <span className="text-right">
                              <span className={`inline-block px-2 py-0.5 font-label text-[10px] uppercase tracking-widest ${item.allocation === 'Priority' ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
                                {item.allocation}
                              </span>
                            </span>
                            <div className="flex justify-end gap-1">
                              <button onClick={() => startEditKitchen(item)} className="p-1 hover:bg-surface-container-high transition-colors">
                                <span className="material-symbols-outlined text-base text-outline">edit</span>
                              </button>
                              <button onClick={() => removeKitchenItem(item.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                                <span className="material-symbols-outlined text-base text-error">close</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Mobile card */}
                      <div className="md:hidden px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <input className={inputClasses} value={kitchenDraft.item_name ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, item_name: e.target.value })} placeholder="Item name" />
                            <input className={inputClasses} value={kitchenDraft.weight ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, weight: e.target.value })} placeholder="Weight" />
                            <input className={inputClasses} value={kitchenDraft.stowed_location ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, stowed_location: e.target.value })} placeholder="Location" />
                            <input className={inputClasses} value={kitchenDraft.responsible ?? ''} onChange={(e) => setKitchenDraft({ ...kitchenDraft, responsible: e.target.value })} placeholder="Name" />
                            <select className={selectClasses} value={kitchenDraft.allocation ?? 'Staged'} onChange={(e) => setKitchenDraft({ ...kitchenDraft, allocation: e.target.value })}>
                              <option value="Staged">Staged</option>
                              <option value="Priority">Priority</option>
                              <option value="Packed">Packed</option>
                            </select>
                            <div className="flex justify-end">
                              <button onClick={saveKitchen} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                                <span className="material-symbols-outlined text-base text-tertiary">check</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-body text-sm text-on-surface">{item.item_name}</p>
                              <p className="font-mono text-xs text-on-surface-variant mt-0.5">
                                {item.weight}<span className="text-outline ml-0.5">kg</span>
                                {item.allocation && (
                                  <span className={`ml-2 inline-block px-2 py-0.5 font-label text-[10px] uppercase tracking-widest ${item.allocation === 'Priority' ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
                                    {item.allocation}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => startEditKitchen(item)} className="p-1 hover:bg-surface-container-high transition-colors">
                                <span className="material-symbols-outlined text-base text-outline">edit</span>
                              </button>
                              <button onClick={() => removeKitchenItem(item.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                                <span className="material-symbols-outlined text-base text-error">close</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Repair Kit */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-xl font-bold text-primary tracking-tight">
                  Repair Kit
                </h2>
                <button
                  onClick={addRepairItem}
                  disabled={saving}
                  className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-tertiary">add</span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add</span>
                </button>
              </div>
              <p className="tactical-label mb-4">
                Maintenance Logistics — Multi-Raft Redundancy
              </p>

              <div className="flex flex-col gap-2">
                {editingRepair === '__new__' && (
                  <div className="flex items-center gap-4 surface-card border border-outline-variant/20 bg-surface-container-high/40">
                    <select
                      className={selectClasses + ' w-20 flex-shrink-0'}
                      value={repairDraft.allocation ?? 'ok'}
                      onChange={(e) => setRepairDraft({ ...repairDraft, allocation: e.target.value })}
                    >
                      <option value="ok">OK</option>
                      <option value="warning">WARN</option>
                    </select>
                    <div className="flex-1 flex gap-2">
                      <input className={inputClasses} value={repairDraft.item_name ?? ''} onChange={(e) => setRepairDraft({ ...repairDraft, item_name: e.target.value })} placeholder="Item name" />
                      <input className={inputClasses} value={repairDraft.notes ?? ''} onChange={(e) => setRepairDraft({ ...repairDraft, notes: e.target.value })} placeholder="Description" />
                      <input className={inputClasses + ' w-48'} value={repairDraft.stowed_location ?? ''} onChange={(e) => setRepairDraft({ ...repairDraft, stowed_location: e.target.value })} placeholder="Location" />
                    </div>
                    <button onClick={saveRepair} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                      <span className="material-symbols-outlined text-base text-tertiary">check</span>
                    </button>
                  </div>
                )}

                {repairItems.map((item) => {
                  const isEditing = editingRepair === item.id
                  const status = item.allocation === 'warning' ? 'warning' : 'ok'
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 surface-card border border-outline-variant/20 hover:bg-surface-container-high/40 transition-colors"
                    >
                      {isEditing ? (
                        <>
                          <select
                            className={selectClasses + ' w-20 flex-shrink-0'}
                            value={repairDraft.allocation ?? 'ok'}
                            onChange={(e) => setRepairDraft({ ...repairDraft, allocation: e.target.value })}
                          >
                            <option value="ok">OK</option>
                            <option value="warning">WARN</option>
                          </select>
                          <div className="flex-1 flex gap-2">
                            <input className={inputClasses} value={repairDraft.item_name ?? ''} onChange={(e) => setRepairDraft({ ...repairDraft, item_name: e.target.value })} placeholder="Item name" />
                            <input className={inputClasses} value={repairDraft.notes ?? ''} onChange={(e) => setRepairDraft({ ...repairDraft, notes: e.target.value })} placeholder="Description" />
                            <input className={inputClasses + ' w-48'} value={repairDraft.stowed_location ?? ''} onChange={(e) => setRepairDraft({ ...repairDraft, stowed_location: e.target.value })} placeholder="Location" />
                          </div>
                          <button onClick={saveRepair} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                            <span className="material-symbols-outlined text-base text-tertiary">check</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={`material-symbols-outlined text-[20px] flex-shrink-0 ${status === 'ok' ? 'text-tertiary' : 'text-error'}`}>
                            {status === 'ok' ? 'check_circle' : 'warning'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-sm text-on-surface font-medium">{item.item_name}</p>
                            <p className="font-body text-xs text-on-surface-variant">{item.notes}</p>
                          </div>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-outline flex-shrink-0">
                            {item.stowed_location}
                          </span>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => startEditRepair(item)} className="p-1 hover:bg-surface-container-high transition-colors">
                              <span className="material-symbols-outlined text-base text-outline">edit</span>
                            </button>
                            <button onClick={() => removeRepairItem(item.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                              <span className="material-symbols-outlined text-base text-error">close</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Right Column — side on xl, stacks below on mobile */}
          <div className="w-full xl:w-[280px] flex-shrink-0 xl:border-l border-t xl:border-t-0 border-outline-variant/20 p-4 md:p-5 flex flex-col gap-6">
            {/* Comms Planning */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-bold text-primary tracking-tight uppercase">
                  Comms Planning
                </h3>
                <button
                  onClick={addCommsDevice}
                  disabled={saving}
                  className="p-1 hover:bg-surface-container-high transition-colors"
                  title="Add device"
                >
                  <span className="material-symbols-outlined text-base text-tertiary">add</span>
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {editingComms === '__new__' && (
                  <div className="surface-card border border-outline-variant/20">
                    <div className="flex flex-col gap-2">
                      <input className={inputClasses} value={commsDraft.item_name ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, item_name: e.target.value })} placeholder="Device name" />
                      <input className={inputClasses} value={commsDraft.responsible ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, responsible: e.target.value })} placeholder="Assignee" />
                      <input className={inputClasses} value={commsDraft.allocation ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, allocation: e.target.value })} placeholder="Tag (Assigned/Backup)" />
                      <input className={inputClasses} value={commsDraft.notes ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, notes: e.target.value })} placeholder="Label (Primary/Secondary)" />
                      <div className="flex gap-1 justify-end">
                        <button onClick={saveComms} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-base text-tertiary">check</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {commsDevices.map((device) => {
                  const isEditing = editingComms === device.id
                  const tagStyle = device.notes === 'Primary' ? 'primary' : 'secondary'
                  return (
                    <div key={device.id} className="surface-card border border-outline-variant/20">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <input className={inputClasses} value={commsDraft.item_name ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, item_name: e.target.value })} placeholder="Device name" />
                          <input className={inputClasses} value={commsDraft.responsible ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, responsible: e.target.value })} placeholder="Assignee" />
                          <input className={inputClasses} value={commsDraft.allocation ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, allocation: e.target.value })} placeholder="Tag" />
                          <input className={inputClasses} value={commsDraft.notes ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, notes: e.target.value })} placeholder="Label (Primary/Secondary)" />
                          <div className="flex gap-1 justify-end">
                            <button onClick={saveComms} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                              <span className="material-symbols-outlined text-base text-tertiary">check</span>
                            </button>
                            <button onClick={() => removeCommsDevice(device.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                              <span className="material-symbols-outlined text-base text-error">close</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`material-symbols-outlined text-[16px] ${tagStyle === 'primary' ? 'text-tertiary' : 'text-outline'}`}>
                              {tagStyle === 'primary' ? 'satellite_alt' : 'phone_in_talk'}
                            </span>
                            <span className="font-body text-sm text-on-surface font-medium">
                              {device.item_name}
                            </span>
                            <button onClick={() => startEditComms(device)} className="ml-auto p-0.5 hover:bg-surface-container-high transition-colors">
                              <span className="material-symbols-outlined text-[14px] text-outline">edit</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-block px-2 py-0.5 font-label text-[10px] uppercase tracking-widest ${tagStyle === 'primary' ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
                              {device.allocation}
                            </span>
                            <span className="font-label text-[10px] uppercase tracking-widest text-outline">
                              {device.notes}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-on-surface-variant mt-1">{device.responsible}</p>
                        </>
                      )}
                    </div>
                  )
                })}

                <div className="flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-[14px] text-outline">
                    cell_tower
                  </span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Expected Coverage{' '}
                    <span className="font-mono text-on-surface">85%</span> Route
                  </span>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-outline-variant/20" />

            {/* First Aid (Major) */}
            <section>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display text-sm font-bold text-primary tracking-tight uppercase">
                  First Aid (Major)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addFirstAidItem}
                    disabled={saving}
                    className="p-1 hover:bg-surface-container-high transition-colors"
                    title="Add item"
                  >
                    <span className="material-symbols-outlined text-base text-tertiary">add</span>
                  </button>
                  <span className="material-symbols-outlined text-[16px] text-error">
                    local_hospital
                  </span>
                </div>
              </div>
              <p className="tactical-label mb-3">Medical Contingency — Critical Access</p>

              <button className="w-full mb-4 px-3 py-2 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-tertiary">
                  fact_check
                </span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Review Audit
                </span>
              </button>

              {editingFirstAid === '__new__' && (
                <div className="surface-card border border-outline-variant/20 mb-3">
                  <div className="flex flex-col gap-2">
                    <input className={inputClasses} value={firstAidDraft.item_name ?? ''} onChange={(e) => setFirstAidDraft({ ...firstAidDraft, item_name: e.target.value })} placeholder="Item name" />
                    <input className={inputClasses} value={firstAidDraft.qty ?? ''} onChange={(e) => setFirstAidDraft({ ...firstAidDraft, qty: e.target.value })} placeholder="Quantity" />
                    <input className={inputClasses} value={firstAidDraft.expiry ?? ''} onChange={(e) => setFirstAidDraft({ ...firstAidDraft, expiry: e.target.value })} placeholder="Expiry (e.g. NOV-24)" />
                    <input className={inputClasses} value={firstAidDraft.stowed_location ?? ''} onChange={(e) => setFirstAidDraft({ ...firstAidDraft, stowed_location: e.target.value })} placeholder="Kit / Location" />
                    <input className={inputClasses} value={firstAidDraft.custodian ?? ''} onChange={(e) => setFirstAidDraft({ ...firstAidDraft, custodian: e.target.value })} placeholder="Custodian" />
                    <div className="flex gap-1 justify-end">
                      <button onClick={saveFirstAid} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                        <span className="material-symbols-outlined text-base text-tertiary">check</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {Object.entries(firstAidKits).map(([kitLocation, items]) => {
                const firstItem = items[0]
                return (
                  <div key={kitLocation} className="surface-card border border-outline-variant/20 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label text-xs uppercase tracking-widest text-tertiary">
                        {kitLocation}
                      </span>
                      <span className="font-mono text-[10px] text-outline">{kitLocation}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {items.map((med) => (
                        <div key={med.id} className="flex items-center justify-between">
                          {editingFirstAid === med.id ? (
                            <>
                              <input className={inputClasses + ' w-32'} value={firstAidDraft.item_name ?? ''} onChange={(e) => setFirstAidDraft({ ...firstAidDraft, item_name: e.target.value })} placeholder="Item" />
                              <div className="flex items-center gap-1">
                                <input className={inputClasses + ' w-16'} value={firstAidDraft.qty ?? ''} onChange={(e) => setFirstAidDraft({ ...firstAidDraft, qty: e.target.value })} placeholder="Qty" />
                                <button onClick={saveFirstAid} disabled={saving} className="p-0.5">
                                  <span className="material-symbols-outlined text-[14px] text-tertiary">check</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="font-body text-xs text-on-surface">{med.item_name}</span>
                              <div className="flex items-center gap-1">
                                {med.expiry ? (
                                  <span className="font-mono text-xs text-error">Expiry: {med.expiry}</span>
                                ) : (
                                  <span className="font-mono text-xs text-on-surface-variant">QTY: {med.qty}</span>
                                )}
                                <button onClick={() => startEditFirstAid(med)} className="p-0.5 hover:bg-surface-container-high transition-colors">
                                  <span className="material-symbols-outlined text-[12px] text-outline">edit</span>
                                </button>
                                <button onClick={() => removeFirstAidItem(med.id)} className="p-0.5 hover:bg-surface-container-high transition-colors">
                                  <span className="material-symbols-outlined text-[12px] text-error">close</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-outline-variant/10 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-outline">
                        person
                      </span>
                      <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                        Custodian: {firstItem?.custodian || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
