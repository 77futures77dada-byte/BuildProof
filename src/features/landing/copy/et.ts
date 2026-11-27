/**
 * Landing copy, Estonian.
 *
 * TODO native ET review: not translated on purpose (buildproof-decisions.md
 * §6 — Estonian copy is written by a native speaker, not machine-translated).
 * The displayed marker remains until review. Replace values key by key,
 * keeping the shape of `LandingCopy`.
 */

import { en } from './en'
import type { LandingCopy } from './ru'

export const et: LandingCopy = {
  ...en,
  meta: {
    // TODO native ET review
    fallbackNote: 'TODO native ET review',
  },
}
