import { useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'

interface TeamMemberRecord extends RecordModel {
  id: string
  first_name: string
  last_name: string
  role: string
  role_code: string
  boat: string
  boat_tag: string
  medical_alert: string
  status: 'CLEARED' | 'PENDING' | 'FLAGGED'
  blood_type: string
  certifications: string
  critical_history: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
}

type TeamMemberDraft = Omit<TeamMemberRecord, 'id' | 'collectionId' | 'collectionName' | 'created' | 'updated' | 'expand'>

interface MedKitItem {
  label: string
  current: number
  required: number
}

const medKitItems: MedKitItem[] = [
  { label: 'EPI-PENS', current: 8, required: 8 },
  { label: 'IV SALINE (1L)', current: 4, required: 4 },
  { label: 'BROAD-SPEC ANTIBIOTICS', current: 2, required: 6 },
]

function createBlankDraft(): TeamMemberDraft {
  return {
    first_name: '',
    last_name: '',
    role: '',
    role_code: '',
    boat: 'RAFT 01',
    boat_tag: 'LEAD',
    medical_alert: '',
    status: 'PENDING',
    blood_type: '',
    certifications: '',
    critical_history: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
  }
}

const BOAT_OPTIONS = ['RAFT 01', 'RAFT 02', 'RAFT 03', 'RAFT 04'] as const
const BOAT_TAG_OPTIONS = ['LEAD', 'SUPPLY', 'KITCHEN', 'TAIL'] as const
const STATUS_OPTIONS: TeamMemberRecord['status'][] = ['CLEARED', 'PENDING', 'FLAGGED']

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'
const selectClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer'
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
      role_code: member.role_code,
      boat: member.boat,
      boat_tag: member.boat_tag,
      medical_alert: member.medical_alert,
      status: member.status,
      blood_type: member.blood_type,
      certifications: member.certifications,
      critical_history: member.critical_history,
      emergency_contact_name: member.emergency_contact_name,
      emergency_contact_phone: member.emergency_contact_phone,
      emergency_contact_relation: member.emergency_contact_relation,
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
  const clearedCount = teamMembers.filter((m) => m.status === 'CLEARED').length
  const clearancePct = totalMembers > 0 ? Math.round((clearedCount / totalMembers) * 100) : 0

  // Dynamic boat assignments
  const boatCounts = (['RAFT 01', 'RAFT 02', 'RAFT 03', 'RAFT 04'] as const).map((boat) => {
    const members = teamMembers.filter((m) => m.boat === boat)
    const tag = members.length > 0 ? members[0].boat_tag : { 'RAFT 01': 'LEAD', 'RAFT 02': 'SUPPLY', 'RAFT 03': 'KITCHEN', 'RAFT 04': 'TAIL' }[boat]
    return { boat, tag, count: members.length }
  })
  const activeBoats = boatCounts.filter((b) => b.count > 0).length

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
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-on-surface-variant font-label text-xs uppercase tracking-widest hover:text-on-surface hover:bg-surface-container transition-colors text-left">
            <span className="material-symbols-outlined text-base">emergency</span>
            Emergency Protocols
          </button>
        </div>

        {/* Boat Assignments Summary */}
        <div className="flex-1 border-t border-outline-variant/20 px-3 py-4">
          <h3 className="tactical-label px-2 mb-3">Boat Assignments</h3>
          <div className="space-y-0">
            {boatCounts.map((b) => (
              <div
                key={b.boat}
                className="flex items-center justify-between px-2 py-1.5 border-l border-outline-variant/30"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-wider text-outline">{b.boat}</span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {b.tag}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-on-surface">{b.count}</span>
              </div>
            ))}
          </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="surface-card-elevated">
              <span className="tactical-label">Total Personnel</span>
              <p className="font-mono text-3xl text-on-surface mt-1 leading-none">
                {String(totalMembers).padStart(2, '0')} <span className="text-lg text-on-surface-variant">/ 16</span>
              </p>
            </div>
            <div className="surface-card-elevated">
              <span className="tactical-label">Medical Clearance</span>
              <p className="font-mono text-3xl text-on-surface mt-1 leading-none">
                {clearancePct}<span className="text-lg text-on-surface-variant">%</span>
              </p>
            </div>
            <div className="surface-card-elevated hidden sm:block">
              <span className="tactical-label">Boats Assigned</span>
              <p className="font-mono text-3xl text-on-surface mt-1 leading-none">
                {String(activeBoats).padStart(2, '0')} <span className="text-lg text-on-surface-variant">active</span>
              </p>
            </div>
          </div>

          {/* Team Manifest Table */}
          <div className="surface-card p-0 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_60px_140px_180px_100px_48px] gap-0 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20">
              <span className="tactical-label">Name</span>
              <span className="tactical-label">Role</span>
              <span className="tactical-label">Boat Assignment</span>
              <span className="tactical-label">Medical Alerts</span>
              <span className="tactical-label">Review</span>
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
                    role_code: (entry as TeamMemberRecord).role_code,
                    boat: (entry as TeamMemberRecord).boat,
                    boat_tag: (entry as TeamMemberRecord).boat_tag,
                    medical_alert: (entry as TeamMemberRecord).medical_alert,
                    status: (entry as TeamMemberRecord).status,
                    blood_type: (entry as TeamMemberRecord).blood_type,
                    certifications: (entry as TeamMemberRecord).certifications,
                    critical_history: (entry as TeamMemberRecord).critical_history,
                    emergency_contact_name: (entry as TeamMemberRecord).emergency_contact_name,
                    emergency_contact_phone: (entry as TeamMemberRecord).emergency_contact_phone,
                    emergency_contact_relation: (entry as TeamMemberRecord).emergency_contact_relation,
                  }

              const displayData = editingId === memberId && editDraft ? editDraft : member

              return (
                <div key={memberId}>
                  {/* Row */}
                  <div
                    className={`grid grid-cols-1 md:grid-cols-[1fr_60px_140px_180px_100px_48px] gap-2 md:gap-0 items-center px-4 py-3 border-b border-outline-variant/10 cursor-pointer hover:bg-surface-container-high/50 transition-colors ${
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

                    {/* Role Code */}
                    <span className="hidden md:block font-mono text-xs text-on-surface-variant">
                      {displayData.role_code || '---'}
                    </span>

                    {/* Boat */}
                    <div className="hidden md:flex items-center gap-2">
                      <span className="font-mono text-xs text-on-surface">{displayData.boat}</span>
                      <span className="px-1.5 py-0.5 bg-surface-container-highest font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                        {displayData.boat_tag}
                      </span>
                    </div>

                    {/* Medical Alerts */}
                    <div className="hidden md:block">
                      <span
                        className={`font-label text-xs uppercase tracking-widest ${
                          displayData.medical_alert === 'NONE REPORTED' || displayData.medical_alert === ''
                            ? 'text-on-surface-variant'
                            : 'text-tertiary'
                        }`}
                      >
                        {displayData.medical_alert || 'NONE REPORTED'}
                      </span>
                    </div>

                    {/* Review Status */}
                    <div className="hidden md:block">
                      <span
                        className={`inline-block px-2 py-0.5 font-label text-[10px] uppercase tracking-widest ${
                          displayData.status === 'CLEARED'
                            ? 'bg-surface-container-highest text-primary'
                            : displayData.status === 'FLAGGED'
                              ? 'bg-error-container text-error'
                              : 'bg-tertiary-container text-on-tertiary'
                        }`}
                      >
                        {displayData.status}
                      </span>
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
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        {displayData.boat} [{displayData.boat_tag}]
                      </span>
                      <span
                        className={`font-label text-[10px] uppercase tracking-widest ${
                          displayData.medical_alert === 'NONE REPORTED' || displayData.medical_alert === ''
                            ? 'text-on-surface-variant'
                            : 'text-tertiary'
                        }`}
                      >
                        {displayData.medical_alert || 'NONE REPORTED'}
                      </span>
                      <span className="inline-block px-2 py-0.5 bg-surface-container-highest font-label text-[10px] uppercase tracking-widest text-primary">
                        {displayData.status}
                      </span>
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
                            <span className="tactical-label">Blood Type</span>
                            <p className="font-mono text-sm text-on-surface mt-1">{member.blood_type}</p>
                          </div>
                          <div className="sm:col-span-1 lg:col-span-3">
                            <span className="tactical-label">Certifications</span>
                            <p className="font-mono text-sm text-on-surface mt-1">{member.certifications}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <span className="tactical-label">Critical History</span>
                          <p className="font-body text-sm text-on-surface-variant mt-1 leading-relaxed">
                            {member.critical_history}
                          </p>
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
                            <label className="tactical-label block mb-1">Role Code</label>
                            <input
                              type="text"
                              className={inputClasses}
                              value={editDraft.role_code}
                              onChange={(e) => updateDraft('role_code', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Assignment Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                          <div>
                            <label className="tactical-label block mb-1">Boat Assignment</label>
                            <select
                              className={selectClasses}
                              value={editDraft.boat}
                              onChange={(e) => updateDraft('boat', e.target.value)}
                            >
                              {BOAT_OPTIONS.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="tactical-label block mb-1">Boat Tag</label>
                            <select
                              className={selectClasses}
                              value={editDraft.boat_tag}
                              onChange={(e) => updateDraft('boat_tag', e.target.value)}
                            >
                              {BOAT_TAG_OPTIONS.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="tactical-label block mb-1">Medical Alert</label>
                            <input
                              type="text"
                              className={inputClasses}
                              value={editDraft.medical_alert}
                              onChange={(e) => updateDraft('medical_alert', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="tactical-label block mb-1">Review Status</label>
                            <select
                              className={selectClasses}
                              value={editDraft.status}
                              onChange={(e) => updateDraft('status', e.target.value)}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
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
                            <label className="tactical-label block mb-1">Blood Type</label>
                            <input
                              type="text"
                              className={inputClasses}
                              value={editDraft.blood_type}
                              onChange={(e) => updateDraft('blood_type', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-1 lg:col-span-3">
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
          {/* Med-Kit Allocation Plan */}
          <div className="surface-card space-y-3">
            <h3 className="tactical-label">Med-Kit Allocation Plan</h3>
            {medKitItems.map((item) => {
              const pct = (item.current / item.required) * 100
              const isFull = item.current >= item.required
              return (
                <div key={item.label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-label text-xs text-on-surface-variant">{item.label}</span>
                    <span className="font-mono text-xs text-on-surface">
                      {String(item.current).padStart(2, '0')}/{String(item.required).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-highest">
                    <div
                      className={`h-full ${isFull ? 'bg-primary' : 'bg-error'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Planned Extraction Zone */}
          <div className="surface-card-elevated border-l-2 border-tertiary">
            <h3 className="tactical-label">Planned Extraction Zone</h3>
            <p className="font-mono text-2xl text-on-surface mt-2 leading-none">
              MILE 130.5
            </p>
            <p className="font-label text-xs font-semibold text-tertiary uppercase tracking-widest mt-2">
              Primary Evac Point
            </p>
          </div>

          {/* Comm Plan Status */}
          <div className="surface-card space-y-3">
            <h3 className="tactical-label">Comm Plan Status</h3>
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-on-surface-variant">satellite_alt</span>
                <span className="font-mono text-sm text-on-surface">Starlink</span>
                <span className="ml-auto px-1.5 py-0.5 bg-surface-container-highest font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Primary
                </span>
              </div>
            </div>
            <div>
              <span className="tactical-label">Coverage Verified</span>
              <p className="font-mono text-2xl text-on-surface mt-1 leading-none">
                98.4<span className="text-sm text-on-surface-variant">%</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full" />
              <span className="tactical-label">
                Link Status: <span className="text-on-surface">Nominal</span>
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-surface-container-high text-on-surface font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors text-left">
              <span className="material-symbols-outlined text-base">print</span>
              Export Manifest
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-surface-container-high text-on-surface font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors text-left">
              <span className="material-symbols-outlined text-base">verified_user</span>
              Run Med-Check
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
