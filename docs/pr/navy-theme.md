# claude/navy-theme: brand navy instead of neutral black

**Base:** `origin/main` dfdfa75 (PR #11 ui-weight-fix merged).
**Why:** the owner's remark «чёрный выглядит дёшево и просто».
**Not touched:** `supabase/`, `api/`. No new dependencies. No screenshots, as requested.

## What was done

### Palette (`src/styles/tokens.css`)
| Token | Dark (navy) | Light (navy on white) |
|---|---|---|
| `--bg` page | #08213B | #FFFFFF |
| `--surface` cards | #0B2A4A | #EEF3F9 |
| `--surface-2` hover / selected | #12365C | #E1EAF4 |
| `--line` | #24476F | #C9D7E6 |
| `--fg` text and headings | #EEF3F9 | #0B2A4A |
| `--muted-strong` / `--muted` | #C3D3E4 / #9DB3CC | #2E4B6B / #4A6582 |
| `--accent` main button | #FFC72C, navy text #0B2A4A | same |
| `--link`, `--focus` | #7DD3FC (light blue) | #0A4478 |
| accepted / waiting / problem | #2FB67E / #D9962B / #FF6B6B | #11683F / #8A5300 / #B3261E (darkened for white) |

- **Status.** A state is always shown by shape and word, never by colour alone. Status colours only tint icons and chip edges. On the landing they also appear as words, at the text threshold.
- **Dark bands.** The always-dark bands (landing night sections, phone bezel) use the same navy.

### Contrast check: `scripts/check-contrast.mjs`, new, part of `run-checks`
- **Coverage.** 114 pairs in both themes, all passing.
- **Thresholds:**
  - text 4.5:1;
  - worker text, links and the «не отправлено» banner 7:1;
  - yellow button with navy text 7:1 (9.3 measured);
  - status icons, focus ring, borders and 3D lines 3:1;
  - status inks used as words 4.5:1.
- **Drift checks.** The dark set under `@media` must equal the forced `[data-theme="dark"]` set. The `theme-color` values in `index.html` must equal `--bg`.
- **Failing pairs.** When a pair failed, the colour changed, not the threshold. For example, the light link went from #1560A8 (6.4) to #0A4478 (7+).
- **Negative test.** A dull grey `--muted` makes the script fail.

### One theme everywhere
- **Where the theme lives.** On `<html>`. Every screen, every sheet and modal (they portal into `#bp-root`), the landing and the sign-in screens share it.
- **New `check-overflow` checks:**
  - on all 32 routes × 4 widths × 2 themes, `data-theme` equals the chosen theme and `#bp-root` has the same background on every screen;
  - the report sheet has the same background as the page behind it;
  - **theme-default:** with no stored choice, under both OS schemes — owner, client and signed-out get dark; worker and foreman get light. 10/10.

### Theme switcher
- **Control.** «Тема: светлая / тёмная / как в системе» in the app header, the sign-in screen, the landing and the review screen. It is a native select: one 48 px control, border `--fg` like every field.
- **Storage.** Per device (`localStorage`), nothing goes to the server. Every switcher on the page follows a change.
- **Default.** Navy dark for the owner, the client and signed-out pages. Light for worker and foreman: they are on site, where light reads better in sunlight.
- **First paint.** An inline script in `index.html` applies the same rule before the page paints, so there is no flash for a returning user. A test runs that script for all 20 choice × role combinations and compares it with `src/lib/theme.ts`.
- **Sign-out** forgets the remembered role (shared device). The user's own choice stays.

### Header on phones
- **Not sticky below 1024 px.** At 360×553 the sticky project header covered 308 of 553 px.
- **Phone layout.** Two rows: «BuildProof · Тариф · Выйти», then theme + language. On desktop it is one sticky row.
- **Order.** DOM order = visual order = Tab order at every width.
- **New `check-overflow` sticky-top check.** Bars stuck to the top cover ≤ 25 % of a 360/390×553 screen. Negative test: a sticky header fails 10/10.

### 3D object model
- **Tokens.** Its colours moved to `--house-*` tokens. `palette.ts` and `houseScene.ts` left the hex allowlist (5 → 3 entries).
- **Rendering.** The DOM uses `var(--house-…)`; three.js resolves the tokens once when the scene is built.
- **Stage.** The model sits on a fixed navy stage. In the dark theme that equals the card surface.
- **Tests.** `palette.test.ts` reads the colours from `tokens.css`: pinned stage hues, 3:1 on the model background, ΔE ≥ 15 under deuteranopia.

### Checks: `node scripts/run-checks.mjs --strict-a11y`, all PASS
lint 0 · build · tests 105/105 · check-tokens 0 (3 permanent exceptions) · check-contrast 114/0 · check-ru-latin 0 · check-overflow: 32 routes, overflow 0, touch < 48 px 0, text < 17 px 0, theme 0, sticky 0, «Отправить» at 360×553 8/8.

### Critics (`docs/design/06-audit-navy-*-r{1..4}.md`)
| Critic | r1 | r2 | r3 | r4 |
|---|---|---|---|---|
| «Март» | 0 HIGH / 5 MED | 0 / 0 | 0 / 0 | — |
| «Бригадир» | 0 / 4 | 0 / 1 | 0 / 0 | 0 / 0 |
| «Инвестор» | 1 / 6 | 0 / 0 | 0 / 0 | — |

The r1 HIGH: there was no switcher on the landing and the review screen. Fixed.

## Decisions (not changed)
- **Signed-out visitors** get navy dark, not the OS theme. The owner asked for navy by default, and the landing's audience is owners.
- **First sign-in of a worker on a new device** shows one dark frame, then light. The role is unknown until the profile loads; after that it is remembered.
- **The 3D model stays on a navy stage in the light theme too.** The stage colours are built for a dark background.
- **Project tabs scroll away with the header on phones.** If people complain, make only the tab strip sticky.
- **On desktop «Выйти» sits before theme and language, not at the far right** (Бригадир r4 LOW). This follows from DOM order = Tab order.

## Waiting for the owner
- **The light/dark default by role.** Try it on a phone in the sun: worker and foreman get light, owner and client get navy dark.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
