# House model: interactive checks

Captured with `node docs/house3d/capture.mjs` against the Vite dev server (`/dev/house-3d`, dev builds only, local fixture, zero Supabase requests). Headless Chromium from the Playwright cache, Playwright Core 1.56.1, WebGL via `--use-gl=angle --use-angle=swiftshader` (renderer reported: *ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))*). Fixture: Фундамент 100, Каркас 60, Кровля 30, Окна 50, Электрика 25, Сантехника 50, Отделка 0. Screenshots show only the model section.

## Screenshots (390 × 844 and 1280 × 900)

| File | State |
| --- | --- |
| `*-1-default.png` | Nothing selected: one colour per stage; finished parts bright with glow, the rest a ghost of the same colour |
| `*-2-windows-mid.png` | Окна selected, ~330 ms in: camera turning, other stages dimming, windows growing |
| `*-3-windows-end.png` | Окна after the transition: windows/door pushed 1.3 m out of their walls, card "окон и дверей: 8 из 17" |
| `*-4-roof.png` | Кровля: view from above, roof lifted 1.3 m, 30% built from the eaves up |
| `*-5-electric.png` | Электрика: interior view, 4 of 16 cable runs lit, nothing pulled out |
| `*-6-all-complete.png` | All seven stages at 100%: white contour glow around the house |
| `*-7-reduced-motion-windows.png` | System `prefers-reduced-motion: reduce`, Окна selected: dimming and camera applied instantly, no slide-out |
| `desktop-8-playback.png` | "Проиграть стройку" at 2.6 s: caption shows the current stage |

## Interaction checks (same script)

- tap in the middle of the house → Окна selected; tap in an empty corner → selection cleared
- Enter on a focused list row selects it (`aria-pressed=true`), Enter again deselects, Esc clears
- playback shows the stage caption; a click anywhere stops it and restores the final state

## Renderer lifecycle

20 mount/unmount cycles: every reading `geometries=68, textures=0, programs=5`; 21 contexts created (20 cycles + the initial mount), 0 alive afterwards.

## Bundle (gzip, `vite build`)

| Chunk | `codex/house-3d-polish` | this branch | Δ |
| --- | ---: | ---: | ---: |
| `index` (entry) | 60.75 KB | 60.75 KB | 0 |
| `App` | 17.65 KB | 17.65 KB | 0 |
| `AuthenticatedRoutes` (includes Обзор) | 73.30 KB | 74.50 KB | +1.20 KB |
| CSS | 6.84 KB | 7.42 KB | +0.58 KB |
| **Initial path for the Обзор page** | 158.54 KB | 160.32 KB | **+1.78 KB** |
| `HouseModel` (lazy, Three.js) | 130.26 KB | 134.60 KB | +4.34 KB |
