import type { RecordModel } from 'pocketbase'

// The expedition runs 18 days — the default rental window for per-day priced gear.
export const TRIP_DAYS = 18

// localStorage key remembering which member's kit you last viewed (no per-user auth).
export const MEMBER_KEY = 'canyon.kit.member'

export const STATUSES = ['Planned', 'Packed', 'On-river', 'Consumed', 'Lost'] as const
export type Status = (typeof STATUSES)[number]

// Bundle codes used by gear_catalogue.included_in, with display labels for the Included section.
export const BUNDLES: { code: string; label: string; icon: string }[] = [
  { code: 'full_rig', label: 'Full Oar Rig', icon: 'directions_boat' },
  { code: 'comp_kitchen', label: 'Complete Kitchen', icon: 'skillet' },
  { code: 'whole_shabang', label: 'Whole Shabang', icon: 'redeem' },
  { code: 'toilet_system', label: 'Toilet System', icon: 'wc' },
]

export interface CatalogueRecord extends RecordModel {
  name: string
  section: string
  unit_price: number
  unit_type: string // 'day' | 'flat' | 'each'
  included_in: string
  nps_required: boolean
  notes: string
  sort: number
}

export interface PersonalKitRecord extends RecordModel {
  member: string
  catalogue_item: string
  name: string
  section: string
  unit_price: number
  unit_type: string
  qty: number
  days: number
  status: string
  is_bespoke: boolean
  notes: string
}

export interface TeamMemberLite extends RecordModel {
  first_name: string
  last_name: string
  role: string
}

// Format a number as USD with two decimals and thousands separators.
export function money(n: number): string {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Per-item cost: per-day gear multiplies by the rental window; flat/each is just price × qty.
export function lineTotal(item: Pick<PersonalKitRecord, 'unit_price' | 'unit_type' | 'qty' | 'days'>): number {
  const qty = item.qty || 0
  if (item.unit_type === 'day') return (item.unit_price || 0) * qty * (item.days || 0)
  return (item.unit_price || 0) * qty
}

// Short suffix describing how an item is priced.
export function unitLabel(unit_type: string): string {
  if (unit_type === 'day') return '/day'
  if (unit_type === 'each') return 'ea'
  return 'flat'
}
