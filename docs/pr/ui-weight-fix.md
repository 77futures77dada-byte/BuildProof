# claude/ui-weight-fix: lighter type across the app

**Base:** `origin/main` 77f5cc9 (app redesign, PR #10, merged).
**Why:** the owner's remark «всё выглядит слишком жирно».

## What was done
Every weight moved one step lighter. The change sits in tokens and shared components, so screens did not get one-off fixes.

| What | Before | After |
|---|---|---|
| Body text, owner screens | 500 | 400 |
| Body text, worker zone (`data-zone="field"`) | 500 | 500, unchanged |
| Headings h1–h3, large figures (%) | 700 | 600 |
| Chips, labels, values, active tab, secondary/ghost/danger buttons | 600 | 500 |
| Former `font-medium` | 500 | class removed; text inherits the zone base (400 owner / 500 worker) |
| Main yellow button | 600 | 600, unchanged |

The worker zone keeps a 500 base on purpose. `check-tokens` forbids 400 there: thin text is hard to read in sunlight (02-type research).

The landing is untouched; it has its own PR.

- **Files:** 62 files in `src/` (class swaps), `src/styles/tokens.css` (`body` 400), `src/components/ui/buttonClass.ts` (the weight moved into the variants, so primary keeps 600 without a class conflict).
- **Docs:** `docs/design/05-ui.md` §2 weight table updated.

**Before | after:** `docs/screens/weight-fix/before-after-*.png` (dashboard, people, worker report sheet in dark). The PR screenshots in `docs/screens/redesign/` were re-captured.

**Checks:** `node scripts/run-checks.mjs --strict-a11y`: all PASS. lint 0, build, tests 80/80, check-tokens 0, check-ru-latin 0, check-overflow 32 routes with 0 failures, «Отправить» at 360×553 visible 8/8.

## Rejected
- **400 in the worker zone.** Sunlight readability; the linter forbids it.
- **A lighter main button.** It is the one main action per screen and has to stand out.

## Left
- **If it is still too heavy,** the next step is headings 600 → 500 on owner screens only. Decide after looking at it on your phone.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
