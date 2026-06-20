import { useMemo, useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'

interface BoatRecord extends RecordModel {
  slug: string
  name: string
  manufacturer: string
  model: string
  size: string
  category: string
  description: string
  supplier: string
  available_count: number
  sort_order: number
  conflict_resolved: boolean
  conflict_note: string
}

interface BoatChoiceRecord extends RecordModel {
  team_member_id: string
  first_choice_id: string
  second_choice_id: string
  third_choice_id: string
  notes: string
}

interface TeamMemberRecord extends RecordModel {
  first_name: string
  last_name: string
  boat_tag: string
  boat_preference: string
  paddler_weight: string
  own_boat: string
}

const CATEGORY_ORDER = ['Playboat', 'Half-Slice', 'Creek', 'Expedition'] as const
type Category = typeof CATEGORY_ORDER[number]

const CATEGORY_META: Record<Category, { icon: string; tag: string; blurb: string }> = {
  'Playboat':   { icon: 'sports_esports', tag: 'PLAY',  blurb: 'Short, low-volume freestyle hulls — tricks and surfing.' },
  'Half-Slice': { icon: 'waves',          tag: 'HALF',  blurb: 'Sliced-stern and modern river-running hulls — the Canyon workhorse fleet.' },
  'Creek':      { icon: 'terrain',        tag: 'CREEK', blurb: 'Big-volume displacement hulls — punches holes, charges big water.' },
  'Expedition': { icon: 'luggage',        tag: 'XP',    blurb: 'Self-support hulls with internal storage. Required for kayak self-support.' },
}

type Pick = 'first' | 'second' | 'third'

const PICK_META: Record<Pick, { label: string; rank: string; color: string; tile: string }> = {
  first:  { label: '1st Choice', rank: '01', color: 'text-tertiary',           tile: 'bg-tertiary-container text-on-tertiary' },
  second: { label: '2nd Choice', rank: '02', color: 'text-primary',            tile: 'bg-primary text-on-primary' },
  third:  { label: '3rd Choice', rank: '03', color: 'text-on-surface-variant', tile: 'bg-surface-container-high text-on-surface' },
}

export default function Boats() {
  const { records: boats, loading: boatsLoading, update: updateBoat } = useCollection<BoatRecord>('boats', { sort: 'sort_order' })
  const { records: choices, loading: choicesLoading, create, update, remove: removeChoice } = useCollection<BoatChoiceRecord>('boat_choices')
  const { records: members, loading: membersLoading } = useCollection<TeamMemberRecord>('team_members', { sort: 'last_name' })

  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All')
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ first: string; second: string; third: string }>({ first: '', second: '', third: '' })
  const [savingId, setSavingId] = useState<string | null>(null)
  const [expandedBoat, setExpandedBoat] = useState<string>('')
  const [draggedBoatId, setDraggedBoatId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<Category | null>(null)
  const [movingBoatId, setMovingBoatId] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [confirmUnsetId, setConfirmUnsetId] = useState<string | null>(null)
  const [unsettingId, setUnsettingId] = useState<string | null>(null)
  // Per-boat note drafts while resolving/editing a conflict, keyed by boat id.
  const [conflictNotes, setConflictNotes] = useState<Record<string, string>>({})
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const loading = boatsLoading || choicesLoading || membersLoading

  const choicesByMember = useMemo(() => {
    const map = new Map<string, BoatChoiceRecord>()
    for (const c of choices) map.set(c.team_member_id, c)
    return map
  }, [choices])

  const boatById = useMemo(() => {
    const map = new Map<string, BoatRecord>()
    for (const b of boats) map.set(b.id, b)
    return map
  }, [boats])

  // Demand counts: how many paddlers want each boat in any slot
  const demand = useMemo(() => {
    const map = new Map<string, { first: number; second: number; third: number; total: number }>()
    for (const c of choices) {
      for (const [slot, id] of [['first', c.first_choice_id], ['second', c.second_choice_id], ['third', c.third_choice_id]] as const) {
        if (!id) continue
        const cur = map.get(id) ?? { first: 0, second: 0, third: 0, total: 0 }
        cur[slot]++
        cur.total++
        map.set(id, cur)
      }
    }
    return map
  }, [choices])

  const boatsByCategory = useMemo(() => {
    const grouped: Record<Category, BoatRecord[]> = {
      'Playboat': [], 'Half-Slice': [], 'Creek': [], 'Expedition': [],
    }
    for (const b of boats) {
      const cat = (CATEGORY_ORDER as readonly string[]).includes(b.category) ? (b.category as Category) : null
      if (cat) grouped[cat].push(b)
    }
    return grouped
  }, [boats])

  const totals = useMemo(() => ({
    boats: boats.length,
    units: boats.reduce((sum, b) => sum + (b.available_count || 0), 0),
    assigned: choices.length,
    pending: members.length - choices.length,
  }), [boats, choices, members])

  const visibleCategories: Category[] = activeCategory === 'All' ? [...CATEGORY_ORDER] : [activeCategory]

  // ─── Derived: conflicts, chart data, procurement report ──────
  const conflicts = useMemo(() => {
    return boats
      .filter((b) => (demand.get(b.id)?.first || 0) > (b.available_count || 0))
      .map((b) => ({ boat: b, firstPicks: demand.get(b.id)!.first }))
      .sort((a, b) => b.firstPicks - a.firstPicks)
  }, [boats, demand])

  const activeConflicts = useMemo(() => conflicts.filter((c) => !c.boat.conflict_resolved), [conflicts])
  const resolvedConflicts = useMemo(() => conflicts.filter((c) => c.boat.conflict_resolved), [conflicts])

  async function resolveConflict(boatId: string) {
    setResolvingId(boatId)
    try {
      // Use the typed draft if there is one; otherwise keep any note already on the boat
      // (so reopening then re-resolving without retyping doesn't wipe the note).
      const draft = conflictNotes[boatId]
      const note = draft !== undefined ? draft.trim() : (boatById.get(boatId)?.conflict_note ?? '')
      await updateBoat(boatId, { conflict_resolved: true, conflict_note: note })
      setConflictNotes((prev) => { const next = { ...prev }; delete next[boatId]; return next })
    } catch (err) {
      console.error('Failed to resolve conflict', err)
    } finally {
      setResolvingId(null)
    }
  }

  async function reopenConflict(boatId: string) {
    setResolvingId(boatId)
    try {
      await updateBoat(boatId, { conflict_resolved: false })
    } catch (err) {
      console.error('Failed to reopen conflict', err)
    } finally {
      setResolvingId(null)
    }
  }

  async function saveConflictNote(boatId: string, note: string) {
    setResolvingId(boatId)
    try {
      await updateBoat(boatId, { conflict_note: note.trim() })
      setConflictNotes((prev) => { const next = { ...prev }; delete next[boatId]; return next })
    } catch (err) {
      console.error('Failed to save conflict note', err)
    } finally {
      setResolvingId(null)
    }
  }

  const picksByBoat = useMemo(() => {
    return boats
      .map((b) => ({ boat: b, d: demand.get(b.id) }))
      .filter((x): x is { boat: BoatRecord; d: NonNullable<ReturnType<typeof demand.get>> } => !!x.d && x.d.total > 0)
      .sort((a, b) => b.d.total - a.d.total)
  }, [boats, demand])

  const picksByCategory = useMemo(() => {
    const map: Record<Category, number> = { 'Playboat': 0, 'Half-Slice': 0, 'Creek': 0, 'Expedition': 0 }
    for (const c of choices) {
      if (!c.first_choice_id) continue
      const boat = boatById.get(c.first_choice_id)
      if (!boat) continue
      if ((CATEGORY_ORDER as readonly string[]).includes(boat.category)) {
        map[boat.category as Category]++
      }
    }
    const total = (Object.values(map) as number[]).reduce((s, n) => s + n, 0)
    return { byCat: map, total }
  }, [choices, boatById])

  const procurement = useMemo(() => {
    const map = new Map<string, Array<{ boat: BoatRecord; demand: number }>>()
    for (const b of boats) {
      const d = demand.get(b.id)?.first || 0
      if (d === 0) continue
      const supplier = b.supplier || 'Unknown'
      if (!map.has(supplier)) map.set(supplier, [])
      map.get(supplier)!.push({ boat: b, demand: d })
    }
    for (const [, list] of map) list.sort((a, b) => b.demand - a.demand)
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [boats, demand])

  // ─── Drag & drop ─────────────────────────────────────────────
  const handleBoatDragStart = (e: React.DragEvent<HTMLDivElement>, boatId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', boatId)
    setDraggedBoatId(boatId)
    setMoveError(null)
  }

  const handleBoatDragEnd = () => {
    setDraggedBoatId(null)
    setDropTarget(null)
  }

  const handleCategoryDragOver = (e: React.DragEvent<HTMLDivElement>, cat: Category) => {
    if (!draggedBoatId) return
    const dragged = boatById.get(draggedBoatId)
    if (!dragged || dragged.category === cat) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTarget !== cat) setDropTarget(cat)
  }

  const handleCategoryDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Ignore bubble events from children
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    setDropTarget(null)
  }

  const handleCategoryDrop = async (e: React.DragEvent<HTMLDivElement>, cat: Category) => {
    e.preventDefault()
    const boatId = e.dataTransfer.getData('text/plain') || draggedBoatId
    setDropTarget(null)
    setDraggedBoatId(null)
    if (!boatId) return
    const boat = boatById.get(boatId)
    if (!boat || boat.category === cat) return
    setMovingBoatId(boatId)
    setMoveError(null)
    try {
      await updateBoat(boatId, { category: cat } as Partial<BoatRecord>)
    } catch (err) {
      console.error('Failed to recategorise boat:', err)
      setMoveError(`Couldn't move ${boat.name} to ${cat}. ${err instanceof Error ? err.message : ''}`)
    } finally {
      setMovingBoatId(null)
    }
  }

  const startEdit = (memberId: string) => {
    const cur = choicesByMember.get(memberId)
    setEditDraft({
      first:  cur?.first_choice_id  || '',
      second: cur?.second_choice_id || '',
      third:  cur?.third_choice_id  || '',
    })
    setEditingMemberId(memberId)
  }

  const cancelEdit = () => {
    setEditingMemberId(null)
    setEditDraft({ first: '', second: '', third: '' })
  }

  const unsetChoices = async (memberId: string) => {
    const existing = choicesByMember.get(memberId)
    if (!existing) {
      setConfirmUnsetId(null)
      return
    }
    setUnsettingId(memberId)
    try {
      await removeChoice(existing.id)
    } catch (err) {
      console.error('Failed to unset boat choices:', err)
    } finally {
      setConfirmUnsetId(null)
      setUnsettingId(null)
    }
  }

  const saveEdit = async () => {
    if (!editingMemberId) return
    setSavingId(editingMemberId)
    try {
      const existing = choicesByMember.get(editingMemberId)
      const payload = {
        team_member_id:    editingMemberId,
        first_choice_id:   editDraft.first,
        second_choice_id:  editDraft.second,
        third_choice_id:   editDraft.third,
      }
      if (existing) await update(existing.id, payload)
      else await create(payload)
      cancelEdit()
    } catch (err) {
      console.error('Failed to save boat choices:', err)
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-pulse">kayaking</span>
          <p className="tactical-label mt-3">Loading boat catalogue</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar — category filters */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant/20 overflow-y-auto">
        <div className="p-3 space-y-1">
          <button
            onClick={() => setActiveCategory('All')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 font-label text-xs uppercase tracking-widest text-left transition-colors ${
              activeCategory === 'All'
                ? 'bg-surface-container-high text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-base">grid_view</span>
            All Categories
            <span className="ml-auto font-mono text-[10px] text-outline">{totals.boats}</span>
          </button>
          {CATEGORY_ORDER.map((cat) => {
            const count = boatsByCategory[cat].length
            const units = boatsByCategory[cat].reduce((s, b) => s + (b.available_count || 0), 0)
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 font-label text-xs uppercase tracking-widest text-left transition-colors ${
                  activeCategory === cat
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-base">{CATEGORY_META[cat].icon}</span>
                <span className="flex-1 truncate">{cat}</span>
                <span className="font-mono text-[10px] text-outline">{count}·{units}</span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* Header */}
          <div>
            <p className="tactical-label">Logistics Segment 05 | Fleet Allocation</p>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-primary uppercase tracking-wide mt-2">
              Boat Choices
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="surface-card-elevated">
              <span className="tactical-label">Models in Catalogue</span>
              <p className="font-mono text-3xl text-on-surface mt-1 leading-none">{String(totals.boats).padStart(2, '0')}</p>
            </div>
            <div className="surface-card-elevated">
              <span className="tactical-label">Hulls Available</span>
              <p className="font-mono text-3xl text-on-surface mt-1 leading-none">{String(totals.units).padStart(2, '0')}</p>
            </div>
            <div className="surface-card-elevated">
              <span className="tactical-label">Paddlers Picked</span>
              <p className="font-mono text-3xl text-tertiary mt-1 leading-none">
                {String(totals.assigned).padStart(2, '0')}<span className="text-lg text-on-surface-variant"> / {members.length}</span>
              </p>
            </div>
            <div className="surface-card-elevated">
              <span className="tactical-label">Awaiting Picks</span>
              <p className="font-mono text-3xl text-on-surface mt-1 leading-none">
                {String(Math.max(0, totals.pending)).padStart(2, '0')}
              </p>
            </div>
          </div>

          {/* Mobile category chips */}
          <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-3 py-1.5 font-label text-[10px] uppercase tracking-widest whitespace-nowrap transition-colors ${
                activeCategory === 'All' ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              All
            </button>
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 font-label text-[10px] uppercase tracking-widest whitespace-nowrap transition-colors ${
                  activeCategory === cat ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ── Conflicts banner — only in All view, only if conflicts ── */}
          {activeCategory === 'All' && conflicts.length > 0 && (
            <div className={`border-l-4 p-4 ${activeConflicts.length > 0 ? 'border-error bg-error-container/30' : 'border-tertiary bg-tertiary-container/20'}`}>
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined mt-0.5 ${activeConflicts.length > 0 ? 'text-error' : 'text-tertiary'}`}>
                  {activeConflicts.length > 0 ? 'warning' : 'task_alt'}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-display text-sm font-bold uppercase tracking-wider ${activeConflicts.length > 0 ? 'text-error' : 'text-tertiary'}`}>
                    {activeConflicts.length > 0
                      ? `${activeConflicts.length} Conflict${activeConflicts.length === 1 ? '' : 's'} — Demand Exceeds Supply`
                      : 'All Conflicts Resolved'}
                  </h3>
                  <p className="tactical-label normal-case tracking-normal mt-0.5">
                    {activeConflicts.length > 0
                      ? 'More paddlers want these boats as their 1st choice than there are hulls available.'
                      : 'Every supply conflict has been reviewed and cleared.'}
                  </p>

                  {/* Active (unresolved) conflicts — each can be noted + marked resolved */}
                  {activeConflicts.length > 0 && (
                    <ul className="mt-3 space-y-3">
                      {activeConflicts.map(({ boat, firstPicks }) => (
                        <li key={boat.id} className="border-t border-error/15 pt-3 first:border-t-0 first:pt-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-mono text-sm font-bold text-error">{firstPicks}</span>
                            <span className="font-mono text-xs text-on-surface-variant">want</span>
                            <span className="font-display text-xs font-semibold text-on-surface uppercase tracking-wider">{boat.name}</span>
                            <span className="font-mono text-xs text-on-surface-variant">— only</span>
                            <span className="font-mono text-sm font-bold text-on-surface">{boat.available_count || 0}</span>
                            <span className="font-mono text-xs text-on-surface-variant">available</span>
                            <span className="font-mono text-[10px] text-outline">[{boat.supplier}]</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 mt-2">
                            <input
                              className="flex-1 bg-surface-container-lowest text-on-surface font-mono text-xs border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5"
                              placeholder="Resolution note (e.g. ordering 2 more, or Sam taking 2nd choice)"
                              value={conflictNotes[boat.id] ?? ''}
                              onChange={(e) => setConflictNotes((prev) => ({ ...prev, [boat.id]: e.target.value }))}
                            />
                            <button
                              onClick={() => resolveConflict(boat.id)}
                              disabled={resolvingId === boat.id}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-tertiary-container text-on-tertiary font-label text-[10px] uppercase tracking-widest hover:brightness-95 transition-colors disabled:opacity-50 flex-shrink-0"
                            >
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              Mark resolved
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Resolved conflicts — note shown, can edit note or reopen */}
                  {resolvedConflicts.length > 0 && (
                    <div className={activeConflicts.length > 0 ? 'mt-4 pt-3 border-t border-outline-variant/20' : 'mt-3'}>
                      <p className="tactical-label mb-2">Resolved ({resolvedConflicts.length})</p>
                      <ul className="space-y-2">
                        {resolvedConflicts.map(({ boat, firstPicks }) => {
                          const editing = boat.id in conflictNotes
                          return (
                            <li key={boat.id} className="flex flex-col gap-1.5 bg-surface-container-lowest/60 p-2">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="material-symbols-outlined text-tertiary text-base">task_alt</span>
                                <span className="font-display text-xs font-semibold text-on-surface uppercase tracking-wider">{boat.name}</span>
                                <span className="font-mono text-[10px] text-outline">{firstPicks} want / {boat.available_count || 0} avail · [{boat.supplier}]</span>
                                <button
                                  onClick={() => reopenConflict(boat.id)}
                                  disabled={resolvingId === boat.id}
                                  className="ml-auto flex items-center gap-1 px-2 py-1 font-label text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-sm">undo</span>
                                  Reopen
                                </button>
                              </div>
                              {editing ? (
                                <div className="flex flex-col sm:flex-row gap-2 pl-6">
                                  <input
                                    className="flex-1 bg-surface-container-lowest text-on-surface font-mono text-xs border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5"
                                    placeholder="Resolution note"
                                    value={conflictNotes[boat.id]}
                                    onChange={(e) => setConflictNotes((prev) => ({ ...prev, [boat.id]: e.target.value }))}
                                  />
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => saveConflictNote(boat.id, conflictNotes[boat.id])}
                                      disabled={resolvingId === boat.id}
                                      className="flex items-center gap-1 px-2 py-1.5 bg-tertiary-container text-on-tertiary font-label text-[10px] uppercase tracking-widest hover:brightness-95 transition-colors disabled:opacity-50"
                                    >
                                      <span className="material-symbols-outlined text-sm">check</span>Save
                                    </button>
                                    <button
                                      onClick={() => setConflictNotes((prev) => { const next = { ...prev }; delete next[boat.id]; return next })}
                                      className="flex items-center gap-1 px-2 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-1.5 pl-6">
                                  <span className="font-body text-xs text-on-surface-variant italic flex-1">
                                    {boat.conflict_note ? `“${boat.conflict_note}”` : 'No note added.'}
                                  </span>
                                  <button
                                    onClick={() => setConflictNotes((prev) => ({ ...prev, [boat.id]: boat.conflict_note || '' }))}
                                    className="flex items-center gap-1 px-2 py-0.5 font-label text-[10px] uppercase tracking-widest text-outline hover:text-on-surface transition-colors flex-shrink-0"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    {boat.conflict_note ? 'Edit note' : 'Add note'}
                                  </button>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Choice Distribution — bar chart + donut chart ── */}
          {(picksByBoat.length > 0 || picksByCategory.total > 0) && (
            <div className="surface-card p-0 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20">
                <span className="material-symbols-outlined text-tertiary">analytics</span>
                <div className="flex-1">
                  <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Choice Distribution</h3>
                  <p className="tactical-label text-[9px] mt-0.5 normal-case tracking-normal">
                    Where the team's votes are landing across boats and categories.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline-variant/10">
                {/* Bar chart: picks per boat — coloured by demand vs supply */}
                <div className="bg-surface-container-lowest p-4">
                  <h4 className="font-display text-xs font-bold text-on-surface uppercase tracking-wider mb-3">
                    Picks by Boat {picksByBoat.length > 10 ? '(top 10)' : ''}
                  </h4>
                  {picksByBoat.length === 0 ? (
                    <p className="tactical-label">No picks yet.</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {picksByBoat.slice(0, 10).map(({ boat, d }) => {
                          const max = Math.max(...picksByBoat.map((x) => x.d.total))
                          const supply = boat.available_count || 0
                          // Status by 1st-pick demand vs supply
                          const status: 'over' | 'at' | 'under' =
                            d.first > supply ? 'over' : d.first === supply && supply > 0 ? 'at' : 'under'
                          const barClass = status === 'over' ? 'bg-red-500' : status === 'at' ? 'bg-orange-500' : 'bg-emerald-500'
                          const countClass = status === 'over' ? 'text-red-500' : status === 'at' ? 'text-orange-500' : 'text-on-surface-variant'
                          return (
                            <div key={boat.id}>
                              <div className="flex items-baseline justify-between mb-0.5 gap-2">
                                <span className="font-mono text-[10px] text-on-surface truncate flex-1" title={boat.name}>
                                  {boat.name}
                                </span>
                                <span className={`font-mono text-[10px] flex-shrink-0 ${countClass}`} title={`1st: ${d.first} / 2nd: ${d.second} / 3rd: ${d.third} · supply ×${supply}`}>
                                  {d.first}·{d.second}·{d.third}  /  ×{supply}
                                </span>
                              </div>
                              <div className="h-2.5 bg-surface-container-highest overflow-hidden">
                                <div
                                  className={`h-full ${barClass} transition-all`}
                                  style={{ width: `${(d.total / max) * 100}%` }}
                                  title={`${status === 'over' ? 'Oversubscribed' : status === 'at' ? 'At capacity' : 'Under demand'} — ${d.first} × 1st picks vs ${supply} available`}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-label uppercase tracking-widest text-on-surface-variant">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500" />Under demand</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500" />At capacity</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500" />Oversubscribed</span>
                        <span className="text-outline normal-case tracking-normal">— numbers show 1·2·3 picks / stock</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Donut chart: 1st picks by category */}
                <div className="bg-surface-container-lowest p-4">
                  <h4 className="font-display text-xs font-bold text-on-surface uppercase tracking-wider mb-3">
                    1st Picks by Category
                  </h4>
                  {picksByCategory.total === 0 ? (
                    <p className="tactical-label">No 1st picks yet.</p>
                  ) : (
                    <DonutByCategory data={picksByCategory.byCat} total={picksByCategory.total} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Procurement Report — what to order from which outfitter ── */}
          {procurement.length > 0 && (
            <div className="surface-card p-0 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20">
                <span className="material-symbols-outlined text-tertiary">receipt_long</span>
                <div className="flex-1">
                  <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Procurement Report</h3>
                  <p className="tactical-label text-[9px] mt-0.5 normal-case tracking-normal">
                    Boats we need to reserve, grouped by outfitter (based on 1st picks).
                  </p>
                </div>
                <span className="font-mono text-2xl text-on-surface">{procurement.reduce((s, [, list]) => s + list.reduce((a, b) => a + b.demand, 0), 0)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-outline-variant/10">
                {procurement.map(([supplier, list]) => {
                  const subtotal = list.reduce((s, item) => s + item.demand, 0)
                  return (
                    <div key={supplier} className="bg-surface-container-lowest p-4">
                      <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-outline-variant/20">
                        <span className="font-display text-xs font-bold text-tertiary uppercase tracking-wider">{supplier}</span>
                        <span className="font-mono text-lg text-on-surface">{String(subtotal).padStart(2, '0')}</span>
                      </div>
                      <div className="space-y-2">
                        {list.map(({ boat, demand: d }) => {
                          const short = d > (boat.available_count || 0)
                          return (
                            <div key={boat.id} className="flex items-baseline gap-2">
                              <span className={`font-mono text-sm font-bold flex-shrink-0 w-6 text-right ${short ? 'text-error' : 'text-tertiary'}`}>
                                ×{d}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-[11px] text-on-surface truncate" title={boat.name}>
                                  {boat.name}
                                </p>
                                <p className="font-mono text-[9px] text-on-surface-variant mt-0.5">
                                  {boat.category} · stock {boat.available_count || 0}
                                </p>
                              </div>
                              {short && (
                                <span className="px-1 py-0.5 bg-error-container text-error font-label text-[8px] uppercase tracking-widest flex-shrink-0">
                                  short
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Drag-drop hint + error */}
          <div className="surface-card flex flex-wrap items-center gap-2 py-2">
            <span className="material-symbols-outlined text-base text-tertiary">drag_indicator</span>
            <span className="tactical-label normal-case tracking-normal text-[10px] flex-1">
              Drag any boat card and drop it on another category to recategorise. Switch to <strong>All Categories</strong> to see every drop zone at once.
            </span>
            {movingBoatId && (
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                Saving…
              </span>
            )}
            {moveError && (
              <span className="font-label text-[10px] text-error uppercase tracking-widest">{moveError}</span>
            )}
          </div>

          {/* Catalogue by category */}
          <div className="space-y-4">
            {visibleCategories.map((cat) => {
              const list = boatsByCategory[cat]
              const meta = CATEGORY_META[cat]
              const units = list.reduce((s, b) => s + (b.available_count || 0), 0)
              const isDropTarget = dropTarget === cat
              // Always render the category card so empty categories remain valid drop zones
              return (
                <div
                  key={cat}
                  className={`surface-card p-0 overflow-hidden transition-all ${
                    isDropTarget ? 'ring-2 ring-tertiary outline-offset-0' : ''
                  }`}
                  onDragOver={(e) => handleCategoryDragOver(e, cat)}
                  onDragLeave={handleCategoryDragLeave}
                  onDrop={(e) => handleCategoryDrop(e, cat)}
                >
                  <div className={`flex items-center gap-3 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20 transition-colors ${
                    isDropTarget ? 'bg-tertiary-container text-on-tertiary' : ''
                  }`}>
                    <span className={`material-symbols-outlined ${isDropTarget ? 'text-on-tertiary' : 'text-tertiary'}`}>{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-display text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                        isDropTarget ? 'text-on-tertiary' : 'text-primary'
                      }`}>
                        {cat}
                        <span className="px-1.5 py-0.5 bg-surface-container-highest font-mono text-[9px] text-on-surface-variant">{meta.tag}</span>
                        {isDropTarget && (
                          <span className="px-1.5 py-0.5 bg-on-tertiary text-tertiary-container font-mono text-[9px] uppercase tracking-widest">Drop here</span>
                        )}
                      </h3>
                      <p className="tactical-label text-[9px] mt-0.5 normal-case tracking-normal">{meta.blurb}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-2xl text-on-surface leading-none">{String(list.length).padStart(2, '0')}</p>
                      <p className="tactical-label text-[9px]">{units} hulls</p>
                    </div>
                  </div>

                  {list.length === 0 && (
                    <div className={`px-4 py-6 text-center ${isDropTarget ? 'bg-tertiary-container/30' : ''}`}>
                      <p className="tactical-label text-on-surface-variant">No boats in this category — drop one here.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-outline-variant/10">
                    {list.map((boat) => {
                      const d = demand.get(boat.id)
                      const oversubscribed = d != null && d.first > (boat.available_count || 0)
                      const isDragging = draggedBoatId === boat.id
                      const isMoving   = movingBoatId === boat.id
                      return (
                        <div
                          key={boat.id}
                          draggable
                          onDragStart={(e) => handleBoatDragStart(e, boat.id)}
                          onDragEnd={handleBoatDragEnd}
                          className={`bg-surface-container-lowest p-3 flex flex-col cursor-grab active:cursor-grabbing hover:bg-surface-container-low/40 transition-all ${
                            isDragging ? 'opacity-40' : ''
                          } ${isMoving ? 'animate-pulse' : ''}`}
                          onClick={() => setExpandedBoat((prev) => prev === boat.id ? '' : boat.id)}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-display text-sm font-semibold text-on-surface uppercase tracking-wider truncate">
                                {boat.name}
                              </p>
                              <p className="tactical-label text-[9px] mt-0.5 normal-case tracking-normal text-on-surface-variant truncate">
                                {boat.supplier}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-1.5 py-0.5 bg-surface-container-high font-mono text-[10px] text-on-surface">
                                ×{boat.available_count || 0}
                              </span>
                              {d && d.first > 0 && (
                                <span className={`px-1.5 py-0.5 font-mono text-[10px] ${oversubscribed ? 'bg-error-container text-error' : 'bg-tertiary-container text-on-tertiary'}`}>
                                  {d.first} want 1st
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Demand bar */}
                          {d && d.total > 0 && (
                            <div className="mt-2 flex h-1.5 bg-surface-container-highest overflow-hidden">
                              <div className="bg-tertiary" style={{ width: `${(d.first / Math.max(d.total, boat.available_count || 1)) * 100}%` }} title={`${d.first} × 1st`} />
                              <div className="bg-primary" style={{ width: `${(d.second / Math.max(d.total, boat.available_count || 1)) * 100}%` }} title={`${d.second} × 2nd`} />
                              <div className="bg-on-surface-variant/40" style={{ width: `${(d.third / Math.max(d.total, boat.available_count || 1)) * 100}%` }} title={`${d.third} × 3rd`} />
                            </div>
                          )}

                          {/* Expanded detail */}
                          {expandedBoat === boat.id && (
                            <div className="mt-2 pt-2 border-t border-outline-variant/20 space-y-1.5">
                              <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                                {boat.description || '—'}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="tactical-label text-[9px]">Make / Model</span>
                                  <p className="font-mono text-xs text-on-surface">{boat.manufacturer}{boat.size ? ` · ${boat.size}` : ''}</p>
                                </div>
                                <div>
                                  <span className="tactical-label text-[9px]">Demand</span>
                                  <p className="font-mono text-xs text-on-surface">
                                    {d ? `${d.first}/${d.second}/${d.third}` : '0/0/0'}
                                  </p>
                                </div>
                              </div>
                              {d && d.total > 0 && (
                                <div className="space-y-0.5 pt-1">
                                  <span className="tactical-label text-[9px]">Who's picked it</span>
                                  {(['first', 'second', 'third'] as Pick[]).map((slot) => {
                                    const picks = choices.filter((c) => {
                                      const k = slot === 'first' ? c.first_choice_id : slot === 'second' ? c.second_choice_id : c.third_choice_id
                                      return k === boat.id
                                    })
                                    if (picks.length === 0) return null
                                    return (
                                      <div key={slot} className="flex flex-wrap items-center gap-1">
                                        <span className={`px-1.5 py-0.5 font-mono text-[9px] ${PICK_META[slot].tile}`}>{PICK_META[slot].rank}</span>
                                        {picks.map((p) => {
                                          const m = members.find((x) => x.id === p.team_member_id)
                                          return (
                                            <span key={p.id} className="font-mono text-[10px] text-on-surface">
                                              {m ? `${m.first_name} ${m.last_name[0] ?? ''}.` : '—'}
                                            </span>
                                          )
                                        })}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Choice manifest — every team member with their picks */}
          <div className="surface-card p-0 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20">
              <span className="material-symbols-outlined text-tertiary">checklist</span>
              <div className="flex-1">
                <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Paddler Choice Manifest</h3>
                <p className="tactical-label text-[9px] mt-0.5 normal-case tracking-normal">
                  Each paddler's 1st / 2nd / 3rd boat picks. Use the chat assistant or edit a row to update.
                </p>
              </div>
              <span className="font-mono text-2xl text-on-surface">{String(totals.assigned).padStart(2, '0')} <span className="text-sm text-on-surface-variant">/ {String(members.length).padStart(2, '0')}</span></span>
            </div>

            <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_120px] gap-0 px-4 py-3 bg-surface-container-high border-b border-outline-variant/20">
              <span className="tactical-label">Paddler</span>
              <span className="tactical-label">1st</span>
              <span className="tactical-label">2nd</span>
              <span className="tactical-label">3rd</span>
              <span />
            </div>

            {members.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="tactical-label">No paddlers on the manifest yet. Add team members on /team.</p>
              </div>
            )}

            {members.map((m, idx) => {
              const choice = choicesByMember.get(m.id)
              const isEditing = editingMemberId === m.id
              return (
                <div
                  key={m.id}
                  className={`border-b border-outline-variant/10 ${idx % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_120px] gap-2 md:gap-0 items-center px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-[10px] text-on-surface-variant">
                          {(m.first_name[0] || '?')}{(m.last_name[0] || '?')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold text-on-surface uppercase tracking-wider truncate">
                          {m.last_name || '---'}, {m.first_name || '---'}
                        </p>
                        <p className="tactical-label mt-0.5">
                          {m.boat_preference || '—'}
                          {m.own_boat === 'Yes' && <span className="text-tertiary ml-2">[own boat]</span>}
                        </p>
                      </div>
                    </div>

                    {(['first', 'second', 'third'] as Pick[]).map((slot) => {
                      const id = slot === 'first' ? choice?.first_choice_id : slot === 'second' ? choice?.second_choice_id : choice?.third_choice_id
                      const boat = id ? boatById.get(id) : null
                      return (
                        <div key={slot} className="md:hidden flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 font-mono text-[9px] ${PICK_META[slot].tile}`}>{PICK_META[slot].rank}</span>
                          <span className="font-mono text-xs text-on-surface truncate">{boat?.name || '—'}</span>
                        </div>
                      )
                    })}
                    <div className="hidden md:block">
                      <BoatCell boat={choice?.first_choice_id ? boatById.get(choice.first_choice_id) : null} slot="first" />
                    </div>
                    <div className="hidden md:block">
                      <BoatCell boat={choice?.second_choice_id ? boatById.get(choice.second_choice_id) : null} slot="second" />
                    </div>
                    <div className="hidden md:block">
                      <BoatCell boat={choice?.third_choice_id ? boatById.get(choice.third_choice_id) : null} slot="third" />
                    </div>

                    <div className="flex justify-end items-center gap-1.5 flex-wrap">
                      {!isEditing && confirmUnsetId === m.id ? (
                        <>
                          <button
                            onClick={() => unsetChoices(m.id)}
                            disabled={unsettingId === m.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-error-container text-error font-label text-[10px] uppercase tracking-widest hover:brightness-110 transition-colors disabled:opacity-50"
                            title="Permanently remove this paddler's boat choices"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {unsettingId === m.id ? 'hourglass_empty' : 'check'}
                            </span>
                            {unsettingId === m.id ? 'Unsetting…' : 'Confirm Unset'}
                          </button>
                          <button
                            onClick={() => setConfirmUnsetId(null)}
                            disabled={unsettingId === m.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : !isEditing ? (
                        <>
                          {choice && (
                            <button
                              onClick={() => setConfirmUnsetId(m.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-[10px] uppercase tracking-widest hover:bg-error-container hover:text-error transition-colors"
                              title="Remove all boat choices for this paddler"
                            >
                              <span className="material-symbols-outlined text-sm">clear</span>
                              Unset
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(m.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-high text-on-surface font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">{choice ? 'edit' : 'add'}</span>
                            {choice ? 'Edit' : 'Set'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Inline edit row */}
                  {isEditing && (
                    <div className="bg-surface-container border-t border-outline-variant/10 px-4 py-4 lg:px-6 lg:py-5 space-y-3">
                      {(['first', 'second', 'third'] as Pick[]).map((slot) => (
                        <BoatPicker
                          key={slot}
                          slot={slot}
                          value={editDraft[slot]}
                          boats={boats}
                          onChange={(id) => setEditDraft((prev) => ({ ...prev, [slot]: id }))}
                        />
                      ))}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={saveEdit}
                          disabled={savingId === m.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-label text-xs uppercase tracking-widest hover:brightness-90 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">{savingId === m.id ? 'hourglass_empty' : 'save'}</span>
                          {savingId === m.id ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high text-on-surface-variant font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function BoatCell({ boat, slot }: { boat: BoatRecord | null | undefined; slot: Pick }) {
  if (!boat) {
    return <span className="font-mono text-xs text-outline">—</span>
  }
  return (
    <div className="flex items-center gap-2">
      <span className={`px-1.5 py-0.5 font-mono text-[9px] ${PICK_META[slot].tile}`}>{PICK_META[slot].rank}</span>
      <span className="font-mono text-xs text-on-surface truncate" title={boat.name}>{boat.name}</span>
    </div>
  )
}

function BoatPicker({ slot, value, boats, onChange }: {
  slot: Pick
  value: string
  boats: BoatRecord[]
  onChange: (id: string) => void
}) {
  const meta = PICK_META[slot]
  return (
    <div>
      <label className="tactical-label block mb-1 flex items-center gap-2">
        <span className={`px-1.5 py-0.5 font-mono text-[9px] ${meta.tile}`}>{meta.rank}</span>
        <span>{meta.label}</span>
      </label>
      <select
        className="w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— None —</option>
        {CATEGORY_ORDER.map((cat) => {
          const inCat = boats.filter((b) => b.category === cat)
          if (inCat.length === 0) return null
          return (
            <optgroup key={cat} label={cat}>
              {inCat.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (×{b.available_count || 0})
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </div>
  )
}

const CAT_COLOR_CLASS: Record<Category, string> = {
  'Playboat':   'text-tertiary',
  'Half-Slice': 'text-primary',
  'Creek':      'text-error',
  'Expedition': 'text-outline',
}

const CAT_BG_CLASS: Record<Category, string> = {
  'Playboat':   'bg-tertiary',
  'Half-Slice': 'bg-primary',
  'Creek':      'bg-error',
  'Expedition': 'bg-outline',
}

function DonutByCategory({ data, total }: { data: Record<Category, number>; total: number }) {
  const r = 40
  const c = 2 * Math.PI * r

  let offset = 0
  const segments = (CATEGORY_ORDER as readonly Category[])
    .map((cat) => {
      const value = data[cat]
      const dash = total > 0 ? (value / total) * c : 0
      const seg = { cat, value, dash, offset, colorClass: CAT_COLOR_CLASS[cat] }
      offset += dash
      return seg
    })
    .filter((s) => s.value > 0)

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50" cy="50" r={r}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="14"
            className="text-surface-container-highest"
          />
          {segments.map((s) => (
            <circle
              key={s.cat}
              cx="50" cy="50" r={r}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="14"
              strokeDasharray={`${s.dash} ${c - s.dash}`}
              strokeDashoffset={-s.offset}
              className={s.colorClass}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl text-on-surface leading-none">{total}</span>
          <span className="tactical-label text-[9px] mt-0.5">1st picks</span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {(CATEGORY_ORDER as readonly Category[]).map((cat) => {
          const value = data[cat]
          const pct = total > 0 ? Math.round((value / total) * 100) : 0
          return (
            <div key={cat} className="flex items-center gap-2 text-[10px] font-mono">
              <span className={`w-2.5 h-2.5 ${CAT_BG_CLASS[cat]} flex-shrink-0`} />
              <span className="text-on-surface flex-1 truncate">{cat}</span>
              <span className="text-on-surface tabular-nums w-5 text-right">{value}</span>
              <span className="text-outline tabular-nums w-9 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
