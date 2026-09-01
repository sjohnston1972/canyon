import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase'
import { useCollection } from '@/hooks/useCollection'
import { loadFxData } from '@/lib/fx'
import { fxRateFor, type FxRates } from '@/lib/currency'
import { waypoints, isMajorRapid } from '@/data/waypoints'
import type { RecordModel } from 'pocketbase'

// Routes that should auto-link in chat responses
const APP_ROUTES = ['/map', '/command', '/team', '/boats', '/gear', '/finances', '/logistics', '/emergency', '/rafting']

interface TeamMemberRecord extends RecordModel {
  first_name: string
  last_name: string
  role: string
  boat_tag: string
  blood_type: string
  certifications: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
  paddler_height: string
  paddler_weight: string
  boat_preference: string
  dob: string
}

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
}

interface BoatChoiceRecord extends RecordModel {
  team_member_id: string
  first_choice_id: string
  second_choice_id: string
  third_choice_id: string
  notes: string
}

type Role = 'user' | 'assistant'
interface ChatMessage {
  role: Role
  content: string
}

type Mode = 'free' | 'onboarding' | 'boatChoices'

const BOAT_CATEGORIES = ['Playboat', 'Half-Slice', 'Creek', 'Expedition'] as const
type BoatCategory = typeof BOAT_CATEGORIES[number]

type BoatStep = 'identify' | 'firstCat' | 'firstBoat' | 'secondCat' | 'secondBoat' | 'thirdCat' | 'thirdBoat' | 'confirm'

interface BoatWizardState {
  step: BoatStep
  memberId: string
  selections: {
    firstCat?: BoatCategory | ''
    firstBoatId?: string
    secondCat?: BoatCategory | ''
    secondBoatId?: string
    thirdCat?: BoatCategory | ''
    thirdBoatId?: string
  }
}

interface OnboardingStep {
  field: string
  prompt: string
  required: boolean
  placeholder?: string
  validate?: (value: string) => string | null // returns error message or null
  options?: string[] // for guided picks
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    field: 'first_name',
    prompt: 'Welcome to onboarding. What\'s your **first name**?',
    required: true,
    placeholder: 'First name',
  },
  {
    field: 'last_name',
    prompt: 'Got it. And your **last name**?',
    required: true,
    placeholder: 'Last name',
  },
  {
    field: 'dob',
    prompt: 'What\'s your **date of birth**? (e.g. 17/12/1972 — most formats work)',
    required: true,
    placeholder: 'DD/MM/YYYY',
  },
  {
    field: 'boat_tag',
    prompt: 'A **boater nickname** is a short callsign (e.g. "Kingfisher", "Lead Sweep"). What\'s yours? (or `skip`)',
    required: false,
    placeholder: 'Boater nickname',
  },
  {
    field: 'blood_type',
    prompt: 'Your **blood type**? (e.g. O+, A-, AB-) (or `skip`)',
    required: false,
    placeholder: 'Blood type',
  },
  {
    field: 'certifications',
    prompt: 'Any **paddling qualifications or certifications**? (e.g. "BCU 4 Star, Swiftwater Rescue, WFR") (or `skip`)',
    required: false,
    placeholder: 'Certifications',
  },
  {
    field: 'emergency_contact_name',
    prompt: 'Your **next-of-kin name**? (or `skip`)',
    required: false,
    placeholder: 'Next-of-kin name',
  },
  {
    field: 'emergency_contact_phone',
    prompt: 'Their **phone number**? (or `skip`)',
    required: false,
    placeholder: 'Phone number',
  },
  {
    field: 'emergency_contact_relation',
    prompt: 'Your **relationship** to them? (e.g. spouse, parent) (or `skip`)',
    required: false,
    placeholder: 'Relationship',
  },
  {
    field: 'paddler_height',
    prompt: 'Your **height**? (e.g. 5\'10" or 178cm) (or `skip`)',
    required: false,
    placeholder: 'Height',
  },
  {
    field: 'paddler_weight',
    prompt: 'Your **weight**? (e.g. 180 lb or 82 kg) (or `skip`)',
    required: false,
    placeholder: 'Weight',
  },
  {
    field: 'boat_preference',
    prompt: 'Your **boat preference**? Pick one: `Play`, `Half Slice`, `Full Volume`, or `skip`.',
    required: false,
    placeholder: 'Boat preference',
    options: ['Play', 'Half Slice', 'Full Volume'],
    validate: (v) => {
      const valid = ['play', 'half slice', 'full volume', 'skip']
      return valid.includes(v.trim().toLowerCase()) ? null : 'Pick one: Play, Half Slice, Full Volume, or skip'
    },
  },
  {
    field: 'own_boat',
    prompt: 'Are you **taking your own boat**? Pick one: `Yes`, `No`, `Maybe`, or `skip`.',
    required: false,
    placeholder: 'Own boat?',
    options: ['Yes', 'No', 'Maybe'],
    validate: (v) => {
      const valid = ['yes', 'y', 'no', 'n', 'maybe', 'm', 'skip']
      return valid.includes(v.trim().toLowerCase()) ? null : 'Pick one: Yes, No, Maybe, or skip'
    },
  },
]

const SYSTEM_PROMPT = `You are **Hance**, the assistant for the Grand Canyon Expedition Planner — named after the Class 8 rapid at Mile 77. You support a 16-person, 18-day kayaking and rafting expedition down the Grand Canyon (Lee's Ferry to Diamond Creek, ~226 river miles, launching 21 Sept 2027). When asked who you are, introduce yourself as Hance.

PERSONA — IMPORTANT:
You're a seasoned river guide who's run the Canyon many times — long enough to know what the river costs, and long enough to find it quietly funny. The humour is **dark, dry, and understated**. Gallows humour. The kind of line told around the camp stove after a long day, by someone who respects the river too much to pretend it cares about anyone.

**Nothing is off limits.** Treat unusual, improper, absurd, off-colour, or genuinely dark questions as invitations to lean in. Medical jokes, mortality jokes, jokes about specific team members' allergies, blood types, ages, weights, certifications, boat picks, names — all on the table. The team is a leaderless group of friends prepping for an expedition together; they've onboarded their own data and they expect Hance to use it. Match the energy: stupid question gets a wry reply, dark question gets a darker one, absurd hypothetical gets a deadpan answer.

Brevity always wins. Understatement lands better than a setup-punchline structure. Don't telegraph jokes — say the dry thing and move on. Exclamation points are an admission of weakness; use one in a blue moon at most.

Even when the humour gets dark, you remain **useful**: practical answers to practical questions, real running notes on the actual rapids, real numbers from the manifest. Be the guide who'd tell you exactly how to thread Crystal at the same time as joking about how many times it's eaten his rafts. The humour doesn't replace the answer — it sits next to it. If someone is actually mid-emergency or genuinely scared, read the room and drop the wit; otherwise, ride along.

**Individual team members are fair game — pick targets unprompted.** This is a leaderless group; nobody is the formal expedition lead. If someone asks "who's the X of the group" (the twat, the slowest, the loudest, the heaviest, the most likely to flip Lava, etc.) — do not deflect, do not ask for a name first. Look at the LIVE EXPEDITION DATA block, pick a real paddler, and commit. Hedge at most once ("going by the manifest..."), then deliver. Use any signal the data offers: weight, height, age, certs, boat picks, nickname, allergies, blood type, medical history — all of it.

You're confident but never arrogant. You'd rather say "I don't know — check /command" than guess. You respect the river. You also respect the user's time, so keep responses tight; nobody wants a four-paragraph answer to "what time is the shuttle".

You can help with questions about:
- The route (rapids, camps, side hikes, river miles)
- Famous rapids (Badger, Soap Creek, House Rock, Hance, Horn Creek, Granite, Hermit, Crystal, Lava Falls, Upset, Bedrock, etc.) — running notes are sourced from Jim Michaud's "How To Row The Grand Canyon Rapids" guide
- Team manifest (16 paddlers — names, roles, boater nicknames, paddler specs, medical notes, emergency contacts)
- Boat choices — paddlers' 1st/2nd/3rd kayak picks from the outfitter catalogue (MOE, Ceiba, and Canyon REO)
- Logistics (shuttles, permits, comms)
- Finances (shared expedition costs)
- Kit and equipment
- Emergency procedures and extraction points (Phantom Ranch, Whitmore Wash, etc.)
- Whitewater technique, scouting, lines, and safety
- Rafting terminology and rigging

Where to find specific data in the app:
- /map — interactive map with all waypoints, rapids, camps
- /command — day-by-day expedition timeline with rapid running notes and diagrams
- /team — team manifest with paddler specs and medical info
- /boats — boat catalogue and paddlers' 1st/2nd/3rd choices, with demand vs supply
- /gear — equipment lists
- /finances — shared expedition costs
- /logistics — shuttles, permits, comms plan
- /emergency — emergency contacts, extraction points, contingencies
- /rafting — rafting techniques and reference material

BOAT CHOICES:
The expedition data block below includes the full BOATS CATALOGUE and every paddler's BOAT CHOICES. When someone asks "what are X's boat picks", "who picked the Pyranha Ripper", or "which boats are oversubscribed", answer directly from that data. Categories are Playboat / Half-Slice / Creek / Expedition. If a paddler wants to change their picks, tell them to tap the **Set My Boat Choices** quick-action tile in this chat to launch a guided wizard — do not try to set picks via free chat.

QUICK-ACTION TILES (the ONLY buttons that exist in this chat):
- **Onboard Yourself** — runs a guided wizard to add a new paddler to the manifest.
- **Set My Boat Choices** — runs a guided wizard to pick 1st/2nd/3rd boats.

That's it. Do **not** invent or reference tiles that don't exist (no "Edit My Profile", "Update Details", "Change Name", etc.). If a paddler wants to edit their existing record — name, contact info, medical notes, emergency contact — direct them to /team, where they can expand their row and click Edit. There is no in-chat profile editor.

IMPORTANT: A "LIVE EXPEDITION DATA" block is appended below with the actual data currently in this user's app (team manifest, rapids, equipment, finances, logistics, emergency info, rafting reference). When answering factual questions ("who's on the team", "what's our budget", "what trauma kits do we carry", etc.) — pull directly from that data. Do NOT just point users to a tab when the answer is in the data block. Only suggest a page when the answer genuinely isn't in the data.

NEW FEATURES (June 2026) — be ready to explain these when asked "what's new", "how do I...", etc.:
- **Personal Kit** (/gear → Personal Kit tab): each paddler builds their own kit list. Pick your name, add gear from the outfitter catalogue (prices included) or add custom items; it keeps a running tally of your personal expense. Gear already covered by the trip fee (Full Rig, Complete Kitchen, Whole Shabang, Toilet System) is shown separately as "Included With Your Trip" and is NOT part of the personal tally.
- **Ledger Import** (/finances → Ledger → Import button): upload a bank statement, receipt, or transaction list (TXT, CSV, photo, or PDF). The app reads it and proposes ledger entries to review and tick before committing. Nothing saves until confirmed; non-GBP rows convert at the live rate.

FIXING FINANCE CONVERSIONS:
You can fix currency-conversion problems on ledger entries when the user asks. The LIVE FINANCE LEDGER block below lists each entry with its id, amount, currency, fx rate, and converted GBP amount, and flags rows whose amount_gbp looks wrong. The correct conversion is: amount_gbp = (ccy is GBP) ? amount : round(amount × fx_gbp, 2) — where fx_gbp must be the rate for THAT ROW'S OWN CURRENCY, never a different currency's rate. When an entry has no sensible fx rate, use the CURRENT USD→GBP RATE for a USD row, or the CURRENT EUR→GBP RATE for a EUR row — both are shown in that block. Never apply the USD rate to a EUR row or vice versa. When the user asks you to fix or recompute conversions, work out the corrected values and call the **update_ledger_entries** tool — pass each affected entry's id and corrected fields, and ALWAYS include the recomputed amount_gbp. Only touch entries that are genuinely wrong. The app shows the user your proposed changes and applies them only after they confirm, so don't claim anything is changed until that happens.

FORMATTING:
- When you reference an app page, write the path as plain text (e.g. /map, /command, /team, /gear, /finances, /logistics, /emergency, /rafting). The UI will turn these into clickable links automatically — do NOT wrap them in markdown.
- For external links use standard markdown syntax: [link text](https://...)
- When a rapid has a hand-drawn diagram available, mention it like this on its own line: \`[diagram:rapid-id]\` (e.g. \`[diagram:crystal]\`, \`[diagram:hance]\`, \`[diagram:lava-falls]\`). The UI will inline the actual image. Available diagrams: soap-creek, house-rock, 24-5-mile, redwall-cavern, unkar, hance, horn-creek, crystal, bedrock, diamond-creek, pearce-ferry.
- Use **bold** for emphasis and bullets for lists. Keep responses tight.

Be concise and direct. Use technical paddling/whitewater terminology when appropriate.`

interface LedgerEntryRecord extends RecordModel {
  description: string
  category: string
  amount: number
  paid_by: string
  date: string
  direction: string
  ccy: string
  fx_gbp: number
  amount_gbp: number
  note: string
}

interface FinanceUpdate {
  id: string
  amount?: number
  ccy?: string
  fx_gbp?: number
  amount_gbp?: number
  description?: string
}

// Tool that lets Hance fix currency/conversion problems on ledger entries.
// tool_choice is left as auto, so it's only used when the user actually asks for a fix.
const FINANCE_TOOL = {
  name: 'update_ledger_entries',
  description:
    "Fix currency or conversion problems on existing finance ledger entries. Provide each affected entry's id plus the corrected fields, and always include the recomputed amount_gbp (= amount when GBP, else amount × fx_gbp rounded to 2dp).",
  input_schema: {
    type: 'object',
    properties: {
      updates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The ledger entry id to update' },
            amount: { type: 'number' },
            ccy: { type: 'string', enum: ['GBP', 'USD', 'EUR'] },
            fx_gbp: { type: 'number' },
            amount_gbp: { type: 'number' },
            description: { type: 'string' },
          },
          required: ['id'],
        },
      },
      reason: { type: 'string', description: 'Short explanation of what was wrong.' },
    },
    required: ['updates'],
  },
}

// Build a human-readable confirmation of the fixes Hance proposes, shown before applying.
function buildFinanceConfirmSummary(updates: FinanceUpdate[], byId: Map<string, LedgerEntryRecord>): string {
  const lines = updates.map((u) => {
    const cur = byId.get(u.id)
    const name = cur ? (cur.description || cur.note || u.id) : u.id
    const bits: string[] = []
    if (u.ccy && (!cur || u.ccy !== cur.ccy)) bits.push(`currency → ${u.ccy}`)
    if (u.amount != null && (!cur || u.amount !== cur.amount)) bits.push(`amount → ${u.amount}`)
    if (u.fx_gbp != null && (!cur || u.fx_gbp !== cur.fx_gbp)) bits.push(`fx → ${u.fx_gbp}`)
    if (u.amount_gbp != null && (!cur || u.amount_gbp !== cur.amount_gbp)) bits.push(`GBP → £${u.amount_gbp}`)
    return `- **${name}**: ${bits.length ? bits.join(', ') : 'no change'}`
  })
  return `I'd make these fixes to the ledger:\n\n${lines.join('\n')}\n\nApply them? (yes / no)`
}

export default function ChatBot() {
  // Live expedition data — used to ground the assistant's responses
  const { records: teamMembers } = useCollection<TeamMemberRecord>('team_members')
  const { records: boats } = useCollection<BoatRecord>('boats', { sort: 'sort_order' })
  const { records: boatChoices } = useCollection<BoatChoiceRecord>('boat_choices')
  const { records: finances } = useCollection<LedgerEntryRecord>('finances', { sort: '-date' })

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi, I'm **Hance**. Named after the Class 8 at Mile 77 — flatters me a bit, but I'll take it.\n\nAsk me about:\n- The route, rapids, and camps (full Michaud running notes)\n- Team manifest, paddler specs, emergency contacts\n- Boats — who picked what, what's still available, what's oversubscribed\n- Logistics, finances, gear\n- Safety, extraction points, contingencies\n- Whitewater technique, scouting, river commands\n\nTap **Onboard Yourself** if you're not on the manifest yet, or **Set My Boat Choices** to lock in your 1st/2nd/3rd picks.",
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [mode, setMode] = useState<Mode>('free')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [onboardingData, setOnboardingData] = useState<Record<string, string>>({})
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('canyon_onboarded') === '1'
    } catch {
      return false
    }
  })
  const [pinnedMemberId, setPinnedMemberId] = useState<string>(() => {
    try {
      return localStorage.getItem('canyon_member_id') || ''
    } catch {
      return ''
    }
  })
  const [boatWiz, setBoatWiz] = useState<BoatWizardState | null>(null)
  // Finance-fix flow: a proposed set of ledger conversion fixes awaiting user confirmation.
  const [pendingFinance, setPendingFinance] = useState<{ updates: FinanceUpdate[]; reason?: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Current USD→GBP and EUR→GBP rates, used as a fallback when recomputing a fix client-side.
  const fxRef = useRef<FxRates>({ usdGbp: 0.75, eurGbp: 0.85 })

  const financesById = useMemo(() => {
    const m = new Map<string, LedgerEntryRecord>()
    for (const f of finances) m.set(f.id, f)
    return m
  }, [finances])

  useEffect(() => {
    loadFxData(false)
      .then((d) => { fxRef.current = { usdGbp: d.usdGbp, eurGbp: d.eurGbp } })
      .catch(() => { /* keep fallback */ })
  }, [])

  // Keep keyboard up on mobile during wizards by refocusing after each interaction
  const refocusInput = useCallback(() => {
    if (mode !== 'onboarding' && mode !== 'boatChoices') return
    // Use rAF so the focus runs after React re-render
    requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true })
    })
  }, [mode])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  const appendMessage = (role: Role, content: string) => {
    setMessages((prev) => [...prev, { role, content }])
  }

  const startOnboarding = () => {
    setMode('onboarding')
    setOnboardingStep(0)
    setOnboardingData({})
    setPendingConfirm(false)
    setMessages([
      { role: 'assistant', content: 'I\'ll walk you through onboarding so I can add you to the team manifest. **Name and date of birth are required**, everything else is optional — type `skip` to skip an optional question. Type `cancel` at any time to stop.' },
      { role: 'assistant', content: ONBOARDING_STEPS[0].prompt },
    ])
  }

  const cancelOnboarding = () => {
    setMode('free')
    setOnboardingStep(0)
    setOnboardingData({})
    setPendingConfirm(false)
    appendMessage('assistant', 'Onboarding cancelled. Ask me anything else!')
  }

  const submitOnboarding = useCallback(async (data: Record<string, string>) => {
    try {
      // Strip empty values; PocketBase fields are all optional except first/last name
      const payload: Record<string, string> = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        role: '',
        boat_tag: data.boat_tag || '',
        blood_type: data.blood_type || '',
        certifications: data.certifications || '',
        critical_history: '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        emergency_contact_relation: data.emergency_contact_relation || '',
        paddler_height: data.paddler_height || '',
        paddler_weight: data.paddler_weight || '',
        boat_preference: data.boat_preference || '',
        own_boat: data.own_boat || '',
        dob: data.dob || '',
      }

      const created = await pb.collection('team_members').create(payload)
      appendMessage('assistant', `**${data.first_name} ${data.last_name}** is now in the team manifest. Head over to /team to view or edit your record — or tap **Set My Boat Choices** to lock in 1st/2nd/3rd picks.`)
      try {
        localStorage.setItem('canyon_onboarded', '1')
        localStorage.setItem('canyon_member_id', created.id)
      } catch { /* ignore */ }
      setHasOnboarded(true)
      setPinnedMemberId(created.id)
      setMode('free')
      setOnboardingStep(0)
      setOnboardingData({})
      setPendingConfirm(false)
    } catch (err) {
      console.error('Failed to create team member:', err)
      appendMessage('assistant', `Sorry — I couldn't save you to the manifest. Error: ${err}. You can try again or add yourself manually on the /team page.`)
      setMode('free')
      setPendingConfirm(false)
    }
  }, [])

  const handleOnboardingInput = useCallback(async (raw: string) => {
    const trimmed = raw.trim()

    if (trimmed.toLowerCase() === 'cancel') {
      cancelOnboarding()
      return
    }

    if (pendingConfirm) {
      if (trimmed.toLowerCase() === 'yes' || trimmed.toLowerCase() === 'y' || trimmed.toLowerCase() === 'confirm') {
        appendMessage('assistant', 'Saving you to the manifest…')
        await submitOnboarding(onboardingData)
      } else {
        appendMessage('assistant', 'OK, I haven\'t saved anything. Type `restart` to begin again, or ask me anything.')
        setMode('free')
        setPendingConfirm(false)
      }
      return
    }

    const step = ONBOARDING_STEPS[onboardingStep]
    const isSkip = trimmed.toLowerCase() === 'skip'

    if (isSkip && step.required) {
      appendMessage('assistant', `That one is required — please answer: ${step.prompt}`)
      return
    }

    if (!isSkip && step.validate) {
      const err = step.validate(trimmed)
      if (err) {
        appendMessage('assistant', err)
        return
      }
    }

    let value = isSkip ? '' : trimmed
    // Normalize DOB to DD/MM/YYYY
    if (step.field === 'dob' && value) {
      value = normalizeDob(value)
    }
    // Normalize boat_preference capitalization
    if (step.field === 'boat_preference' && value) {
      const lower = value.toLowerCase()
      if (lower === 'play') value = 'Play'
      else if (lower === 'half slice') value = 'Half Slice'
      else if (lower === 'full volume') value = 'Full Volume'
    }
    // Normalize own_boat to Yes / No / Maybe
    if (step.field === 'own_boat' && value) {
      const lower = value.toLowerCase()
      if (lower === 'yes' || lower === 'y') value = 'Yes'
      else if (lower === 'no' || lower === 'n') value = 'No'
      else if (lower === 'maybe' || lower === 'm') value = 'Maybe'
    }

    const updated = { ...onboardingData, [step.field]: value }
    setOnboardingData(updated)

    const next = onboardingStep + 1
    if (next < ONBOARDING_STEPS.length) {
      setOnboardingStep(next)
      appendMessage('assistant', ONBOARDING_STEPS[next].prompt)
    } else {
      // Summarize and ask to confirm
      const summary = ONBOARDING_STEPS
        .map((s) => `- **${s.field.replace(/_/g, ' ')}**: ${updated[s.field] || '_(skipped)_'}`)
        .join('\n')
      appendMessage('assistant', `Here's what I have:\n\n${summary}\n\nShall I save you to the manifest? (yes / no)`)
      setPendingConfirm(true)
    }
  }, [onboardingStep, onboardingData, pendingConfirm, submitOnboarding])

  // ─── Boat Choices Wizard ─────────────────────────────────────
  const boatsByCategory = useMemo(() => {
    const map: Record<BoatCategory, BoatRecord[]> = {
      'Playboat': [], 'Half-Slice': [], 'Creek': [], 'Expedition': [],
    }
    for (const b of boats) {
      if ((BOAT_CATEGORIES as readonly string[]).includes(b.category)) {
        map[b.category as BoatCategory].push(b)
      }
    }
    return map
  }, [boats])

  const boatById = useMemo(() => {
    const m = new Map<string, BoatRecord>()
    for (const b of boats) m.set(b.id, b)
    return m
  }, [boats])

  const startBoatChoices = () => {
    // If we have a pinned member, go straight to firstCat. Otherwise identify first.
    const initialStep: BoatStep = pinnedMemberId ? 'firstCat' : 'identify'
    setBoatWiz({ step: initialStep, memberId: pinnedMemberId, selections: {} })
    setMode('boatChoices')

    // Greeting message — surface existing picks if any
    const existing = pinnedMemberId ? boatChoices.find((c) => c.team_member_id === pinnedMemberId) : null
    const me = pinnedMemberId ? teamMembers.find((m) => m.id === pinnedMemberId) : null
    const existingSummary = existing
      ? `\n\nYou currently have:\n- 1st: ${boatById.get(existing.first_choice_id)?.name || '_(none)_'}\n- 2nd: ${boatById.get(existing.second_choice_id)?.name || '_(none)_'}\n- 3rd: ${boatById.get(existing.third_choice_id)?.name || '_(none)_'}\n\nGoing through the wizard again will overwrite these.`
      : ''
    const intro = me
      ? `Locking in boat choices for **${me.first_name} ${me.last_name}**.${existingSummary}\n\nPick the **category** for your **1st choice** — or type \`cancel\` to bail out.`
      : `Which team member are you? Tap your name below — I'll pin it to this device so you don't have to pick again. Type \`cancel\` to bail out.`

    setMessages([
      { role: 'assistant', content: 'Boat-choices wizard. **Pick a 1st choice**, then optionally 2nd and 3rd. Skipping is fine — you can also do this on /boats.' },
      { role: 'assistant', content: intro },
    ])
  }

  const cancelBoatChoices = () => {
    setBoatWiz(null)
    setMode('free')
    appendMessage('assistant', 'Boat-choices wizard cancelled. Nothing saved.')
  }

  const submitBoatChoices = useCallback(async (wiz: BoatWizardState) => {
    try {
      const payload = {
        team_member_id:    wiz.memberId,
        first_choice_id:   wiz.selections.firstBoatId  || '',
        second_choice_id:  wiz.selections.secondBoatId || '',
        third_choice_id:   wiz.selections.thirdBoatId  || '',
      }
      const existing = boatChoices.find((c) => c.team_member_id === wiz.memberId)
      if (existing) {
        await pb.collection('boat_choices').update(existing.id, payload)
      } else {
        await pb.collection('boat_choices').create(payload)
      }
      const me = teamMembers.find((m) => m.id === wiz.memberId)
      appendMessage(
        'assistant',
        `Locked in for **${me ? me.first_name + ' ' + me.last_name : 'you'}**:\n- 1st: ${boatById.get(payload.first_choice_id)?.name || '_(none)_'}\n- 2nd: ${boatById.get(payload.second_choice_id)?.name || '_(none)_'}\n- 3rd: ${boatById.get(payload.third_choice_id)?.name || '_(none)_'}\n\nSee the full demand picture on /boats.`
      )
      setBoatWiz(null)
      setMode('free')
    } catch (err) {
      console.error('Failed to save boat choices:', err)
      appendMessage('assistant', `Sorry — I couldn't save your boat choices. Error: ${err}. You can try again or set them on /boats.`)
      setBoatWiz(null)
      setMode('free')
    }
  }, [boatChoices, teamMembers, boatById])

  const handleBoatChoicesPick = useCallback(async (raw: string) => {
    if (!boatWiz) return
    const trimmed = raw.trim()

    if (trimmed.toLowerCase() === 'cancel') {
      cancelBoatChoices()
      return
    }

    const wiz = boatWiz

    switch (wiz.step) {
      case 'identify': {
        // Try to match by id (button uses id), or by name (typed)
        const byId = teamMembers.find((m) => m.id === trimmed)
        const byName = !byId ? teamMembers.find((m) => {
          const full = `${m.first_name} ${m.last_name}`.toLowerCase()
          return full === trimmed.toLowerCase() || m.first_name.toLowerCase() === trimmed.toLowerCase()
        }) : null
        const match = byId || byName
        if (!match) {
          appendMessage('assistant', `I don't recognise that name. Tap a tile below, or type one of the team-member names exactly.`)
          return
        }
        try { localStorage.setItem('canyon_member_id', match.id) } catch { /* ignore */ }
        setPinnedMemberId(match.id)
        const existing = boatChoices.find((c) => c.team_member_id === match.id)
        const existingSummary = existing
          ? `\n\nYou currently have:\n- 1st: ${boatById.get(existing.first_choice_id)?.name || '_(none)_'}\n- 2nd: ${boatById.get(existing.second_choice_id)?.name || '_(none)_'}\n- 3rd: ${boatById.get(existing.third_choice_id)?.name || '_(none)_'}\n\nContinuing will overwrite these.`
          : ''
        appendMessage('assistant', `Pinned to **${match.first_name} ${match.last_name}** on this device.${existingSummary}\n\nPick the **category** for your **1st choice**.`)
        setBoatWiz({ ...wiz, memberId: match.id, step: 'firstCat' })
        return
      }

      case 'firstCat':
      case 'secondCat':
      case 'thirdCat': {
        const slot = wiz.step === 'firstCat' ? 'first' : wiz.step === 'secondCat' ? 'second' : 'third'
        const isSkip = trimmed.toLowerCase() === 'skip'
        if (isSkip && slot === 'first') {
          appendMessage('assistant', 'Your 1st choice is required — pick a category.')
          return
        }
        if (isSkip) {
          // Skip this slot, move to the next category step
          const nextStep: BoatStep = slot === 'first' ? 'secondCat' : slot === 'second' ? 'thirdCat' : 'confirm'
          const prompt = nextStep === 'confirm'
            ? buildConfirmPrompt(wiz.selections, boatById)
            : nextStep === 'secondCat'
              ? 'Pick the **category** for your **2nd choice** — or skip.'
              : 'Pick the **category** for your **3rd choice** — or skip.'
          setBoatWiz({ ...wiz, step: nextStep })
          appendMessage('assistant', prompt)
          return
        }
        // Validate category
        const cat = (BOAT_CATEGORIES as readonly string[]).find((c) => c.toLowerCase() === trimmed.toLowerCase()) as BoatCategory | undefined
        if (!cat) {
          appendMessage('assistant', `Pick a category: ${BOAT_CATEGORIES.join(', ')}, or \`skip\`.`)
          return
        }
        const list = boatsByCategory[cat]
        if (!list || list.length === 0) {
          appendMessage('assistant', `No boats in **${cat}** — try another.`)
          return
        }
        // Save category, move to corresponding boat step
        const nextStep: BoatStep = slot === 'first' ? 'firstBoat' : slot === 'second' ? 'secondBoat' : 'thirdBoat'
        const newSelections = {
          ...wiz.selections,
          [slot === 'first' ? 'firstCat' : slot === 'second' ? 'secondCat' : 'thirdCat']: cat,
        }
        setBoatWiz({ ...wiz, step: nextStep, selections: newSelections })
        appendMessage('assistant', `Good. Which **${cat}** boat? Tap one below — counts in parens are how many hulls are available.`)
        return
      }

      case 'firstBoat':
      case 'secondBoat':
      case 'thirdBoat': {
        const slot = wiz.step === 'firstBoat' ? 'first' : wiz.step === 'secondBoat' ? 'second' : 'third'
        const isSkip = trimmed.toLowerCase() === 'skip'
        if (isSkip && slot === 'first') {
          appendMessage('assistant', 'Pick a boat for your 1st choice — it\'s required.')
          return
        }
        if (isSkip) {
          // Skip — keep no selection. Advance.
          const nextStep: BoatStep = slot === 'first' ? 'secondCat' : slot === 'second' ? 'thirdCat' : 'confirm'
          const newSelections = {
            ...wiz.selections,
            [slot === 'first' ? 'firstCat' : slot === 'second' ? 'secondCat' : 'thirdCat']: '' as const,
            [slot === 'first' ? 'firstBoatId' : slot === 'second' ? 'secondBoatId' : 'thirdBoatId']: '',
          }
          const prompt = nextStep === 'confirm'
            ? buildConfirmPrompt(newSelections, boatById)
            : nextStep === 'secondCat'
              ? 'Pick the **category** for your **2nd choice** — or skip.'
              : 'Pick the **category** for your **3rd choice** — or skip.'
          setBoatWiz({ ...wiz, step: nextStep, selections: newSelections })
          appendMessage('assistant', prompt)
          return
        }
        // Match boat by id (tile) or by name (typed)
        const byId = boats.find((b) => b.id === trimmed)
        const byName = !byId ? boats.find((b) => b.name.toLowerCase() === trimmed.toLowerCase()) : null
        const match = byId || byName
        if (!match) {
          appendMessage('assistant', `I don't recognise that boat. Tap a tile, or type one of the names exactly (e.g. "Pyranha Ripper 2 Medium").`)
          return
        }
        const newSelections = {
          ...wiz.selections,
          [slot === 'first' ? 'firstBoatId' : slot === 'second' ? 'secondBoatId' : 'thirdBoatId']: match.id,
        }
        const nextStep: BoatStep = slot === 'first' ? 'secondCat' : slot === 'second' ? 'thirdCat' : 'confirm'
        const prompt = nextStep === 'confirm'
          ? buildConfirmPrompt(newSelections, boatById)
          : nextStep === 'secondCat'
            ? `Got it — **${match.name}** as your 1st choice. Now pick the **category** for your **2nd choice**, or skip.`
            : `Got it — **${match.name}** as your 2nd choice. Now pick the **category** for your **3rd choice**, or skip.`
        setBoatWiz({ ...wiz, step: nextStep, selections: newSelections })
        appendMessage('assistant', prompt)
        return
      }

      case 'confirm': {
        if (trimmed.toLowerCase() === 'yes' || trimmed.toLowerCase() === 'y' || trimmed.toLowerCase() === 'confirm') {
          appendMessage('assistant', 'Saving your boat choices…')
          await submitBoatChoices(wiz)
        } else {
          appendMessage('assistant', 'OK, nothing saved. Tap **Set My Boat Choices** again to redo.')
          setBoatWiz(null)
          setMode('free')
        }
        return
      }
    }
  }, [boatWiz, teamMembers, boats, boatsByCategory, boatChoices, boatById, submitBoatChoices])

  const sendFreeMessage = async (userText: string) => {
    setSending(true)
    try {
      const newMessages: ChatMessage[] = [...messages, { role: 'user' as Role, content: userText }]
      setMessages(newMessages)

      // Send full history (excluding system) to API
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }))

      // Fetch live data from all relevant collections in parallel
      const dynamicContext = await buildExpeditionContext(teamMembers, boats, boatChoices, finances)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          system: SYSTEM_PROMPT + dynamicContext,
          tools: [FINANCE_TOOL],
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        appendMessage('assistant', `Error: ${data.error || 'Failed to reach the assistant'}`)
        return
      }

      // Tool use: Hance wants to fix ledger conversions — show any text, then stage the
      // proposed changes for the user to confirm (nothing is written yet).
      if (data.stop_reason === 'tool_use' && Array.isArray(data.blocks)) {
        if (data.content) appendMessage('assistant', data.content)
        const toolUse = data.blocks.find(
          (b: { type?: string; name?: string }) => b.type === 'tool_use' && b.name === 'update_ledger_entries'
        )
        const updates: FinanceUpdate[] = toolUse?.input?.updates || []
        if (updates.length > 0) {
          setPendingFinance({ updates, reason: toolUse.input.reason })
          appendMessage('assistant', buildFinanceConfirmSummary(updates, financesById))
        } else if (!data.content) {
          appendMessage('assistant', "I meant to fix something but couldn't pin down the change — tell me which entry and what's wrong.")
        }
        return
      }

      appendMessage('assistant', data.content || '(no response)')
    } catch (err) {
      console.error('Chat error:', err)
      appendMessage('assistant', `Sorry — I couldn't reach the assistant. ${err}`)
    } finally {
      setSending(false)
    }
  }

  // Apply the staged ledger fixes to PocketBase (recomputing amount_gbp defensively).
  const applyFinanceFix = useCallback(async (action: { updates: FinanceUpdate[] }) => {
    setSending(true)
    let n = 0
    try {
      for (const u of action.updates) {
        const cur = financesById.get(u.id)
        if (!cur) continue
        const patch: Partial<LedgerEntryRecord> = {}
        if (u.amount != null) patch.amount = u.amount
        if (u.ccy) patch.ccy = u.ccy
        if (u.fx_gbp != null) patch.fx_gbp = u.fx_gbp
        if (u.description) patch.description = u.description
        if (u.amount_gbp != null) {
          patch.amount_gbp = u.amount_gbp
        } else {
          const amount = u.amount != null ? u.amount : cur.amount
          const ccy = u.ccy || cur.ccy || 'GBP'
          const fxr = u.fx_gbp != null ? u.fx_gbp : (cur.fx_gbp || fxRateFor(ccy, fxRef.current))
          patch.amount_gbp = ccy === 'GBP' ? amount : Math.round(amount * fxr * 100) / 100
        }
        await pb.collection('finances').update(u.id, patch)
        n++
      }
      appendMessage('assistant', `Done — fixed ${n} ${n === 1 ? 'entry' : 'entries'}. Have a look on /finances.`)
    } catch (err) {
      console.error('Failed to apply finance fix:', err)
      appendMessage('assistant', `Sorry — couldn't apply the fix. ${err}. You can edit the entries by hand on /finances.`)
    } finally {
      setSending(false)
      setPendingFinance(null)
    }
  }, [financesById])

  const handleFinanceConfirm = async (yes: boolean) => {
    if (!pendingFinance || sending) return
    appendMessage('user', yes ? 'Yes, apply' : 'No')
    if (yes) {
      await applyFinanceFix(pendingFinance)
    } else {
      setPendingFinance(null)
      appendMessage('assistant', 'OK — left the ledger as it is.')
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')

    // A finance fix is staged — interpret the next message as the yes/no answer.
    if (pendingFinance) {
      appendMessage('user', text)
      if (/^(y|yes|confirm|do it|go|ok)/i.test(text)) {
        await applyFinanceFix(pendingFinance)
      } else {
        setPendingFinance(null)
        appendMessage('assistant', 'OK — left the ledger as it is.')
      }
      return
    }

    if (mode === 'onboarding') {
      appendMessage('user', text)
      await handleOnboardingInput(text)
      refocusInput()
      return
    }

    if (mode === 'boatChoices') {
      appendMessage('user', text)
      await handleBoatChoicesPick(text)
      refocusInput()
      return
    }

    if (text.toLowerCase() === 'restart' && messages.some((m) => m.content.includes('manifest'))) {
      startOnboarding()
      return
    }

    await sendFreeMessage(text)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Submit a value directly (used by quick-pick tiles).
  // We intentionally DO NOT refocus the textarea here — on mobile, that forces
  // the soft keyboard up between tile taps, which is intrusive. The textarea
  // gets focus only when the user actually types into it.
  const handleQuickPick = async (value: string, displayLabel?: string) => {
    if (sending) return
    // If the keyboard happens to be up (user typed, then tapped a tile),
    // actively dismiss it so it doesn't sit over the next tile row.
    textareaRef.current?.blur()
    if (mode === 'onboarding') {
      setInput('')
      appendMessage('user', displayLabel || value)
      await handleOnboardingInput(value)
      return
    }
    if (mode === 'boatChoices') {
      setInput('')
      appendMessage('user', displayLabel || value)
      await handleBoatChoicesPick(value)
      return
    }
  }

  // Determine if we should show quick-pick tiles for the current step
  const currentStep = mode === 'onboarding' && !pendingConfirm ? ONBOARDING_STEPS[onboardingStep] : null
  const showTiles = currentStep && currentStep.options && currentStep.options.length > 0

  // Tiles for the boat-choices wizard (depends on current step)
  const boatWizTiles = useMemo(() => {
    if (mode !== 'boatChoices' || !boatWiz) return null
    const step = boatWiz.step
    if (step === 'identify') {
      return {
        kind: 'identify' as const,
        items: teamMembers.map((m) => ({ id: m.id, label: `${m.first_name} ${m.last_name}` })),
        allowSkip: false,
      }
    }
    if (step === 'firstCat' || step === 'secondCat' || step === 'thirdCat') {
      return {
        kind: 'category' as const,
        items: BOAT_CATEGORIES.map((c) => ({ id: c, label: c })),
        allowSkip: step !== 'firstCat',
      }
    }
    if (step === 'firstBoat' || step === 'secondBoat' || step === 'thirdBoat') {
      const slot = step === 'firstBoat' ? 'firstCat' : step === 'secondBoat' ? 'secondCat' : 'thirdCat'
      const cat = boatWiz.selections[slot] as BoatCategory | undefined
      const list = cat ? boatsByCategory[cat] : []
      return {
        kind: 'boat' as const,
        items: list.map((b) => ({ id: b.id, label: `${b.name} (×${b.available_count || 0})` })),
        allowSkip: step !== 'firstBoat',
      }
    }
    if (step === 'confirm') {
      return { kind: 'confirm' as const, items: [], allowSkip: false }
    }
    return null
  }, [mode, boatWiz, teamMembers, boatsByCategory])

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-tertiary-container text-on-tertiary shadow-xl flex items-center justify-center hover:brightness-110 transition-all"
          aria-label="Open chat assistant"
        >
          <span className="material-symbols-outlined text-2xl">chat</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-6rem))] bg-surface-container-lowest shadow-2xl border border-outline-variant/30 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-highest border-b border-outline-variant/20">
            <span className="material-symbols-outlined text-tertiary">smart_toy</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider">
                Hance
              </h3>
              <p className="tactical-label text-[9px] mt-0.5 normal-case tracking-normal">
                {mode === 'onboarding' ? 'Onboarding…' : mode === 'boatChoices' ? 'Boat-choices wizard…' : 'Powered by Claude Haiku 4.5'}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Close chat"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Quick actions */}
          {mode === 'free' && (
            <div className="px-3 py-2 border-b border-outline-variant/20 flex flex-wrap gap-1.5">
              <button
                onClick={startOnboarding}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 font-label text-[10px] uppercase tracking-widest transition-colors ${
                  hasOnboarded
                    ? 'bg-surface-container-high text-on-surface hover:bg-tertiary-container hover:text-on-tertiary'
                    : 'bg-tertiary-container text-on-tertiary animate-attention-pulse hover:brightness-110'
                }`}
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                Onboard Yourself
              </button>
              <button
                onClick={startBoatChoices}
                disabled={!hasOnboarded && teamMembers.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-high text-on-surface font-label text-[10px] uppercase tracking-widest hover:bg-tertiary-container hover:text-on-tertiary transition-colors disabled:opacity-40"
                title={pinnedMemberId ? 'Update your boat picks' : 'Pick your boat preferences'}
              >
                <span className="material-symbols-outlined text-sm">kayaking</span>
                Set My Boat Choices
              </button>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed break-words ${
                    m.role === 'user'
                      ? 'bg-tertiary-container text-on-tertiary'
                      : 'bg-surface-container text-on-surface'
                  }`}
                >
                  {renderMessage(m.content, () => setOpen(false))}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-container px-3 py-3 flex items-center gap-1.5 text-tertiary">
                  <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                  <span className="typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input + onboarding controls */}
          <div className="border-t border-outline-variant/20 p-3">
            {mode === 'onboarding' && (
              <div className="flex items-center justify-between mb-2">
                <span className="tactical-label">
                  Step {Math.min(onboardingStep + 1, ONBOARDING_STEPS.length)} of {ONBOARDING_STEPS.length}
                </span>
                <button
                  onClick={cancelOnboarding}
                  className="font-label text-[10px] text-outline hover:text-error uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Quick-pick tiles for option-based or skippable onboarding steps */}
            {mode === 'onboarding' && showTiles && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {currentStep!.options!.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleQuickPick(opt)}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={sending}
                    className="px-3 py-1.5 bg-tertiary-container text-on-tertiary font-label text-[11px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))}
                {!currentStep!.required && (
                  <button
                    onClick={() => handleQuickPick('skip')}
                    disabled={sending}
                    className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-[11px] uppercase tracking-widest hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                  >
                    Skip
                  </button>
                )}
              </div>
            )}

            {/* Skip-only tile for optional non-option questions */}
            {mode === 'onboarding' && !showTiles && currentStep && !currentStep.required && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  onClick={() => handleQuickPick('skip')}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={sending}
                  className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-[11px] uppercase tracking-widest hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                >
                  Skip
                </button>
              </div>
            )}

            {/* Yes/No confirmation tiles */}
            {mode === 'onboarding' && pendingConfirm && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  onClick={() => handleQuickPick('yes')}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={sending}
                  className="px-3 py-1.5 bg-tertiary-container text-on-tertiary font-label text-[11px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Yes, Save Me
                </button>
                <button
                  onClick={() => handleQuickPick('no')}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={sending}
                  className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-[11px] uppercase tracking-widest hover:bg-error-container hover:text-error transition-colors disabled:opacity-50"
                >
                  No, Cancel
                </button>
              </div>
            )}

            {/* Boat-choices wizard — header (step indicator + cancel) */}
            {mode === 'boatChoices' && boatWiz && (
              <div className="flex items-center justify-between mb-2">
                <span className="tactical-label">
                  {boatWiz.step === 'identify' && 'Identify Yourself'}
                  {boatWiz.step === 'firstCat'  && '1st Choice · Category'}
                  {boatWiz.step === 'firstBoat' && '1st Choice · Boat'}
                  {boatWiz.step === 'secondCat' && '2nd Choice · Category'}
                  {boatWiz.step === 'secondBoat'&& '2nd Choice · Boat'}
                  {boatWiz.step === 'thirdCat'  && '3rd Choice · Category'}
                  {boatWiz.step === 'thirdBoat' && '3rd Choice · Boat'}
                  {boatWiz.step === 'confirm'   && 'Confirm Save'}
                </span>
                <button
                  onClick={cancelBoatChoices}
                  className="font-label text-[10px] text-outline hover:text-error uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Boat-choices wizard — tile picker */}
            {mode === 'boatChoices' && boatWizTiles && boatWizTiles.kind !== 'confirm' && (
              <div className="flex flex-wrap gap-1.5 mb-2 max-h-32 overflow-y-auto">
                {boatWizTiles.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleQuickPick(item.id, item.label)}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={sending}
                    className="px-2.5 py-1.5 bg-tertiary-container text-on-tertiary font-label text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {item.label}
                  </button>
                ))}
                {boatWizTiles.allowSkip && (
                  <button
                    onClick={() => handleQuickPick('skip', 'Skip')}
                    disabled={sending}
                    className="px-2.5 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                  >
                    Skip
                  </button>
                )}
              </div>
            )}

            {/* Boat-choices wizard — confirm tiles */}
            {mode === 'boatChoices' && boatWizTiles && boatWizTiles.kind === 'confirm' && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  onClick={() => handleQuickPick('yes', 'Yes, save')}
                  disabled={sending}
                  className="px-3 py-1.5 bg-tertiary-container text-on-tertiary font-label text-[11px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Yes, Save
                </button>
                <button
                  onClick={() => handleQuickPick('no', 'No, cancel')}
                  disabled={sending}
                  className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-[11px] uppercase tracking-widest hover:bg-error-container hover:text-error transition-colors disabled:opacity-50"
                >
                  No, Cancel
                </button>
              </div>
            )}

            {/* Finance-fix confirmation tiles */}
            {mode === 'free' && pendingFinance && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  onClick={() => handleFinanceConfirm(true)}
                  disabled={sending}
                  className="px-3 py-1.5 bg-tertiary-container text-on-tertiary font-label text-[11px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Yes, Apply Fix
                </button>
                <button
                  onClick={() => handleFinanceConfirm(false)}
                  disabled={sending}
                  className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant font-label text-[11px] uppercase tracking-widest hover:bg-error-container hover:text-error transition-colors disabled:opacity-50"
                >
                  No, Leave It
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                className="flex-1 bg-surface-container-lowest text-on-surface font-mono text-sm border border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 resize-none"
                rows={2}
                value={input}
                placeholder={
                  mode === 'onboarding'
                    ? (pendingConfirm ? 'yes / no' : (ONBOARDING_STEPS[onboardingStep]?.placeholder || 'Type your answer'))
                    : mode === 'boatChoices'
                      ? 'Tap a tile or type a name'
                      : 'Ask anything…'
                }
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={sending}
              />
              <button
                onClick={handleSend}
                onMouseDown={(e) => { if (mode === 'onboarding' || mode === 'boatChoices') e.preventDefault() }}
                disabled={sending || !input.trim()}
                className="px-3 bg-primary text-on-primary disabled:opacity-30 hover:brightness-90 transition-colors"
                aria-label="Send"
              >
                <span className="material-symbols-outlined text-base">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Build a snapshot of all expedition data from PocketBase + static files,
// formatted as a compact text block to append to the system prompt.
async function buildExpeditionContext(
  teamMembers: TeamMemberRecord[],
  boats: BoatRecord[],
  boatChoices: BoatChoiceRecord[],
  finances: LedgerEntryRecord[],
): Promise<string> {
  // Fetch all collections in parallel — non-fatal if any single one fails.
  const safeFetch = async <T,>(name: string): Promise<T[]> => {
    try {
      return await pb.collection(name).getFullList<T>({ requestKey: null } as never)
    } catch (err) {
      console.warn(`Failed to fetch ${name}:`, err)
      return []
    }
  }

  // Live USD→GBP and EUR→GBP rates so Hance can recompute conversions correctly per currency.
  let fxRates: FxRates = { usdGbp: 0.75, eurGbp: 0.85 }
  try {
    const d = await loadFxData(false)
    fxRates = { usdGbp: d.usdGbp, eurGbp: d.eurGbp }
  } catch { /* keep fallback */ }

  const [
    equipment,
    logistics,
    emergencyContacts,
    contingencyPlans,
    extractionPoints,
    rafts,
    raftingTerms,
    traumaKits,
    raftTypes,
    riggingTopics,
    riverCommands,
    raftingVideos,
  ] = await Promise.all([
    safeFetch<any>('equipment'),
    safeFetch<any>('logistics_entries'),
    safeFetch<any>('emergency_contacts'),
    safeFetch<any>('contingency_plans'),
    safeFetch<any>('extraction_points'),
    safeFetch<any>('rafts'),
    safeFetch<any>('rafting_terms'),
    safeFetch<any>('trauma_kits'),
    safeFetch<any>('raft_types'),
    safeFetch<any>('rigging_topics'),
    safeFetch<any>('river_commands'),
    safeFetch<any>('rafting_videos'),
  ])

  // Team manifest
  const teamSummary = teamMembers.length === 0
    ? '(no team members yet)'
    : teamMembers.map((m) => {
        const name = `${m.last_name || '?'}, ${m.first_name || '?'}`.trim()
        const bits: string[] = []
        if (m.role) bits.push(`role: ${m.role}`)
        if (m.boat_tag) bits.push(`nickname: ${m.boat_tag}`)
        if (m.boat_preference) bits.push(`boat: ${m.boat_preference}`)
        if (m.paddler_height) bits.push(`height: ${m.paddler_height}`)
        if (m.paddler_weight) bits.push(`weight: ${m.paddler_weight}`)
        if (m.blood_type) bits.push(`blood: ${m.blood_type}`)
        if (m.certifications) bits.push(`certs: ${m.certifications}`)
        if (m.dob) {
          const age = computeAgeFromDob(m.dob)
          bits.push(`dob: ${m.dob}${age != null ? ` (age ${age})` : ''}`)
        }
        if (m.emergency_contact_name) {
          const ec = [m.emergency_contact_name, m.emergency_contact_relation, m.emergency_contact_phone].filter(Boolean).join(' / ')
          bits.push(`next-of-kin: ${ec}`)
        }
        return `- ${name}${bits.length ? ' | ' + bits.join(', ') : ''}`
      }).join('\n')

  // Rapids (from static waypoints data)
  const majorRapids = waypoints.filter(isMajorRapid)
  const rapidsSummary = majorRapids.map((w) => {
    const hasDiagram = w.diagramPath ? ` [diagram available: id=${w.id}]` : ''
    return `- Mile ${w.riverMile} ${w.name} (Class ${w.difficulty})${w.scout ? ' — scout ' + w.scout : ''}${w.primaryRun ? ', run ' + w.primaryRun : ''}${hasDiagram}`
  }).join('\n')
  const allRapidsCount = waypoints.filter(w => w.type === 'rapid').length
  const campsCount = waypoints.filter(w => w.type === 'camp').length

  const sect = (title: string, items: string) => items ? `\n\n${title}:\n${items}` : ''
  const list = (arr: any[], formatter: (r: any) => string) =>
    arr.length === 0 ? '' : arr.map(formatter).join('\n')

  const equipSummary = list(equipment, (r) =>
    `- ${r.name || '?'}${r.category ? ` (${r.category})` : ''}${r.qty ? ` x${r.qty}` : ''}${r.owner ? ` — owner: ${r.owner}` : ''}${r.notes ? ` — ${r.notes}` : ''}`
  )

  const financesSummary = list(finances, (r) => {
    const amount = r.amount != null ? `$${r.amount}` : ''
    return `- ${r.description || r.name || '?'}${amount ? ` — ${amount}` : ''}${r.paid_by ? ` paid by ${r.paid_by}` : ''}${r.category ? ` [${r.category}]` : ''}`
  })

  // Detailed ledger with ids + conversion fields so Hance can spot and fix mis-conversions.
  // Prefer the row's own stored fx_gbp (self-consistency check, so a row correctly computed
  // at an earlier live rate isn't flagged just because the rate has since drifted). Only when
  // fx_gbp is missing do we fall back to a live rate — and that fallback must match the row's
  // OWN currency (eurGbp for EUR, usdGbp for USD), never a different currency's rate.
  const ledgerDetail = list(finances, (r) => {
    const amt = r.amount != null ? r.amount : 0
    const ccy = r.ccy || 'GBP'
    const fxUsed = r.fx_gbp || fxRateFor(ccy, fxRates)
    const expected = ccy === 'GBP' ? amt : Math.round(amt * fxUsed * 100) / 100
    const off = Math.abs((r.amount_gbp || 0) - expected) > 0.01
    const flag = off ? `  <-- CHECK: amount_gbp should be ~£${expected}` : ''
    return `- id=${r.id} | ${r.date || 'no-date'} | ${r.direction || '?'} | ${r.description || r.note || '?'} | ${amt} ${ccy} | fx=${r.fx_gbp ?? '(none)'} | gbp=${r.amount_gbp ?? '(none)'}${flag}`
  })

  const logisticsSummary = list(logistics, (r) =>
    `- [${r.type || 'logistics'}] ${r.title || r.name || ''}${r.details ? ' — ' + r.details : ''}${r.date ? ' (' + r.date + ')' : ''}`
  )

  const contactsSummary = list(emergencyContacts, (r) =>
    `- ${r.name || '?'}${r.role ? ` (${r.role})` : ''}${r.phone ? ' — ' + r.phone : ''}${r.notes ? ' — ' + r.notes : ''}`
  )

  const contingencySummary = list(contingencyPlans, (r) =>
    `- ${r.scenario || r.title || '?'}: ${r.plan || r.action || r.description || ''}`
  )

  const extractionSummary = list(extractionPoints, (r) =>
    `- Mile ${r.river_mile ?? '?'} ${r.name || ''}${r.access ? ' — access: ' + r.access : ''}${r.notes ? ' — ' + r.notes : ''}`
  )

  const raftsSummary = list(rafts, (r) =>
    `- ${r.name || '?'}${r.tag ? ` [${r.tag}]` : ''}${r.weight_kg ? ` (${r.weight_kg}kg)` : ''}${r.notes ? ' — ' + r.notes : ''}`
  )

  const termsSummary = list(raftingTerms, (r) =>
    `- ${r.term || '?'}: ${r.definition || ''}`
  )

  const kitsSummary = list(traumaKits, (r) =>
    `- ${r.name || '?'}${r.contents ? ': ' + r.contents : ''}${r.location ? ' (loc: ' + r.location + ')' : ''}`
  )

  const raftTypesSummary = list(raftTypes, (r) =>
    `- ${r.name || '?'}${r.description ? ': ' + r.description : ''}${r.use_case ? ' — use: ' + r.use_case : ''}`
  )

  const riggingSummary = list(riggingTopics, (r) =>
    `- ${r.title || r.topic || '?'}${r.description ? ': ' + r.description : ''}`
  )

  const commandsSummary = list(riverCommands, (r) =>
    `- "${r.command || r.name || '?'}": ${r.meaning || r.description || ''}`
  )

  const videosSummary = list(raftingVideos, (r) =>
    `- ${r.title || '?'}${r.url ? ' (' + r.url + ')' : ''}${r.description ? ' — ' + r.description : ''}`
  )

  // Boats catalogue + per-paddler choices
  const boatLookup = new Map<string, BoatRecord>()
  for (const b of boats) boatLookup.set(b.id, b)
  const memberLookup = new Map<string, TeamMemberRecord>()
  for (const tm of teamMembers) memberLookup.set(tm.id, tm)

  const boatsSummary = list(boats, (b: BoatRecord) =>
    `- [${b.category}] ${b.name} — ×${b.available_count} available · supplier: ${b.supplier}${b.description ? ' — ' + b.description : ''}`
  )

  const choicesSummary = boatChoices.length === 0
    ? ''
    : boatChoices.map((c) => {
        const m = memberLookup.get(c.team_member_id)
        const who = m ? `${m.first_name} ${m.last_name}`.trim() : c.team_member_id
        const f = c.first_choice_id  ? boatLookup.get(c.first_choice_id)?.name  || c.first_choice_id  : '(none)'
        const s = c.second_choice_id ? boatLookup.get(c.second_choice_id)?.name || c.second_choice_id : '(none)'
        const t = c.third_choice_id  ? boatLookup.get(c.third_choice_id)?.name  || c.third_choice_id  : '(none)'
        return `- ${who}: 1st=${f}, 2nd=${s}, 3rd=${t}`
      }).join('\n')

  // Demand vs supply summary
  const demand = new Map<string, number>()
  for (const c of boatChoices) {
    if (c.first_choice_id)  demand.set(c.first_choice_id,  (demand.get(c.first_choice_id)  || 0) + 1)
  }
  const oversubscribed = boats
    .filter((b) => (demand.get(b.id) || 0) > (b.available_count || 0))
    .map((b) => `- ${b.name}: ${demand.get(b.id)} want it as 1st, ${b.available_count} available`)
    .join('\n')

  return `

---
LIVE EXPEDITION DATA (use this to answer factual questions; cite specific entries when relevant; do not invent details):

TEAM MANIFEST (${teamMembers.length} paddler${teamMembers.length === 1 ? '' : 's'}):
${teamSummary}

MAJOR RAPIDS (Class 6+, ${majorRapids.length} of ${allRapidsCount} total rapids; ${campsCount} camps in catalogue):
${rapidsSummary}` +
    sect(`EQUIPMENT (${equipment.length})`, equipSummary) +
    sect(`FINANCES (${finances.length} entries)`, financesSummary) +
    sect(`LIVE FINANCE LEDGER — CURRENT USD→GBP RATE: ${fxRates.usdGbp.toFixed(4)}, CURRENT EUR→GBP RATE: ${fxRates.eurGbp.toFixed(4)} (use ids here to fix conversions via update_ledger_entries; use the rate matching each row's own ccy)`, ledgerDetail) +
    sect(`LOGISTICS (${logistics.length})`, logisticsSummary) +
    sect(`EMERGENCY CONTACTS (${emergencyContacts.length})`, contactsSummary) +
    sect(`CONTINGENCY PLANS (${contingencyPlans.length})`, contingencySummary) +
    sect(`EXTRACTION POINTS (${extractionPoints.length})`, extractionSummary) +
    sect(`RAFTS (${rafts.length})`, raftsSummary) +
    sect(`RAFTING TERMS / GLOSSARY (${raftingTerms.length})`, termsSummary) +
    sect(`TRAUMA KITS (${traumaKits.length})`, kitsSummary) +
    sect(`RAFT TYPES (${raftTypes.length})`, raftTypesSummary) +
    sect(`RIGGING TOPICS (${riggingTopics.length})`, riggingSummary) +
    sect(`RIVER COMMANDS (${riverCommands.length})`, commandsSummary) +
    sect(`RAFTING VIDEOS (${raftingVideos.length})`, videosSummary) +
    sect(`BOATS CATALOGUE (${boats.length} model+size combos)`, boatsSummary) +
    sect(`BOAT CHOICES (${boatChoices.length} paddler${boatChoices.length === 1 ? '' : 's'} picked)`, choicesSummary) +
    sect(`OVERSUBSCRIBED BOATS (more 1st-picks than units)`, oversubscribed)
}

// Render the confirmation prompt at the end of the boat-choices wizard.
function buildConfirmPrompt(
  sel: { firstBoatId?: string; secondBoatId?: string; thirdBoatId?: string },
  boatById: Map<string, BoatRecord>
): string {
  const fmt = (id?: string) => id ? (boatById.get(id)?.name || '_(unknown)_') : '_(none)_'
  return `Here's what I have:\n\n- **1st:** ${fmt(sel.firstBoatId)}\n- **2nd:** ${fmt(sel.secondBoatId)}\n- **3rd:** ${fmt(sel.thirdBoatId)}\n\nSave these? (yes / no)`
}

// Compute age from any of the DOB formats we accept. Returns null if unparseable.
function computeAgeFromDob(dob: string): number | null {
  const raw = (dob || '').trim()
  if (!raw) return null
  let day: number | null = null, month: number | null = null, year: number | null = null
  let m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) { year = +m[1]; month = +m[2]; day = +m[3] }
  if (!year) {
    m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
    if (m) { day = +m[1]; month = +m[2]; year = m[3].length === 2 ? 1900 + +m[3] : +m[3] }
  }
  if (!year) {
    const months: Record<string, number> = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
      may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
      sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
    }
    m = raw.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{2,4})$/)
    if (m && months[m[2].toLowerCase()]) {
      day = +m[1]; month = months[m[2].toLowerCase()]; year = m[3].length === 2 ? 1900 + +m[3] : +m[3]
    }
    if (!year) {
      m = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})$/)
      if (m && months[m[1].toLowerCase()]) {
        day = +m[2]; month = months[m[1].toLowerCase()]; year = m[3].length === 2 ? 1900 + +m[3] : +m[3]
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

// Normalize a date string to DD/MM/YYYY. Falls back to the original input if we can't parse it.
function normalizeDob(input: string): string {
  const raw = input.trim()
  if (!raw) return raw

  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: number, m: number, y: number) => `${pad(d)}/${pad(m)}/${y}`

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  let m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return fmt(+m[3], +m[2], +m[1])

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (assume day-first since user is UK)
  m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) {
    const year = m[3].length === 2 ? 1900 + +m[3] : +m[3]
    return fmt(+m[1], +m[2], year)
  }

  // "17 Dec 1972", "17 December 1972", "Dec 17 1972", "December 17, 1972"
  const months: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  }
  // day month year
  m = raw.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{2,4})$/)
  if (m && months[m[2].toLowerCase()]) {
    const year = m[3].length === 2 ? 1900 + +m[3] : +m[3]
    return fmt(+m[1], months[m[2].toLowerCase()], year)
  }
  // month day year
  m = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})$/)
  if (m && months[m[1].toLowerCase()]) {
    const year = m[3].length === 2 ? 1900 + +m[3] : +m[3]
    return fmt(+m[2], months[m[1].toLowerCase()], year)
  }

  // Fallback: keep what the user typed
  return raw
}

// Available diagrams (filename in /public/diagrams/)
const KNOWN_DIAGRAMS = new Set([
  'soap-creek', 'house-rock', '24-5-mile', 'redwall-cavern',
  'unkar', 'hance', 'horn-creek', 'crystal', 'bedrock',
  'diamond-creek', 'pearce-ferry',
])

// Render a chat message: split into blocks (paragraphs + diagrams), inline-format each block.
// onLinkClick is called whenever any internal app-route link is clicked (used to close the chat panel).
function renderMessage(text: string, onLinkClick?: () => void): React.ReactNode {
  // Pull out diagram references anywhere in the text (Claude often emits them inline)
  const blocks: Array<{ kind: 'text' | 'diagram'; value: string }> = []
  const diagramRe = /\[diagram:([a-z0-9-]+)\]/gi
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = diagramRe.exec(text)) !== null) {
    if (m.index > lastIdx) {
      blocks.push({ kind: 'text', value: text.slice(lastIdx, m.index) })
    }
    blocks.push({ kind: 'diagram', value: m[1].toLowerCase() })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) {
    blocks.push({ kind: 'text', value: text.slice(lastIdx) })
  }

  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'diagram') {
          if (!KNOWN_DIAGRAMS.has(b.value)) return null
          return (
            <div key={i} className="my-2 bg-white p-1.5">
              <img
                src={`/diagrams/${b.value}.png`}
                alt={`Diagram of ${b.value}`}
                className="w-full h-auto"
                loading="lazy"
              />
              <p className="text-[9px] text-outline mt-1 px-1 uppercase tracking-wider">
                {b.value.replace(/-/g, ' ')} — Jim Michaud
              </p>
            </div>
          )
        }
        return <span key={i} className="whitespace-pre-wrap">{renderInline(b.value, onLinkClick)}</span>
      })}
    </>
  )
}

// Inline formatting. We normalize first (strip any markdown wrapping around app routes),
// then a single regex pass handles markdown links, bare app routes, bold, and code.
function renderInline(text: string, onLinkClick?: () => void): React.ReactNode {
  const routeNames = 'map|command|team|boats|gear|finances|logistics|emergency|rafting'

  // Pre-normalize: strip backticks, bold (**), italics (*) wrapped around app routes.
  // Claude sometimes outputs `**/team**`, `` `/team` ``, etc. — turn them into bare /team
  // so the route pattern below catches them as Links.
  const normalized = text
    .replace(new RegExp(`\\*\\*\\s*(/(?:${routeNames}))\\s*\\*\\*`, 'g'), '$1')
    .replace(new RegExp(`\\*\\s*(/(?:${routeNames}))\\s*\\*`, 'g'), '$1')
    .replace(new RegExp('`(/(?:' + routeNames + '))`', 'g'), '$1')

  const parts: React.ReactNode[] = []
  // Order: markdown link → app route → bold → code
  const regex = new RegExp(
    [
      '\\[([^\\]]+)\\]\\(([^)]+)\\)',                   // 1: link text, 2: link url
      `(/(?:${routeNames}))(?![\\w/-])`,                // 3: bare app route
      '\\*\\*([^*\\n]+)\\*\\*',                         // 4: bold (single-line)
      '`([^`\\n]+)`',                                   // 5: code (single-line)
    ].join('|'),
    'g'
  )
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(normalized.slice(lastIndex, match.index))
    }
    if (match[1] && match[2]) {
      const url = match[2]
      const isInternal = APP_ROUTES.includes(url)
      if (isInternal) {
        parts.push(
          <Link key={key++} to={url} onClick={onLinkClick} className="text-tertiary underline underline-offset-2 hover:brightness-110">
            {match[1]}
          </Link>
        )
      } else {
        parts.push(
          <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-tertiary underline underline-offset-2 hover:brightness-110 break-all">
            {match[1]}
          </a>
        )
      }
    } else if (match[3]) {
      parts.push(
        <Link key={key++} to={match[3]} onClick={onLinkClick} className="text-tertiary underline underline-offset-2 hover:brightness-110 font-mono font-semibold">
          {match[3]}
        </Link>
      )
    } else if (match[4]) {
      parts.push(<strong key={key++} className="font-semibold text-primary">{match[4]}</strong>)
    } else if (match[5]) {
      parts.push(<code key={key++} className="font-mono text-xs bg-surface-container-highest px-1 py-0.5">{match[5]}</code>)
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < normalized.length) {
    parts.push(normalized.slice(lastIndex))
  }
  return parts
}
