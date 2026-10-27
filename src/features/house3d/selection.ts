import type { StagePart } from './types'

export interface SelectionState { selected: StagePart | null }
export type SelectionAction =
  /** Row, legend chip or 3D part: a second click on the same stage deselects it. */
  | { type: 'toggle'; part: StagePart }
  /** Esc, tap on the background, close button, playback start. */
  | { type: 'clear' }

export const initialSelection: SelectionState = { selected: null }

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'toggle':
      return { selected: state.selected === action.part ? null : action.part }
    case 'clear':
      return state.selected === null ? state : initialSelection
  }
}
