import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LAUNCH_DATE = new Date('2027-09-21T07:30:00-07:00')

export default function Landing() {
  const navigate = useNavigate()
  const [now, setNow] = useState(Date.now())
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = Math.max(0, LAUNCH_DATE.getTime() - now)
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  return (
    <div className="relative w-screen overflow-hidden bg-black" style={{ height: '100dvh' }}>
      {/* Hero image — full bleed */}
      <img
        src="/landing.png"
        alt="Grand Canyon at sunset from Toroweap"
        onLoad={() => setImageLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle gradient overlays for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" style={{ height: '30%' }} />

      {/* Content — positioned at bottom, text is subtle */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-16">
        {/* Countdown — small, elegant, top-right on desktop */}
        <div className="absolute top-6 right-6 sm:top-10 sm:right-10 lg:top-16 lg:right-16">
          <div className="flex items-center gap-3 sm:gap-4">
            {[
              { value: days, label: 'd' },
              { value: hours, label: 'h' },
              { value: minutes, label: 'm' },
              { value: seconds, label: 's' },
            ].map((unit) => (
              <div key={unit.label} className="text-center">
                <p className="font-mono text-lg sm:text-2xl lg:text-3xl font-bold text-white/90 leading-none tracking-tight">
                  {String(unit.value).padStart(2, '0')}
                </p>
                <p className="font-label text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1">
                  {unit.label === 'd' ? 'days' : unit.label === 'h' ? 'hrs' : unit.label === 'm' ? 'min' : 'sec'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Title block — bottom left, understated */}
        <div className="max-w-lg">
          <p className="font-label text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/40 mb-2 sm:mb-3">
            Glasgow Kayak Club
          </p>
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-white/90 leading-[0.95] tracking-tight">
            Grand<br />Canyon
          </h1>
          <p className="font-mono text-sm sm:text-base text-white/50 mt-2 sm:mt-3 tracking-wider">
            2027
          </p>

          {/* Subtle separator */}
          <div className="h-px w-12 bg-white/20 mt-4 sm:mt-6 mb-4 sm:mb-6" />

          {/* Enter button */}
          <button
            onClick={() => navigate('/command')}
            className="group flex items-center gap-3 text-white/50 hover:text-white/90 transition-all duration-300"
          >
            <span className="font-label text-[10px] sm:text-xs uppercase tracking-[0.2em]">
              Enter Expedition Planner
            </span>
            <span className="material-symbols-outlined text-sm transition-transform duration-300 group-hover:translate-x-1">
              arrow_forward
            </span>
          </button>
        </div>

        {/* River mile indicator — very subtle, bottom right */}
        <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 lg:bottom-16 lg:right-16 text-right">
          <p className="font-mono text-[9px] text-white/25 tracking-wider">226 RIVER MILES</p>
          <p className="font-mono text-[9px] text-white/25 tracking-wider">18 DAYS</p>
          <p className="font-mono text-[9px] text-white/25 tracking-wider">16 CREW</p>
        </div>
      </div>
    </div>
  )
}
