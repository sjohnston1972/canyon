import { useState, useEffect, useCallback } from 'react'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase'
import { createPdf, addSectionHeader, addText, addTable, addKeyValue, savePdf } from '@/lib/pdf-export'

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

interface TraumaKitItem {
  name: string
  qty: string
  expiry: string
}

interface TraumaKitRecord extends RecordModel {
  kit_name: string
  custodian: string
  location: string
  notes: string
  items: TraumaKitItem[]
}

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'
const selectClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer'

export default function Emergency() {
  const { records: contacts, loading: contactsLoading, create: createContact, update: updateContact, remove: removeContact } = useCollection<EmergencyContactRecord>('emergency_contacts')
  const { records: extractionPoints, loading: extractionLoading, create: createExtraction, update: updateExtraction, remove: removeExtraction } = useCollection<ExtractionRecord>('extraction_points')
  const { records: contingencyPlans, loading: plansLoading, create: createPlan, update: updatePlan, remove: removePlan } = useCollection<ContingencyRecord>('contingency_plans')

  // Trauma kits
  const { records: traumaKits, loading: kitsLoading, create: createKit, update: updateKit, remove: removeKit } = useCollection<TraumaKitRecord>('trauma_kits')

  const loading = contactsLoading || extractionLoading || plansLoading || kitsLoading

  const [editingContact, setEditingContact] = useState<string | null>(null)
  const [editingExtraction, setEditingExtraction] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editingStep, setEditingStep] = useState<string | null>(null) // "planId-stepIndex"

  const [contactDraft, setContactDraft] = useState<Partial<EmergencyContactRecord>>({})
  const [extractionDraft, setExtractionDraft] = useState<Partial<ExtractionRecord>>({})
  const [planDraft, setPlanDraft] = useState<Partial<ContingencyRecord>>({})
  const [stepDraft, setStepDraft] = useState('')

  const [editingKit, setEditingKit] = useState<string | null>(null)
  const [kitDraft, setKitDraft] = useState<{ kit_name: string; custodian: string; location: string; notes: string }>({ kit_name: '', custodian: '', location: '', notes: '' })
  const [editingKitItem, setEditingKitItem] = useState<string | null>(null) // "kitId-itemIndex"
  const [kitItemDraft, setKitItemDraft] = useState<TraumaKitItem>({ name: '', qty: '', expiry: '' })
  const [expandedKit, setExpandedKit] = useState<string | null>(null)

  // Verification date from app_settings
  const [verifiedDate, setVerifiedDate] = useState<string>('')
  const [verifiedRecordId, setVerifiedRecordId] = useState<string | null>(null)
  const [editingVerified, setEditingVerified] = useState(false)
  const [verifiedDraft, setVerifiedDraft] = useState('')

  const loadVerifiedDate = useCallback(async () => {
    try {
      const records = await pb.collection('app_settings').getFullList({ filter: 'key="safety_verified_date"' })
      if (records.length > 0) {
        setVerifiedDate(records[0].value as string)
        setVerifiedRecordId(records[0].id)
      }
    } catch (err) {
      console.error('Failed to load verification date', err)
    }
  }, [])

  useEffect(() => { loadVerifiedDate() }, [loadVerifiedDate])

  async function saveVerifiedDate() {
    try {
      if (verifiedRecordId) {
        await pb.collection('app_settings').update(verifiedRecordId, { value: verifiedDraft })
      } else {
        const rec = await pb.collection('app_settings').create({ key: 'safety_verified_date', value: verifiedDraft })
        setVerifiedRecordId(rec.id)
      }
      setVerifiedDate(verifiedDraft)
      setEditingVerified(false)
    } catch (err) {
      console.error('Failed to save verification date', err)
    }
  }

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

  // --- Trauma Kit CRUD ---
  function addKit() {
    setKitDraft({ kit_name: '', custodian: '', location: '', notes: '' })
    setEditingKit('__new__')
  }
  function startEditKit(kit: TraumaKitRecord) {
    setKitDraft({ kit_name: kit.kit_name, custodian: kit.custodian || '', location: kit.location || '', notes: kit.notes || '' })
    setEditingKit(kit.id)
  }
  async function saveKit() {
    setSaving(true)
    try {
      if (editingKit === '__new__') {
        await createKit({ ...kitDraft, items: [] })
      } else if (editingKit) {
        await updateKit(editingKit, kitDraft)
      }
    } catch (err) {
      console.error('Failed to save trauma kit', err)
    } finally {
      setSaving(false)
      setEditingKit(null)
      setKitDraft({ kit_name: '', custodian: '', location: '', notes: '' })
    }
  }
  async function deleteKit(id: string) {
    try { await removeKit(id) } catch (err) { console.error('Failed to remove trauma kit', err) }
    if (editingKit === id) setEditingKit(null)
  }

  // --- Kit Items CRUD ---
  function startEditKitItem(kitId: string, itemIndex: number, item: TraumaKitItem) {
    setKitItemDraft({ ...item })
    setEditingKitItem(`${kitId}-${itemIndex}`)
  }
  async function addKitItem(kit: TraumaKitRecord) {
    const newItems = [...(kit.items || []), { name: '', qty: '', expiry: '' }]
    try {
      await updateKit(kit.id, { items: newItems })
      setKitItemDraft({ name: '', qty: '', expiry: '' })
      setEditingKitItem(`${kit.id}-${newItems.length - 1}`)
    } catch (err) {
      console.error('Failed to add kit item', err)
    }
  }
  async function saveKitItem(kit: TraumaKitRecord, itemIndex: number) {
    const newItems = [...(kit.items || [])]
    newItems[itemIndex] = kitItemDraft
    setSaving(true)
    try {
      await updateKit(kit.id, { items: newItems })
    } catch (err) {
      console.error('Failed to save kit item', err)
    } finally {
      setSaving(false)
      setEditingKitItem(null)
      setKitItemDraft({ name: '', qty: '', expiry: '' })
    }
  }
  async function removeKitItem(kit: TraumaKitRecord, itemIndex: number) {
    const newItems = (kit.items || []).filter((_, i) => i !== itemIndex)
    try {
      await updateKit(kit.id, { items: newItems })
    } catch (err) {
      console.error('Failed to remove kit item', err)
    }
    setEditingKitItem(null)
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

  const exportSafetyPlan = () => {
    const doc = createPdf('Grand Canyon Expedition — Emergency & Safety Plan')

    let y = 34

    // Verification status
    if (verifiedDate) {
      y = addText(doc, y, `This information was verified on: ${verifiedDate}`, { bold: true, size: 9, color: [59, 130, 128] })
    }

    // Satellite Phone Quick Reference
    y = addSectionHeader(doc, y, 'Satellite Phone — Quick Reference')
    y = addTable(doc, y,
      ['Service', 'Number (from Sat Phone)'],
      [
        ['NPS Emergency Dispatch', '00 1 928 638 7805'],
        ['Coconino County SAR', '00 1 928 774 4523'],
        ['US Coast Guard', '00 1 800 985 5856'],
        ['Flagstaff Medical Center', '00 1 928 779 3366'],
        ['Emergency (911 via sat)', '00 1 911'],
        ['Iridium Sat-to-Sat prefix', '00 8816 + number'],
      ]
    )
    y = addText(doc, y, 'Iridium: Extend antenna, wait for signal, dial 00 1 + area code + number. inReach SOS: Lift cover, hold SOS 3 sec.', { size: 7, color: [120, 120, 120] })

    // Emergency Contacts
    y = addSectionHeader(doc, y + 2, 'Emergency Contacts')
    if (contacts.length > 0) {
      y = addTable(doc, y,
        ['Priority', 'Role', 'Name', 'Phone'],
        contacts.map((c) => [c.priority ? '★' : '', c.role_desc, c.name, c.phone])
      )
    }

    // Extraction Points
    y = addSectionHeader(doc, y, 'Extraction & Evacuation Points')
    if (extractionPoints.length > 0) {
      y = addTable(doc, y,
        ['Mile', 'Name', 'Type', 'Access Notes'],
        extractionPoints.map((p) => [p.mile, p.name, p.point_type, p.access])
      )
    }

    // Contingency Plans
    y = addSectionHeader(doc, y, 'Contingency Protocols')
    for (const plan of contingencyPlans) {
      y = addText(doc, y, plan.title, { bold: true, size: 10 })
      const steps = (plan.steps as string[]) || []
      for (let i = 0; i < steps.length; i++) {
        y = addText(doc, y, `${String(i + 1).padStart(2, '0')}. ${steps[i]}`, { indent: 4, size: 8 })
      }
      y += 2
    }

    // Trauma Kits
    y = addSectionHeader(doc, y, 'Trauma Kits')
    for (const kit of traumaKits) {
      const meta = [kit.kit_name, kit.custodian, kit.location].filter(Boolean).join(' — ')
      y = addText(doc, y, meta, { bold: true, size: 9 })
      if (kit.notes) y = addText(doc, y, kit.notes, { size: 7, color: [120, 120, 120] })
      const items = (kit.items as TraumaKitItem[]) || []
      if (items.length > 0) {
        y = addTable(doc, y,
          ['Item', 'Qty', 'Expiry'],
          items.map((item) => [item.name, item.qty || '—', item.expiry || '—'])
        )
      }
    }

    savePdf(doc, `safety-plan-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const sidebarSections = [
    { id: 'satphone', label: 'Satellite Phone', icon: 'satellite_alt' },
    { id: 'contacts', label: 'Emergency Contacts', icon: 'emergency' },
    { id: 'extraction', label: 'Extraction Points', icon: 'flight_land' },
    { id: 'contingency', label: 'Contingency Plans', icon: 'assignment' },
    { id: 'medical', label: 'Trauma Kits', icon: 'medical_services' },
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
        <h1 className="font-display text-2xl md:text-4xl font-bold text-primary uppercase tracking-tight mb-4">
          Emergency & Safety
        </h1>

        {/* Verification banner */}
        <div className="surface-card mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className={`material-symbols-outlined text-lg ${verifiedDate ? 'text-tertiary' : 'text-error'}`}>
              {verifiedDate ? 'verified' : 'warning'}
            </span>
            {editingVerified ? (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-on-surface whitespace-nowrap">This information is correct and was checked on</span>
                <input
                  type="date"
                  className="bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1"
                  value={verifiedDraft}
                  onChange={(e) => setVerifiedDraft(e.target.value)}
                />
                <button onClick={saveVerifiedDate} className="p-1 hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-base text-tertiary">check</span>
                </button>
                <button onClick={() => setEditingVerified(false)} className="p-1 hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-base text-error">close</span>
                </button>
              </div>
            ) : (
              <p className="text-sm text-on-surface">
                {verifiedDate ? (
                  <>This information is correct and was checked on <span className="font-mono font-bold text-tertiary">{verifiedDate}</span></>
                ) : (
                  <span className="text-on-surface-variant italic">Safety information has not been verified yet</span>
                )}
              </p>
            )}
          </div>
          {!editingVerified && (
            <button
              onClick={() => { setVerifiedDraft(verifiedDate || new Date().toISOString().slice(0, 10)); setEditingVerified(true) }}
              className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[14px] text-outline">{verifiedDate ? 'edit' : 'add'}</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{verifiedDate ? 'Update' : 'Verify'}</span>
            </button>
          )}
        </div>

        {/* Satellite Phone Dialling */}
        <section id="satphone" className="mb-8 scroll-mt-4">
          <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider mb-4">
            How to Dial from a Satellite Phone
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="surface-card">
              <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider mb-3">Iridium Satellite Phone</h3>
              <ol className="space-y-2 text-sm text-on-surface">
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">01</span><span>Extend the antenna fully and ensure clear sky view — no canyon walls or overhangs blocking line of sight.</span></li>
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">02</span><span>Power on. Wait for signal bars and "Registered" on screen (can take 15–30 seconds).</span></li>
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">03</span><span><strong>US number:</strong> Dial <span className="font-mono text-tertiary">00 1</span> + area code + number. Example: <span className="font-mono text-tertiary">00 1 928 638 7805</span></span></li>
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">04</span><span><strong>911:</strong> Dial <span className="font-mono text-tertiary">00 1 911</span> or try <span className="font-mono text-tertiary">911</span> directly (some Iridium handsets support direct 911).</span></li>
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">05</span><span><strong>Another sat phone:</strong> Dial <span className="font-mono text-tertiary">00 8816</span> + 8-digit Iridium number.</span></li>
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">06</span><span>Press the green call button. Wait — connection can take 5–10 seconds. Speak clearly and slowly.</span></li>
              </ol>
              <div className="mt-3 p-2 bg-surface-container-low">
                <p className="text-xs text-on-surface-variant"><span className="material-symbols-outlined text-xs align-middle mr-1 text-error">warning</span>In the canyon, you may need to hike to a ridgeline or open area for signal. Tributaries and narrow sections block satellite coverage.</p>
              </div>
            </div>

            <div className="surface-card">
              <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider mb-3">Garmin inReach / SOS</h3>
              <ol className="space-y-2 text-sm text-on-surface">
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">01</span><span>Ensure the device has clear sky view. Even partial sky works — inReach uses Iridium constellation.</span></li>
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">02</span><span><strong>SOS emergency:</strong> Lift the SOS cover and press and hold the SOS button for 3 seconds. Confirm when prompted.</span></li>
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">03</span><span>This contacts GEOS International Emergency Response Centre, which coordinates rescue with NPS/SAR.</span></li>
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">04</span><span><strong>Two-way messaging:</strong> Use the message function to send pre-set or custom messages to your emergency contacts.</span></li>
                <li className="flex gap-3"><span className="font-mono text-xs text-tertiary w-5 flex-shrink-0 pt-0.5">05</span><span><strong>Check-in:</strong> Send pre-set "OK" message per the comms schedule. This confirms your GPS position to contacts.</span></li>
              </ol>
              <div className="mt-3 p-2 bg-surface-container-low">
                <p className="text-xs text-on-surface-variant"><span className="material-symbols-outlined text-xs align-middle mr-1 text-tertiary">info</span>inReach messages are NOT phone calls. For voice calls, use the satellite phone. inReach is for text-based messaging and SOS only.</p>
              </div>
            </div>

            <div className="surface-card lg:col-span-2">
              <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider mb-3">Quick Reference Numbers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                  <span className="text-sm text-on-surface">NPS Emergency Dispatch</span>
                  <span className="font-mono text-sm text-tertiary">00 1 928 638 7805</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                  <span className="text-sm text-on-surface">Coconino County SAR</span>
                  <span className="font-mono text-sm text-tertiary">00 1 928 774 4523</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                  <span className="text-sm text-on-surface">US Coast Guard</span>
                  <span className="font-mono text-sm text-tertiary">00 1 800 985 5856</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                  <span className="text-sm text-on-surface">Flagstaff Medical Center</span>
                  <span className="font-mono text-sm text-tertiary">00 1 928 779 3366</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                  <span className="text-sm text-on-surface">Emergency (via sat phone)</span>
                  <span className="font-mono text-sm text-tertiary">00 1 911</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                  <span className="text-sm text-on-surface">Iridium Sat-to-Sat prefix</span>
                  <span className="font-mono text-sm text-tertiary">00 8816 + number</span>
                </div>
              </div>
            </div>
          </div>
        </section>

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

        {/* Trauma Kits */}
        <section id="medical" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
              Trauma Kits
            </h2>
            <button
              onClick={addKit}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-base text-tertiary">add</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add Kit</span>
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {editingKit === '__new__' && (
              <div className="surface-card">
                <div className="flex flex-col gap-2">
                  <input className={inputClasses} value={kitDraft.kit_name} onChange={(e) => setKitDraft({ ...kitDraft, kit_name: e.target.value })} placeholder="Kit name (e.g. Raft 1 Trauma Kit)" />
                  <input className={inputClasses} value={kitDraft.custodian} onChange={(e) => setKitDraft({ ...kitDraft, custodian: e.target.value })} placeholder="Custodian" />
                  <input className={inputClasses} value={kitDraft.location} onChange={(e) => setKitDraft({ ...kitDraft, location: e.target.value })} placeholder="Stowed location" />
                  <input className={inputClasses} value={kitDraft.notes} onChange={(e) => setKitDraft({ ...kitDraft, notes: e.target.value })} placeholder="Notes" />
                  <div className="flex gap-1 justify-end">
                    <button onClick={saveKit} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                      <span className="material-symbols-outlined text-base text-tertiary">check</span>
                    </button>
                    <button onClick={() => setEditingKit(null)} className="p-1 hover:bg-surface-container-high transition-colors">
                      <span className="material-symbols-outlined text-base text-error">close</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {traumaKits.map((kit) => {
              const isKitEditing = editingKit === kit.id
              const isExpanded = expandedKit === kit.id
              const items = (kit.items as TraumaKitItem[]) || []
              return (
                <div key={kit.id} className="surface-card">
                  {/* Kit Header */}
                  {isKitEditing ? (
                    <div className="flex flex-col gap-2 mb-3">
                      <input className={inputClasses} value={kitDraft.kit_name} onChange={(e) => setKitDraft({ ...kitDraft, kit_name: e.target.value })} placeholder="Kit name" />
                      <input className={inputClasses} value={kitDraft.custodian} onChange={(e) => setKitDraft({ ...kitDraft, custodian: e.target.value })} placeholder="Custodian" />
                      <input className={inputClasses} value={kitDraft.location} onChange={(e) => setKitDraft({ ...kitDraft, location: e.target.value })} placeholder="Location" />
                      <input className={inputClasses} value={kitDraft.notes} onChange={(e) => setKitDraft({ ...kitDraft, notes: e.target.value })} placeholder="Notes" />
                      <div className="flex gap-1 justify-end">
                        <button onClick={saveKit} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-base text-tertiary">check</span>
                        </button>
                        <button onClick={() => deleteKit(kit.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-base text-error">close</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setExpandedKit(isExpanded ? null : kit.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-tertiary text-base">
                            {isExpanded ? 'expand_more' : 'chevron_right'}
                          </span>
                          <div>
                            <h3 className="font-display text-sm font-bold text-on-surface">{kit.kit_name}</h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                              {kit.custodian && <span className="tactical-label text-[10px]">{kit.custodian}</span>}
                              {kit.location && <span className="tactical-label text-[10px]">{kit.location}</span>}
                              <span className="font-mono text-[10px] text-on-surface-variant">{items.length} items</span>
                            </div>
                          </div>
                        </div>
                        {kit.notes && <p className="text-xs text-on-surface-variant mt-1 ml-7">{kit.notes}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEditKit(kit)} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-[14px] text-outline">edit</span>
                        </button>
                        <button onClick={() => deleteKit(kit.id)} className="p-1 hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-[14px] text-error">close</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Kit Items — expanded */}
                  {isExpanded && !isKitEditing && (
                    <div className="border-t border-outline-variant/20 pt-3">
                      <div className="space-y-1.5">
                        {items.map((item, i) => {
                          const itemKey = `${kit.id}-${i}`
                          const isItemEditing = editingKitItem === itemKey
                          return (
                            <div key={i} className="py-1.5 border-b border-outline-variant/10 last:border-0">
                              {isItemEditing ? (
                                <div className="flex flex-col gap-2">
                                  <input className={inputClasses} value={kitItemDraft.name} onChange={(e) => setKitItemDraft({ ...kitItemDraft, name: e.target.value })} placeholder="Item name / description" />
                                  <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                                    <input className={inputClasses} value={kitItemDraft.qty} onChange={(e) => setKitItemDraft({ ...kitItemDraft, qty: e.target.value })} placeholder="Qty" />
                                    <input className={inputClasses} value={kitItemDraft.expiry} onChange={(e) => setKitItemDraft({ ...kitItemDraft, expiry: e.target.value })} placeholder="Expiry (e.g. 2027-06)" />
                                    <button onClick={() => saveKitItem(kit, i)} disabled={saving} className="p-0.5 flex-shrink-0">
                                      <span className="material-symbols-outlined text-[14px] text-tertiary">check</span>
                                    </button>
                                    <button onClick={() => removeKitItem(kit, i)} className="p-0.5 flex-shrink-0">
                                      <span className="material-symbols-outlined text-[14px] text-error">close</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 group">
                                  <span className="text-sm text-on-surface flex-1">{item.name}</span>
                                  {item.qty && <span className="font-mono text-xs text-on-surface-variant">x{item.qty}</span>}
                                  {item.expiry && (
                                    <span className={`font-mono text-xs ${
                                      item.expiry.includes('27') || item.expiry.includes('28') ? 'text-on-surface-variant' : 'text-error'
                                    }`}>{item.expiry}</span>
                                  )}
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button onClick={() => startEditKitItem(kit.id, i, item)} className="p-0.5">
                                      <span className="material-symbols-outlined text-[12px] text-outline">edit</span>
                                    </button>
                                    <button onClick={() => removeKitItem(kit, i)} className="p-0.5">
                                      <span className="material-symbols-outlined text-[12px] text-error">close</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => addKitItem(kit)}
                        className="flex items-center gap-1 mt-3 text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        <span className="font-label text-[10px] uppercase tracking-widest">Add Item</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
