import { useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'

interface EmergencyContactRecord extends RecordModel {
  name: string
  phone: string
  role_desc: string
  priority: boolean
}

interface ExtractionRecord extends RecordModel {
  mile: string
  name: string
  access: string
  point_type: string
}

interface ContingencyRecord extends RecordModel {
  title: string
  icon: string
  steps: string[]
}

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'
const selectClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer'

export default function Emergency() {
  const { records: contacts, loading: contactsLoading, create: createContact, update: updateContact, remove: removeContact } = useCollection<EmergencyContactRecord>('emergency_contacts')
  const { records: extractionPoints, loading: extractionLoading, create: createExtraction, update: updateExtraction, remove: removeExtraction } = useCollection<ExtractionRecord>('extraction_points')
  const { records: contingencyPlans, loading: plansLoading, create: createPlan, update: updatePlan, remove: removePlan } = useCollection<ContingencyRecord>('contingency_plans')

  const loading = contactsLoading || extractionLoading || plansLoading

  const [editingContact, setEditingContact] = useState<string | null>(null)
  const [editingExtraction, setEditingExtraction] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editingStep, setEditingStep] = useState<string | null>(null) // "planId-stepIndex"

  const [contactDraft, setContactDraft] = useState<Partial<EmergencyContactRecord>>({})
  const [extractionDraft, setExtractionDraft] = useState<Partial<ExtractionRecord>>({})
  const [planDraft, setPlanDraft] = useState<Partial<ContingencyRecord>>({})
  const [stepDraft, setStepDraft] = useState('')

  const [saving, setSaving] = useState(false)

  // --- Contact CRUD ---
  function startEditContact(contact: EmergencyContactRecord) {
    setContactDraft({ name: contact.name, phone: contact.phone, role_desc: contact.role_desc, priority: contact.priority })
    setEditingContact(contact.id)
  }
  function addContact() {
    setContactDraft({ name: '', phone: '', role_desc: '', priority: false })
    setEditingContact('__new__')
  }
  async function saveContact() {
    setSaving(true)
    try {
      if (editingContact === '__new__') {
        await createContact(contactDraft)
      } else if (editingContact) {
        await updateContact(editingContact, contactDraft)
      }
    } catch (err) {
      console.error('Failed to save contact', err)
    } finally {
      setSaving(false)
      setEditingContact(null)
      setContactDraft({})
    }
  }
  async function deleteContact(id: string) {
    try { await removeContact(id) } catch (err) { console.error('Failed to remove contact', err) }
    if (editingContact === id) setEditingContact(null)
  }

  // --- Extraction CRUD ---
  function startEditExtraction(point: ExtractionRecord) {
    setExtractionDraft({ mile: point.mile, name: point.name, access: point.access, point_type: point.point_type })
    setEditingExtraction(point.id)
  }
  function addExtraction() {
    setExtractionDraft({ mile: '', name: '', access: '', point_type: 'SECONDARY' })
    setEditingExtraction('__new__')
  }
  async function saveExtraction() {
    setSaving(true)
    try {
      if (editingExtraction === '__new__') {
        await createExtraction(extractionDraft)
      } else if (editingExtraction) {
        await updateExtraction(editingExtraction, extractionDraft)
      }
    } catch (err) {
      console.error('Failed to save extraction point', err)
    } finally {
      setSaving(false)
      setEditingExtraction(null)
      setExtractionDraft({})
    }
  }
  async function deleteExtraction(id: string) {
    try { await removeExtraction(id) } catch (err) { console.error('Failed to remove extraction point', err) }
    if (editingExtraction === id) setEditingExtraction(null)
  }

  // --- Contingency CRUD ---
  function startEditPlan(plan: ContingencyRecord) {
    setPlanDraft({ title: plan.title, icon: plan.icon })
    setEditingPlan(plan.id)
  }
  function addPlan() {
    setPlanDraft({ title: '', icon: 'assignment', steps: [''] })
    setEditingPlan('__new__')
  }
  async function savePlanHeader() {
    setSaving(true)
    try {
      if (editingPlan === '__new__') {
        await createPlan(planDraft)
      } else if (editingPlan) {
        await updatePlan(editingPlan, { title: planDraft.title, icon: planDraft.icon })
      }
    } catch (err) {
      console.error('Failed to save plan', err)
    } finally {
      setSaving(false)
      setEditingPlan(null)
      setPlanDraft({})
    }
  }
  async function deletePlan(id: string) {
    try { await removePlan(id) } catch (err) { console.error('Failed to remove plan', err) }
    if (editingPlan === id) setEditingPlan(null)
  }

  // Step editing
  function startEditStep(planId: string, stepIndex: number, currentValue: string) {
    setStepDraft(currentValue)
    setEditingStep(`${planId}-${stepIndex}`)
  }
  async function saveStep(plan: ContingencyRecord, stepIndex: number) {
    const newSteps = [...plan.steps]
    newSteps[stepIndex] = stepDraft
    setSaving(true)
    try {
      await updatePlan(plan.id, { steps: newSteps })
    } catch (err) {
      console.error('Failed to save step', err)
    } finally {
      setSaving(false)
      setEditingStep(null)
      setStepDraft('')
    }
  }
  async function addStep(plan: ContingencyRecord) {
    const newSteps = [...plan.steps, '']
    try {
      await updatePlan(plan.id, { steps: newSteps })
      setStepDraft('')
      setEditingStep(`${plan.id}-${newSteps.length - 1}`)
    } catch (err) {
      console.error('Failed to add step', err)
    }
  }
  async function removeStep(plan: ContingencyRecord, stepIndex: number) {
    const newSteps = plan.steps.filter((_, i) => i !== stepIndex)
    try {
      await updatePlan(plan.id, { steps: newSteps })
    } catch (err) {
      console.error('Failed to remove step', err)
    }
    setEditingStep(null)
  }
  async function moveStep(plan: ContingencyRecord, stepIndex: number, direction: -1 | 1) {
    const newSteps = [...plan.steps]
    const targetIndex = stepIndex + direction
    if (targetIndex < 0 || targetIndex >= newSteps.length) return
    const temp = newSteps[stepIndex]
    newSteps[stepIndex] = newSteps[targetIndex]
    newSteps[targetIndex] = temp
    try {
      await updatePlan(plan.id, { steps: newSteps })
    } catch (err) {
      console.error('Failed to move step', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
          <span className="tactical-label">Loading emergency data...</span>
        </div>
      </div>
    )
  }

  // Medical inventory from equipment collection (first_aid category)
  const { records: medEquipment, loading: medLoading } = useCollection<RecordModel>('equipment', { filter: 'category="first_aid"' })

  const exportSafetyPlan = () => {
    const lines: string[] = [
      'GRAND CANYON EXPEDITION — EMERGENCY & SAFETY PLAN',
      `Exported: ${new Date().toISOString()}`,
      '',
      '═══ EMERGENCY CONTACTS ═══',
      ...contacts.map((c) => `${c.priority ? '★ ' : '  '}${c.name} — ${c.phone} (${c.role_desc})`),
      '',
      '═══ EXTRACTION POINTS ═══',
      ...extractionPoints.map((p) => `Mile ${p.mile} — ${p.name} [${p.point_type}]\n  ${p.access}`),
      '',
      '═══ CONTINGENCY PLANS ═══',
      ...contingencyPlans.flatMap((p) => [
        `\n▸ ${p.title}`,
        ...((p.steps as string[]) || []).map((s, i) => `  ${String(i + 1).padStart(2, '0')}. ${s}`),
      ]),
      '',
      '═══ MEDICAL INVENTORY ═══',
      ...medEquipment.map((m) => {
        const rec = m as Record<string, string>
        return `  ${rec.item_name}${rec.qty ? ' — QTY: ' + rec.qty : ''}${rec.custodian ? ' — ' + rec.custodian : ''}${rec.expiry ? ' — EXP: ' + rec.expiry : ''}`
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `safety-plan-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sidebarSections = [
    { id: 'contacts', label: 'Emergency Contacts', icon: 'emergency' },
    { id: 'extraction', label: 'Extraction Points', icon: 'flight_land' },
    { id: 'contingency', label: 'Contingency Plans', icon: 'assignment' },
    { id: 'medical', label: 'Medical Inventory', icon: 'medical_services' },
  ]

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-surface-container-lowest p-4 border-r border-outline-variant/20 hidden lg:flex lg:flex-col">
        <div className="space-y-2">
          {sidebarSections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="w-full flex items-center gap-3 px-3 py-2 bg-surface-container-low text-on-surface-variant text-sm hover:bg-surface-container-high transition-colors text-left"
            >
              <span className="material-symbols-outlined text-base">{sec.icon}</span>
              {sec.label}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-outline-variant/20">
          <button
            onClick={exportSafetyPlan}
            className="w-full flex items-center gap-3 px-3 py-2 bg-tertiary-container text-on-tertiary text-sm hover:opacity-90 transition-opacity text-left"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export Safety Plan
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-xl">emergency</span>
            <p className="tactical-label">Safety Plan | Priority: Maximum</p>
          </div>
          <button
            onClick={exportSafetyPlan}
            className="lg:hidden flex items-center gap-2 px-3 py-1.5 bg-tertiary-container text-on-tertiary text-xs hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span className="font-label text-[10px] uppercase tracking-widest">Export</span>
          </button>
        </div>
        <h1 className="font-display text-2xl md:text-4xl font-bold text-primary uppercase tracking-tight mb-8">
          Emergency & Safety
        </h1>

        {/* Emergency Contacts */}
        <section id="contacts" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
              Emergency Contacts
            </h2>
            <button
              onClick={addContact}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-base text-tertiary">add</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add Contact</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {editingContact === '__new__' && (
              <div className="p-4 bg-surface-container-low">
                <div className="flex flex-col gap-2">
                  <input className={inputClasses} value={contactDraft.role_desc ?? ''} onChange={(e) => setContactDraft({ ...contactDraft, role_desc: e.target.value })} placeholder="Role" />
                  <input className={inputClasses} value={contactDraft.name ?? ''} onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} placeholder="Name" />
                  <input className={inputClasses} value={contactDraft.phone ?? ''} onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })} placeholder="Phone" />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contactDraft.priority ?? false}
                      onChange={(e) => setContactDraft({ ...contactDraft, priority: e.target.checked })}
                      className="accent-tertiary"
                    />
                    <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Priority Contact</span>
                  </label>
                  <div className="flex gap-1 justify-end">
                    <button onClick={saveContact} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                      <span className="material-symbols-outlined text-base text-tertiary">check</span>
                    </button>
                    <button onClick={() => setEditingContact(null)} className="p-1 hover:bg-surface-container-high transition-colors">
                      <span className="material-symbols-outlined text-base text-error">close</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {contacts.map((contact) => {
              const isEditing = editingContact === contact.id
              return (
                <div
                  key={contact.id}
                  className={`p-4 ${contact.priority ? 'bg-surface-container-high' : 'bg-surface-container-low'}`}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input className={inputClasses} value={contactDraft.role_desc ?? ''} onChange={(e) => setContactDraft({ ...contactDraft, role_desc: e.target.value })} placeholder="Role" />
                      <input className={inputClasses} value={contactDraft.name ?? ''} onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} placeholder="Name" />
                      <input className={inputClasses} value={contactDraft.phone ?? ''} onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })} placeholder="Phone" />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactDraft.priority ?? false}
                          onChange={(e) => setContactDraft({ ...contactDraft, priority: e.target.checked })}
                          className="accent-tertiary"
                        />
                        <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Priority Contact</span>
                      </label>
                      <div className="flex gap-1 justify-end">
                        <button onClick={saveContact} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-base text-tertiary">check</span>
                        </button>
                        <button onClick={() => deleteContact(contact.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-base text-error">close</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {contact.priority && (
                        <div className="h-1 w-full bg-tertiary-container mb-3" />
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="tactical-label mb-1">{contact.role_desc}</p>
                          <p className="font-display text-sm font-bold text-on-surface mb-2">{contact.name}</p>
                          <p className="font-mono text-lg text-tertiary">{contact.phone}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEditContact(contact)} className="p-1 hover:bg-surface-container transition-colors">
                            <span className="material-symbols-outlined text-[14px] text-outline">edit</span>
                          </button>
                          <button onClick={() => deleteContact(contact.id)} className="p-1 hover:bg-surface-container transition-colors">
                            <span className="material-symbols-outlined text-[14px] text-error">close</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Extraction Points */}
        <section id="extraction" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
              Extraction & Evacuation Points
            </h2>
            <button
              onClick={addExtraction}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-base text-tertiary">add</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add Point</span>
            </button>
          </div>
          <div className="space-y-4">
            {editingExtraction === '__new__' && (
              <div className="surface-card flex gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input className={inputClasses + ' w-24'} value={extractionDraft.mile ?? ''} onChange={(e) => setExtractionDraft({ ...extractionDraft, mile: e.target.value })} placeholder="River Mile" />
                    <select className={selectClasses + ' w-32'} value={extractionDraft.point_type ?? 'SECONDARY'} onChange={(e) => setExtractionDraft({ ...extractionDraft, point_type: e.target.value })}>
                      <option value="PRIMARY">PRIMARY</option>
                      <option value="SECONDARY">SECONDARY</option>
                      <option value="EGRESS">EGRESS</option>
                    </select>
                  </div>
                  <input className={inputClasses} value={extractionDraft.name ?? ''} onChange={(e) => setExtractionDraft({ ...extractionDraft, name: e.target.value })} placeholder="Location name" />
                  <textarea
                    className={inputClasses + ' resize-none h-16'}
                    value={extractionDraft.access ?? ''}
                    onChange={(e) => setExtractionDraft({ ...extractionDraft, access: e.target.value })}
                    placeholder="Access notes"
                  />
                  <div className="flex gap-1 justify-end">
                    <button onClick={saveExtraction} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                      <span className="material-symbols-outlined text-base text-tertiary">check</span>
                    </button>
                    <button onClick={() => setEditingExtraction(null)} className="p-1 hover:bg-surface-container-high transition-colors">
                      <span className="material-symbols-outlined text-base text-error">close</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {extractionPoints.map((point) => {
              const isEditing = editingExtraction === point.id
              return (
                <div key={point.id} className="surface-card flex gap-6">
                  {isEditing ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input className={inputClasses + ' w-24'} value={extractionDraft.mile ?? ''} onChange={(e) => setExtractionDraft({ ...extractionDraft, mile: e.target.value })} placeholder="River Mile" />
                        <select className={selectClasses + ' w-32'} value={extractionDraft.point_type ?? 'SECONDARY'} onChange={(e) => setExtractionDraft({ ...extractionDraft, point_type: e.target.value })}>
                          <option value="PRIMARY">PRIMARY</option>
                          <option value="SECONDARY">SECONDARY</option>
                          <option value="EGRESS">EGRESS</option>
                        </select>
                      </div>
                      <input className={inputClasses} value={extractionDraft.name ?? ''} onChange={(e) => setExtractionDraft({ ...extractionDraft, name: e.target.value })} placeholder="Location name" />
                      <textarea
                        className={inputClasses + ' resize-none h-16'}
                        value={extractionDraft.access ?? ''}
                        onChange={(e) => setExtractionDraft({ ...extractionDraft, access: e.target.value })}
                        placeholder="Access notes"
                      />
                      <div className="flex gap-1 justify-end">
                        <button onClick={saveExtraction} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-base text-tertiary">check</span>
                        </button>
                        <button onClick={() => deleteExtraction(point.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-base text-error">close</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-shrink-0 w-24">
                        <p className="tactical-label">River Mile</p>
                        <p className="font-mono text-2xl text-primary">{point.mile}</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 ${
                          point.point_type === 'PRIMARY' ? 'bg-tertiary-container text-on-tertiary' :
                          point.point_type === 'EGRESS' ? 'bg-surface-container-high text-on-surface' :
                          'bg-surface-container text-on-surface-variant'
                        }`}>
                          {point.point_type}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-display text-sm font-bold text-on-surface mb-1">{point.name}</p>
                        <p className="text-sm text-on-surface-variant">{point.access}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEditExtraction(point)} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-[14px] text-outline">edit</span>
                        </button>
                        <button onClick={() => deleteExtraction(point.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-[14px] text-error">close</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Contingency Plans */}
        <section id="contingency" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
              Contingency Protocols
            </h2>
            <button
              onClick={addPlan}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-base text-tertiary">add</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add Plan</span>
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {editingPlan === '__new__' && (
              <div className="surface-card">
                <div className="flex items-center gap-2 mb-3">
                  <input className={inputClasses + ' w-10'} value={planDraft.icon ?? ''} onChange={(e) => setPlanDraft({ ...planDraft, icon: e.target.value })} placeholder="Icon" />
                  <input className={inputClasses + ' flex-1'} value={planDraft.title ?? ''} onChange={(e) => setPlanDraft({ ...planDraft, title: e.target.value })} placeholder="Plan title" />
                  <button onClick={savePlanHeader} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-base text-tertiary">check</span>
                  </button>
                </div>
              </div>
            )}

            {contingencyPlans.map((plan) => {
              const isPlanEditing = editingPlan === plan.id
              const steps = plan.steps || []
              return (
                <div key={plan.id} className="surface-card">
                  <div className="flex items-center gap-2 mb-3">
                    {isPlanEditing ? (
                      <>
                        <input className={inputClasses + ' w-10'} value={planDraft.icon ?? ''} onChange={(e) => setPlanDraft({ ...planDraft, icon: e.target.value })} placeholder="Icon" />
                        <input className={inputClasses + ' flex-1'} value={planDraft.title ?? ''} onChange={(e) => setPlanDraft({ ...planDraft, title: e.target.value })} placeholder="Plan title" />
                        <button onClick={savePlanHeader} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                          <span className="material-symbols-outlined text-base text-tertiary">check</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-tertiary text-base">{plan.icon}</span>
                        <h3 className="font-display text-sm font-bold text-on-surface uppercase flex-1">{plan.title}</h3>
                        <button onClick={() => startEditPlan(plan)} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                          <span className="material-symbols-outlined text-[14px] text-outline">edit</span>
                        </button>
                        <button onClick={() => deletePlan(plan.id)} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                          <span className="material-symbols-outlined text-[14px] text-error">close</span>
                        </button>
                      </>
                    )}
                  </div>
                  <ol className="space-y-2">
                    {steps.map((step, i) => {
                      const stepKey = `${plan.id}-${i}`
                      const isStepEditing = editingStep === stepKey
                      return (
                        <li key={i} className="flex gap-3 text-sm items-start">
                          <span className="font-mono text-xs text-on-surface-variant flex-shrink-0 w-5 text-right pt-1">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          {isStepEditing ? (
                            <div className="flex-1 flex gap-1 items-center">
                              <input
                                className={inputClasses + ' flex-1'}
                                value={stepDraft}
                                onChange={(e) => setStepDraft(e.target.value)}
                                autoFocus
                              />
                              <button onClick={() => saveStep(plan, i)} disabled={saving} className="p-0.5 flex-shrink-0">
                                <span className="material-symbols-outlined text-[14px] text-tertiary">check</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-start gap-1 group">
                              <span className="text-on-surface-variant flex-1">{step}</span>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button onClick={() => moveStep(plan, i, -1)} className="p-0.5" title="Move up">
                                  <span className="material-symbols-outlined text-[12px] text-outline">arrow_upward</span>
                                </button>
                                <button onClick={() => moveStep(plan, i, 1)} className="p-0.5" title="Move down">
                                  <span className="material-symbols-outlined text-[12px] text-outline">arrow_downward</span>
                                </button>
                                <button onClick={() => startEditStep(plan.id, i, step)} className="p-0.5">
                                  <span className="material-symbols-outlined text-[12px] text-outline">edit</span>
                                </button>
                                <button onClick={() => removeStep(plan, i)} className="p-0.5">
                                  <span className="material-symbols-outlined text-[12px] text-error">close</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                  <button
                    onClick={() => addStep(plan)}
                    className="flex items-center gap-1 mt-3 text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span className="font-label text-[10px] uppercase tracking-widest">Add Step</span>
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* Medical Inventory */}
        <section id="medical" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
              Medical Inventory
            </h2>
          </div>
          {medLoading ? (
            <p className="tactical-label">Loading medical inventory...</p>
          ) : medEquipment.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic">No medical items found. Add first aid items in the Gear tab.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medEquipment.map((item) => {
                const rec = item as Record<string, string>
                const hasExpiry = rec.expiry && rec.expiry !== ''
                return (
                  <div key={item.id} className="surface-card flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-semibold text-on-surface">{rec.item_name}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        {rec.qty && (
                          <span className="font-mono text-xs text-on-surface-variant">QTY: {rec.qty}</span>
                        )}
                        {rec.custodian && (
                          <span className="tactical-label text-[10px]">{rec.custodian}</span>
                        )}
                        {rec.stowed_location && (
                          <span className="tactical-label text-[10px]">{rec.stowed_location}</span>
                        )}
                      </div>
                      {rec.notes && (
                        <p className="text-xs text-on-surface-variant mt-1">{rec.notes}</p>
                      )}
                    </div>
                    {hasExpiry && (
                      <div className="flex-shrink-0 text-right">
                        <span className="tactical-label text-[9px]">Expiry</span>
                        <p className={`font-mono text-xs mt-0.5 ${
                          rec.expiry.includes('27') || rec.expiry.includes('28') ? 'text-on-surface' : 'text-error'
                        }`}>
                          {rec.expiry}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
