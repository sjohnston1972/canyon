import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  APIProvider,
  Map,
  Marker,
  useMap,
  InfoWindow,
} from '@vis.gl/react-google-maps'
import { waypoints, riverPath, markerColors, isMajorRapid, MAJOR_RAPID_THRESHOLD } from '@/data/waypoints'
import type { Waypoint } from '@/data/waypoints'
import { tacticalMapStyles } from '@/data/map-styles'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || ''

// Grand Canyon center point
const CANYON_CENTER = { lat: 36.18, lng: -112.05 }
const DEFAULT_ZOOM = 10

type PanelMode = 'waypoints' | 'safety' | 'topo'
type WaypointFilter = 'all' | 'major-rapid' | 'rapid' | Waypoint['type']

// Interpolate points along a path at a given interval in meters
function interpolatePath(path: google.maps.LatLngLiteral[], intervalM: number): google.maps.LatLngLiteral[] {
  if (path.length < 2) return [...path]
  const result: google.maps.LatLngLiteral[] = [path[0]]
  let carry = 0

  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1]
    const to = path[i]
    const segDist = haversine(from.lat, from.lng, to.lat, to.lng)
    let covered = carry

    while (covered + intervalM <= segDist) {
      covered += intervalM
      const frac = covered / segDist
      result.push({
        lat: from.lat + (to.lat - from.lat) * frac,
        lng: from.lng + (to.lng - from.lng) * frac,
      })
    }
    carry = segDist - covered
  }

  // Always include last point
  const last = path[path.length - 1]
  if (result[result.length - 1].lat !== last.lat || result[result.length - 1].lng !== last.lng) {
    result.push(last)
  }
  return result
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// --- River Polyline Component ---
function RiverPolyline({ editable }: { editable: boolean }) {
  const map = useMap()

  useMemo(() => {
    if (!map) return

    // When editable, interpolate to ~100m vertices for fine control
    const pathData = editable ? interpolatePath(riverPath, 100) : riverPath

    const polyline = new google.maps.Polyline({
      path: pathData,
      geodesic: true,
      strokeColor: editable ? '#2a8aaa' : '#1a6b8a',
      strokeOpacity: 0.8,
      strokeWeight: editable ? 3 : 4,
      editable,
      draggable: false,
      map,
    })

    const glowLine = new google.maps.Polyline({
      path: pathData,
      geodesic: true,
      strokeColor: '#0e4a6a',
      strokeOpacity: editable ? 0.15 : 0.3,
      strokeWeight: 10,
      map,
    })

    const syncGlow = () => {
      glowLine.setPath(polyline.getPath())
    }

    let listeners: google.maps.MapsEventListener[] = []

    if (editable) {
      const exportPath = () => {
        const path = polyline.getPath()
        const coords: google.maps.LatLngLiteral[] = []
        for (let i = 0; i < path.getLength(); i++) {
          const p = path.getAt(i)
          coords.push({ lat: parseFloat(p.lat().toFixed(6)), lng: parseFloat(p.lng().toFixed(6)) })
        }
        syncGlow()
        console.log('--- RIVER PATH COORDINATES ---')
        console.log(JSON.stringify(coords, null, 2))
        console.log(`--- ${coords.length} points ---`)
      }

      const pathObj = polyline.getPath()
      listeners.push(
        google.maps.event.addListener(pathObj, 'set_at', exportPath),
        google.maps.event.addListener(pathObj, 'insert_at', exportPath),
        google.maps.event.addListener(pathObj, 'remove_at', exportPath),
      )
    }

    return () => {
      listeners.forEach((l) => google.maps.event.removeListener(l))
      polyline.setMap(null)
      glowLine.setMap(null)
    }
  }, [map, editable])

  return null
}

// --- SVG marker icon as data URL ---
function markerIcon(color: string, scale: number): google.maps.Icon {
  const size = Math.round(12 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 3}" viewBox="0 0 24 36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#131313" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="#131313" opacity="0.4"/>
  </svg>`
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size * 2, size * 3),
    anchor: new google.maps.Point(size, size * 3),
  }
}

// --- Cache marker icons to avoid recreating on every render ---
const iconCache: Record<string, google.maps.Icon> = {}
function getCachedIcon(color: string, scale: number): google.maps.Icon {
  const key = `${color}-${scale}`
  if (!iconCache[key]) {
    iconCache[key] = markerIcon(color, scale)
  }
  return iconCache[key]
}

// --- Waypoint Markers ---
function WaypointMarkers({
  filter,
  selectedId,
  onSelect,
  onDeselect,
  onInfoClick,
}: {
  filter: WaypointFilter
  selectedId: string | null
  onSelect: (wp: Waypoint) => void
  onDeselect: () => void
  onInfoClick: () => void
}) {
  // Sync InfoWindow with parent selection
  const infoId = selectedId

  const filtered = useMemo(() => {
    if (filter === 'all') return waypoints
    if (filter === 'major-rapid') return waypoints.filter(isMajorRapid)
    return waypoints.filter((wp) => wp.type === filter)
  }, [filter])

  const infoWaypoint = useMemo(() => {
    if (!infoId) return null
    return waypoints.find((w) => w.id === infoId) ?? null
  }, [infoId])

  return (
    <>
      {filtered.map((wp) => {
        const isSelected = wp.id === selectedId
        const color = isSelected ? '#ffdeac' : markerColors[wp.type]
        const scale = isSelected ? 1.4 : 1.0

        return (
          <Marker
            key={wp.id}
            position={{ lat: wp.lat, lng: wp.lng }}
            onClick={() => {
              onSelect(wp)
            }}
            icon={getCachedIcon(color, scale)}
            zIndex={isSelected ? 100 : 1}
            title={`${wp.name} — RM ${wp.riverMile}`}
          />
        )
      })}
      {/* Simple label InfoWindow — no click handling (Google Maps iframe blocks events) */}
      {infoWaypoint && (
        <InfoWindow
          position={{ lat: infoWaypoint.lat, lng: infoWaypoint.lng }}
          onCloseClick={onDeselect}
          pixelOffset={[0, -36]}
        >
          <div style={{ background: '#131313', color: '#e5e2e1', padding: '6px 10px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {infoWaypoint.name}
            </div>
            <div style={{ fontSize: '9px', color: '#c6c6c6', marginTop: '2px' }}>
              RM {infoWaypoint.riverMile}
              {infoWaypoint.type === 'rapid' && infoWaypoint.difficulty > 0 && (
                <span style={{ color: '#ffdeac', marginLeft: '8px' }}>Class {infoWaypoint.difficulty}</span>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}

// --- Left Panel ---
function LeftPanel({
  activeMode,
  onModeChange,
  filter,
  onFilterChange,
  onSelectRapid,
  selectedWaypointId,
  editPath,
  onToggleEditPath,
}: {
  activeMode: PanelMode
  onModeChange: (mode: PanelMode) => void
  filter: WaypointFilter
  onFilterChange: (f: WaypointFilter) => void
  onSelectRapid: (wp: Waypoint) => void
  selectedWaypointId: string | null
  editPath: boolean
  onToggleEditPath: () => void
}) {
  const modes: { key: PanelMode; label: string; icon: string }[] = [
    { key: 'waypoints', label: 'Waypoints', icon: 'location_on' },
  ]

  const filterOptions: { key: WaypointFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'major-rapid', label: 'Major Rapids' },
    { key: 'rapid', label: 'All Rapids' },
    { key: 'camp', label: 'Camps' },
    { key: 'evacuation', label: 'Evac' },
    { key: 'landmark', label: 'Landmarks' },
  ]

  const majorRapids = waypoints.filter(isMajorRapid)
  const allRapids = waypoints.filter((wp) => wp.type === 'rapid')
  const camps = waypoints.filter((wp) => wp.type === 'camp')
  const evac = waypoints.filter((wp) => wp.type === 'evacuation')
  const landmarks = waypoints.filter((wp) => wp.type === 'landmark')

  // Estimate day based on ~12.5 mi/day over 18 days
  const estimateDay = (riverMile: number) => Math.max(1, Math.min(18, Math.ceil(riverMile / 12.5)))

  const WaypointList = ({ items, label, color }: { items: Waypoint[]; label: string; color: string }) => (
    <div className="p-3 border-t border-outline-variant/20">
      <p className="tactical-label text-[10px] mb-2">{label}</p>
      <div className="space-y-0.5">
        {items.map((wp) => {
          const isActive = wp.id === selectedWaypointId
          return (
            <button
              key={wp.id}
              onClick={() => onSelectRapid(wp)}
              className={`w-full flex items-center justify-between px-2 py-1.5 text-left transition-colors group ${
                isActive ? 'bg-surface-container-high' : 'hover:bg-surface-container-high/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 flex-shrink-0" style={{ backgroundColor: isActive ? '#ffdeac' : color }} />
                <span className={`font-label text-[10px] truncate uppercase tracking-wider ${
                  isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
                }`}>
                  {wp.name.replace(' Rapid', '').replace(' Falls', '').replace(' Creek', '').replace(' Wash', '')}
                </span>
              </div>
              <span className={`font-mono text-[9px] flex-shrink-0 ml-1 ${isActive ? 'text-tertiary' : 'text-outline'}`}>
                {wp.riverMile}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  // Collapsible rapids list with class rating shown
  const [rapidsExpanded, setRapidsExpanded] = useState(false)
  const RapidsList = ({ items, label, count, selectedWaypointId: selId, onSelectRapid: onSel, estimateDay: estDay }: {
    items: Waypoint[]; label: string; count: number; selectedWaypointId: string | null; onSelectRapid: (wp: Waypoint) => void; estimateDay: (m: number) => number
  }) => (
    <div className="p-3 border-t border-outline-variant/20">
      <button
        onClick={() => setRapidsExpanded(!rapidsExpanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <p className="tactical-label text-[10px]">{label} <span className="text-outline">({count})</span></p>
        <span className={`material-symbols-outlined text-sm text-outline transition-transform ${rapidsExpanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {rapidsExpanded && (
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {items.map((wp) => {
            const isActive = wp.id === selId
            const day = estDay(wp.riverMile)
            const isMajor = wp.difficulty >= MAJOR_RAPID_THRESHOLD
            return (
              <button
                key={wp.id}
                onClick={() => onSel(wp)}
                className={`w-full flex items-center justify-between px-2 py-1 text-left transition-colors group ${
                  isActive ? 'bg-surface-container-high' : 'hover:bg-surface-container-high/50'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isMajor ? (
                    <span className="material-symbols-outlined flex-shrink-0 text-tertiary/70" style={{ fontSize: '10px' }}>waves</span>
                  ) : (
                    <span className="w-1 h-1 flex-shrink-0 bg-outline/50" />
                  )}
                  <span className={`font-label text-[9px] truncate uppercase tracking-wider ${
                    isActive ? 'text-primary' : isMajor ? 'text-on-surface-variant' : 'text-outline group-hover:text-on-surface-variant'
                  }`}>
                    {wp.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                  <span className={`font-mono text-[8px] ${wp.difficulty >= 8 ? 'text-error' : wp.difficulty >= MAJOR_RAPID_THRESHOLD ? 'text-tertiary' : 'text-outline'}`}>
                    {wp.difficulty}
                  </span>
                  <span className="font-mono text-[8px] text-outline">{wp.riverMile}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="w-[280px] lg:w-[220px] flex-shrink-0 bg-surface-container-lowest flex flex-col border-r border-outline-variant/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant/20">
        <h2 className="font-display text-xs font-bold text-primary tracking-widest uppercase">
          Planning Nodes
        </h2>
        <p className="tactical-label mt-1 text-[10px]">GC-2027 Expedition</p>
      </div>

      {/* Mode Toggles */}
      <div className="p-3 flex flex-col gap-1 border-b border-outline-variant/20">
        {modes.map((mode) => (
          <button
            key={mode.key}
            onClick={() => onModeChange(mode.key)}
            className={`flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
              activeMode === mode.key
                ? 'bg-surface-container-high text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{mode.icon}</span>
            <span className="font-label text-[11px] uppercase tracking-wider">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Filter Chips */}
      <div className="p-3 border-b border-outline-variant/20">
        <p className="tactical-label text-[10px] mb-2">Filter</p>
        <div className="flex flex-wrap gap-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onFilterChange(opt.key)}
              className={`px-2 py-1 text-[10px] font-label uppercase tracking-wider transition-colors ${
                filter === opt.key
                  ? 'bg-tertiary-container text-on-tertiary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Waypoint Lists — filtered to match active filter */}
      <div className="flex-1 overflow-y-auto">
        {(filter === 'all' || filter === 'major-rapid') && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="tactical-label text-[10px]">Major Rapids <span className="text-outline">(Class {MAJOR_RAPID_THRESHOLD}+)</span></p>
              <span className="font-mono text-[9px] text-outline">{majorRapids.length}</span>
            </div>
            <div className="space-y-0.5">
              {majorRapids.map((wp) => {
                const isActive = wp.id === selectedWaypointId
                const day = estimateDay(wp.riverMile)
                return (
                  <button
                    key={wp.id}
                    onClick={() => onSelectRapid(wp)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-left transition-colors group ${
                      isActive ? 'bg-surface-container-high' : 'hover:bg-surface-container-high/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined flex-shrink-0 text-tertiary" style={{ fontSize: '12px' }}>waves</span>
                      <span className={`font-label text-[10px] truncate uppercase tracking-wider ${
                        isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
                      }`}>
                        {wp.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                      <span className={`font-mono text-[8px] ${isActive ? 'text-on-surface' : 'text-outline'}`}>
                        D{String(day).padStart(2, '0')}
                      </span>
                      <span className={`font-mono text-[9px] font-bold ${wp.difficulty >= 8 ? 'text-error' : 'text-tertiary'}`}>
                        {wp.difficulty}
                      </span>
                      <span className={`font-mono text-[9px] ${isActive ? 'text-tertiary' : 'text-outline'}`}>
                        {wp.riverMile}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {(filter === 'all' || filter === 'rapid') && (
          <RapidsList
            items={allRapids}
            label="All Rapids"
            count={allRapids.length}
            selectedWaypointId={selectedWaypointId}
            onSelectRapid={onSelectRapid}
            estimateDay={estimateDay}
          />
        )}

        {(filter === 'all' || filter === 'camp') && (
          <WaypointList items={camps} label="Camps" color="#4ade80" />
        )}

        {(filter === 'all' || filter === 'evacuation') && (
          <WaypointList items={evac} label="Evacuation" color="#a855f7" />
        )}

        {(filter === 'all' || filter === 'landmark') && (
          <WaypointList items={landmarks} label="Landmarks" color="#3b82f6" />
        )}
      </div>

      {/* Edit Path Toggle */}
      <div className="p-3 border-t border-outline-variant/20">
        <button
          onClick={onToggleEditPath}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
            editPath
              ? 'bg-tertiary-container text-on-tertiary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-sm">{editPath ? 'edit_off' : 'edit'}</span>
          <span className="font-label text-[10px] uppercase tracking-wider">
            {editPath ? 'Editing Path (100m)' : 'Edit River Path'}
          </span>
        </button>
        {editPath && (
          <p className="tactical-label text-[9px] mt-1.5 px-1">
            Drag vertices to adjust. Updated coords logged to console.
          </p>
        )}
      </div>
    </div>
  )
}

// --- Right Panel ---
function RightPanel({ waypoint }: { waypoint: Waypoint | null }) {
  const panelRef = useRef<HTMLDivElement>(null)
  // Scroll to top when waypoint changes
  useEffect(() => {
    if (waypoint && panelRef.current) {
      panelRef.current.scrollTop = 0
    }
  }, [waypoint?.id])

  const wp = waypoint
  if (!wp) return (
    <div className="w-full lg:w-[320px] flex-shrink-0 bg-surface-container-lowest flex flex-col items-center justify-center border-l border-outline-variant/20 p-6">
      <span className="material-symbols-outlined text-3xl text-outline mb-3">touch_app</span>
      <p className="text-sm text-on-surface-variant text-center">Select a waypoint from the map or sidebar to view details</p>
    </div>
  )

  return (
    <div ref={panelRef} className="w-full lg:w-[320px] flex-shrink-0 bg-surface-container-lowest flex flex-col border-l border-outline-variant/20 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant/20">
        <h2 className="font-display text-xs font-bold text-primary tracking-widest uppercase">
          Planning Intel / Legend
        </h2>
      </div>

      {/* Mile + Name */}
      <div className="p-4 border-b border-outline-variant/20">
        <p className="font-mono text-2xl font-bold text-primary tracking-tight">
          MILE {wp.riverMile.toFixed(1)}
        </p>
        <p className="font-display text-sm text-on-surface-variant mt-1">{wp.name}</p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="w-2 h-2"
            style={{ backgroundColor: markerColors[wp.type] }}
          />
          <span className="tactical-label text-[10px]">{wp.type.toUpperCase()}</span>
          {wp.type === 'rapid' && (
            <div className="flex gap-px ml-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-[10px] ${i < wp.difficulty ? 'text-tertiary' : 'text-outline-variant/40'}`}
                >
                  &#9733;
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scout / Run (only for rapids) */}
      {wp.type === 'rapid' && (
        <div className="p-4 border-b border-outline-variant/20 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="tactical-label text-[10px]">Scout</span>
              <p className="font-label text-xs text-on-surface mt-0.5 uppercase tracking-wider">
                {wp.scout}
              </p>
            </div>
            <div>
              <span className="tactical-label text-[10px]">Primary Run</span>
              <p className="font-label text-xs text-on-surface mt-0.5 uppercase tracking-wider">
                {wp.primaryRun}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Risk Level */}
      {wp.riskLevel > 0 && (
        <div className="p-4 border-b border-outline-variant/20">
          <span className="tactical-label text-[10px]">Risk Level</span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-lg font-bold text-tertiary">
              {wp.riskLevel >= 8 ? 'HIGH' : wp.riskLevel >= 5 ? 'MODERATE' : 'LOW'}
            </span>
            <span className="font-mono text-sm text-tertiary">
              ({wp.riskLevel}/10)
            </span>
          </div>
          <div className="mt-2 h-1 bg-surface-container-high">
            <div
              className="h-full bg-tertiary-container transition-all"
              style={{ width: `${wp.riskLevel * 10}%` }}
            />
          </div>
        </div>
      )}

      {/* Notes */}
      {wp.notes && (
        <div className="p-4 border-b border-outline-variant/20">
          <span className="tactical-label text-[10px]">
            {wp.type === 'rapid' ? 'Reconnaissance Notes' : 'Description'}
          </span>
          <div className="mt-2 p-3 bg-surface-container text-on-surface-variant font-body text-xs leading-relaxed">
            {wp.notes}
          </div>
        </div>
      )}

      {/* Coordinates */}
      <div className="p-4 border-b border-outline-variant/20">
        <span className="tactical-label text-[10px]">Coordinates</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <span className="tactical-label text-[9px]">LAT</span>
            <p className="font-mono text-xs text-on-surface">{wp.lat.toFixed(4)}° N</p>
          </div>
          <div>
            <span className="tactical-label text-[9px]">LONG</span>
            <p className="font-mono text-xs text-on-surface">{Math.abs(wp.lng).toFixed(4)}° W</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-b border-outline-variant/20">
        <span className="tactical-label text-[10px]">Map Legend</span>
        <div className="mt-2 space-y-1.5">
          {Object.entries(markerColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5" style={{ backgroundColor: color }} />
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
                {type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Media Upload */}
      <div className="p-4 border-b border-outline-variant/20">
        <span className="tactical-label text-[10px]">Waypoint Media</span>
        <div className="mt-2 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-sm">photo_camera</span>
            <span className="font-label text-[10px] uppercase tracking-wider">Photo</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-sm">videocam</span>
            <span className="font-label text-[10px] uppercase tracking-wider">Video</span>
          </button>
        </div>
        <p className="tactical-label text-[9px] mt-1.5">Attach recon media to this waypoint</p>
      </div>

      {/* Save Button */}
      <div className="p-4 mt-auto">
        <button className="btn-primary w-full text-center flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">download</span>
          Save Plan Offline
        </button>
      </div>
    </div>
  )
}

// --- No API Key Fallback ---
function NoApiKeyMessage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-surface">
      <div className="text-center p-8 max-w-md">
        <span className="material-symbols-outlined text-4xl text-outline mb-4 block">map</span>
        <h2 className="font-display text-lg font-bold text-primary mb-2">Google Maps API Key Required</h2>
        <p className="text-sm text-on-surface-variant mb-4">
          Set <code className="font-mono text-tertiary bg-surface-container px-1.5 py-0.5">VITE_GOOGLE_MAPS_API_KEY</code> in
          your <code className="font-mono text-tertiary bg-surface-container px-1.5 py-0.5">.env.local</code> file to enable the map.
        </p>
        <p className="text-xs text-outline">
          Enable the Maps JavaScript API in Google Cloud Console and restrict the key to your domain.
        </p>
      </div>
    </div>
  )
}

// --- Main MapView ---
export default function MapView() {
  const [activeMode, setActiveMode] = useState<PanelMode>('waypoints')
  const [filter, setFilter] = useState<WaypointFilter>('major-rapid')
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(
    waypoints.find((w) => w.id === 'crystal') ?? null
  )
  const [mapType, setMapType] = useState<string>('terrain')
  const [editPath, setEditPath] = useState(false)
  const [mobileLeftOpen, setMobileLeftOpen] = useState(true)
  const [mobileRightOpen, setMobileRightOpen] = useState(false)

  // Use a ref to pan the map without fighting controlled center
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null)
  // Suppress drag-dismiss during programmatic pans
  const panningRef = useRef(false)

  // Pan + zoom — used by sidebar clicks
  const handleFlyTo = useCallback((lat: number, lng: number) => {
    if (mapRef) {
      panningRef.current = true
      mapRef.panTo({ lat, lng })
      mapRef.setZoom(13)
      setTimeout(() => { panningRef.current = false }, 1000)
    }
  }, [mapRef])

  // Sidebar click — select AND fly to, close mobile left panel, show preview
  const handleSidebarSelect = useCallback((wp: Waypoint) => {
    panningRef.current = true
    setSelectedWaypoint(wp)
    setMobileLeftOpen(false)
    setMobileRightOpen(false) // Show preview card, user taps to open full
    if (mapRef) {
      mapRef.panTo({ lat: wp.lat, lng: wp.lng })
    }
    setTimeout(() => { panningRef.current = false }, 1000)
  }, [mapRef])

  // Map marker click — select and show preview (mobile) or just select (desktop)
  const handleMarkerSelect = useCallback((wp: Waypoint) => {
    setSelectedWaypoint(wp)
    setMobileRightOpen(false) // Close full sheet, show preview instead
  }, [])

  // Map background click — deselect and close everything
  const handleMapClick = useCallback(() => {
    setSelectedWaypoint(null)
    setMobileRightOpen(false)
  }, [])

  return (
    <div className="flex h-full">
      {/* Desktop left panel — hidden on mobile */}
      <div className="hidden lg:flex">
        <LeftPanel
          activeMode={activeMode}
          onModeChange={setActiveMode}
          filter={filter}
          onFilterChange={setFilter}
          onSelectRapid={handleSidebarSelect}
          selectedWaypointId={selectedWaypoint?.id ?? null}
          editPath={editPath}
          onToggleEditPath={() => setEditPath((e) => !e)}
        />
      </div>

      {/* Mobile left panel overlay */}
      {mobileLeftOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileLeftOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 top-0 bottom-0 w-[280px] bg-surface-container-lowest shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setMobileLeftOpen(false)}
              className="absolute top-2 right-2 z-10 w-[44px] h-[44px] flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Close panel"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <LeftPanel
              activeMode={activeMode}
              onModeChange={setActiveMode}
              filter={filter}
              onFilterChange={setFilter}
              onSelectRapid={handleSidebarSelect}
              selectedWaypointId={selectedWaypoint?.id ?? null}
              editPath={editPath}
              onToggleEditPath={() => setEditPath((e) => !e)}
            />
          </div>
        </div>
      )}

      {/* Map Area */}
      {API_KEY ? (
        <APIProvider apiKey={API_KEY}>
          <div className="flex-1 relative">
            <MapInner
              onMapReady={setMapRef}
              mapType={mapType}
              editPath={editPath}
              filter={filter}
              selectedWaypoint={selectedWaypoint}
              onSelectWaypoint={handleMarkerSelect}
              onMapClick={handleMapClick}
              onMapDrag={useCallback(() => {
                if (panningRef.current) return
                setSelectedWaypoint(null)
                setMobileRightOpen(false)
              }, [])}
              onInfoClick={useCallback(() => {
                setMobileRightOpen(true)
              }, [])}
              setMapType={setMapType}
            />

            {/* Mobile floating toggle: open left panel */}
            <button
              onClick={() => setMobileLeftOpen(true)}
              className="lg:hidden absolute top-4 left-4 z-30 w-[44px] h-[44px] flex items-center justify-center bg-surface-container-lowest/90 text-on-surface-variant hover:text-on-surface shadow-lg transition-colors"
              aria-label="Open waypoints panel"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            {/* Mobile: preview card when waypoint selected (not showing full sheet) */}
            {selectedWaypoint && !mobileRightOpen && (
              <button
                onClick={() => setMobileRightOpen(true)}
                className="lg:hidden absolute bottom-4 left-4 right-4 z-30 bg-surface-container-lowest shadow-xl p-3 flex items-center gap-3 active:bg-surface-container-high transition-colors"
              >
                <span
                  className="w-3 h-3 flex-shrink-0"
                  style={{ backgroundColor: markerColors[selectedWaypoint.type] }}
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-display text-sm font-bold text-on-surface truncate">
                    {selectedWaypoint.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="tactical-label text-[10px]">RM {selectedWaypoint.riverMile}</span>
                    <span className="tactical-label text-[10px] uppercase">{selectedWaypoint.type}</span>
                    {selectedWaypoint.type === 'rapid' && selectedWaypoint.difficulty > 0 && (
                      <span className={`font-mono text-xs font-bold ${selectedWaypoint.difficulty >= 8 ? 'text-error' : selectedWaypoint.difficulty >= 6 ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                        Class {selectedWaypoint.difficulty}
                      </span>
                    )}
                    <span className="font-label text-[9px] text-tertiary uppercase tracking-widest ml-auto">Tap for details</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-tertiary flex-shrink-0">expand_less</span>
              </button>
            )}

            {/* Info button when nothing selected (mobile only) */}
            {!selectedWaypoint && (
              <button
                onClick={() => setMobileRightOpen(true)}
                className="lg:hidden absolute bottom-4 right-4 z-30 w-[44px] h-[44px] flex items-center justify-center bg-surface-container-lowest/90 text-on-surface-variant hover:text-on-surface shadow-lg transition-colors"
                aria-label="Open waypoint info"
              >
                <span className="material-symbols-outlined">info</span>
              </button>
            )}
          </div>
        </APIProvider>
      ) : (
        <NoApiKeyMessage />
      )}

      {/* Desktop right panel — hidden on mobile */}
      <div className="hidden lg:flex">
        <RightPanel waypoint={selectedWaypoint} />
      </div>

      {/* Mobile right panel overlay (bottom sheet) */}
      {mobileRightOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileRightOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 right-0 bottom-0 h-[60vh] bg-surface-container-lowest shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setMobileRightOpen(false)}
              className="absolute top-2 right-2 z-10 w-[44px] h-[44px] flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Close info panel"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            {/* Drag handle indicator */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-outline-variant/40 rounded-full" />
            </div>
            <div className="h-[calc(60vh-20px)] overflow-y-auto">
              <RightPanel waypoint={selectedWaypoint} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Inner map component that has access to useMap()
function MapInner({
  onMapReady,
  mapType,
  editPath,
  filter,
  selectedWaypoint,
  onSelectWaypoint,
  onMapClick,
  onMapDrag,
  onInfoClick,
  setMapType,
}: {
  onMapReady: (map: google.maps.Map) => void
  mapType: string
  editPath: boolean
  filter: WaypointFilter
  selectedWaypoint: Waypoint | null
  onSelectWaypoint: (wp: Waypoint) => void
  onMapClick: () => void
  onMapDrag: () => void
  onInfoClick: () => void
  setMapType: (t: string) => void
}) {
  const map = useMap()
  const [coords, setCoords] = useState(CANYON_CENTER)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  useMemo(() => {
    if (map) onMapReady(map)
  }, [map, onMapReady])

  return (
    <>
      <Map
        defaultCenter={CANYON_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        onCenterChanged={(e) => { setCoords(e.detail.center); onMapDrag() }}
        onZoomChanged={(e) => setZoom(e.detail.zoom)}
        onClick={onMapClick}
        gestureHandling="greedy"
        disableDefaultUI
        mapTypeId={mapType}
        className="w-full h-full"
      >
        <RiverPolyline editable={editPath} />
        <WaypointMarkers
          filter={filter}
          selectedId={selectedWaypoint?.id ?? null}
          onSelect={onSelectWaypoint}
          onDeselect={onMapClick}
          onInfoClick={onInfoClick}
        />
      </Map>

      {/* Overlay Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="flex flex-col bg-surface-container-lowest/90">
          {([
            { id: 'terrain', label: 'Terrain', icon: 'terrain' },
            { id: 'satellite', label: 'Satellite', icon: 'satellite_alt' },
            { id: 'hybrid', label: 'Hybrid', icon: 'layers' },
            { id: 'roadmap', label: 'Road', icon: 'map' },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMapType(opt.id)}
              className={`flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                mapType === opt.id
                  ? 'bg-surface-container-high text-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{opt.icon}</span>
              <span className="font-label text-[10px] uppercase tracking-wider hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col">
          <button
            onClick={() => map?.setZoom((map.getZoom() ?? 10) + 1)}
            className="w-full h-8 flex items-center justify-center bg-surface-container-lowest/90 text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
          <button
            onClick={() => map?.setZoom((map.getZoom() ?? 10) - 1)}
            className="w-full h-8 flex items-center justify-center bg-surface-container-lowest/90 text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
        </div>
      </div>

      {/* Map info overlay */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-surface-container-lowest/80 px-3 py-1.5">
        <span className="tactical-label text-[9px]">{mapType}</span>
        <div className="w-px h-3 bg-outline-variant/30" />
        <span className="font-mono text-[9px] text-on-surface-variant">
          {coords.lat.toFixed(4)}°N, {Math.abs(coords.lng).toFixed(4)}°W
        </span>
        <div className="w-px h-3 bg-outline-variant/30" />
        <span className="font-mono text-[9px] text-on-surface-variant">
          Zoom {zoom.toFixed(0)}
        </span>
      </div>
    </>
  )
}
