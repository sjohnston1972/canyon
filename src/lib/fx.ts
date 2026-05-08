// Live FX rates via Frankfurter (ECB-backed, free, CORS-enabled).
// Cached in PocketBase app_settings so everyone on the trip sees the same rate.

import pb from '@/lib/pocketbase'
import type { RecordModel } from 'pocketbase'

export interface FxHistoryPoint {
  date: string   // ISO YYYY-MM-DD
  rate: number
}

export interface FxData {
  rate: number                 // latest USD→GBP rate
  date: string                 // ISO date of the latest rate
  history: FxHistoryPoint[]    // last ~30 business days
  fetchedAt: number            // epoch ms of last fetch
}

const FX_SETTING_KEY = 'fx_data'
const STALE_MS = 1000 * 60 * 60 * 6 // refresh if cache > 6h old
const HISTORY_DAYS = 30

interface AppSetting extends RecordModel {
  key: string
  value: FxData | number | null
}

// Format YYYY-MM-DD in UTC
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function fetchFromFrankfurter(): Promise<FxData> {
  const today = new Date()
  const startDate = new Date(today.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
  const startStr = isoDate(startDate)
  const endStr = isoDate(today)

  // Range endpoint returns both history and the latest rate for the range
  // Example: https://api.frankfurter.dev/v1/2025-10-01..2025-10-30?from=USD&to=GBP
  const url = `https://api.frankfurter.dev/v1/${startStr}..${endStr}?base=USD&symbols=GBP`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`)
  const data = await res.json()

  const rateMap: Record<string, { GBP: number }> = data.rates || {}
  const history: FxHistoryPoint[] = Object.entries(rateMap)
    .map(([date, r]) => ({ date, rate: r.GBP }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (history.length === 0) throw new Error('Frankfurter returned no rates')
  const latest = history[history.length - 1]

  return {
    rate: latest.rate,
    date: latest.date,
    history,
    fetchedAt: Date.now(),
  }
}

export async function loadFxData(forceRefresh = false): Promise<FxData> {
  // Try cache first
  try {
    const recs = await pb.collection('app_settings').getFullList<AppSetting>({
      filter: `key="${FX_SETTING_KEY}"`,
      requestKey: null,
    } as never)
    if (recs.length > 0 && !forceRefresh) {
      const cached = recs[0].value as FxData | null
      if (cached && typeof cached === 'object' && 'rate' in cached && 'fetchedAt' in cached) {
        if (Date.now() - cached.fetchedAt < STALE_MS) {
          return cached
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load cached FX data:', err)
  }

  // Fetch fresh
  const fresh = await fetchFromFrankfurter()

  // Save back to cache (best-effort, non-blocking)
  try {
    const existing = await pb.collection('app_settings').getFullList<AppSetting>({
      filter: `key="${FX_SETTING_KEY}"`,
      requestKey: null,
    } as never)
    if (existing.length > 0) {
      await pb.collection('app_settings').update(existing[0].id, { value: fresh })
    } else {
      await pb.collection('app_settings').create({ key: FX_SETTING_KEY, value: fresh })
    }
  } catch (err) {
    console.warn('Failed to cache FX data:', err)
  }

  return fresh
}
