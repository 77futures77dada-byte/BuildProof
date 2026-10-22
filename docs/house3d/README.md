# House model browser checks

Captured at 390 × 844 CSS pixels in headless Microsoft Edge Chromium 155 with Playwright Core 1.56.1 and SwiftShader (`--use-gl=swiftshader --enable-unsafe-swiftshader`). The `/dev/house-3d` route is included only in dev builds and renders a local fixture without Supabase requests.

## Geometry and screenshots

The wireframe body is 10 × 7 m with 6 m walls, a 10.6 × 0.4 × 7.6 m slab, two 3 m floors, and a gable roof with a 2.8 m ridge rise and 0.5 m eaves. Windows and the centered 1 × 2.1 m door are placed in the wall planes. The 25° camera is fitted to the full envelope and can switch to an end view.

- `all-zero.png` — every stage is 0%. The body, roof, windows, and door remain visible as faint blueprint lines; the silhouette reads as a two-storey gable house.
- `mixed-roof-30.png` — foundation 100%, frame 60%, roof 30%, windows 50%, plumbing 50%, other stages 0%. Completed details are white, unfinished details are amber, and untouched geometry stays faint blue.
- `all-complete.png` — every stage is 100%. The exterior and gable are clear and bright, with static white additive edge glow. The combined interior frame, electrical routes, and finish seams make the completed wireframe intentionally dense.
- `end-view.png` — all stages 100%, viewed from the gable end. The triangular roof and centered end-wall window are visible; the roof slopes meet the wall top at y=6.

The new geometry tests check the overall dimensions, window and door bounds and wall planes, window and door sizes, electrical/roof bounds, and roof support points at y=6.

The model and legend share `HOUSE_COLORS`: completed is white with additive glow, in-progress is amber, and untouched geometry is pale blue at 0.12 opacity. At partial percentages, completed segments remain white while the rest of that part is amber. Geometry tests also enforce that every generated vertex stays inside the declared model bounds.

The stage mapper follows the confirmed seven-stage catalogue (sort order 1–7). Unknown stages stay visible by their received name but do not drive any model geometry. Plumbing includes stacked risers, horizontal kitchen/bath branches, and outlet marks on both floors; the visible segment count follows the stage percentage.

## Renderer lifecycle

The dev page's **mount/unmount ×20** control was run in headless Chromium. Each unmount samples `renderer.info.memory` and `renderer.info.programs`, calls `dispose()` and `forceContextLoss()`, and checks tracked contexts.

| Cycles | Geometries | Textures | Programs | Live WebGL contexts after unmount |
| --- | ---: | ---: | ---: | ---: |
| 1–20 (each cycle) | 9 | 0 | 2 | 0 |

All 20 readings were identical. Twenty context objects were created, none remained live after unmount, and the dev page made zero Supabase requests.

## Production bundle

Vite 8.2.2 with the same lockfile. The clean `main` baseline was measured in a detached worktree. The current feature build keeps Three.js in the separate lazy `HouseModel` chunk.

| Build | Main entry gzip | App shell gzip | Initial path gzip | Main entry change vs `main` |
| --- | ---: | ---: | ---: | ---: |
| `main` baseline | 75.02 KB | included | 75.02 KB | — |
| `codex/house-3d` after geometry fix | 60.75 KB | 17.64 KB | 78.39 KB | −14.27 KB |

The main entry is smaller than baseline. Including the separately loaded app shell, the initial path is +3.37 KB, within the 10 KB limit. The authenticated routes are a separate async chunk (73.28 KB gzip); `HouseModel` and Three.js are also async (130.02 KB gzip). The dev page is absent from production output.

Recreate the screenshots and lifecycle log with the Vite dev server running:

```sh
npm run dev -- --host 127.0.0.1
node docs/house3d/capture.mjs
```
