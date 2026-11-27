# claude/overview-b: project overview, variant B

**Base:** `origin/main` 0f4ed24 (PR #12 navy-theme merged).
**Task:** «Обзор по варианту B»: a 33 % panel, the 3D model in the middle, the stage list, and a phone layout. No written spec was in the repo, so the layout below follows that description.
**Not touched:** `supabase/`, `api/`. No new dependencies. No screenshots.

## What was done

### Desktop (≥ 1024 px): three columns
| Panel 33 % | 3D model | Stages |
|---|---|---|
| readiness, freshness, the one main action; active issues; people; feed; photos | compact model, always open | the stage list with marks and actions |

- **Column split.** 4/4/4 at 1024–1279 px and 4/5/3 from 1280 px. The panel is always 4/12 = 33 %. At 1024 px a 3/12 list broke «Фундамент» mid-word.
- **Order.** DOM order = visual order = Tab order (left → right). No CSS reordering.

### Phone (< 1024 px)
- **Order.** Panel with the main action, then the stage list right under it. After that: issues, people, feed, photos. The model comes last, folded under «Показать дом».
- **No three.js on phones.** The model mounts through `matchMedia`, not `hidden lg:block`, so a phone does not load the three.js chunk unless «Показать дом» is opened. Measured: 0 3D requests at 390 px, 1 at 1024/1440 px.

### 3D model, compact mode (`HouseModel` / `HouseModelBlock` `compact`)
- **Stage card.** Sits under the canvas, not in a 17rem side column.
- **Stage chips stay.** They are the colour legend and the keyboard way to select a stage.
- **No own stage list.** The model's own stage list is left out: the column beside it is the list.

### Stage list as the model's legend (desktop)
- **Colour dot.** Each stage row has a dot in the colour of its lines in the model.
- **Navy ring.** The dot sits on a 3 px ring of `--house-bg`, the background its colour is checked against (≥ 3:1), so light stage colours stay visible on the light theme.
- **Phone.** No dots: the model is folded away there.

### Checks: `node scripts/run-checks.mjs --strict-a11y`, all PASS
lint 0 · build · tests 105/105 · check-tokens 0 · check-contrast 114/0 · check-ru-latin 0 · check-overflow, **now 5 widths (360 / 390 / 768 / 1024 / 1440)**: 32 routes, 320 loads, overflow 0, touch < 48 px 0, text < 17 px 0, theme 0, sticky 0, «Отправить» at 360×553 8/8.

### Critics (`docs/design/06-audit-ovb-*-r{1..4}.md`)
| Critic | r1 | r2 | r3 | r4 |
|---|---|---|---|---|
| «Март» | 0 HIGH / 2 MED | 0 / 0 | 0 / 0 | — |
| «Бригадир» | 0 / 0 | 0 / 0 | — | — |
| «Инвестор» | 0 / 1 | 0 / 1 | 0 / 0 | 0 / 0 |

Stage criterion met for all three: two passes in a row with no HIGH and no MED.

Fixed in review:
- **r1:** the compact model had lost its stage chips (no colour legend, no keyboard selection).
- **r2:** light stage dots were invisible on the light theme.

## Decisions
- **Stage names appear twice on desktop:** in the model's chips and in the list. They do different jobs: the chips select in the model, the list rows open the mark sheet.
- **On desktop the 3D model loads on every visit.** It used to be folded behind «Показать дом».
- **Crossing 1024 px remounts the model.** Rotating a tablet across 1024 px resets the 3D selection.
- **Stage dot colour on unusual stage names (Инвестор r4 LOW).** A stage with an unusual name is coloured by its `sortOrder`. The dot is coloured by the same `stagesToParts()` mapping as the model's lines, so the dot always matches what the model shows.
- **Dot ring on the dark theme (Март r3 LOW).** On the dark theme the navy ring blends into the page; the dot itself stays ≥ 3:1 there.
- **The 3D strings (`src/features/house3d/strings.ts`) are still Russian-only,** as before this PR.

## Waiting for the owner
- **Confirm that variant B is what was meant:** panel 33 % on the left, model in the middle, stages on the right; on a phone, stages under the main action and the model folded at the end.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
