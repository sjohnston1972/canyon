import { useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'

interface RaftingTermRecord extends RecordModel {
  term: string
  definition: string
}

interface RaftTypeRecord extends RecordModel {
  name: string
  capacity: string
  use_desc: string
  notes: string
  image_url: string
  credit: string
}

interface RiggingRecord extends RecordModel {
  title: string
  content: string
}

interface RiverCommandRecord extends RecordModel {
  command: string
  description: string
}

interface RaftingVideoRecord extends RecordModel {
  title: string
  url: string
  description: string
}

const sections = [
  { id: 'raft-types', label: 'Raft Types', icon: 'directions_boat' },
  { id: 'terminology', label: 'Terminology', icon: 'menu_book' },
  { id: 'rigging', label: 'Rigging & Setup', icon: 'handyman' },
  { id: 'commands', label: 'River Commands', icon: 'record_voice_over' },
  { id: 'videos', label: 'Video Resources', icon: 'play_circle' },
]

// --- Static defaults for seeding ---
const defaultRaftTypes = [
  { name: "18' Self-Bailing Raft", capacity: '6–8 persons + gear', use_desc: 'Primary expedition support raft. Carries group gear, food, and kitchen setup.', notes: 'Self-bailing floor drains water automatically. Frame-mounted with oar towers for guide control.', image_url: 'https://www.nps.gov/grca/planyourvisit/images/D_3801_2.jpg', credit: 'NPS / Grand Canyon National Park' },
  { name: "16' Paddle Raft", capacity: '6–8 paddlers + guide', use_desc: 'Crew participates in paddling. Guide steers from the stern with a paddle or oar.', notes: 'More active riding experience. Requires coordinated paddle commands from the guide.', image_url: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Trishuli_River_Rafting%2C_Nepal-3187.jpg', credit: 'Bijay Chaurasia / Wikimedia CC BY-SA 4.0' },
  { name: "14' Oar Raft", capacity: '4–5 persons + gear', use_desc: 'Smaller support boat or passenger raft. Guide rows from a centre frame.', notes: 'More manoeuvrable than larger rigs. Good for technical sections.', image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Rafting_the_Colorado%2C_Grand_Canyon_9-15_%2821376170074%29.jpg', credit: 'Don Graham / Wikimedia CC BY-SA 2.0' },
  { name: 'Inflatable Kayak (IK / Ducky)', capacity: '1–2 persons', use_desc: 'Individual paddling. Used by experienced members for a more immersive run.', notes: 'Highly manoeuvrable but requires solid paddle skills. Must be paired with a support raft for gear.', image_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Paddler_in_a_duckie_on_the_San_Miguel_River.jpg', credit: 'Cawright2007 / Wikimedia CC BY-SA 3.0' },
]

const defaultTerminology = [
  { term: 'Bow', definition: 'Front of the raft, facing downstream.' },
  { term: 'Stern', definition: 'Rear of the raft.' },
  { term: 'Port', definition: 'Left side of the raft when facing downstream.' },
  { term: 'Starboard', definition: 'Right side of the raft when facing downstream.' },
  { term: 'Thwart', definition: 'Cross-tube or seat spanning the width of the raft.' },
  { term: 'D-Ring', definition: 'Metal attachment point on the raft used for tying down gear, frames, and lines.' },
  { term: 'Chicken Line', definition: "Perimeter rope along the outside of the raft. Grab it if you're going overboard." },
  { term: 'Flip Line', definition: 'Webbing strap used to right an overturned raft.' },
  { term: 'Oar Tower / Oarlock', definition: 'Frame-mounted pivot point where the oar sits. Allows the guide to row.' },
  { term: 'Dry Box / Rocket Box', definition: 'Waterproof container strapped to the frame for valuables, first aid, and day-use items.' },
  { term: 'Groover', definition: 'Portable toilet system. Required on all permitted Grand Canyon trips. Leave no trace.' },
  { term: 'Eddy', definition: 'Calm water behind an obstacle where current flows upstream. Used for stopping and scouting.' },
  { term: 'Strainer', definition: 'Obstacle (tree, debris) that water flows through but traps boats and people. Extremely dangerous.' },
  { term: 'Hydraulic / Hole', definition: 'Recirculating water feature where water pours over a rock and cycles back upstream. Can trap rafts.' },
  { term: 'Wave Train', definition: 'Series of standing waves below a rapid. Generally fun, occasionally swamping.' },
  { term: 'Tongue', definition: 'Smooth V of water at the top of a rapid indicating the main channel. Usually your entry line.' },
  { term: 'CFS', definition: 'Cubic Feet per Second — measure of river flow volume. Higher CFS = bigger water.' },
  { term: 'River Right / River Left', definition: "Directions as seen facing downstream. Always referenced this way regardless of which way you're looking." },
  { term: 'PFD', definition: 'Personal Flotation Device — your life jacket. Worn at all times on the water.' },
  { term: 'Throw Bag', definition: 'Rescue rope in a nylon bag. Thrown to swimmers to pull them to safety.' },
]

const defaultRigging = [
  { title: 'Frame Assembly', content: 'The rowing frame bolts to the raft via D-rings and straps. Oar towers mount to the frame crossbars. Ensure all pins are secured with cotter pins or clips — vibration from rapids will work anything loose.' },
  { title: 'Load Distribution', content: 'Heavy gear (coolers, water jugs, groover) goes low and centre. Strap everything down with cam straps through D-rings. Nothing should shift if the raft flips. Test by pushing — if it moves, re-rig it.' },
  { title: 'Bow & Stern Lines', content: 'Attach 15–20ft lines to bow and stern. These are your primary tie-off points at camp and are critical for lining the raft through shallow or technical sections. Coil and secure when running rapids — loose lines are a snag hazard.' },
  { title: 'Spare Oar', content: 'Always carry a spare oar strapped to the frame. Oars break. If you lose both oars in a rapid, you are a passenger — the spare is your insurance.' },
  { title: 'Bail Bucket & Pump', content: 'Non-self-bailing rafts need a bail bucket accessible at all times. Even self-bailers benefit from a pump for top-off inflation in the field. Check pressure morning and evening — temperatures swing 30°F+ in the canyon.' },
  { title: 'Safety Kit Placement', content: 'First aid kit, throw bag, knife, and flip line must be immediately accessible — not buried under gear. The guide should be able to reach the throw bag without unstrapping anything.' },
]

const defaultCommands = [
  { command: 'ALL FORWARD', description: 'Everyone paddles forward together. Used to build momentum or punch through waves.' },
  { command: 'ALL BACK', description: 'Everyone paddles backward. Used to slow down or avoid obstacles.' },
  { command: 'LEFT BACK, RIGHT FORWARD', description: 'Turns the raft right. Left side back-paddles, right side forward-paddles.' },
  { command: 'RIGHT BACK, LEFT FORWARD', description: 'Turns the raft left. Right side back-paddles, left side forward-paddles.' },
  { command: 'STOP', description: 'Hold paddles out of the water. Let the raft drift.' },
  { command: 'HIGH SIDE', description: 'Move your weight to the high (downstream) side of the raft to prevent a flip. React immediately.' },
  { command: 'GET DOWN', description: 'Drop to the floor of the raft and hold on. Used in big water or imminent collision.' },
  { command: 'SWIMMER', description: 'Someone is in the water. All boats respond — nearest raft moves to recover.' },
]

const defaultVideos = [
  { title: 'NPS Grand Canyon River Trip Orientation', url: 'https://www.youtube.com/watch?v=dvoX4Z3oNcE', description: 'Official National Park Service orientation for Grand Canyon river trips. Covers regulations, safety, and what to expect on the Colorado River.' },
  { title: 'Types of Grand Canyon Rafts', url: 'https://www.youtube.com/watch?v=gP5pUtHwV60', description: 'Breakdown of motorised rafts, oar rafts, paddle rafts, and hybrid setups used on Grand Canyon trips. Pros and cons of each.' },
  { title: 'How to Build an NRS Raft Frame', url: 'https://www.youtube.com/watch?v=z2ydyPzQgzw', description: 'NRS walkthrough of raft frame assembly — modular LoPro fittings, crossbar setup, and oar tower mounting.' },
  { title: 'How to Strap a Rowing Frame to a Raft', url: 'https://www.youtube.com/watch?v=Kck3DzZVmHs', description: 'NRS guide to strapping down a rowing frame using counter-tension and opposing diagonals for a secure rig.' },
  { title: 'How to Set Up Your Oars for Rafting', url: 'https://www.youtube.com/watch?v=Eio7lPHa_UA', description: 'NRS tutorial on oar length, mount adjustment, power positioning, and handle spacing for efficient rowing.' },
  { title: 'How to Toss a Throw Bag — NRS Rescue', url: 'https://www.youtube.com/watch?v=mSjmMB4QFkc', description: 'Rescue instructor Jim Coffey demonstrates throw bag technique — grip, stance, aim, and swimmer recovery.' },
  { title: 'NPS River Trip: Water Flow & Safety', url: 'https://www.youtube.com/watch?v=AiU9wip1fgE', description: 'National Park Service video on Colorado River water flow patterns, hazards, and how flow levels affect rapids.' },
  { title: 'NPS River Trip: Accident Prevention', url: 'https://www.youtube.com/watch?v=tbRQHRaLHeU', description: 'NPS safety video covering common accident scenarios on Grand Canyon river trips and how to prevent them.' },
]

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'

// Reusable add button
function AddButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors">
      <span className="material-symbols-outlined text-base text-tertiary">add</span>
      <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</span>
    </button>
  )
}

function SeedButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center gap-1 px-2 py-1 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors">
      <span className="material-symbols-outlined text-base text-tertiary">download</span>
      <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Load Defaults</span>
    </button>
  )
}

function SaveCancel({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex gap-1 justify-end">
      <button onClick={onSave} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors">
        <span className="material-symbols-outlined text-base text-tertiary">check</span>
      </button>
      <button onClick={onCancel} className="p-1 hover:bg-surface-container-high transition-colors">
        <span className="material-symbols-outlined text-base text-error">close</span>
      </button>
    </div>
  )
}

function EditDeleteButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      <button onClick={onEdit} className="p-0.5"><span className="material-symbols-outlined text-[14px] text-outline">edit</span></button>
      <button onClick={onDelete} className="p-0.5"><span className="material-symbols-outlined text-[14px] text-error">close</span></button>
    </div>
  )
}

export default function Rafting() {
  const [activeSection, setActiveSection] = useState('raft-types')
  const [saving, setSaving] = useState(false)

  // --- All collections ---
  const { records: dbRaftTypes, loading: raftTypesLoading, create: createRaftType, update: updateRaftType, remove: removeRaftType } = useCollection<RaftTypeRecord>('raft_types')
  const { records: dbTerms, loading: termsLoading, create: createTerm, update: updateTerm, remove: removeTerm } = useCollection<RaftingTermRecord>('rafting_terms')
  const { records: dbRigging, loading: riggingLoading, create: createRigging, update: updateRigging, remove: removeRigging } = useCollection<RiggingRecord>('rigging_topics')
  const { records: dbCommands, loading: commandsLoading, create: createCommand, update: updateCommand, remove: removeCommand } = useCollection<RiverCommandRecord>('river_commands')
  const { records: dbVideos, loading: videosLoading, create: createVideo, update: updateVideo, remove: removeVideo } = useCollection<RaftingVideoRecord>('rafting_videos')

  const loading = raftTypesLoading || termsLoading || riggingLoading || commandsLoading || videosLoading

  // --- Editing state ---
  const [editingRaftType, setEditingRaftType] = useState<string | null>(null)
  const [raftTypeDraft, setRaftTypeDraft] = useState({ name: '', capacity: '', use_desc: '', notes: '', image_url: '', credit: '' })

  const [editingTerm, setEditingTerm] = useState<string | null>(null)
  const [termDraft, setTermDraft] = useState({ term: '', definition: '' })

  const [editingRigging, setEditingRigging] = useState<string | null>(null)
  const [riggingDraft, setRiggingDraft] = useState({ title: '', content: '' })

  const [editingCommand, setEditingCommand] = useState<string | null>(null)
  const [commandDraft, setCommandDraft] = useState({ command: '', description: '' })

  const [editingVideo, setEditingVideo] = useState<string | null>(null)
  const [videoDraft, setVideoDraft] = useState({ title: '', url: '', description: '' })

  // --- Generic CRUD helpers ---
  async function seedCollection<T>(items: T[], createFn: (data: Partial<RecordModel>) => Promise<RecordModel>) {
    setSaving(true)
    try {
      for (const item of items) {
        await createFn(item as Partial<RecordModel>)
      }
    } catch (err) { console.error('Failed to seed', err) }
    finally { setSaving(false) }
  }

  // --- Raft Type CRUD ---
  function startEditRaftType(r: RaftTypeRecord) { setRaftTypeDraft({ name: r.name, capacity: r.capacity, use_desc: r.use_desc, notes: r.notes, image_url: r.image_url || '', credit: r.credit || '' }); setEditingRaftType(r.id) }
  function addRaftType() { setRaftTypeDraft({ name: '', capacity: '', use_desc: '', notes: '', image_url: '', credit: '' }); setEditingRaftType('__new__') }
  async function saveRaftType() {
    setSaving(true)
    try { if (editingRaftType === '__new__') await createRaftType(raftTypeDraft); else if (editingRaftType) await updateRaftType(editingRaftType, raftTypeDraft) }
    catch (err) { console.error('Failed to save raft type', err) }
    finally { setSaving(false); setEditingRaftType(null) }
  }
  async function deleteRaftType(id: string) { try { await removeRaftType(id) } catch (err) { console.error(err) }; if (editingRaftType === id) setEditingRaftType(null) }

  // --- Term CRUD ---
  function startEditTerm(t: RaftingTermRecord) { setTermDraft({ term: t.term, definition: t.definition }); setEditingTerm(t.id) }
  function addTerm() { setTermDraft({ term: '', definition: '' }); setEditingTerm('__new__') }
  async function saveTerm() {
    setSaving(true)
    try { if (editingTerm === '__new__') await createTerm(termDraft); else if (editingTerm) await updateTerm(editingTerm, termDraft) }
    catch (err) { console.error('Failed to save term', err) }
    finally { setSaving(false); setEditingTerm(null) }
  }
  async function deleteTerm(id: string) { try { await removeTerm(id) } catch (err) { console.error(err) }; if (editingTerm === id) setEditingTerm(null) }

  // --- Rigging CRUD ---
  function startEditRigging(r: RiggingRecord) { setRiggingDraft({ title: r.title, content: r.content }); setEditingRigging(r.id) }
  function addRigging() { setRiggingDraft({ title: '', content: '' }); setEditingRigging('__new__') }
  async function saveRigging() {
    setSaving(true)
    try { if (editingRigging === '__new__') await createRigging(riggingDraft); else if (editingRigging) await updateRigging(editingRigging, riggingDraft) }
    catch (err) { console.error('Failed to save rigging topic', err) }
    finally { setSaving(false); setEditingRigging(null) }
  }
  async function deleteRigging(id: string) { try { await removeRigging(id) } catch (err) { console.error(err) }; if (editingRigging === id) setEditingRigging(null) }

  // --- Command CRUD ---
  function startEditCommand(c: RiverCommandRecord) { setCommandDraft({ command: c.command, description: c.description }); setEditingCommand(c.id) }
  function addCommand() { setCommandDraft({ command: '', description: '' }); setEditingCommand('__new__') }
  async function saveCommand() {
    setSaving(true)
    try { if (editingCommand === '__new__') await createCommand(commandDraft); else if (editingCommand) await updateCommand(editingCommand, commandDraft) }
    catch (err) { console.error('Failed to save command', err) }
    finally { setSaving(false); setEditingCommand(null) }
  }
  async function deleteCommand(id: string) { try { await removeCommand(id) } catch (err) { console.error(err) }; if (editingCommand === id) setEditingCommand(null) }

  // --- Video CRUD ---
  function startEditVideo(v: RaftingVideoRecord) { setVideoDraft({ title: v.title, url: v.url, description: v.description }); setEditingVideo(v.id) }
  function addVideo() { setVideoDraft({ title: '', url: '', description: '' }); setEditingVideo('__new__') }
  async function saveVideo() {
    setSaving(true)
    try { if (editingVideo === '__new__') await createVideo(videoDraft); else if (editingVideo) await updateVideo(editingVideo, videoDraft) }
    catch (err) { console.error('Failed to save video', err) }
    finally { setSaving(false); setEditingVideo(null) }
  }
  async function deleteVideo(id: string) { try { await removeVideo(id) } catch (err) { console.error(err) }; if (editingVideo === id) setEditingVideo(null) }

  function scrollTo(id: string) {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
          <span className="tactical-label">Loading rafting reference...</span>
        </div>
      </div>
    )
  }

  // --- Raft type edit form ---
  const raftTypeForm = (
    <div className="surface-card overflow-hidden p-4">
      <div className="flex flex-col gap-2">
        <input className={inputClasses} value={raftTypeDraft.name} onChange={(e) => setRaftTypeDraft({ ...raftTypeDraft, name: e.target.value })} placeholder="Raft name (e.g. 18' Self-Bailing Raft)" />
        <input className={inputClasses} value={raftTypeDraft.capacity} onChange={(e) => setRaftTypeDraft({ ...raftTypeDraft, capacity: e.target.value })} placeholder="Capacity (e.g. 6–8 persons + gear)" />
        <input className={inputClasses} value={raftTypeDraft.use_desc} onChange={(e) => setRaftTypeDraft({ ...raftTypeDraft, use_desc: e.target.value })} placeholder="Primary use" />
        <input className={inputClasses} value={raftTypeDraft.notes} onChange={(e) => setRaftTypeDraft({ ...raftTypeDraft, notes: e.target.value })} placeholder="Notes" />
        <input className={inputClasses} value={raftTypeDraft.image_url} onChange={(e) => setRaftTypeDraft({ ...raftTypeDraft, image_url: e.target.value })} placeholder="Image URL" />
        <input className={inputClasses} value={raftTypeDraft.credit} onChange={(e) => setRaftTypeDraft({ ...raftTypeDraft, credit: e.target.value })} placeholder="Photo credit" />
        <SaveCancel onSave={saveRaftType} onCancel={() => setEditingRaftType(null)} saving={saving} />
      </div>
    </div>
  )

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-surface-container-lowest p-4 border-r border-outline-variant/20 hidden lg:flex lg:flex-col">
        <div className="space-y-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left ${
                activeSection === s.id
                  ? 'bg-surface-container-high text-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-base">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <p className="tactical-label mb-2">
          <span className="material-symbols-outlined text-xs align-middle mr-1">school</span>
          Reference & Training | Expedition Preparation
        </p>
        <h1 className="font-display text-2xl md:text-4xl font-bold text-primary uppercase tracking-tight mb-4 md:mb-8">
          Rafting
        </h1>

        {/* Mobile section nav */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 lg:hidden -mx-4 px-4">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
                activeSection === s.id
                  ? 'bg-surface-container-high text-primary'
                  : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* ═══ RAFT TYPES ═══ */}
        <section id="raft-types" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Raft Types</h2>
            <div className="flex items-center gap-2">
              {dbRaftTypes.length === 0 && <SeedButton onClick={() => seedCollection(defaultRaftTypes, createRaftType)} disabled={saving} />}
              <AddButton onClick={addRaftType} label="Add Type" disabled={saving} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editingRaftType === '__new__' && raftTypeForm}

            {dbRaftTypes.map((raft) => {
              if (editingRaftType === raft.id) return <div key={raft.id}>{raftTypeForm}</div>
              return (
                <div key={raft.id} className="surface-card overflow-hidden p-0 group">
                  {raft.image_url && (
                    <div className="w-full h-40 bg-surface-container overflow-hidden">
                      <img src={raft.image_url} alt={raft.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-lg text-tertiary mt-0.5">directions_boat</span>
                        <div>
                          <h3 className="text-sm font-bold text-on-surface">{raft.name}</h3>
                          <p className="tactical-label">{raft.capacity}</p>
                        </div>
                      </div>
                      <EditDeleteButtons onEdit={() => startEditRaftType(raft)} onDelete={() => deleteRaftType(raft.id)} />
                    </div>
                    <p className="text-sm text-on-surface mb-1">{raft.use_desc}</p>
                    <p className="text-xs text-on-surface-variant mb-2">{raft.notes}</p>
                    {raft.credit && <p className="text-[9px] text-outline">{raft.credit}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ═══ TERMINOLOGY ═══ */}
        <section id="terminology" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Terminology</h2>
            <div className="flex items-center gap-2">
              {dbTerms.length === 0 && <SeedButton onClick={() => seedCollection(defaultTerminology, createTerm)} disabled={saving} />}
              <AddButton onClick={addTerm} label="Add Term" disabled={saving} />
            </div>
          </div>
          <div className="surface-card">
            {editingTerm === '__new__' && (
              <div className="flex flex-col gap-2 py-2 border-b border-outline-variant/20 mb-2">
                <input className={inputClasses} value={termDraft.term} onChange={(e) => setTermDraft({ ...termDraft, term: e.target.value })} placeholder="Term" />
                <input className={inputClasses} value={termDraft.definition} onChange={(e) => setTermDraft({ ...termDraft, definition: e.target.value })} placeholder="Definition" />
                <SaveCancel onSave={saveTerm} onCancel={() => setEditingTerm(null)} saving={saving} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
              {dbTerms.map((item) => (
                <div key={item.id} className="py-2 border-b border-outline-variant/20 last:border-0">
                  {editingTerm === item.id ? (
                    <div className="flex flex-col gap-2">
                      <input className={inputClasses} value={termDraft.term} onChange={(e) => setTermDraft({ ...termDraft, term: e.target.value })} placeholder="Term" />
                      <input className={inputClasses} value={termDraft.definition} onChange={(e) => setTermDraft({ ...termDraft, definition: e.target.value })} placeholder="Definition" />
                      <SaveCancel onSave={saveTerm} onCancel={() => setEditingTerm(null)} saving={saving} />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:gap-3 group">
                      <span className="font-mono text-sm text-tertiary font-bold sm:whitespace-nowrap sm:min-w-[140px]">{item.term}</span>
                      <span className="text-sm text-on-surface flex-1">{item.definition}</span>
                      <EditDeleteButtons onEdit={() => startEditTerm(item)} onDelete={() => deleteTerm(item.id)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ RIGGING & SETUP ═══ */}
        <section id="rigging" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Rigging & Setup</h2>
            <div className="flex items-center gap-2">
              {dbRigging.length === 0 && <SeedButton onClick={() => seedCollection(defaultRigging, createRigging)} disabled={saving} />}
              <AddButton onClick={addRigging} label="Add Topic" disabled={saving} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {editingRigging === '__new__' && (
              <div className="surface-card">
                <input className={inputClasses + ' mb-2'} value={riggingDraft.title} onChange={(e) => setRiggingDraft({ ...riggingDraft, title: e.target.value })} placeholder="Topic title" />
                <textarea className={inputClasses + ' resize-none h-28'} value={riggingDraft.content} onChange={(e) => setRiggingDraft({ ...riggingDraft, content: e.target.value })} placeholder="Content" />
                <SaveCancel onSave={saveRigging} onCancel={() => setEditingRigging(null)} saving={saving} />
              </div>
            )}

            {dbRigging.map((topic) => (
              <div key={topic.id} className="surface-card group">
                {editingRigging === topic.id ? (
                  <>
                    <input className={inputClasses + ' mb-2'} value={riggingDraft.title} onChange={(e) => setRiggingDraft({ ...riggingDraft, title: e.target.value })} placeholder="Topic title" />
                    <textarea className={inputClasses + ' resize-none h-28'} value={riggingDraft.content} onChange={(e) => setRiggingDraft({ ...riggingDraft, content: e.target.value })} placeholder="Content" />
                    <SaveCancel onSave={saveRigging} onCancel={() => setEditingRigging(null)} saving={saving} />
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider">{topic.title}</h3>
                      <EditDeleteButtons onEdit={() => startEditRigging(topic)} onDelete={() => deleteRigging(topic.id)} />
                    </div>
                    <p className="text-sm text-on-surface leading-relaxed">{topic.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ RIVER COMMANDS ═══ */}
        <section id="commands" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">River Commands</h2>
            <div className="flex items-center gap-2">
              {dbCommands.length === 0 && <SeedButton onClick={() => seedCollection(defaultCommands, createCommand)} disabled={saving} />}
              <AddButton onClick={addCommand} label="Add Command" disabled={saving} />
            </div>
          </div>
          <div className="surface-card">
            <p className="text-xs text-on-surface-variant mb-4">
              These commands will be used by the guide on paddle rafts. Learn them before launch day. When you hear a command, execute immediately — hesitation costs positioning.
            </p>
            {editingCommand === '__new__' && (
              <div className="flex flex-col gap-2 py-2 border-b border-outline-variant/20 mb-2">
                <input className={inputClasses} value={commandDraft.command} onChange={(e) => setCommandDraft({ ...commandDraft, command: e.target.value })} placeholder="Command (e.g. ALL FORWARD)" />
                <input className={inputClasses} value={commandDraft.description} onChange={(e) => setCommandDraft({ ...commandDraft, description: e.target.value })} placeholder="Description" />
                <SaveCancel onSave={saveCommand} onCancel={() => setEditingCommand(null)} saving={saving} />
              </div>
            )}
            <div className="space-y-0">
              {dbCommands.map((cmd) => (
                <div key={cmd.id} className="py-2.5 border-b border-outline-variant/20 last:border-0">
                  {editingCommand === cmd.id ? (
                    <div className="flex flex-col gap-2">
                      <input className={inputClasses} value={commandDraft.command} onChange={(e) => setCommandDraft({ ...commandDraft, command: e.target.value })} placeholder="Command" />
                      <input className={inputClasses} value={commandDraft.description} onChange={(e) => setCommandDraft({ ...commandDraft, description: e.target.value })} placeholder="Description" />
                      <SaveCancel onSave={saveCommand} onCancel={() => setEditingCommand(null)} saving={saving} />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:gap-4 group">
                      <span className="font-mono text-sm text-tertiary font-bold sm:whitespace-nowrap sm:min-w-[240px]">{cmd.command}</span>
                      <span className="text-sm text-on-surface flex-1">{cmd.description}</span>
                      <EditDeleteButtons onEdit={() => startEditCommand(cmd)} onDelete={() => deleteCommand(cmd.id)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ VIDEO RESOURCES ═══ */}
        <section id="videos" className="mb-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider">Video Resources</h2>
            <div className="flex items-center gap-2">
              {dbVideos.length === 0 && <SeedButton onClick={() => seedCollection(defaultVideos, createVideo)} disabled={saving} />}
              <AddButton onClick={addVideo} label="Add Video" disabled={saving} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {editingVideo === '__new__' && (
              <div className="surface-card">
                <input className={inputClasses + ' mb-2'} value={videoDraft.title} onChange={(e) => setVideoDraft({ ...videoDraft, title: e.target.value })} placeholder="Video title" />
                <input className={inputClasses + ' mb-2'} value={videoDraft.url} onChange={(e) => setVideoDraft({ ...videoDraft, url: e.target.value })} placeholder="YouTube URL" />
                <input className={inputClasses} value={videoDraft.description} onChange={(e) => setVideoDraft({ ...videoDraft, description: e.target.value })} placeholder="Description" />
                <SaveCancel onSave={saveVideo} onCancel={() => setEditingVideo(null)} saving={saving} />
              </div>
            )}

            {dbVideos.map((video) => (
              <div key={video.id} className="surface-card group">
                {editingVideo === video.id ? (
                  <>
                    <input className={inputClasses + ' mb-2'} value={videoDraft.title} onChange={(e) => setVideoDraft({ ...videoDraft, title: e.target.value })} placeholder="Video title" />
                    <input className={inputClasses + ' mb-2'} value={videoDraft.url} onChange={(e) => setVideoDraft({ ...videoDraft, url: e.target.value })} placeholder="YouTube URL" />
                    <input className={inputClasses} value={videoDraft.description} onChange={(e) => setVideoDraft({ ...videoDraft, description: e.target.value })} placeholder="Description" />
                    <SaveCancel onSave={saveVideo} onCancel={() => setEditingVideo(null)} saving={saving} />
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <a href={video.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="material-symbols-outlined text-lg text-tertiary hover:text-primary transition-colors mt-0.5">play_circle</span>
                        <h3 className="text-sm font-bold text-on-surface hover:text-primary transition-colors">{video.title}</h3>
                      </a>
                      <EditDeleteButtons onEdit={() => startEditVideo(video)} onDelete={() => deleteVideo(video.id)} />
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{video.description}</p>
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="tactical-label mt-2 hover:text-tertiary transition-colors inline-flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                      YouTube
                    </a>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
