import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type Dispatch } from 'react'
import { Play } from 'lucide-react'
import { createHouseScene, type HouseScene } from './houseScene'
import { STAGE_KIND, buildStageGroups, doneCount } from './stageElements'
import { initialSelection, selectionReducer, type SelectionAction, type SelectionState } from './selection'
import { HOUSE_BG, STAGE_COLORS } from './palette'
import { StageRows } from './StageRows'
import { StageCard } from './StageCard'
import { houseStrings as t } from './strings'
import { STAGE_PARTS, isStagePart, type HouseRendererSnapshot, type MappedStage, type StagePart } from './types'

const GROUPS = buildStageGroups()

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const usePrefersReducedMotion = () => useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches)

interface HouseModelProps {
  stages: MappedStage[]
  height?: number
  /** Drag to rotate and auto-rotation. Picking works either way. */
  interactive?: boolean
  initialAngle?: number
  /** Overrides the system prefers-reduced-motion setting (dev page). */
  reducedMotion?: boolean
  /** Lifted selection state, for callers that drive the selection themselves. */
  selection?: [SelectionState, Dispatch<SelectionAction>]
  onRendererDispose?: (snapshot: HouseRendererSnapshot) => void
}

export function HouseModel({ stages, height, interactive = true, initialAngle = 35, reducedMotion, selection, onRendererDispose }: HouseModelProps) {
  const host = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HouseScene | null>(null)
  const ownSelection = useReducer(selectionReducer, initialSelection)
  const [{ selected }, dispatch] = selection ?? ownSelection
  const systemReduced = usePrefersReducedMotion()
  const reduced = reducedMotion ?? systemReduced
  const [failed, setFailed] = useState(false)
  const [playingPart, setPlayingPart] = useState<StagePart | null>(null)

  // One stage per model part (first wins), in catalogue order.
  const modelStages = useMemo(() => {
    const seen = new Set<StagePart>()
    return stages.filter(stage => isStagePart(stage.part) && !seen.has(stage.part) && seen.add(stage.part))
      .sort((a, b) => (a.sortOrder ?? STAGE_PARTS.indexOf(a.part as StagePart) + 1) - (b.sortOrder ?? STAGE_PARTS.indexOf(b.part as StagePart) + 1))
  }, [stages])
  const percents = useMemo(() => Object.fromEntries(modelStages.map(stage => [stage.part, stage.percent])) as Partial<Record<StagePart, number>>, [modelStages])

  const live = useRef({ dispatch, onRendererDispose, reduced, percents, selected })
  useEffect(() => { live.current = { dispatch, onRendererDispose, reduced, percents, selected } })

  useEffect(() => {
    const root = host.current
    if (!root) return
    let scene: HouseScene
    try {
      scene = createHouseScene(root, {
        interactive, initialAngle, reducedMotion: live.current.reduced,
        onPick: part => live.current.dispatch(part ? { type: 'toggle', part } : { type: 'clear' }),
        onPlaybackStage: setPlayingPart,
        onContextLost: () => setFailed(true),
      })
    } catch {
      queueMicrotask(() => setFailed(true))
      return
    }
    scene.setProgress(live.current.percents); scene.select(live.current.selected)
    sceneRef.current = scene
    return () => {
      sceneRef.current = null
      const snapshot = scene.dispose()
      setPlayingPart(null)
      live.current.onRendererDispose?.(snapshot)
    }
  }, [interactive, initialAngle])

  useEffect(() => { sceneRef.current?.setProgress(percents) }, [percents])
  useEffect(() => { sceneRef.current?.select(selected) }, [selected])
  useEffect(() => { sceneRef.current?.setReducedMotion(reduced) }, [reduced])

  // Esc clears the selection and stops playback.
  useEffect(() => {
    if (!selected && !playingPart) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      dispatch({ type: 'clear' }); sceneRef.current?.stopPlayback()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected, playingPart, dispatch])

  // While playback runs, the first click anywhere only stops it.
  useEffect(() => {
    if (!playingPart) return
    const stop = (event: MouseEvent) => { event.stopPropagation(); event.preventDefault(); sceneRef.current?.stopPlayback() }
    document.addEventListener('click', stop, true)
    return () => document.removeEventListener('click', stop, true)
  }, [playingPart])

  const toggle = (part: StagePart) => dispatch({ type: 'toggle', part })
  const play = () => { dispatch({ type: 'clear' }); sceneRef.current?.play(modelStages.map(stage => stage.part as StagePart)) }

  const selectedStage = selected ? modelStages.find(stage => stage.part === selected) ?? null : null
  const counts = selected && selectedStage && STAGE_KIND[selected] === 'count'
    ? { total: GROUPS[selected].elements.length, done: doneCount(GROUPS[selected].elements.length, selectedStage.percent) }
    : null
  const playingStage = playingPart ? modelStages.find(stage => stage.part === playingPart) : null
  const rows = stages.map(stage => `${stage.name}: ${Math.round(stage.percent)}%`).join(', ')

  return <section aria-label={t.title} className="overflow-hidden rounded-2xl border border-slate-800 text-white shadow-sm" style={{ background: HOUSE_BG }}>
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem]">
      {!failed
        ? <div ref={host} className="house3d-canvas w-full" style={height ? { height } : undefined} role="img" aria-label={t.modelLabel(rows)} />
        : <p className="p-4 text-sm text-slate-300">{t.fallback}</p>}
      <aside aria-live="polite" className="min-h-24 border-t border-white/10 p-4 lg:border-l lg:border-t-0">
        {playingStage
          ? <div className="space-y-1">
              <p className="text-sm text-slate-300">{t.playing}</p>
              <p className="text-xl font-semibold" style={{ color: STAGE_COLORS[playingStage.part as StagePart] }}>{playingStage.name}</p>
              <p className="text-xs text-slate-400">{t.playInterrupt}</p>
            </div>
          : <StageCard stage={selectedStage} part={selected} counts={counts}
              doneStages={modelStages.filter(stage => stage.percent >= 100).length} totalStages={modelStages.length}
              onClose={() => dispatch({ type: 'clear' })} />}
      </aside>
    </div>
    <div className="space-y-4 border-t border-white/10 p-4">
      <div role="group" aria-label={t.stageLegend} className="flex flex-wrap gap-1.5">
        {modelStages.map(stage => <button key={stage.key} type="button" aria-pressed={selected === stage.part} onClick={() => toggle(stage.part as StagePart)}
          className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-2.5 text-xs text-white transition-colors hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-pressed:border-white/60 aria-pressed:bg-white/15">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: STAGE_COLORS[stage.part as StagePart] }} aria-hidden />{stage.name}
        </button>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul aria-label={t.stateLegend} className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
          <li className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-white shadow-[0_0_6px_1px_rgba(255,255,255,.7)]" aria-hidden />{t.ready} <span className="text-slate-400">({t.readyHint})</span></li>
          <li className="flex items-center gap-1.5"><span className="flex h-0.5 w-5 overflow-hidden rounded" aria-hidden><span className="w-1/2 bg-white" /><span className="w-1/2 bg-white/15" /></span>{t.working} <span className="text-slate-400">({t.workingHint})</span></li>
          <li className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-white/15" aria-hidden />{t.notStarted} <span className="text-slate-400">({t.notStartedHint})</span></li>
        </ul>
        {!failed && modelStages.length ? <button type="button" onClick={play} disabled={!!playingPart}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60">
          <Play className="size-4" aria-hidden />{t.play}
        </button> : null}
      </div>
      <StageRows stages={stages} selected={selected} onSelect={toggle} />
    </div>
  </section>
}
