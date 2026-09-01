// Live FX rates via Frankfurter (ECB-backed, free, CORS-enabled).
// Cached in PocketBase app_settings so everyone on the trip sees the same rate.

import pb from '@/lib/pocketbase'
import type { RecordModel } from 'pocketbase'

export interface FxHistoryPoint {
  date: string   // ISO YYYY-MM-DD
  rate: number   // USD→GBP rate on that date (history is USD-only; powers the FX card sparkline)
}

export interface FxData {
  usdGbp: number                // latest USD→GBP rate
  eurGbp: number                // latest EUR→GBP rate
  /** @deprecated alias for usdGbp — kept for consumers not yet migrated off a single rate */
  rate: number
  date: string                  // ISO date of the latest rates
  history: FxHistoryPoint[]     // last ~30 business days, USD→GBP only
  fetchedAt: number             // epoch ms of last fetch
}

const FX_SETTING_KEY = 'fx_data_v2'
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

// Shape of a Frankfurter range response with base=GBP&symbols=USD,EUR
interface FrankfurterRangeResponse {
  amount?: number
  base?: string
  start_date?: string
  end_date?: string
  rates?: Record<string, { USD?: number; EUR?: number }>
}

function isFxData(value: unknown): value is FxData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.usdGbp === 'number' &&
    typeof v.eurGbp === 'number' &&
    typeof v.fetchedAt === 'number'
  )
}

/**
 * Parse a Frankfurter `base=GBP&symbols=USD,EUR` range response into our FxData shape,
 * inverting GBP→USD/GBP→EUR rates into USD→GBP/EUR→GBP. Exported for unit testing.
 */
export function parseFrankfurterResponse(data: FrankfurterRangeResponse): FxData {
  const rateMap = data.rates || {}
  const dates = Object.keys(rateMap).sort((a, b) => a.localeCompare(b))
  if (dates.length === 0) throw new Error('Frankfurter returned no rates')

  const history: FxHistoryPoint[] = dates
    .filter((date) => typeof rateMap[date]?.USD === 'number' && rateMap[date].USD! > 0)
    .map((date) => ({ date, rate: 1 / rateMap[date].USD! }))

  const latestDate = dates[dates.length - 1]
  const latestGbpUsd = rateMap[latestDate]?.USD
  const latestGbpEur = rateMap[latestDate]?.EUR
  if (!latestGbpUsd || !latestGbpEur) {
    throw new Error('Frankfurter response missing USD or EUR rate for latest date')
  }

  const usdGbp = 1 / latestGbpUsd
  const eurGbp = 1 / latestGbpEur

  return {
    usdGbp,
    eurGbp,
    rate: usdGbp,
    date: latestDate,
    history,
    fetchedAt: Date.now(),
  }
}

async function fetchFromFrankfurter(): Promise<FxData> {
  const today = new Date()
  const startDate = new Date(today.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
  const startStr = isoDate(startDate)
  const endStr = isoDate(today)

  // Range endpoint returns both history and the latest rate for the range.
  // We fetch base=GBP&symbols=USD,EUR and invert to get USD→GBP / EUR→GBP.
  // Example: https://api.frankfurter.dev/v1/2025-10-01..2025-10-30?base=GBP&symbols=USD,EUR
  const url = `https://api.frankfurter.dev/v1/${startStr}..${endStr}?base=GBP&symbols=USD,EUR`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`)
  const data: FrankfurterRangeResponse = await res.json()

  return parseFrankfurterResponse(data)
}

export async function loadFxData(forceRefresh = false): Promise<FxData> {
  // Try cache first
  try {
    const recs = await pb.collection('app_settings').getFullList<AppSetting>({
      filter: `key="${FX_SETTING_KEY}"`,
      requestKey: null,
    } as never)
    if (recs.length > 0 && !forceRefresh) {
      const cached = recs[0].value
      if (isFxData(cached) && Date.now() - cached.fetchedAt < STALE_MS) {
        return cached
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
