import { useState } from 'react'
import type { ReactNode } from 'react'
import type { LandingCopy } from './copy'
import { DEMO_OBJECTS, initialStageIndex, isPending, objectTotals } from './demoObjects'
import type { DemoObjectKey, DemoStage, StageState } from './demoObjects'
import { Pill } from './parts'

/** Solid fills per state on the night-blue plan (no hatching). "none" is a dashed outline. */
const FILL: Record<StageState, string> = { ok: 'var(--illu-ok)', part: 'var(--illu-part)', bad: 'var(--illu-bad)', none: 'var(--illu-none-fill)' }
const LINE: Record<StageState, string> = { ok: 'var(--illu-ok)', part: 'var(--illu-part-line)', bad: 'var(--illu-bad)', none: 'var(--illu-blueprint)' }
const OUTLINE: Record<StageState, string> = { ok: 'var(--illu-plan)', part: 'var(--illu-plan)', bad: 'var(--illu-bad-edge)', none: 'var(--illu-blueprint)' }

type Rect = { x: number; y: number; w: number; h: number; rx?: number }
type Shape =
  | { kind: 'rects'; rects: Rect[] }
  | { kind: 'polygon'; points: string }
  /** Drawn as a coloured line (wiring, pipes) rather than a filled area. */
  | { kind: 'line'; d: string; width: number }

const PLAN: Record<DemoObjectKey, Record<string, Shape>> = {
  house: {
    f: { kind: 'rects', rects: [{ x: 50, y: 248, w: 300, h: 26, rx: 2 }] },
    k: { kind: 'rects', rects: [{ x: 66, y: 150, w: 268, h: 98 }] },
    r: { kind: 'polygon', points: '44,150 200,52 356,150' },
    o: { kind: 'rects', rects: [92, 178, 264].map((x) => ({ x, y: 172, w: 44, h: 44 })) },
    e: { kind: 'line', d: 'M72 232H328M72 160H328', width: 7 },
    p: { kind: 'line', d: 'M84 250V212H150', width: 9 },
    d: { kind: 'rects', rects: [{ x: 234, y: 196, w: 34, h: 52 }] },
  },
  flat: {
    a: { kind: 'rects', rects: [{ x: 40, y: 40, w: 130, h: 100 }] },
    b: { kind: 'rects', rects: [{ x: 170, y: 40, w: 190, h: 100 }] },
    c: { kind: 'rects', rects: [{ x: 40, y: 140, w: 110, h: 110 }] },
    g: { kind: 'rects', rects: [{ x: 150, y: 140, w: 130, h: 110 }] },
    h: { kind: 'rects', rects: [{ x: 280, y: 140, w: 80, h: 110 }] },
    i: { kind: 'rects', rects: [{ x: 40, y: 250, w: 320, h: 22 }] },
  },
}

function StageShape({ shape, state }: { shape: Shape; state: StageState }) {
  if (shape.kind === 'line') {
    return (
      <g
        className="sh"
        stroke={LINE[state]}
        fill="none"
        strokeWidth={shape.width}
        strokeDasharray={state === 'none' ? '10 8' : undefined}
        strokeLinejoin="round"
        strokeLinecap={state === 'none' ? 'butt' : 'round'}
      >
        <path d={shape.d} />
      </g>
    )
  }
  const dashed = state === 'none'
  const common = {
    className: 'sh',
    fill: FILL[state],
    stroke: OUTLINE[state],
    strokeOpacity: dashed ? 0.6 : 0.55,
    strokeDasharray: dashed ? '5 4' : undefined,
    strokeLinejoin: 'round' as const,
  }
  if (shape.kind === 'polygon') return <polygon points={shape.points} {...common} />
  return (
    <g {...common}>
      {shape.rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} />
      ))}
    </g>
  )
}

function stagePill(copy: LandingCopy, stage: DemoStage, last: string): ReactNode {
  const d = copy.demo
  if (isPending(stage)) return <Pill tone="neutral">○ {d.pending}</Pill>
  if (stage.state === 'ok') return <Pill tone="ok">{d.state.ok}</Pill>
  if (stage.state === 'bad') return <Pill tone="bad">{last}</Pill>
  if (stage.state === 'none') return <Pill tone="neutral">{d.state.none}</Pill>
  return <Pill tone="warn">{d.inWork(last)}</Pill>
}

export function DemoObjectSection({ copy }: { copy: LandingCopy }) {
  const d = copy.demo
  const [objectKey, setObjectKey] = useState<DemoObjectKey>('house')
  const object = DEMO_OBJECTS[objectKey]
  const [selected, setSelected] = useState(() => initialStageIndex(DEMO_OBJECTS.house))
  const texts = d.stages[objectKey] as Record<string, LandingCopy['demo']['stages']['house']['f']>
  const totals = objectTotals(object.stages)
  const current = object.stages[selected]
  const currentText = texts[current.id]

  function openTab(key: DemoObjectKey) {
    setObjectKey(key)
    setSelected(initialStageIndex(DEMO_OBJECTS[key]))
  }

  return (
    <section className="sec" id="object" aria-labelledby="object-title">
      <div className="in">
        <div className="sec-head">
          <div className="eyebrow">{d.eyebrow}</div>
          <h2 id="object-title">{d.title}</h2>
          <p>{d.lead}</p>
        </div>

        <div className="tabs" role="tablist" aria-label={d.tabsLabel}>
          {(Object.keys(DEMO_OBJECTS) as DemoObjectKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-selected={key === objectKey}
              aria-controls="object-panel"
              className="tab"
              onClick={() => openTab(key)}
            >
              {d.tabs[key]}
            </button>
          ))}
        </div>

        <div className="obj-grid" id="object-panel" role="tabpanel" aria-labelledby={`tab-${objectKey}`}>
          <div className="blue">
            <div className="big">
              <div className="c">
                <div>
                  <strong>{totals.accepted}%</strong>
                  <span>{d.accepted}</span>
                </div>
                <div>
                  <strong>{totals.withPending}%</strong>
                  <span>{d.withPending}</span>
                </div>
              </div>
              <span>{d.objectNames[objectKey]}</span>
            </div>

            <svg viewBox="0 0 400 290" role="group" aria-label={d.planLabel}>
              {objectKey === 'flat' ? (
                <rect x="34" y="34" width="332" height="244" rx="3" fill="none" stroke="var(--illu-blueprint)" strokeOpacity=".4" strokeWidth="2" />
              ) : (
                <path d="M20 274H380" stroke="var(--illu-blueprint)" strokeOpacity=".4" strokeWidth="2" />
              )}
              {object.stages.map((stage, i) => {
                const shape = PLAN[objectKey][stage.id]
                return (
                  <g
                    key={stage.id}
                    className={`part${i === selected ? ' sel' : ''}`}
                    aria-hidden="true"
                  >
                    <StageShape shape={shape} state={stage.state} />
                  </g>
                )
              })}
            </svg>

            <div className="legend">
              <span><i style={{ background: FILL.ok }} />{d.legend.ok}</span>
              <span><i style={{ background: FILL.part }} />{d.legend.part}</span>
              <span><i style={{ background: FILL.bad }} />{d.legend.bad}</span>
              <span><i style={{ border: '1px dashed var(--illu-blueprint)' }} />{d.legend.none}</span>
            </div>
          </div>

          <div className="side">
            <div className="list">
              {object.stages.map((stage, i) => {
                const t = texts[stage.id]
                return (
                  <button key={stage.id} type="button" className="li" aria-pressed={i === selected} onClick={() => setSelected(i)}>
                    <span>{t.name}</span>
                    <span className="p">{stage.confirmed}%</span>
                    <small>
                      {isPending(stage) ? d.pendingShort : ''}
                      {t.last}
                    </small>
                  </button>
                )
              })}
            </div>

            <div className="detail" aria-live="polite">
              <div className="top">
                <div>
                  <h3>{currentText.name}</h3>
                  {stagePill(copy, current, currentText.last)}
                </div>
                <div className="pct">
                  {current.confirmed}%<small>{isPending(current) ? d.byReport(current.claimed) : d.acceptedSmall}</small>
                </div>
              </div>
              {current.state !== 'none' && (
                <div className="photo">
                  <span>{currentText.taken}</span>
                </div>
              )}
              <dl className="kv">
                <div>
                  <dt>{d.fields.who}</dt>
                  <dd>
                    {currentText.who}
                    {current.state === 'none' ? '' : d.personalLink}
                  </dd>
                </div>
                <div>
                  <dt>{d.fields.taken}</dt>
                  <dd>{currentText.taken}</dd>
                </div>
                <div>
                  <dt>{d.fields.sent}</dt>
                  <dd>{currentText.sent}</dd>
                </div>
                {currentText.issue && (
                  <div>
                    <dt>{d.fields.issue}</dt>
                    <dd className="issue">{currentText.issue}</dd>
                  </div>
                )}
                {currentText.note && (
                  <div>
                    <dt>{d.fields.note}</dt>
                    <dd>{currentText.note}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
