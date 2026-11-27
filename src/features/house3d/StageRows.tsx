import { stageColor } from './palette'
import { isStagePart, type MappedStage, type StagePart } from './types'

/**
 * Stage list on the dark model panel: colour stripe, name, percent, mini bar.
 * Rows of the seven model stages become toggle buttons when `onSelect` is given.
 */
export function StageRows({ stages, selected = null, onSelect }: { stages: MappedStage[]; selected?: StagePart | null; onSelect?: (part: StagePart) => void }) {
  return <ul className="space-y-1.5">
    {stages.map(stage => {
      const color = stageColor(stage.part), percent = Math.round(stage.percent), part = stage.part
      const body = <>
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-body text-on-inverse">{stage.name}</span>
          <span className="text-body font-semibold tabular-nums text-on-inverse">{percent}%</span>
        </span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-inverse-line">
          <span className="block h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
        </span>
      </>
      const base = 'block w-full rounded-lg border-l-4 px-3 py-2 text-left'
      return <li key={stage.key}>
        {onSelect && isStagePart(part)
          ? <button type="button" aria-pressed={selected === part} onClick={() => onSelect(part)} style={{ borderLeftColor: color }}
              className={`${base} cursor-pointer transition-colors hover:bg-inverse-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-inverse aria-pressed:bg-inverse-line aria-pressed:ring-1 aria-pressed:ring-on-inverse`}>{body}</button>
          : <div className={base} style={{ borderLeftColor: color }}>{body}</div>}
      </li>
    })}
  </ul>
}
