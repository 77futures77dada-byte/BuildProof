/**
 * Landing copy, Estonian.
 *
 * TODO native ET review: not translated on purpose (buildproof-decisions.md
 * §6 — Estonian copy is written by a native speaker, not machine-translated).
 * Every key below is the English text until then; the page shows a note
 * saying so. Replace values key by key, keeping the shape of `LandingCopy`.
 */

import { en } from './en'
import type { LandingCopy } from './ru'

export const et: LandingCopy = {
  ...en,
  meta: {
    // TODO native ET review
    fallbackNote: 'The Estonian version is being written by a native speaker. Until then this page is in English.',
  },
}
