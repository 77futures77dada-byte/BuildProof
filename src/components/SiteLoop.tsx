import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { LOOP_SECONDS, STILL_FRAME, createSiteLoopScene, wrap } from './siteLoopScene'
import type { SiteLoopScene } from './siteLoopScene'

interface SiteLoopProps {
  className?: string
}

/**
 * Landing hero animation: a 15 s seamless loop of a crew installing windows,
 * photographing the result and the report card reaching 100%.
 *
 * Plays on its own, pauses while scrolled out of view and shows a single
 * still frame when the user prefers reduced motion. Playback controls exist
 * only in dev builds (`import.meta.env.DEV`), tucked into a collapsed panel.
 */
export function SiteLoop({ className = '' }: SiteLoopProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const sceneRef = useRef<SiteLoopScene | null>(null)
  const timeRef = useRef(0)
  const scrubRef = useRef<HTMLInputElement>(null)
  const clockRef = useRef<HTMLOutputElement>(null)

  const reducedMotion = usePrefersReducedMotion()
  const [inView, setInView] = useState(true)
  const [devPaused, setDevPaused] = useState(false)
  const playing = !reducedMotion && inView && !devPaused

  // Dev-only readout; the refs are never attached in production builds.
  const syncDevControls = () => {
    if (scrubRef.current) scrubRef.current.value = timeRef.current.toFixed(2)
    if (clockRef.current) clockRef.current.textContent = `${timeRef.current.toFixed(1)} s`
  }

  // Snap to a time without smoothing (limbs ease from the last frame otherwise).
  const drawStill = (t: number) => {
    timeRef.current = t
    for (let i = 0; i < 3; i++) sceneRef.current?.render(t, 1)
    syncDevControls()
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const scene = createSiteLoopScene(svg)
    sceneRef.current = scene
    scene.setWidth(svg.getBoundingClientRect().width)
    scene.render(timeRef.current, 1)

    const resize = new ResizeObserver(([entry]) => scene.setWidth(entry.contentRect.width))
    resize.observe(svg)

    const visibility =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    visibility?.observe(svg)

    return () => {
      resize.disconnect()
      visibility?.disconnect()
      scene.destroy()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) drawStill(STILL_FRAME)
  }, [reducedMotion])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      timeRef.current = wrap(timeRef.current + dt)
      sceneRef.current?.render(timeRef.current, 1 - Math.exp(-dt * 16))
      syncDevControls()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  return (
    <div className={`site-loop ${className}`}>
      <div className="overflow-hidden rounded-2xl border border-sky-300/30 bg-[#0b2a4a] leading-[0] shadow-xl shadow-sky-900/20">
        <svg
          ref={svgRef}
          viewBox="0 0 1280 720"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Анимация стройплощадки: рабочие в касках носят окна к недостроенному дому, устанавливают три окна, фотографируют результат, и карточка этапа «Окна» показывает 100%."
          className="block h-auto w-full"
        >
          <defs>
            <linearGradient id="site-loop-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b2a4a" />
              <stop offset="1" stopColor="#17497a" />
            </linearGradient>
            <linearGradient id="site-loop-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#113c65" />
              <stop offset="1" stopColor="#08233f" />
            </linearGradient>
            <pattern id="site-loop-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M64 0H0V64" fill="none" stroke="#7dd3fc" strokeOpacity=".08" />
            </pattern>
            <pattern id="site-loop-gravel" width="23" height="15" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1.3" fill="#7dd3fc" fillOpacity=".2" />
              <circle cx="16" cy="10" r="1" fill="#7dd3fc" fillOpacity=".15" />
            </pattern>
            <filter id="site-loop-shadow" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#000" floodOpacity=".4" />
            </filter>
          </defs>

          <rect width="1280" height="720" fill="url(#site-loop-sky)" />
          <rect width="1280" height="610" fill="url(#site-loop-grid)" />
          <g data-layer="clouds" fill="#b9d8f5" opacity=".09">
            <ellipse cx="260" cy="110" rx="150" ry="26" />
            <ellipse cx="360" cy="96" rx="90" ry="22" />
            <ellipse cx="820" cy="70" rx="170" ry="24" />
            <ellipse cx="1010" cy="92" rx="100" ry="20" />
            <ellipse cx="1180" cy="250" rx="120" ry="18" />
          </g>
          <g fill="#0a2742" opacity=".9">
            <rect x="20" y="470" width="86" height="140" />
            <rect x="112" y="505" width="64" height="105" />
            <rect x="1075" y="450" width="70" height="160" />
            <rect x="1150" y="490" width="110" height="120" />
          </g>

          <g data-layer="crane" stroke="#7dd3fc" strokeOpacity=".4" fill="none" strokeWidth="2" />
          <g data-layer="hook" stroke="#7dd3fc" strokeOpacity=".55" fill="none" strokeWidth="2">
            <line x1="540" y1="164" x2="540" y2="320" />
            <path d="M534 320h12v8a6 6 0 0 1-12 0z" fill="#7dd3fc" fillOpacity=".25" />
            <rect x="518" y="330" width="44" height="14" fill="#123e69" />
          </g>

          <rect y="610" width="1280" height="110" fill="url(#site-loop-ground)" />
          <rect y="610" width="1280" height="110" fill="url(#site-loop-gravel)" />
          <line x1="0" y1="610" x2="1280" y2="610" stroke="#7dd3fc" strokeOpacity=".5" />

          {/* window rack and crate */}
          <g>
            <rect x="38" y="568" width="72" height="42" fill="#17487a" stroke="#7dd3fc" strokeOpacity=".6" />
            <line x1="38" y1="589" x2="110" y2="589" stroke="#7dd3fc" strokeOpacity=".35" />
            <text x="74" y="583" textAnchor="middle" className="t-mono" fontSize="9" fill="#cfe9ff" letterSpacing=".8">
              ОКНА
            </text>
            <rect x="120" y="596" width="140" height="8" fill="#6d86a3" />
            <line x1="124" y1="548" x2="124" y2="596" stroke="#9fb4c9" strokeWidth="4" />
            <line x1="256" y1="548" x2="256" y2="596" stroke="#9fb4c9" strokeWidth="4" />
            <line x1="124" y1="552" x2="256" y2="552" stroke="#9fb4c9" strokeWidth="3" />
          </g>

          {/* house */}
          <g>
            <g stroke="#cfe3f5" strokeOpacity=".6" strokeWidth="2" fill="none">
              <line x1="586" y1="335" x2="586" y2="610" />
              <line x1="612" y1="335" x2="612" y2="610" />
              <line x1="586" y1="470" x2="612" y2="470" />
              <line x1="586" y1="340" x2="612" y2="340" />
              <line x1="586" y1="600" x2="612" y2="600" />
              <line x1="586" y1="470" x2="612" y2="340" />
              <line x1="612" y1="600" x2="586" y2="470" />
            </g>
            <rect x="604" y="598" width="422" height="14" fill="#6d86a3" />
            <rect x="620" y="470" width="390" height="128" fill="#123e69" stroke="#7dd3fc" strokeOpacity=".7" strokeWidth="2" />
            <rect x="620" y="340" width="390" height="130" fill="#16477a" stroke="#7dd3fc" strokeOpacity=".7" strokeWidth="2" />
            <polygon points="598,342 815,236 1032,342" fill="#1d5188" stroke="#7dd3fc" strokeOpacity=".85" strokeWidth="2" />
            <g stroke="#7dd3fc" strokeOpacity=".25">
              <line x1="640" y1="326" x2="990" y2="326" />
              <line x1="680" y1="304" x2="950" y2="304" />
              <line x1="720" y1="282" x2="910" y2="282" />
              <line x1="760" y1="260" x2="870" y2="260" />
            </g>
            <rect x="930" y="262" width="24" height="52" fill="#17487a" stroke="#7dd3fc" strokeOpacity=".6" />
            <g data-layer="win2" />
            <g data-layer="openings" />
            <rect x="835" y="520" width="50" height="78" fill="#0f3558" stroke="#cfe3f5" strokeOpacity=".7" strokeWidth="2" />
            <circle cx="875" cy="562" r="2.5" fill="#ffd23f" />
          </g>

          <g data-layer="panesBack" />
          <g data-layer="actors" />
          <g data-layer="panes" />
          <g data-layer="fx" />
          <g data-layer="ui" />
        </svg>
      </div>

      {import.meta.env.DEV && (
        <details className="mt-3 font-mono text-xs text-slate-500">
          <summary className="cursor-pointer select-none">Управление анимацией (dev)</summary>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDevPaused((p) => !p)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:border-sky-500"
            >
              {devPaused ? 'Play' : 'Pause'}
            </button>
            <input
              ref={scrubRef}
              type="range"
              min={0}
              max={LOOP_SECONDS}
              step={0.01}
              defaultValue={0}
              aria-label="Время анимации"
              className="min-w-0 flex-1 accent-sky-600"
              onInput={(e) => {
                setDevPaused(true)
                drawStill(Number(e.currentTarget.value))
              }}
            />
            <output ref={clockRef} className="w-14 text-right text-slate-700">
              0.0 s
            </output>
          </div>
        </details>
      )}
    </div>
  )
}
