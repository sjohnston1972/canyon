import { useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { isUnicornPaddler } from '@/lib/easterEgg'
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
const textareaClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 resize-y min-h-[60px]'

export default function Team() {
  const { records: teamMembers, loading, create, update, remove } = useCollection<TeamMemberRecord>('team_members')

  const [expandedRow, setExpandedRow] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<TeamMemberDraft | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

          {/* Team Manifest Table */}
          <div className="surface-card p-0 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_180px_160px_48px] gap-0 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20">
              <span className="tactical-label">Name</span>
              <span className="tactical-label">Role</span>
              <span className="tactical-label">Boater Nickname</span>
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
                    className={`grid grid-cols-1 md:grid-cols-[1fr_180px_160px_48px] gap-2 md:gap-0 items-center px-4 py-3 border-b border-outline-variant/10 cursor-pointer hover:bg-surface-container-high/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'
                    }`}
                    onClick={() => toggleRow(memberId)}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3">
                      {isUnicornPaddler({ id: memberId, first_name: displayData.first_name, last_name: displayData.last_name }) ? (
                        <div className="w-8 h-8 bg-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-base leading-none">🦄</span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                          <span className="font-mono text-[10px] text-on-surface-variant">
                            {(displayData.first_name[0] || '?')}{(displayData.last_name[0] || '?')}
                          </span>
                        </div>
                      )}
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        </div>
      </aside>
    </div>
  )
}
