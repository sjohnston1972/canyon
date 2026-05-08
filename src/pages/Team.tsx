import { useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'

interface TeamMemberRecord extends RecordModel {
  id: string
  first_name: string
  last_name: string
  role: string
  boat_tag: string
  blood_type: string
  certifications: string
  critical_history: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
  paddler_height: string
  paddler_weight: string
  boat_preference: string
  own_boat: string
  dob: string
}

type TeamMemberDraft = Omit<TeamMemberRecord, 'id' | 'collectionId' | 'collectionName' | 'created' | 'updated' | 'expand'>


function createBlankDraft(): TeamMemberDraft {
  return {
    first_name: '',
    last_name: '',
    role: '',
    boat_tag: '',
    blood_type: '',
    certifications: '',
    critical_history: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    paddler_height: '',
    paddler_weight: '',
    boat_preference: '',
    own_boat: '',
    dob: '',
  }
}

// Compute age (in whole years) from a DOB string. Supports DD/MM/YYYY, ISO YYYY-MM-DD,
// DD-MM-YYYY, DD.MM.YYYY, "17 Dec 1972", etc. Returns null if unparseable.
function computeAge(dob: string): number | null {
  const raw = (dob || '').trim()
  if (!raw) return null

  let day: number | null = null, month: number | null = null, year: number | null = null

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  let m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) { year = +m[1]; month = +m[2]; day = +m[3] }
  // DD/MM/YYYY style (day-first)
  if (!year) {
    m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
    if (m) {
      day = +m[1]; month = +m[2]
      year = m[3].length === 2 ? 1900 + +m[3] : +m[3]
    }
  }
  // "17 Dec 1972" / "17 December 1972"
  if (!year) {
    const months: Record<string, number> = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
      may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
      sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
    }
    m = raw.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{2,4})$/)
    if (m && months[m[2].toLowerCase()]) {
      day = +m[1]; month = months[m[2].toLowerCase()]
      year = m[3].length === 2 ? 1900 + +m[3] : +m[3]
    }
    if (!year) {
      m = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})$/)
      if (m && months[m[1].toLowerCase()]) {
        day = +m[2]; month = months[m[1].toLowerCase()]
        year = m[3].length === 2 ? 1900 + +m[3] : +m[3]
      }
    }
  }

  if (year == null || month == null || day == null) return null
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null

  const today = new Date()
  let age = today.getFullYear() - year
  const monthDiff = today.getMonth() + 1 - month
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age--
  if (age < 0 || age > 130) return null
  return age
}

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'
const selectClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer'
const textareaClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 resize-y min-h-[60px]'

const BOAT_PREFERENCE_OPTIONS = ['Play', 'Half Slice', 'Full Volume'] as const

export default function Team() {
  const { records: teamMembers, loading, create, update, remove } = useCollection<TeamMemberRecord>('team_members')
  const [expandedRow, setExpandedRow] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<TeamMemberDraft | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'manifest' | 'boatType'>('manifest')
  const [chartCollapsed, setChartCollapsed] = useState(false)

  const toggleRow = (id: string) => {
    if (editingId === id) return
    setExpandedRow((prev) => (prev === id ? '' : id))
  }

  const startEdit = (member: TeamMemberRecord) => {
    setEditingId(member.id)
    setIsCreating(false)
    setEditDraft({
      first_name: member.first_name,
      last_name: member.last_name,
      role: member.role,
      boat_tag: member.boat_tag,
      blood_type: member.blood_type,
      certifications: member.certifications,
      critical_history: member.critical_history,
      emergency_contact_name: member.emergency_contact_name,
      emergency_contact_phone: member.emergency_contact_phone,
      emergency_contact_relation: member.emergency_contact_relation,
      paddler_height: member.paddler_height ?? '',
      paddler_weight: member.paddler_weight ?? '',
      boat_preference: member.boat_preference ?? '',
      own_boat: member.own_boat ?? '',
      dob: member.dob ?? '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft(null)
    setIsCreating(false)
  }

  const saveEdit = async () => {
    if (!editDraft) return
    setSaving(true)
    try {
      if (isCreating) {
        await create(editDraft)
      } else if (editingId) {
        await update(editingId, editDraft)
      }
      setEditingId(null)
      setEditDraft(null)
      setIsCreating(false)
    } catch (err) {
      console.error('Failed to save team member:', err)
    } finally {
      setSaving(false)
    }
  }

  const removeMember = async (id: string) => {
    try {
      await remove(id)
      setConfirmRemoveId(null)
      setEditingId(null)
      setEditDraft(null)
      setExpandedRow('')
    } catch (err) {
      console.error('Failed to remove team member:', err)
    }
  }

  const addMember = () => {
    const draft = createBlankDraft()
    setEditDraft(draft)
    setIsCreating(true)
    setEditingId('__new__')
    setExpandedRow('__new__')
  }

  const updateDraft = (field: keyof TeamMemberDraft, value: string) => {
    if (!editDraft) return
    setEditDraft((prev) => {
      if (!prev) return prev
      return { ...prev, [field]: value }
    })
  }

  // Dynamic stats
  const totalMembers = teamMembers.length

  // Combine real records with the in-progress new member for rendering
  const renderMembers: Array<TeamMemberRecord | { id: '__new__'; _isNew: true }> = isCreating
    ? [...teamMembers, { id: '__new__' as const, _isNew: true as const }]
    : teamMembers

  // Group paddlers by boat preference (direct value match — populated from dropdown)
  type BoatGroup = 'Play' | 'Half Slice' | 'Full Volume' | 'Unassigned'

  const grouped: Record<BoatGroup, TeamMemberRecord[]> = {
    'Play': [],
    'Half Slice': [],
    'Full Volume': [],
    'Unassigned': [],
  }
  teamMembers.forEach((m) => {
    const pref = m.boat_preference as BoatGroup
    if (pref === 'Play' || pref === 'Half Slice' || pref === 'Full Volume') {
      grouped[pref].push(m)
    } else {
      grouped['Unassigned'].push(m)
    }
  })

  const groupConfig: Array<{ key: Exclude<BoatGroup, 'Unassigned'>; icon: string; description: string }> = [
    { key: 'Play', icon: 'sports_esports', description: 'Playboats — short, low-volume, freestyle' },
    { key: 'Half Slice', icon: 'waves', description: 'Half-slice — playable river-runners with sliced sterns' },
    { key: 'Full Volume', icon: 'kayaking', description: 'Full-volume creekers and river-runners' },
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-pulse">groups</span>
          <p className="tactical-label mt-3">Loading Team Manifest</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant/20 overflow-y-auto">
        <div className="p-3 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-surface-container-high text-on-surface font-label text-xs uppercase tracking-widest text-left">
            <span className="material-symbols-outlined text-base">groups</span>
            Team Manifest
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-on-surface-variant font-label text-xs uppercase tracking-widest hover:text-on-surface hover:bg-surface-container transition-colors text-left">
            <span className="material-symbols-outlined text-base">inventory_2</span>
            Asset Allocation
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* Section Header */}
          <div>
            <p className="tactical-label">Logistics Segment 04 | Phase: Preparation</p>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-primary uppercase tracking-wide mt-2">
              Team & Medical Manifest
            </h1>
          </div>

          {/* Personnel Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="surface-card-elevated">
              <span className="tactical-label">Total Personnel</span>
              <p className="font-mono text-3xl text-on-surface mt-1 leading-none">
                {String(totalMembers).padStart(2, '0')} <span className="text-lg text-on-surface-variant">/ 16</span>
              </p>
            </div>
          </div>

          {/* Boat Type Breakdown — inline on screens under xl (sidebar version covers xl+) */}
          <div className="surface-card xl:hidden">
            <button
              onClick={() => setChartCollapsed((c) => !c)}
              className="w-full flex items-center gap-2 text-left"
            >
              <span className="material-symbols-outlined text-base text-tertiary">bar_chart</span>
              <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider flex-1">
                Boat Type Breakdown
              </h3>
              <span className={`material-symbols-outlined text-base text-on-surface-variant transition-transform ${chartCollapsed ? '' : 'rotate-180'}`}>
                expand_more
              </span>
            </button>
            {!chartCollapsed && (() => {
              const chartRows: Array<{ key: BoatGroup; count: number; color: string }> = [
                { key: 'Play', count: grouped['Play'].length, color: 'bg-tertiary' },
                { key: 'Half Slice', count: grouped['Half Slice'].length, color: 'bg-primary' },
                { key: 'Full Volume', count: grouped['Full Volume'].length, color: 'bg-tertiary-container' },
                { key: 'Unassigned', count: grouped['Unassigned'].length, color: 'bg-outline-variant/40' },
              ]
              const max = Math.max(1, ...chartRows.map((r) => r.count))
              return (
                <div className="space-y-2.5 mt-3">
                  {chartRows.map((row) => {
                    const pct = totalMembers > 0 ? Math.round((row.count / totalMembers) * 100) : 0
                    const widthPct = (row.count / max) * 100
                    return (
                      <div key={row.key}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
                            {row.key}
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono text-sm text-on-surface">
                              {String(row.count).padStart(2, '0')}
                            </span>
                            <span className="font-mono text-[9px] text-outline">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-surface-container-highest overflow-hidden">
                          <div
                            className={`h-full ${row.color} transition-all`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-surface-container-lowest p-1 w-fit">
            <button
              onClick={() => setViewMode('manifest')}
              className={`flex items-center gap-2 px-3 py-1.5 font-label text-xs uppercase tracking-widest transition-colors ${
                viewMode === 'manifest'
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-base">table_rows</span>
              Manifest
            </button>
            <button
              onClick={() => setViewMode('boatType')}
              className={`flex items-center gap-2 px-3 py-1.5 font-label text-xs uppercase tracking-widest transition-colors ${
                viewMode === 'boatType'
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-base">kayaking</span>
              By Boat Type
            </button>
          </div>

          {/* Grouped View — By Boat Type */}
          {viewMode === 'boatType' && (
            <div className="space-y-4">
              {groupConfig.map((group) => {
                const members = grouped[group.key]
                return (
                  <div key={group.key} className="surface-card p-0 overflow-hidden">
                    {/* Group Header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20">
                      <span className="material-symbols-outlined text-tertiary">{group.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
                          {group.key}
                        </h3>
                        <p className="tactical-label text-[9px] mt-0.5 normal-case tracking-normal">
                          {group.description}
                        </p>
                      </div>
                      <span className="font-mono text-2xl text-on-surface">
                        {String(members.length).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Member Cards */}
                    {members.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="tactical-label text-on-surface-variant">No paddlers in this group</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-outline-variant/10">
                        {members.map((m) => (
                          <div key={m.id} className="bg-surface-container-lowest p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                                <span className="font-mono text-xs text-on-surface-variant">
                                  {(m.first_name[0] || '?')}{(m.last_name[0] || '?')}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-display text-sm font-semibold text-on-surface uppercase tracking-wider truncate">
                                  {m.last_name || '---'}, {m.first_name || '---'}
                                </p>
                                <p className="tactical-label mt-0.5">
                                  {m.role || '---'}
                                  {m.boat_tag && <span className="text-tertiary ml-2">[{m.boat_tag}]</span>}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 pt-3 border-t border-outline-variant/10">
                              <div>
                                <span className="tactical-label text-[9px]">Height</span>
                                <p className="font-mono text-xs text-on-surface mt-0.5">
                                  {m.paddler_height || '---'}
                                </p>
                              </div>
                              <div>
                                <span className="tactical-label text-[9px]">Weight</span>
                                <p className="font-mono text-xs text-on-surface mt-0.5">
                                  {m.paddler_weight || '---'}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <span className="tactical-label text-[9px]">Boat Choice</span>
                                <p className="font-mono text-xs text-on-surface mt-0.5">
                                  {m.boat_preference || '---'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Unassigned */}
              {grouped['Unassigned'].length > 0 && (
                <div className="surface-card p-0 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20">
                    <span className="material-symbols-outlined text-on-surface-variant">help</span>
                    <div className="flex-1">
                      <h3 className="font-display text-sm font-bold text-on-surface-variant uppercase tracking-wider">
                        Unassigned
                      </h3>
                      <p className="tactical-label text-[9px] mt-0.5 normal-case tracking-normal">
                        Edit the paddler and pick a Boat Preference to assign them to a group
                      </p>
                    </div>
                    <span className="font-mono text-2xl text-on-surface-variant">
                      {String(grouped['Unassigned'].length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-outline-variant/10">
                    {grouped['Unassigned'].map((m) => (
                      <div key={m.id} className="bg-surface-container-lowest p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                            <span className="font-mono text-xs text-on-surface-variant">
                              {(m.first_name[0] || '?')}{(m.last_name[0] || '?')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-sm font-semibold text-on-surface uppercase tracking-wider truncate">
                              {m.last_name || '---'}, {m.first_name || '---'}
                            </p>
                            <p className="tactical-label mt-0.5">
                              {m.role || '---'}
                              {m.boat_tag && <span className="text-tertiary ml-2">[{m.boat_tag}]</span>}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 pt-3 border-t border-outline-variant/10">
                          <div>
                            <span className="tactical-label text-[9px]">Height</span>
                            <p className="font-mono text-xs text-on-surface mt-0.5">
                              {m.paddler_height || '---'}
                            </p>
                          </div>
                          <div>
                            <span className="tactical-label text-[9px]">Weight</span>
                            <p className="font-mono text-xs text-on-surface mt-0.5">
                              {m.paddler_weight || '---'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="tactical-label text-[9px]">Boat Choice</span>
                            <p className="font-mono text-xs text-on-surface mt-0.5">
                              {m.boat_preference || '---'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Team Manifest Table */}
          {viewMode === 'manifest' && (
          <div className="surface-card p-0 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_130px_130px_120px_90px_48px] gap-0 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20">
              <span className="tactical-label">Name</span>
              <span className="tactical-label">Role</span>
              <span className="tactical-label">Boater Nickname</span>
              <span className="tactical-label">Boat Pref</span>
              <span className="tactical-label">Own Boat</span>
              <span />
            </div>

            {/* Table Rows */}
            {renderMembers.map((entry, idx) => {
              // Check if this is the new member placeholder
              const isNew = '_isNew' in entry
              const memberId = entry.id
              const member: TeamMemberDraft = isNew
                ? editDraft!
                : {
                    first_name: (entry as TeamMemberRecord).first_name,
                    last_name: (entry as TeamMemberRecord).last_name,
                    role: (entry as TeamMemberRecord).role,
                    boat_tag: (entry as TeamMemberRecord).boat_tag,
                    blood_type: (entry as TeamMemberRecord).blood_type,
                    certifications: (entry as TeamMemberRecord).certifications,
                    critical_history: (entry as TeamMemberRecord).critical_history,
                    emergency_contact_name: (entry as TeamMemberRecord).emergency_contact_name,
                    emergency_contact_phone: (entry as TeamMemberRecord).emergency_contact_phone,
                    emergency_contact_relation: (entry as TeamMemberRecord).emergency_contact_relation,
                    paddler_height: (entry as TeamMemberRecord).paddler_height ?? '',
                    paddler_weight: (entry as TeamMemberRecord).paddler_weight ?? '',
                    boat_preference: (entry as TeamMemberRecord).boat_preference ?? '',
                    own_boat: (entry as TeamMemberRecord).own_boat ?? '',
                    dob: (entry as TeamMemberRecord).dob ?? '',
                  }

              const displayData = editingId === memberId && editDraft ? editDraft : member

              return (
                <div key={memberId}>
                  {/* Row */}
                  <div
                    className={`grid grid-cols-1 md:grid-cols-[1fr_130px_130px_120px_90px_48px] gap-2 md:gap-0 items-center px-4 py-3 border-b border-outline-variant/10 cursor-pointer hover:bg-surface-container-high/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'
                    }`}
                    onClick={() => toggleRow(memberId)}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-[10px] text-on-surface-variant">
                          {(displayData.first_name[0] || '?')}{(displayData.last_name[0] || '?')}
                        </span>
                      </div>
                      <div>
                        <p className="font-display text-sm font-semibold text-on-surface uppercase tracking-wider">
                          {displayData.last_name || '---'}, {displayData.first_name || '---'}
                        </p>
                        <p className="md:hidden tactical-label mt-0.5">{displayData.role || '---'}</p>
                      </div>
                    </div>

                    {/* Role */}
                    <span className="hidden md:block font-mono text-xs text-on-surface-variant">
                      {displayData.role || '---'}
                    </span>

                    {/* Boater Nickname */}
                    <div className="hidden md:block">
                      {displayData.boat_tag ? (
                        <span className="px-1.5 py-0.5 bg-surface-container-highest font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                          {displayData.boat_tag}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-outline">---</span>
                      )}
                    </div>

                    {/* Boat Preference */}
                    <div className="hidden md:block">
                      {displayData.boat_preference ? (
                        <span className="px-1.5 py-0.5 bg-surface-container-highest font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                          {displayData.boat_preference}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-outline">---</span>
                      )}
                    </div>

                    {/* Own Boat */}
                    <div className="hidden md:block">
                      {displayData.own_boat === 'Yes' && (
                        <span className="px-1.5 py-0.5 bg-tertiary-container text-tertiary font-label text-[10px] uppercase tracking-widest">
                          Yes
                        </span>
                      )}
                      {displayData.own_boat === 'No' && (
                        <span className="px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant font-label text-[10px] uppercase tracking-widest">
                          No
                        </span>
                      )}
                      {displayData.own_boat === 'Maybe' && (
                        <span className="px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant font-label text-[10px] uppercase tracking-widest border border-outline-variant/40">
                          Maybe
                        </span>
                      )}
                      {!displayData.own_boat && (
                        <span className="font-mono text-xs text-outline">---</span>
                      )}
                    </div>

                    {/* Expand Button */}
                    <div className="hidden md:flex justify-center">
                      <span
                        className={`material-symbols-outlined text-lg text-on-surface-variant transition-transform ${
                          expandedRow === memberId ? 'rotate-180' : ''
                        }`}
                      >
                        expand_more
                      </span>
                    </div>

                    {/* Mobile: condensed info */}
                    <div className="md:hidden flex items-center gap-3 flex-wrap">
                      {displayData.boat_tag && (
                        <span className="px-1.5 py-0.5 bg-surface-container-highest font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                          {displayData.boat_tag}
                        </span>
                      )}
                      {displayData.boat_preference && (
                        <span className="px-1.5 py-0.5 bg-surface-container-highest font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                          {displayData.boat_preference}
                        </span>
                      )}
                      {displayData.own_boat === 'Yes' && (
                        <span className="px-1.5 py-0.5 bg-tertiary-container text-tertiary font-label text-[10px] uppercase tracking-widest">
                          Own boat: Yes
                        </span>
                      )}
                      {displayData.own_boat === 'No' && (
                        <span className="px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant font-label text-[10px] uppercase tracking-widest">
                          Own boat: No
                        </span>
                      )}
                      {displayData.own_boat === 'Maybe' && (
                        <span className="px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant font-label text-[10px] uppercase tracking-widest border border-outline-variant/40">
                          Own boat: Maybe
                        </span>
                      )}
                      <span
                        className={`material-symbols-outlined text-lg text-on-surface-variant transition-transform ml-auto ${
                          expandedRow === memberId ? 'rotate-180' : ''
                        }`}
                      >
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Expanded Detail (read-only view) */}
                  {expandedRow === memberId && editingId !== memberId && !isNew && (
                    <div className="bg-surface-container border-b border-outline-variant/20">
                      <div className="px-4 py-4 lg:px-6 lg:py-5">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-base text-tertiary">medical_information</span>
                          <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
                            Medical Notes
                          </h3>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(entry as TeamMemberRecord) }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Edit
                            </button>
                            {confirmRemoveId === memberId ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeMember(memberId) }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-error-container text-error font-label text-xs uppercase tracking-widest hover:brightness-110 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">check</span>
                                  Confirm
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(null) }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(memberId) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-error font-label text-xs uppercase tracking-widest hover:bg-error-container transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">person_remove</span>
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <span className="tactical-label">Date of Birth</span>
                            <p className="font-mono text-sm text-on-surface mt-1">
                              {member.dob || '---'}
                              {(() => {
                                const age = computeAge(member.dob)
                                return age != null ? <span className="text-tertiary ml-2">({age} yrs)</span> : null
                              })()}
                            </p>
                          </div>
                          <div>
                            <span className="tactical-label">Blood Type</span>
                            <p className="font-mono text-sm text-on-surface mt-1">{member.blood_type || '---'}</p>
                          </div>
                          <div className="sm:col-span-2 lg:col-span-2">
                            <span className="tactical-label">Certifications</span>
                            <p className="font-mono text-sm text-on-surface mt-1">{member.certifications || '---'}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <span className="tactical-label">Critical History</span>
                          <p className="font-body text-sm text-on-surface-variant mt-1 leading-relaxed">
                            {member.critical_history}
                          </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-outline-variant/20">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-base text-tertiary">straighten</span>
                            <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
                              Paddler Specs
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <span className="tactical-label">Height</span>
                              <p className="font-mono text-sm text-on-surface mt-1">
                                {member.paddler_height || '---'}
                              </p>
                            </div>
                            <div>
                              <span className="tactical-label">Weight</span>
                              <p className="font-mono text-sm text-on-surface mt-1">
                                {member.paddler_weight || '---'}
                              </p>
                            </div>
                            <div>
                              <span className="tactical-label">Boat Preference</span>
                              <p className="font-mono text-sm text-on-surface mt-1">
                                {member.boat_preference || '---'}
                              </p>
                            </div>
                            <div>
                              <span className="tactical-label">Own Boat</span>
                              <p className="font-mono text-sm text-on-surface mt-1">
                                {member.own_boat || '---'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-outline-variant/20">
                          <span className="tactical-label">Emergency Contact</span>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-1">
                            <span className="font-mono text-sm text-on-surface">
                              {member.emergency_contact_name}
                            </span>
                            <span className="font-mono text-sm text-tertiary">
                              {member.emergency_contact_phone}
                            </span>
                            <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                              Relation: {member.emergency_contact_relation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Edit Form */}
                  {expandedRow === memberId && editingId === memberId && editDraft && (
                    <div className="bg-surface-container border-b border-outline-variant/20">
                      <div className="px-4 py-4 lg:px-6 lg:py-5">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-base text-tertiary">edit_note</span>
                          <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
                            {isNew ? 'New Member' : 'Edit Member'}
                          </h3>
                        </div>

                        {/* Identity Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="tactical-label block mb-1">First Name</label>
                            <input
                              type="text"
                              className={inputClasses}
                              value={editDraft.first_name}
                              onChange={(e) => updateDraft('first_name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="tactical-label block mb-1">Last Name</label>
                            <input
                              type="text"
                              className={inputClasses}
                              value={editDraft.last_name}
                              onChange={(e) => updateDraft('last_name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="tactical-label block mb-1">Role</label>
                            <input
                              type="text"
                              className={inputClasses}
                              value={editDraft.role}
                              onChange={(e) => updateDraft('role', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="tactical-label block mb-1">Boater Nickname</label>
                            <input
                              type="text"
                              className={inputClasses}
                              placeholder="Custom tag"
                              value={editDraft.boat_tag}
                              onChange={(e) => updateDraft('boat_tag', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Medical Detail Header */}
                        <div className="flex items-center gap-2 mt-6 mb-4">
                          <span className="material-symbols-outlined text-base text-tertiary">medical_information</span>
                          <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
                            Medical Notes
                          </h3>
                        </div>

                        {/* Medical Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="tactical-label block mb-1">Date of Birth</label>
                            <input
                              type="text"
                              className={inputClasses}
                              placeholder="DD/MM/YYYY"
                              value={editDraft.dob}
                              onChange={(e) => updateDraft('dob', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="tactical-label block mb-1">Blood Type</label>
                            <input
                              type="text"
                              className={inputClasses}
                              value={editDraft.blood_type}
                              onChange={(e) => updateDraft('blood_type', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-2">
                            <label className="tactical-label block mb-1">Certifications</label>
                            <input
                              type="text"
                              className={inputClasses}
                              value={editDraft.certifications}
                              onChange={(e) => updateDraft('certifications', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="tactical-label block mb-1">Critical History</label>
                          <textarea
                            className={textareaClasses}
                            rows={3}
                            value={editDraft.critical_history}
                            onChange={(e) => updateDraft('critical_history', e.target.value)}
                          />
                        </div>

                        {/* Paddler Specs */}
                        <div className="mt-6 pt-4 border-t border-outline-variant/20">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-base text-tertiary">straighten</span>
                            <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
                              Paddler Specs
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="tactical-label block mb-1">Height</label>
                              <input
                                type="text"
                                className={inputClasses}
                                placeholder="e.g. 5'10&quot; / 178cm"
                                value={editDraft.paddler_height}
                                onChange={(e) => updateDraft('paddler_height', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="tactical-label block mb-1">Weight</label>
                              <input
                                type="text"
                                className={inputClasses}
                                placeholder="e.g. 180 lb / 82 kg"
                                value={editDraft.paddler_weight}
                                onChange={(e) => updateDraft('paddler_weight', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="tactical-label block mb-1">Boat Preference</label>
                              <select
                                className={selectClasses}
                                value={editDraft.boat_preference}
                                onChange={(e) => updateDraft('boat_preference', e.target.value)}
                              >
                                <option value="">— Unassigned —</option>
                                {BOAT_PREFERENCE_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="tactical-label block mb-1">Own Boat</label>
                              <select
                                className={selectClasses}
                                value={editDraft.own_boat}
                                onChange={(e) => updateDraft('own_boat', e.target.value)}
                              >
                                <option value="">— Unspecified —</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Maybe">Maybe</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="mt-4 pt-4 border-t border-outline-variant/20">
                          <span className="tactical-label block mb-3">Emergency Contact</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="tactical-label block mb-1">Contact Name</label>
                              <input
                                type="text"
                                className={inputClasses}
                                value={editDraft.emergency_contact_name}
                                onChange={(e) => updateDraft('emergency_contact_name', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="tactical-label block mb-1">Phone</label>
                              <input
                                type="text"
                                className={inputClasses}
                                value={editDraft.emergency_contact_phone}
                                onChange={(e) => updateDraft('emergency_contact_phone', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="tactical-label block mb-1">Relation</label>
                              <input
                                type="text"
                                className={inputClasses}
                                value={editDraft.emergency_contact_relation}
                                onChange={(e) => updateDraft('emergency_contact_relation', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-outline-variant/20">
                          <button
                            onClick={(e) => { e.stopPropagation(); saveEdit() }}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-label text-xs uppercase tracking-widest hover:brightness-90 transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-sm">{saving ? 'hourglass_empty' : 'save'}</span>
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelEdit() }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high text-on-surface-variant font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
                          >
                            Cancel
                          </button>
                          <div className="flex-1" />
                          {!isNew && (
                            <>
                              {confirmRemoveId === memberId ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeMember(memberId) }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-error-container text-error font-label text-xs uppercase tracking-widest hover:brightness-110 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-sm">check</span>
                                    Confirm Remove
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(null) }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(memberId) }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-error font-label text-xs uppercase tracking-widest hover:bg-error-container transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">person_remove</span>
                                  Remove
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Member Button */}
            <div className="px-4 py-3 border-t border-outline-variant/20">
              <button
                onClick={addMember}
                disabled={isCreating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-high text-on-surface font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                Add Member
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="hidden xl:flex flex-col w-72 flex-shrink-0 bg-surface-container-lowest border-l border-outline-variant/20 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Quick Actions */}
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-surface-container-high text-on-surface font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors text-left">
              <span className="material-symbols-outlined text-base">print</span>
              Export Manifest
            </button>
          </div>

          {/* Boat Type Breakdown Chart */}
          <div className="surface-card p-4">
            <button
              onClick={() => setChartCollapsed((c) => !c)}
              className="w-full flex items-center gap-2 text-left"
            >
              <span className="material-symbols-outlined text-base text-tertiary">bar_chart</span>
              <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider flex-1">
                Boat Type Breakdown
              </h3>
              <span className={`material-symbols-outlined text-base text-on-surface-variant transition-transform ${chartCollapsed ? '' : 'rotate-180'}`}>
                expand_more
              </span>
            </button>
            {!chartCollapsed && (() => {
              const chartRows: Array<{ key: BoatGroup; count: number; color: string }> = [
                { key: 'Play', count: grouped['Play'].length, color: 'bg-tertiary' },
                { key: 'Half Slice', count: grouped['Half Slice'].length, color: 'bg-primary' },
                { key: 'Full Volume', count: grouped['Full Volume'].length, color: 'bg-tertiary-container' },
                { key: 'Unassigned', count: grouped['Unassigned'].length, color: 'bg-outline-variant/40' },
              ]
              const max = Math.max(1, ...chartRows.map((r) => r.count))
              return (
                <div className="space-y-2.5 mt-3">
                  {chartRows.map((row) => {
                    const pct = totalMembers > 0 ? Math.round((row.count / totalMembers) * 100) : 0
                    const widthPct = (row.count / max) * 100
                    return (
                      <div key={row.key}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
                            {row.key}
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono text-sm text-on-surface">
                              {String(row.count).padStart(2, '0')}
                            </span>
                            <span className="font-mono text-[9px] text-outline">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-surface-container-highest overflow-hidden">
                          <div
                            className={`h-full ${row.color} transition-all`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-3 mt-3 border-t border-outline-variant/20 flex items-baseline justify-between">
                    <span className="tactical-label">Total</span>
                    <span className="font-mono text-sm text-on-surface">
                      {String(totalMembers).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </aside>
    </div>
  )
}
