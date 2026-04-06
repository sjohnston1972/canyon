import { useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'

interface LogisticsRecord extends RecordModel {
  entry_type: 'shuttle' | 'schedule' | 'permit' | 'comms'
  data: Record<string, string>
}

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'
const selectClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer'

export default function Logistics() {
  const { records, loading, create, update, remove } = useCollection<LogisticsRecord>('logistics_entries')

  // Derived filtered lists
  const shuttleEntries = records.filter((r) => r.entry_type === 'shuttle')
  const scheduleEntries = records.filter((r) => r.entry_type === 'schedule')
  const permitFields = records.filter((r) => r.entry_type === 'permit')
  const commsEntries = records.filter((r) => r.entry_type === 'comms')

  const [editingShuttle, setEditingShuttle] = useState<string | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null)
  const [editingPermit, setEditingPermit] = useState<string | null>(null)
  const [editingComms, setEditingComms] = useState<string | null>(null)
  const [editingCommsFooter, setEditingCommsFooter] = useState(false)

  const [shuttleDraft, setShuttleDraft] = useState<Record<string, string>>({})
  const [scheduleDraft, setScheduleDraft] = useState<Record<string, string>>({})
  const [permitDraft, setPermitDraft] = useState<Record<string, string>>({})
  const [commsDraft, setCommsDraft] = useState<Record<string, string>>({})
  const [commsFooterDraft, setCommsFooterDraft] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)

  // Find the comms footer entry (stores check_in_schedule and emergency_channel)
  const commsFooterEntry = records.find((r) => r.entry_type === 'comms' && r.data?.is_footer === 'true')
  const checkInSchedule = commsFooterEntry?.data?.check_in_schedule || 'Daily at 0800 & 1800 HRS via InReach'
  const emergencyChannel = commsFooterEntry?.data?.emergency_channel || 'Emergency: Channel 16 VHF / 911 via SatPhone'
  // Filter comms entries to exclude footer
  const commsDeviceEntries = commsEntries.filter((r) => r.data?.is_footer !== 'true')

  // --- Shuttle CRUD ---
  function startEditShuttle(entry: LogisticsRecord) {
    setShuttleDraft({ ...entry.data })
    setEditingShuttle(entry.id)
  }
  function addShuttleEntry() {
    setShuttleDraft({ label: '', detail: '', tag: '' })
    setEditingShuttle('__new__')
  }
  async function saveShuttle() {
    setSaving(true)
    try {
      if (editingShuttle === '__new__') {
        await create({ entry_type: 'shuttle', data: shuttleDraft })
      } else if (editingShuttle) {
        await update(editingShuttle, { data: shuttleDraft })
      }
    } catch (err) {
      console.error('Failed to save shuttle entry', err)
    } finally {
      setSaving(false)
      setEditingShuttle(null)
      setShuttleDraft({})
    }
  }
  async function removeShuttleEntry(id: string) {
    try { await remove(id) } catch (err) { console.error('Failed to remove shuttle entry', err) }
    if (editingShuttle === id) setEditingShuttle(null)
  }

  // --- Schedule CRUD ---
  function startEditSchedule(entry: LogisticsRecord) {
    setScheduleDraft({ ...entry.data })
    setEditingSchedule(entry.id)
  }
  function addScheduleEntry() {
    setScheduleDraft({ day: '', camp: '', miles: '' })
    setEditingSchedule('__new__')
  }
  async function saveSchedule() {
    setSaving(true)
    try {
      if (editingSchedule === '__new__') {
        await create({ entry_type: 'schedule', data: scheduleDraft })
      } else if (editingSchedule) {
        await update(editingSchedule, { data: scheduleDraft })
      }
    } catch (err) {
      console.error('Failed to save schedule entry', err)
    } finally {
      setSaving(false)
      setEditingSchedule(null)
      setScheduleDraft({})
    }
  }
  async function removeScheduleEntry(id: string) {
    try { await remove(id) } catch (err) { console.error('Failed to remove schedule entry', err) }
    if (editingSchedule === id) setEditingSchedule(null)
  }

  // --- Permit CRUD ---
  function startEditPermit(entry: LogisticsRecord) {
    setPermitDraft({ ...entry.data })
    setEditingPermit(entry.id)
  }
  async function savePermit() {
    if (!editingPermit) return
    setSaving(true)
    try {
      await update(editingPermit, { data: permitDraft })
    } catch (err) {
      console.error('Failed to save permit field', err)
    } finally {
      setSaving(false)
      setEditingPermit(null)
      setPermitDraft({})
    }
  }

  // --- Comms CRUD ---
  function startEditComms(entry: LogisticsRecord) {
    setCommsDraft({ ...entry.data })
    setEditingComms(entry.id)
  }
  function addCommsEntry() {
    setCommsDraft({ device: '', operator: '', status: 'STANDBY' })
    setEditingComms('__new__')
  }
  async function saveComms() {
    setSaving(true)
    try {
      if (editingComms === '__new__') {
        await create({ entry_type: 'comms', data: commsDraft })
      } else if (editingComms) {
        await update(editingComms, { data: commsDraft })
      }
    } catch (err) {
      console.error('Failed to save comms entry', err)
    } finally {
      setSaving(false)
      setEditingComms(null)
      setCommsDraft({})
    }
  }
  async function removeCommsEntry(id: string) {
    try { await remove(id) } catch (err) { console.error('Failed to remove comms entry', err) }
    if (editingComms === id) setEditingComms(null)
  }

  // --- Comms Footer ---
  function startEditCommsFooter() {
    setCommsFooterDraft({ check_in_schedule: checkInSchedule, emergency_channel: emergencyChannel })
    setEditingCommsFooter(true)
  }
  async function saveCommsFooter() {
    setSaving(true)
    try {
      if (commsFooterEntry) {
        await update(commsFooterEntry.id, { data: { ...commsFooterEntry.data, ...commsFooterDraft } })
      } else {
        await create({ entry_type: 'comms', data: { is_footer: 'true', ...commsFooterDraft } })
      }
    } catch (err) {
      console.error('Failed to save comms footer', err)
    } finally {
      setSaving(false)
      setEditingCommsFooter(false)
      setCommsFooterDraft({})
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
          <span className="tactical-label">Loading logistics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-surface-container-lowest p-4 border-r border-outline-variant/20 hidden lg:block">
        <div className="space-y-2">
          {['Shuttle Plan', 'Launch Schedule', 'Permits', 'Comms Plan'].map((item) => (
            <button
              key={item}
              className="w-full flex items-center gap-3 px-3 py-2 bg-surface-container-low text-on-surface-variant text-sm hover:bg-surface-container-high transition-colors text-left"
            >
              <span className="material-symbols-outlined text-base">
                {item === 'Shuttle Plan' ? 'directions_car' : item === 'Launch Schedule' ? 'calendar_month' : item === 'Permits' ? 'description' : 'satellite_alt'}
              </span>
              {item}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <p className="tactical-label mb-2">Operations Planning | Phase: Preparation</p>
        <h1 className="font-display text-4xl font-bold text-primary uppercase tracking-tight mb-8">
          Logistics
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Shuttle Plan */}
          <div className="surface-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Shuttle Plan</h3>
              <button
                onClick={addShuttleEntry}
                disabled={saving}
                className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-base text-tertiary">add</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add</span>
              </button>
            </div>
            <div className="space-y-3">
              {editingShuttle === '__new__' && (
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                  <div className="flex-1 flex flex-col gap-1 mr-2">
                    <input className={inputClasses} value={shuttleDraft.label ?? ''} onChange={(e) => setShuttleDraft({ ...shuttleDraft, label: e.target.value })} placeholder="Label" />
                    <input className={inputClasses} value={shuttleDraft.detail ?? ''} onChange={(e) => setShuttleDraft({ ...shuttleDraft, detail: e.target.value })} placeholder="Detail" />
                    <input className={inputClasses + ' w-20'} value={shuttleDraft.tag ?? ''} onChange={(e) => setShuttleDraft({ ...shuttleDraft, tag: e.target.value })} placeholder="Tag" />
                    <div className="flex gap-1 justify-end mt-1">
                      <button onClick={saveShuttle} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                        <span className="material-symbols-outlined text-base text-tertiary">check</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {shuttleEntries.map((entry) => {
                const isEditing = editingShuttle === entry.id
                const d = entry.data || {}
                return (
                  <div key={entry.id} className="flex justify-between items-center py-2 border-b border-outline-variant/20 last:border-0">
                    {isEditing ? (
                      <div className="flex-1 flex flex-col gap-1 mr-2">
                        <input className={inputClasses} value={shuttleDraft.label ?? ''} onChange={(e) => setShuttleDraft({ ...shuttleDraft, label: e.target.value })} placeholder="Label" />
                        <input className={inputClasses} value={shuttleDraft.detail ?? ''} onChange={(e) => setShuttleDraft({ ...shuttleDraft, detail: e.target.value })} placeholder="Detail" />
                        <input className={inputClasses + ' w-20'} value={shuttleDraft.tag ?? ''} onChange={(e) => setShuttleDraft({ ...shuttleDraft, tag: e.target.value })} placeholder="Tag" />
                        <div className="flex gap-1 justify-end mt-1">
                          <button onClick={saveShuttle} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-base text-tertiary">check</span>
                          </button>
                          <button onClick={() => removeShuttleEntry(entry.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-base text-error">close</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="text-sm text-on-surface">{d.label}</p>
                          <p className="tactical-label">{d.detail}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.status_label ? (
                            <span className="text-xs px-2 py-1 bg-surface-container-high text-tertiary">{d.status_label}</span>
                          ) : (
                            <span className="tactical-label">{d.tag}</span>
                          )}
                          <button onClick={() => startEditShuttle(entry)} className="p-1 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-[14px] text-outline">edit</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Launch Schedule */}
          <div className="surface-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Launch Schedule</h3>
              <button
                onClick={addScheduleEntry}
                disabled={saving}
                className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-base text-tertiary">add</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add</span>
              </button>
            </div>
            <div className="space-y-3">
              {editingSchedule === '__new__' && (
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                  <div className="flex-1 flex gap-2 items-center">
                    <input className={inputClasses + ' w-16'} value={scheduleDraft.day ?? ''} onChange={(e) => setScheduleDraft({ ...scheduleDraft, day: e.target.value })} placeholder="Day" />
                    <input className={inputClasses + ' flex-1'} value={scheduleDraft.camp ?? ''} onChange={(e) => setScheduleDraft({ ...scheduleDraft, camp: e.target.value })} placeholder="Route" />
                    <input className={inputClasses + ' w-20'} value={scheduleDraft.miles ?? ''} onChange={(e) => setScheduleDraft({ ...scheduleDraft, miles: e.target.value })} placeholder="Miles" />
                    <button onClick={saveSchedule} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                      <span className="material-symbols-outlined text-base text-tertiary">check</span>
                    </button>
                  </div>
                </div>
              )}

              {scheduleEntries.map((entry) => {
                const isEditing = editingSchedule === entry.id
                const d = entry.data || {}
                return (
                  <div key={entry.id} className="flex justify-between items-center py-2 border-b border-outline-variant/20 last:border-0">
                    {isEditing ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input className={inputClasses + ' w-16'} value={scheduleDraft.day ?? ''} onChange={(e) => setScheduleDraft({ ...scheduleDraft, day: e.target.value })} placeholder="Day" />
                        <input className={inputClasses + ' flex-1'} value={scheduleDraft.camp ?? ''} onChange={(e) => setScheduleDraft({ ...scheduleDraft, camp: e.target.value })} placeholder="Route" />
                        <input className={inputClasses + ' w-20'} value={scheduleDraft.miles ?? ''} onChange={(e) => setScheduleDraft({ ...scheduleDraft, miles: e.target.value })} placeholder="Miles" />
                        <button onClick={saveSchedule} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                          <span className="material-symbols-outlined text-base text-tertiary">check</span>
                        </button>
                        <button onClick={() => removeScheduleEntry(entry.id)} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                          <span className="material-symbols-outlined text-base text-error">close</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-tertiary w-8">{d.day}</span>
                          <span className="text-sm text-on-surface">{d.camp}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-on-surface-variant">{d.miles}</span>
                          <button onClick={() => startEditSchedule(entry)} className="p-1 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-[14px] text-outline">edit</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Permit Info */}
          <div className="surface-card">
            <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider mb-4">Permit Information</h3>
            <div className="space-y-3">
              {permitFields.map((field) => {
                const isEditing = editingPermit === field.id
                const d = field.data || {}
                return (
                  <div key={field.id} className="flex justify-between items-center">
                    {isEditing ? (
                      <>
                        <input className={inputClasses + ' w-32 mr-2'} value={permitDraft.label ?? ''} onChange={(e) => setPermitDraft({ ...permitDraft, label: e.target.value })} />
                        <div className="flex items-center gap-1">
                          <input className={inputClasses + ' w-40'} value={permitDraft.value ?? ''} onChange={(e) => setPermitDraft({ ...permitDraft, value: e.target.value })} />
                          <button onClick={savePermit} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-base text-tertiary">check</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="tactical-label">{d.label}</span>
                        <div className="flex items-center gap-2">
                          {d.is_status === 'true' ? (
                            <span className={`text-xs px-2 py-1 ${d.status_style === 'confirmed' ? 'bg-surface-container-high text-tertiary' : 'bg-tertiary-container text-on-tertiary'}`}>
                              {d.value}
                            </span>
                          ) : (
                            <span className="font-mono text-sm text-on-surface">{d.value}</span>
                          )}
                          <button onClick={() => startEditPermit(field)} className="p-1 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-[14px] text-outline">edit</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Comms Plan */}
          <div className="surface-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Communications Plan</h3>
              <button
                onClick={addCommsEntry}
                disabled={saving}
                className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-base text-tertiary">add</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add</span>
              </button>
            </div>
            <div className="space-y-3">
              {editingComms === '__new__' && (
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                  <div className="flex-1 flex flex-col gap-1 mr-2">
                    <input className={inputClasses} value={commsDraft.device ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, device: e.target.value })} placeholder="Device" />
                    <input className={inputClasses} value={commsDraft.operator ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, operator: e.target.value })} placeholder="Operator" />
                    <select className={selectClasses + ' w-32'} value={commsDraft.status ?? 'STANDBY'} onChange={(e) => setCommsDraft({ ...commsDraft, status: e.target.value })}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="STANDBY">STANDBY</option>
                    </select>
                    <div className="flex gap-1 justify-end mt-1">
                      <button onClick={saveComms} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                        <span className="material-symbols-outlined text-base text-tertiary">check</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {commsDeviceEntries.map((entry) => {
                const isEditing = editingComms === entry.id
                const d = entry.data || {}
                return (
                  <div key={entry.id} className="flex justify-between items-center py-2 border-b border-outline-variant/20 last:border-0">
                    {isEditing ? (
                      <div className="flex-1 flex flex-col gap-1 mr-2">
                        <input className={inputClasses} value={commsDraft.device ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, device: e.target.value })} placeholder="Device" />
                        <input className={inputClasses} value={commsDraft.operator ?? ''} onChange={(e) => setCommsDraft({ ...commsDraft, operator: e.target.value })} placeholder="Operator" />
                        <select className={selectClasses + ' w-32'} value={commsDraft.status ?? 'STANDBY'} onChange={(e) => setCommsDraft({ ...commsDraft, status: e.target.value })}>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="STANDBY">STANDBY</option>
                        </select>
                        <div className="flex gap-1 justify-end mt-1">
                          <button onClick={saveComms} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-base text-tertiary">check</span>
                          </button>
                          <button onClick={() => removeCommsEntry(entry.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-base text-error">close</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-on-surface">{d.device}</p>
                          <p className="tactical-label">Operator: {d.operator}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-surface-container-high text-on-surface">{d.status}</span>
                          <button onClick={() => startEditComms(entry)} className="p-1 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-[14px] text-outline">edit</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              <div className="py-2">
                {editingCommsFooter ? (
                  <div className="flex flex-col gap-1">
                    <p className="tactical-label mb-1">Check-In Schedule</p>
                    <input className={inputClasses} value={commsFooterDraft.check_in_schedule ?? ''} onChange={(e) => setCommsFooterDraft({ ...commsFooterDraft, check_in_schedule: e.target.value })} />
                    <input className={inputClasses} value={commsFooterDraft.emergency_channel ?? ''} onChange={(e) => setCommsFooterDraft({ ...commsFooterDraft, emergency_channel: e.target.value })} />
                    <div className="flex justify-end mt-1">
                      <button onClick={saveCommsFooter} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                        <span className="material-symbols-outlined text-base text-tertiary">check</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="cursor-pointer" onClick={startEditCommsFooter}>
                    <p className="tactical-label mb-1">Check-In Schedule</p>
                    <p className="text-sm text-on-surface">{checkInSchedule}</p>
                    <p className="text-sm text-on-surface-variant">{emergencyChannel}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
