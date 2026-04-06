import { useState, useEffect, useRef, useCallback } from 'react'
import { rapidBeta, rapidBetaMap } from '@/data/rapid-beta'
import type { RapidBeta } from '@/data/rapid-beta'
import { rapidMedia as initialRapidMedia } from '@/data/rapid-media'
import type { RapidMedia } from '@/data/rapid-media'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'

interface RapidMediaRecord extends RecordModel {
  entry_id: string
  media_type: string
  url: string
  thumb: string
  title: string
  source: string
}

interface RapidEditRecord extends RecordModel {
  rapid_id: string
  description: string
  scout: string
  run: string
  hazards: string
  history: string
}

interface TimelineEntry {
  id: string
  day: string
  label: string
  mile: number
  type: 'camp' | 'rapid' | 'launch' | 'egress'
  rapidId?: string
  rating?: number
  summary?: string
  milestone?: boolean
}

const timelineEntries: TimelineEntry[] = [
  { id: 'launch', day: 'D01', label: "Lee's Ferry Launch", mile: 0, type: 'launch', summary: 'River mile zero. Last vehicle access. NPS ranger check-in, rig rafts, final gear check.', milestone: true },
  { id: 'r-badger', day: 'D01', label: 'Badger Creek', mile: 8, type: 'rapid', rapidId: 'badger', rating: 5 },
  { id: 'r-soap', day: 'D01', label: 'Soap Creek', mile: 11.4, type: 'rapid', rapidId: 'soap-creek-rapid', rating: 5 },
  { id: 'c-d01', day: 'D01', label: 'Navajo Bridge Camp', mile: 12.5, type: 'camp', summary: 'Camp near the historic Navajo Bridge. First night on the river. Settle into camp routine.' },
  { id: 'r-house', day: 'D02', label: 'House Rock', mile: 17.1, type: 'rapid', rapidId: 'house-rock', rating: 7 },
  { id: 'r-25mi', day: 'D02', label: '25 Mile', mile: 25.1, type: 'rapid', rapidId: '25-mile-rapid', rating: 6 },
  { id: 'c-d02', day: 'D02', label: 'South Canyon Camp', mile: 27, type: 'camp', summary: 'Large camp with Ancestral Puebloan ruins nearby. Good morning light for photos.' },
  { id: 'c-d03', day: 'D03', label: 'Redwall Cavern', mile: 33, type: 'camp', summary: 'Massive alcove in Redwall Limestone. Fits 100+ people. Popular lunch stop. Great acoustics.' },
  { id: 'c-d04', day: 'D04', label: 'Nankoweap', mile: 52, type: 'camp', summary: 'Large beach camp. Hike to Ancestral Puebloan granaries with panoramic river views. Layover day.', milestone: true },
  { id: 'c-d05', day: 'D05', label: 'Little Colorado', mile: 62, type: 'camp', summary: 'Turquoise tributary confluence. Sacred Hopi site. Swim in the blue water if conditions allow.', milestone: true },
  { id: 'c-d06', day: 'D06', label: 'Phantom Ranch', mile: 87.5, type: 'camp', summary: 'Only developed facility in the canyon. Phone, canteen, mail. Primary evacuation point via Bright Angel Trail.', milestone: true },
  { id: 'r-hance', day: 'D07', label: 'Hance', mile: 77.1, type: 'rapid', rapidId: 'hance-rapid', rating: 8 },
  { id: 'r-sock', day: 'D07', label: 'Sockdolager', mile: 79.1, type: 'rapid', rapidId: 'sockdolager', rating: 7 },
  { id: 'r-grape', day: 'D07', label: 'Grapevine', mile: 82.1, type: 'rapid', rapidId: 'grapevine-rapid', rating: 7 },
  { id: 'c-d07', day: 'D07', label: 'Bright Angel Camp', mile: 88, type: 'camp', summary: 'Camp near Bright Angel Creek. Resupply at Phantom Ranch canteen. Last reliable phone contact.' },
  { id: 'r-horn', day: 'D08', label: 'Horn Creek', mile: 90.8, type: 'rapid', rapidId: 'horn-creek', rating: 8 },
  { id: 'r-granite', day: 'D08', label: 'Granite', mile: 93.9, type: 'rapid', rapidId: 'granite', rating: 8 },
  { id: 'r-hermit', day: 'D08', label: 'Hermit', mile: 95.5, type: 'rapid', rapidId: 'hermit-rapid', rating: 8 },
  { id: 'r-crystal', day: 'D08', label: 'Crystal', mile: 98.2, type: 'rapid', rapidId: 'crystal', rating: 8 },
  { id: 'c-d08', day: 'D08', label: 'Bass Camp', mile: 108, type: 'camp', summary: 'Camp near Bass Trail. Four class 8 rapids today — rest well. Check gear for damage.' },
  { id: 'c-d09', day: 'D09', label: 'Shinumo Creek', mile: 109, type: 'camp', summary: 'Clear-water creek with swimming holes. Camp at the confluence. Good layover for rest day.' },
  { id: 'c-d10', day: 'D10', label: 'Elves Chasm', mile: 117, type: 'camp', summary: 'Stunning waterfall grotto via short hike up Royal Arch Creek. One of the canyon\'s hidden gems.' },
  { id: 'r-deub', day: 'D11', label: 'Deubendorff', mile: 132.3, type: 'rapid', rapidId: 'deubendorff-rapid', rating: 7 },
  { id: 'c-d11', day: 'D11', label: 'Deer Creek', mile: 136, type: 'camp', summary: '100ft waterfall directly into the river. Hike to "The Patio" narrows and Surprise Valley.', milestone: true },
  { id: 'r-upset', day: 'D12', label: 'Upset', mile: 150.2, type: 'rapid', rapidId: 'upset', rating: 8 },
  { id: 'c-d12', day: 'D12', label: 'Havasu Creek', mile: 157, type: 'camp', summary: 'Iconic turquoise water. Must-visit. Hike to Beaver Falls. Day use only past falls — Havasupai land.', milestone: true },
  { id: 'c-d13', day: 'D13', label: 'National Canyon', mile: 166, type: 'camp', summary: 'Short hike into a slot canyon with seasonal waterfall. Good camp with morning sun.' },
  { id: 'r-lava', day: 'D14', label: 'Lava Falls', mile: 179.4, type: 'rapid', rapidId: 'lava-falls', rating: 9 },
  { id: 'c-d14', day: 'D14', label: 'Below Lava Camp', mile: 181, type: 'camp', summary: 'Camp below Lava Falls. Celebrate surviving the big one. Decompress and swap stories.' },
  { id: 'c-d15', day: 'D15', label: 'Whitmore Wash', mile: 188, type: 'camp', summary: 'Secondary evacuation point. Road access from Bar 10 Ranch. Helicopter extraction possible.' },
  { id: 'c-d16', day: 'D16', label: 'Separation Canyon', mile: 206, type: 'camp', summary: 'Where three Powell expedition members left in 1869 and were never seen again. Powerful place.' },
  { id: 'c-d17', day: 'D17', label: 'Spencer Canyon', mile: 216, type: 'camp', summary: 'Final camp before takeout. Last night on the river. Pack and prep for Diamond Creek exit.' },
  { id: 'egress', day: 'D18', label: 'South Cove Egress', mile: 226, type: 'egress', summary: 'Diamond Creek takeout. Shuttle pickup. End of expedition. 226 river miles complete.', milestone: true },
]


const LAUNCH_DATE = new Date('2027-09-21T07:30:00-07:00') // 21 Sept 2027, 0730 MST

function CountdownCompact() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = LAUNCH_DATE.getTime() - now
  if (diff <= 0) return (
    <div className="flex items-center gap-2 px-3 py-2 bg-tertiary-container/20">
      <span className="w-2 h-2 bg-tertiary animate-pulse rounded-full" />
      <span className="font-label text-xs text-tertiary uppercase tracking-widest">Expedition Active</span>
    </div>
  )
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-container-lowest border-b border-outline-variant/20">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-tertiary animate-pulse rounded-full" />
        <span className="font-label text-[10px] text-tertiary uppercase tracking-widest">Launch</span>
      </div>
      <div className="flex items-center gap-3 font-mono text-sm text-primary">
        <span>{days}<span className="text-[9px] text-outline ml-0.5">d</span></span>
        <span>{String(hours).padStart(2,'0')}<span className="text-[9px] text-outline ml-0.5">h</span></span>
        <span>{String(minutes).padStart(2,'0')}<span className="text-[9px] text-outline ml-0.5">m</span></span>
        <span className="text-on-surface-variant">{String(seconds).padStart(2,'0')}<span className="text-[9px] text-outline ml-0.5">s</span></span>
      </div>
    </div>
  )
}

function CountdownFull() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = LAUNCH_DATE.getTime() - now
  if (diff <= 0) return (
    <div className="surface-card-elevated border-l-2 border-tertiary text-center py-6">
      <p className="font-display text-2xl font-bold text-tertiary uppercase tracking-wider">Expedition Active</p>
    </div>
  )
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return (
    <div className="surface-card p-0 overflow-hidden">
      <div className="h-1 bg-tertiary-container" />
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="tactical-label">Launch Countdown</span>
          <span className="tactical-label">21 Sept 2027 &middot; 0730 MST</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { value: days, label: 'Days' },
            { value: hours, label: 'Hours' },
            { value: minutes, label: 'Minutes' },
            { value: seconds, label: 'Seconds' },
          ].map((unit) => (
            <div key={unit.label} className="bg-surface-container-lowest p-3 lg:p-4">
              <p className="font-mono text-3xl lg:text-5xl font-bold text-primary leading-none">
                {String(unit.value).padStart(2, '0')}
              </p>
              <p className="tactical-label mt-2 text-[10px]">{unit.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-tertiary animate-pulse rounded-full" />
          <span className="font-label text-xs text-tertiary uppercase tracking-widest">Lee's Ferry Launch</span>
        </div>
      </div>
    </div>
  )
}

function GradingBar({ value, max = 10 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 ${i < value ? (value >= 8 ? 'bg-error' : value >= 5 ? 'bg-tertiary-container' : 'bg-primary') : 'bg-surface-container-highest'}`}
        />
      ))}
    </div>
  )
}

const inputClasses = 'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'

function RapidDetail({ rapid, media, mediaRecordIds, onMediaAdd, onMediaRemove, onRapidChange }: {
  rapid: RapidBeta
  media: RapidMedia[]
  mediaRecordIds: string[]
  onMediaAdd: (entryId: string, item: { media_type: string; url: string; thumb: string; title: string; source: string }) => void
  onMediaRemove: (recordId: string) => void
  onRapidChange: (rapidId: string, field: string, value: string) => void
}) {
  const [editingFields, setEditingFields] = useState(false)
  const [editingMedia, setEditingMedia] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoTitle, setPhotoTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')

  const addPhoto = () => {
    if (!photoUrl) return
    onMediaAdd(rapid.id, {
      media_type: 'photo',
      url: photoUrl,
      thumb: photoUrl,
      title: photoTitle || 'Uploaded photo',
      source: 'User upload',
    })
    setPhotoUrl('')
    setPhotoTitle('')
  }

  const addPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file)
      onMediaAdd(rapid.id, {
        media_type: 'photo',
        url,
        thumb: url,
        title: file.name.replace(/\.[^.]+$/, ''),
        source: 'Local upload',
      })
    })
    e.target.value = ''
  }

  const addVideo = () => {
    if (!videoUrl) return
    // Extract YouTube video ID for thumbnail
    const ytMatch = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    const thumb = ytMatch
      ? `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`
      : ''
    onMediaAdd(rapid.id, {
      media_type: 'video',
      url: videoUrl,
      thumb,
      title: videoTitle || 'Video link',
      source: 'YouTube',
    })
    setVideoUrl('')
    setVideoTitle('')
  }

  const removeMedia = (index: number) => {
    const recordId = mediaRecordIds[index]
    if (recordId) onMediaRemove(recordId)
  }

  const EditableField = ({ label, icon, field, value, iconColor = 'text-on-surface-variant', italic = false, cardClass = 'surface-card' }: {
    label: string; icon: string; field: string; value: string; iconColor?: string; italic?: boolean; cardClass?: string
  }) => (
    <div className={cardClass}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined text-sm ${iconColor}`}>{icon}</span>
        <span className="tactical-label">{label}</span>
      </div>
      {editingFields ? (
        <textarea
          className={`${inputClasses} min-h-[60px] resize-y`}
          value={value}
          onChange={(e) => onRapidChange(rapid.id, field, e.target.value)}
          rows={3}
        />
      ) : (
        <p className={`text-sm leading-relaxed ${italic ? 'text-on-surface-variant italic' : 'text-on-surface'}`}>
          {value || <span className="text-outline italic">No data</span>}
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Hero Header */}
      <div className="surface-card p-0 overflow-hidden">
        <div className="relative h-32 sm:h-48 bg-gradient-to-b from-surface-container-highest via-surface-container-high to-surface-container-low flex items-end">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="material-symbols-outlined text-8xl">waves</span>
          </div>
          <div className="relative z-10 w-full p-4 lg:p-6 bg-gradient-to-t from-surface/90 to-transparent">
            {/* Title + grading */}
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <span className="tactical-label text-[9px] sm:text-xs">
                  Mile {rapid.riverMile} &middot; Day {String(rapid.day).padStart(2, '0')} &middot; Drop {rapid.drop}
                </span>
                <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-primary uppercase tracking-wide mt-1 truncate">
                  {rapid.name}
                </h2>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="tactical-label text-[9px]">Grading</span>
                <p className={`font-mono text-2xl sm:text-3xl font-bold mt-0.5 ${rapid.rating >= 8 ? 'text-error' : rapid.rating >= 5 ? 'text-tertiary' : 'text-on-surface'}`}>
                  {rapid.rating}<span className="text-sm sm:text-lg text-on-surface-variant">/10</span>
                </p>
              </div>
            </div>
            {/* Edit button — separate row, always visible */}
            <div className="mt-2">
              <button
                onClick={() => setEditingFields(!editingFields)}
                className={`flex items-center gap-2 px-5 py-2.5 min-w-[120px] justify-center transition-colors ${
                  editingFields ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{editingFields ? 'check' : 'edit'}</span>
                <span className="font-label text-xs uppercase tracking-widest">{editingFields ? 'Done' : 'Edit'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grading bar */}
        <div className="px-4 py-2 border-t border-outline-variant/20">
          <GradingBar value={rapid.rating} />
        </div>
      </div>

      {/* Description */}
      <EditableField label="Description" icon="description" field="description" value={rapid.description} />

      {/* Scout & Run */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <EditableField label="Scout" icon="visibility" field="scout" value={rapid.scout} iconColor="text-tertiary" cardClass="surface-card-elevated" />
        <EditableField label="Recommended Run" icon="kayaking" field="run" value={rapid.run} iconColor="text-tertiary" cardClass="surface-card-elevated" />
      </div>

      {/* Hazards */}
      <EditableField label="Hazards" icon="warning" field="hazards" value={rapid.hazards} iconColor="text-error" cardClass="surface-card border-l-2 border-error" />

      {/* History */}
      <EditableField label="History & Notes" icon="history_edu" field="history" value={rapid.history} italic />

      {/* Media — Photos & Videos */}
      <div className="surface-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-sm text-on-surface-variant">photo_library</span>
          <span className="tactical-label">Recon Media</span>
          <span className="font-mono text-[10px] text-outline ml-auto">
            {media.filter(m => m.type === 'photo').length} photos &middot; {media.filter(m => m.type === 'video').length} videos
          </span>
          <button
            onClick={() => setEditingMedia(!editingMedia)}
            className={`flex items-center gap-1 px-2 py-1 ml-2 transition-colors ${
              editingMedia
                ? 'bg-tertiary-container text-on-tertiary'
                : 'border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{editingMedia ? 'check' : 'edit'}</span>
            <span className="font-label text-[10px] uppercase tracking-widest">{editingMedia ? 'Done' : 'Edit'}</span>
          </button>
        </div>

        {/* Media grid */}
        {media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
            {media.map((item, i) => (
              <div key={i} className="relative group">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-surface-container-highest overflow-hidden aspect-video"
                >
                  {item.thumb ? (
                    <img
                      src={item.thumb}
                      alt={item.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-outline">
                        {item.type === 'video' ? 'videocam' : 'image'}
                      </span>
                    </div>
                  )}
                  {item.type === 'video' && item.thumb && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 flex items-center justify-center bg-surface/70">
                        <span className="material-symbols-outlined text-primary text-xl">play_arrow</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-surface/90 to-transparent">
                    <p className="font-label text-[9px] text-on-surface truncate">{item.title}</p>
                    <p className="font-label text-[8px] text-outline">{item.source}</p>
                  </div>
                </a>
                {editingMedia && (
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-error-container text-error hover:bg-error hover:text-on-primary transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {media.length === 0 && !editingMedia && (
          <p className="text-sm text-outline italic mb-3">No media attached. Click Edit to add photos or videos.</p>
        )}

        {/* Edit mode — add forms */}
        {editingMedia && (
          <div className="space-y-3 pt-3 border-t border-outline-variant/20">
            {/* Upload photo file */}
            <div>
              <p className="tactical-label text-[10px] mb-2">Upload Photo</p>
              <label className="flex items-center gap-2 px-3 py-2 bg-surface-container-high text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-sm">photo_camera</span>
                <span className="font-label text-[10px] uppercase tracking-widest">Choose File</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={addPhotoFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Add photo by URL */}
            <div>
              <p className="tactical-label text-[10px] mb-2">Add Photo by URL</p>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <input className={inputClasses} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Image URL" />
                  <input className={inputClasses} value={photoTitle} onChange={(e) => setPhotoTitle(e.target.value)} placeholder="Caption" />
                </div>
                <button
                  onClick={addPhoto}
                  disabled={!photoUrl}
                  className="self-end px-3 py-1.5 bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>

            {/* Add video link */}
            <div>
              <p className="tactical-label text-[10px] mb-2">Add Video Link</p>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <input className={inputClasses} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube URL" />
                  <input className={inputClasses} value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title" />
                </div>
                <button
                  onClick={addVideo}
                  disabled={!videoUrl}
                  className="self-end px-3 py-1.5 bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Detail view for non-rapid timeline entries (camps, launch, egress)
function EntryDetail({ entry, media, mediaRecordIds, onMediaAdd, onMediaRemove }: {
  entry: TimelineEntry
  media: RapidMedia[]
  mediaRecordIds: string[]
  onMediaAdd: (entryId: string, item: { media_type: string; url: string; thumb: string; title: string; source: string }) => void
  onMediaRemove: (recordId: string) => void
}) {
  const [editingMedia, setEditingMedia] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')

  const addPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file)
      onMediaAdd(entry.id, {
        media_type: 'photo', url, thumb: url, title: file.name.replace(/\.[^.]+$/, ''), source: 'Local upload',
      })
    })
    e.target.value = ''
  }

  const addVideo = () => {
    if (!videoUrl) return
    const ytMatch = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    const thumb = ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg` : ''
    onMediaAdd(entry.id, {
      media_type: 'video', url: videoUrl, thumb, title: videoTitle || 'Video', source: 'YouTube',
    })
    setVideoUrl('')
    setVideoTitle('')
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      {entry.summary && (
        <div className="surface-card">
          <span className="tactical-label">About this location</span>
          <p className="text-sm text-on-surface mt-2 leading-relaxed">{entry.summary}</p>
        </div>
      )}

      {/* Key info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="surface-card-elevated">
          <span className="tactical-label text-[10px]">River Mile</span>
          <p className="font-mono text-xl text-primary mt-1">{entry.mile.toFixed(1)}</p>
        </div>
        <div className="surface-card-elevated">
          <span className="tactical-label text-[10px]">Day</span>
          <p className="font-mono text-xl text-primary mt-1">{entry.day}</p>
        </div>
        <div className="surface-card-elevated">
          <span className="tactical-label text-[10px]">Type</span>
          <p className="font-label text-sm text-on-surface mt-1 uppercase tracking-wider">
            {entry.type === 'launch' ? 'Launch Point' : entry.type === 'egress' ? 'Takeout' : 'Camp'}
          </p>
        </div>
      </div>

      {/* Media section */}
      <div className="surface-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-sm text-on-surface-variant">photo_library</span>
          <span className="tactical-label">Media</span>
          <span className="font-mono text-[10px] text-outline ml-auto">
            {media.filter(m => m.type === 'photo').length} photos &middot; {media.filter(m => m.type === 'video').length} videos
          </span>
          <button
            onClick={() => setEditingMedia(!editingMedia)}
            className={`flex items-center gap-1 px-2 py-1 ml-2 transition-colors ${
              editingMedia ? 'bg-tertiary-container text-on-tertiary' : 'border border-outline-variant/40 hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{editingMedia ? 'check' : 'edit'}</span>
            <span className="font-label text-[10px] uppercase tracking-widest">{editingMedia ? 'Done' : 'Edit'}</span>
          </button>
        </div>

        {media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {media.map((item, idx) => (
              <div key={idx} className="relative group">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="block bg-surface-container-highest overflow-hidden aspect-video">
                  {item.thumb ? (
                    <img src={item.thumb} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-outline">{item.type === 'video' ? 'videocam' : 'image'}</span>
                    </div>
                  )}
                  {item.type === 'video' && item.thumb && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 flex items-center justify-center bg-surface/70">
                        <span className="material-symbols-outlined text-primary text-xl">play_arrow</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-surface/90 to-transparent">
                    <p className="font-label text-[9px] text-on-surface truncate">{item.title}</p>
                  </div>
                </a>
                {editingMedia && mediaRecordIds[idx] && (
                  <button onClick={() => onMediaRemove(mediaRecordIds[idx])}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-error-container text-error hover:bg-error hover:text-on-primary transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {media.length === 0 && !editingMedia && (
          <p className="text-xs text-outline italic">No media yet. Click Edit to add photos or video links.</p>
        )}

        {editingMedia && (
          <div className="space-y-3 pt-3 border-t border-outline-variant/20">
            <div>
              <p className="tactical-label text-[10px] mb-2">Upload Photo</p>
              <label className="flex items-center gap-2 px-3 py-2 bg-surface-container-high text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-sm">photo_camera</span>
                <span className="font-label text-[10px] uppercase tracking-widest">Choose File</span>
                <input type="file" accept="image/*" multiple onChange={addPhotoFile} className="hidden" />
              </label>
            </div>
            <div>
              <p className="tactical-label text-[10px] mb-2">Add Video Link</p>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <input className={inputClasses} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube URL" />
                  <input className={inputClasses} value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title" />
                </div>
                <button onClick={addVideo} disabled={!videoUrl} className="self-end px-3 py-1.5 bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors">
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Command() {
  const [selectedRapid, setSelectedRapid] = useState<RapidBeta | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState('D08')

  // PocketBase-backed media and rapid edits
  const {
    records: mediaRecords,
    loading: mediaLoading,
    create: createMedia,
    remove: removeMedia,
  } = useCollection<RapidMediaRecord>('rapid_media')

  const {
    records: editRecords,
    loading: editsLoading,
    create: createEdit,
    update: updateEdit,
  } = useCollection<RapidEditRecord>('rapid_edits')

  // Seed static media into PocketBase on first load if collection is empty
  const seededRef = useRef(false)
  useEffect(() => {
    if (mediaLoading || seededRef.current) return
    if (mediaRecords.length > 0) {
      seededRef.current = true
      return
    }
    seededRef.current = true
    // Bulk-create from static seed data
    const entries = Object.entries(initialRapidMedia)
    entries.forEach(([entryId, items]) => {
      items.forEach((item) => {
        createMedia({
          entry_id: entryId,
          media_type: item.type,
          url: item.url,
          thumb: item.thumb,
          title: item.title,
          source: item.source,
        } as Partial<RapidMediaRecord>).catch(console.error)
      })
    })
  }, [mediaLoading, mediaRecords.length, createMedia])

  // Helper: get media for a given entry as RapidMedia[] + record IDs for deletion
  const getMediaForEntry = useCallback((entryId: string): { media: RapidMedia[]; recordIds: string[] } => {
    const matching = mediaRecords.filter((r) => r.entry_id === entryId)
    return {
      media: matching.map((r) => ({
        type: r.media_type as 'photo' | 'video',
        url: r.url,
        thumb: r.thumb,
        title: r.title,
        source: r.source,
      })),
      recordIds: matching.map((r) => r.id),
    }
  }, [mediaRecords])

  // Media add/remove handlers
  const handleMediaAdd = useCallback((entryId: string, item: { media_type: string; url: string; thumb: string; title: string; source: string }) => {
    createMedia({
      entry_id: entryId,
      ...item,
    } as Partial<RapidMediaRecord>).catch(console.error)
  }, [createMedia])

  const handleMediaRemove = useCallback((recordId: string) => {
    removeMedia(recordId).catch(console.error)
  }, [removeMedia])

  // Rapid edit handlers — persisted to PocketBase
  const handleRapidChange = useCallback((rapidId: string, field: string, value: string) => {
    const existing = editRecords.find((r) => r.rapid_id === rapidId)
    if (existing) {
      updateEdit(existing.id, { [field]: value } as Partial<RapidEditRecord>).catch(console.error)
    } else {
      createEdit({
        rapid_id: rapidId,
        description: '',
        scout: '',
        run: '',
        hazards: '',
        history: '',
        [field]: value,
      } as Partial<RapidEditRecord>).catch(console.error)
    }
    // Immediate UI feedback for selectedRapid
    if (selectedRapid && selectedRapid.id === rapidId) {
      setSelectedRapid((prev) => prev ? { ...prev, [field]: value } : prev)
    }
  }, [editRecords, updateEdit, createEdit, selectedRapid])

  // Merge edits into rapid data when displaying
  const getRapid = useCallback((rapid: RapidBeta): RapidBeta => {
    const editRecord = editRecords.find((r) => r.rapid_id === rapid.id)
    if (!editRecord) return rapid
    const merged = { ...rapid }
    if (editRecord.description) merged.description = editRecord.description
    if (editRecord.scout) merged.scout = editRecord.scout
    if (editRecord.run) merged.run = editRecord.run
    if (editRecord.hazards) merged.hazards = editRecord.hazards
    if (editRecord.history) merged.history = editRecord.history
    return merged
  }, [editRecords])

  // Loading state
  if (mediaLoading || editsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
          <span className="tactical-label">Loading expedition data...</span>
        </div>
      </div>
    )
  }

  const handleEntryClick = (entry: TimelineEntry) => {
    setSelectedDay(entry.day)
    if (entry.type === 'rapid' && entry.rapidId) {
      // Toggle rapid
      setSelectedEntryId(null)
      if (selectedRapid && selectedRapid.id === entry.rapidId) {
        setSelectedRapid(null)
      } else {
        const rapid = rapidBetaMap.get(entry.rapidId)
        if (rapid) setSelectedRapid(rapid)
      }
    } else {
      // Toggle non-rapid entry
      setSelectedRapid(null)
      if (selectedEntryId === entry.id) {
        setSelectedEntryId(null)
      } else {
        setSelectedEntryId(entry.id)
      }
    }
  }

  // Timeline entry renderer (shared between mobile and desktop)
  // Desktop sidebar timeline renderer
  const renderTimeline = () => (
    <div className="space-y-0">
      {timelineEntries.map((entry, i) => {
        const isRapid = entry.type === 'rapid'
        const isRapidSel = isRapid && entry.rapidId === selectedRapid?.id
        const isEntrySel = !isRapid && entry.id === selectedEntryId
        const isSelected = isRapidSel || isEntrySel
        const isDayActive = entry.day === selectedDay
        const showDay = i === 0 || timelineEntries[i - 1].day !== entry.day
        const isMilestone = entry.milestone
        const isLaunchOrEgress = entry.type === 'launch' || entry.type === 'egress'

        return (
          <div key={`dt-${entry.day}-${entry.label}`}>
            {showDay && i > 0 && <div className="h-px bg-outline-variant/15 my-0.5" />}
            <button
              onClick={() => handleEntryClick(entry)}
              className={`w-full text-left transition-colors ${
                isLaunchOrEgress
                  ? 'px-2 py-1.5 bg-surface-container-high/30 border-l-2 border-primary'
                  : isMilestone && !isRapid
                    ? 'px-2 py-1.5 border-l-2 border-tertiary/40 hover:bg-surface-container/50'
                    : isSelected
                      ? 'px-2 py-1 bg-tertiary-container/20 border-l-2 border-tertiary'
                      : 'px-2 py-1 border-l border-outline-variant/30 hover:bg-surface-container/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`font-mono text-[10px] tracking-wider flex-shrink-0 w-7 ${
                  showDay ? (isDayActive ? 'text-tertiary font-bold' : 'text-outline') : 'text-transparent'
                }`}>
                  {entry.day}
                </span>
                {isRapid ? (
                  <span className={`material-symbols-outlined flex-shrink-0 ${
                    isSelected ? 'text-tertiary' : (entry.rating ?? 0) >= 8 ? 'text-error/70' : 'text-outline'
                  }`} style={{ fontSize: '13px' }}>waves</span>
                ) : isLaunchOrEgress ? (
                  <span className="material-symbols-outlined text-primary/70 flex-shrink-0" style={{ fontSize: '13px' }}>
                    {entry.type === 'launch' ? 'rocket_launch' : 'flag'}
                  </span>
                ) : (
                  <span className={`material-symbols-outlined flex-shrink-0 ${isMilestone ? 'text-tertiary/60' : 'text-outline/40'}`} style={{ fontSize: '13px' }}>
                    {isMilestone ? 'star' : 'camping'}
                  </span>
                )}
                <span className={`text-xs leading-tight truncate flex-1 ${
                  isSelected ? 'text-on-surface font-medium'
                    : isLaunchOrEgress ? 'text-primary font-medium'
                      : isMilestone ? 'text-on-surface' : 'text-on-surface-variant'
                }`}>
                  {entry.label}
                </span>
                {isRapid && entry.rating && (
                  <span className={`font-mono text-[9px] flex-shrink-0 ${
                    entry.rating >= 8 ? 'text-error' : entry.rating >= 6 ? 'text-tertiary' : 'text-outline'
                  }`}>{entry.rating}</span>
                )}
                <span className="font-mono text-[8px] text-outline/50 flex-shrink-0 w-7 text-right">
                  {entry.mile.toFixed(0)}
                </span>
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* ===== MOBILE LAYOUT ===== */}
      <div className="lg:hidden flex flex-col h-full w-full">
        {/* Compact countdown */}
        <CountdownCompact />

        {/* Mobile timeline with inline expansion */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3">
            <h3 className="tactical-label px-1 mb-3">Expedition Timeline</h3>
            <div className="space-y-0">
              {timelineEntries.map((entry, i) => {
                const isRapid = entry.type === 'rapid'
                const isRapidSelected = isRapid && entry.rapidId === selectedRapid?.id
                const isEntryExpanded = !isRapid && entry.id === selectedEntryId
                const isSelected = isRapidSelected || isEntryExpanded
                const isDayActive = entry.day === selectedDay
                const showDay = i === 0 || timelineEntries[i - 1].day !== entry.day
                const betaData = isRapid && entry.rapidId ? rapidBetaMap.get(entry.rapidId) : null
                const isMilestone = entry.milestone
                const isLaunchOrEgress = entry.type === 'launch' || entry.type === 'egress'

                return (
                  <div key={`mob-${entry.day}-${entry.label}`}>
                    {/* Day separator for first entry of each day */}
                    {showDay && i > 0 && (
                      <div className="h-px bg-outline-variant/20 my-1" />
                    )}

                    {/* Timeline entry */}
                    <button
                      onClick={() => handleEntryClick(entry)}
                      className={`w-full text-left transition-all ${
                        isLaunchOrEgress
                          ? 'px-3 py-3 bg-[var(--surface-expanded)] border-l-2 border-primary my-1'
                          : isMilestone && !isRapid
                            ? 'px-3 py-3 border-l-2 border-tertiary/50 hover:bg-surface-container/50'
                            : isSelected
                              ? 'px-3 py-2 bg-tertiary-container/20 border-l-2 border-tertiary'
                              : isRapid
                                ? 'px-3 py-2 border-l border-outline-variant/30 hover:bg-surface-container/50'
                                : 'px-3 py-2.5 border-l border-outline-variant/30 hover:bg-surface-container/50'
                      }`}
                    >
                      {/* Top row: day + icon + label + mile */}
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs tracking-wider flex-shrink-0 w-8 ${
                          showDay ? (isDayActive ? 'text-tertiary font-bold' : 'text-outline') : 'text-transparent'
                        }`}>
                          {entry.day}
                        </span>

                        {/* Icon */}
                        {isRapid ? (
                          <span className={`material-symbols-outlined flex-shrink-0 ${
                            isSelected ? 'text-tertiary' : (entry.rating ?? 0) >= 8 ? 'text-error/70' : 'text-outline'
                          }`} style={{ fontSize: '18px' }}>waves</span>
                        ) : isLaunchOrEgress ? (
                          <span className={`material-symbols-outlined flex-shrink-0 ${isMilestone ? 'text-primary' : 'text-primary/70'}`} style={{ fontSize: '18px' }}>
                            {entry.type === 'launch' ? 'rocket_launch' : 'flag'}
                          </span>
                        ) : (
                          <span className={`material-symbols-outlined flex-shrink-0 ${isMilestone ? 'text-tertiary/70' : 'text-outline/50'}`} style={{ fontSize: '18px' }}>
                            {isMilestone ? 'star' : 'camping'}
                          </span>
                        )}

                        {/* Label */}
                        <span className={`text-sm leading-tight flex-1 min-w-0 truncate ${
                          isSelected ? 'text-on-surface font-medium'
                            : isLaunchOrEgress ? 'text-primary font-semibold'
                              : isMilestone ? 'text-on-surface font-medium'
                                : 'text-on-surface-variant'
                        }`}>
                          {entry.label}
                        </span>

                        {/* Right side: rating or mile marker */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isRapid && entry.rating && (
                            <span className={`font-mono text-xs font-bold ${
                              entry.rating >= 8 ? 'text-error' : entry.rating >= 6 ? 'text-tertiary' : 'text-outline'
                            }`}>
                              {entry.rating}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-outline/60 w-10 text-right">
                            {entry.mile.toFixed(1)}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '16px' }}>expand_more</span>
                          )}
                        </div>
                      </div>

                      {/* Summary preview for non-rapids (only when NOT expanded) */}
                      {!isRapid && entry.summary && !isEntryExpanded && (
                        <p className={`text-xs leading-relaxed mt-1 ml-10 pr-2 line-clamp-2 ${
                          isMilestone ? 'text-on-surface-variant' : 'text-outline'
                        }`}>
                          {entry.summary}
                        </p>
                      )}

                      {/* Milestone accent bar */}
                      {isMilestone && !isRapid && !isLaunchOrEgress && !isEntryExpanded && (
                        <div className="mt-1.5 ml-10 h-0.5 w-8 bg-tertiary/30" />
                      )}
                    </button>

                    {/* Inline rapid detail */}
                    {isRapidSelected && betaData && (() => {
                      const { media: entryMedia, recordIds } = getMediaForEntry(betaData.id)
                      return (
                        <div className="border-l-2 border-tertiary/30 ml-3 pl-3 py-3 pr-3 bg-[var(--surface-expanded)]">
                          <RapidDetail rapid={getRapid(betaData)} media={entryMedia} mediaRecordIds={recordIds} onMediaAdd={handleMediaAdd} onMediaRemove={handleMediaRemove} onRapidChange={handleRapidChange} />
                        </div>
                      )
                    })()}

                    {/* Inline non-rapid detail (camps, launch, egress) */}
                    {isEntryExpanded && (() => {
                      const { media: entryMedia, recordIds } = getMediaForEntry(entry.id)
                      return (
                        <div className={`border-l-2 ml-3 pl-3 py-3 pr-3 bg-[var(--surface-expanded)] ${
                          isMilestone ? 'border-tertiary/30' : 'border-primary/20'
                        }`}>
                          <EntryDetail entry={entry} media={entryMedia} mediaRecordIds={recordIds} onMediaAdd={handleMediaAdd} onMediaRemove={handleMediaRemove} />
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      {/* Left Sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant/20 overflow-hidden">
        {/* Expedition Timeline — desktop sidebar */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <h3 className="tactical-label px-2 mb-3">Expedition Timeline</h3>
          {renderTimeline()}
        </div>
      </aside>

      {/* Main Content — desktop only */}
      <div className="hidden lg:block flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* Countdown Timer */}
          <CountdownFull />

          {/* Stats Row + Rapid Detail — only when a rapid is selected */}
          {selectedRapid && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="surface-card-elevated">
                  <span className="tactical-label">Target Mile</span>
                  <p className="font-mono text-3xl text-on-surface mt-1 leading-none">
                    {selectedRapid.riverMile.toFixed(1)}
                  </p>
                </div>
                <div className="surface-card-elevated">
                  <span className="tactical-label">Rapid Grading</span>
                  <p className={`font-mono text-3xl mt-1 leading-none ${selectedRapid.rating >= 8 ? 'text-error' : 'text-on-surface'}`}>
                    {selectedRapid.rating}<span className="text-lg text-on-surface-variant">/10</span>
                  </p>
                  <span className="tactical-label mt-1 block">Grand Canyon Scale</span>
                </div>
                <div className="surface-card-elevated">
                  <span className="tactical-label">Expedition Day</span>
                  <p className="font-mono text-3xl text-on-surface mt-1 leading-none">
                    D{String(selectedRapid.day).padStart(2, '0')}
                  </p>
                  <span className="tactical-label mt-1 block">of 18</span>
                </div>
              </div>
              {(() => {
                const { media: selMedia, recordIds: selRecordIds } = getMediaForEntry(selectedRapid.id)
                return <RapidDetail rapid={selectedRapid} media={selMedia} mediaRecordIds={selRecordIds} onMediaAdd={handleMediaAdd} onMediaRemove={handleMediaRemove} onRapidChange={handleRapidChange} />
              })()}
            </>
          )}
          {!selectedRapid && selectedEntryId && (() => {
            const entry = timelineEntries.find((e) => e.id === selectedEntryId)
            if (!entry) return null
            const { media: entryMedia, recordIds } = getMediaForEntry(entry.id)
            return <EntryDetail entry={entry} media={entryMedia} mediaRecordIds={recordIds} onMediaAdd={handleMediaAdd} onMediaRemove={handleMediaRemove} />
          })()}
          {!selectedRapid && !selectedEntryId && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-3">touch_app</span>
              <p className="text-sm text-on-surface-variant">Select an entry from the timeline to view details</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
