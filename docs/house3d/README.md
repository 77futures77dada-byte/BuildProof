# House model browser checks

Captured at 390 × 844 CSS pixels in headless Microsoft Edge Chromium 155 with Playwright Core 1.56.1 and SwiftShader (`--use-gl=swiftshader --enable-unsafe-swiftshader`). The `/dev/house-3d` page is development-only and uses a clearly labelled local fixture; it does not query Supabase.

## Screenshots

- `all-zero.png` — all seven fixture stages are 0%; the house parts appear as faint blueprint ghosts.
- `mixed-progress.png` — foundation 100%, frame 60%, windows 50%, other visible fixture stages 0%; completed foundation and windows are bright while the frame is partially raised.
- `all-complete.png` — all fixture stages are 100%; completed edges are white and have a wider static additive glow layer.

## Renderer lifecycle

The dev page's **mount/unmount ×20** control was run in a fresh headless page. `renderer.info.memory` and the program count were sampled in cleanup; the canvas contexts were tracked and checked after `dispose()` and `forceContextLoss()`.

| Cycles | Geometries | Textures | Programs | Live WebGL contexts after unmount |
| --- | ---: | ---: | ---: | ---: |
| 1–20 (each cycle) | 41 | 0 | 2 | 0 |

The harness observed 20 created context objects and 0 live contexts after the final cycle. All twenty renderer readings were identical. The headless page made zero Supabase requests.

## Production bundle comparison

Both builds used Vite 8.2.2 and the same project dependency lock for the comparison. The `main` build was made in a clean detached worktree at the base commit. The feature build's first-render path includes the Vite entry chunk and the public app-shell chunk triggered immediately by the root lazy import.

| Build | Entry chunk gzip | App shell gzip | First-render JS gzip | Change vs main |
| --- | ---: | ---: | ---: | ---: |
| `main` | 75.02 KB | included | 75.02 KB | — |
| `codex/house-3d` | 60.75 KB | 17.65 KB | 78.40 KB | +3.38 KB |

The increase is below the 10 KB limit. The authenticated routes (73.29 KB gzip) and HouseModel (129.99 KB gzip, including Three.js) are separate async chunks. The production output contains no dev-page chunk.

Recreate the screenshots and lifecycle log with the Vite dev server running:

```sh
npm run dev -- --host 127.0.0.1
node docs/house3d/capture.mjs
```
