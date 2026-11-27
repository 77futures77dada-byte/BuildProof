# Test log — app redesign

Appended by `node scripts/run-checks.mjs --step "<name>"` after every step (see design-brief §0).
Checks: lint, build (fixture Supabase, `ALLOW_PLACEHOLDERS=1`), test, check-tokens (`--report` until
implementation starts), check-ru-latin, check-overflow (DOM: 360/390/768/1440 × light/dark; a11y counts
are warnings unless `--strict-a11y`).

## 2026-11-25T21:59:55Z — Этап 0 baseline

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.15s, VITE_SUPABASE_URL=fixture (17s) |
| test | PASS | 8 passed (8); 38 passed (38) (9s) |
| check-tokens (report) | REPORT | total=763 hex=290 colorfn=17 font=21 palette=435 files=58 scanned=118 allowlisted=0 (1s) |
| check-ru-latin | FAIL | offending=4 strings=562 (json=283, landing=279) (0s) |
| check-overflow | PASS | routes=31 loads=248 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=203 a11y_small_text=588 (a11y = warnings; --strict-a11y to fail) (124s) |

<details><summary>check-ru-latin: first lines of the failure</summary>

```
src/i18n/locales/ru.json language.et: [Eesti] «Eesti»
src/i18n/locales/ru.json language.en: [English] «English»
src/i18n/locales/ru.json image.canvasUnavailable: [canvas] «Не удалось обработать изображение (canvas недоступен).»
src/features/landing/copy/ru.ts:197: [Push] «Push-уведомление (если страница добавлена на главный экран) и письмо, сразу бригадиру и вам. SMS и Telegram добавим позже, сейчас их не обещаем.»
check-ru-latin: offending=4 strings=562 (json=283, landing=279)
```
</details>

## 2026-11-25T22:04:12Z — Этап 0: харнесс + исправление RU-строк

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.19s, VITE_SUPABASE_URL=fixture (15s) |
| test | PASS | 8 passed (8); 38 passed (38) (9s) |
| check-tokens (report) | REPORT | total=763 hex=290 colorfn=17 font=21 palette=435 files=58 scanned=118 allowlisted=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=562 (json=283, landing=279) (0s) |
| check-overflow | PASS | routes=31 loads=248 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=203 a11y_small_text=588 (a11y = warnings; --strict-a11y to fail) (124s) |

## 2026-11-26T20:05:10Z — UI foundation: fonts (Onest in, Plex out)

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.03s, VITE_SUPABASE_URL=fixture (12s) |
| test | PASS | 8 passed (8); 38 passed (38) (9s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=139 allowlisted=41 temporary=36 (0s) |
| check-ru-latin | PASS | offending=0 strings=562 (json=283, landing=279) (0s) |
| check-overflow | FAIL | routes=31 loads=248 overflow_failures=80 render_failures=0 page_errors=0 a11y_small_targets=191 a11y_small_text=101 (a11y = warnings; --strict-a11y to fail) (123s) |

<details><summary>check-overflow: first lines of the failure</summary>

```
OVERFLOW project overview /project/p1 @360: scrollWidth 394 > 360; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
OVERFLOW project overview /project/p1 @390: scrollWidth 394 > 390; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
OVERFLOW project overview (new) /project/p4 @360: scrollWidth 394 > 360; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
OVERFLOW project overview (new) /project/p4 @390: scrollWidth 394 > 390; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
OVERFLOW project today (gc → overview) /project/p1/today @360: scrollWidth 394 > 360; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
OVERFLOW project today (gc → overview) /project/p1/today @390: scrollWidth 394 > 390; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
OVERFLOW project stages /project/p1/stages @360: scrollWidth 394 > 360; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
OVERFLOW project stages /project/p1/stages @390: scrollWidth 394 > 390; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
OVERFLOW project photos /project/p1/photos @360: scrollWidth 394 > 360; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
OVERFLOW project photos /project/p1/photos @390: scrollWidth 394 > 390; header.bp-nav > div.mx-auto.flex.max-w-5xl > div.flex.items-center.gap-2 (w 246, right 394)
```
</details>

## 2026-11-26T20:11:19Z — UI foundation: tokens, theme root, strict check-tokens

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.04s, VITE_SUPABASE_URL=fixture (13s) |
| test | PASS | 8 passed (8); 38 passed (38) (8s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=129 allowlisted=41 temporary=36 (0s) |
| check-ru-latin | PASS | offending=0 strings=562 (json=283, landing=279) (0s) |
| check-overflow | PASS | routes=31 loads=248 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=191 a11y_small_text=101 (a11y = warnings; --strict-a11y to fail) (116s) |

## 2026-11-26T20:14:20Z — UI foundation: shared components

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.08s, VITE_SUPABASE_URL=fixture (13s) |
| test | PASS | 9 passed (9); 40 passed (40) (8s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=139 allowlisted=41 temporary=36 (0s) |
| check-ru-latin | PASS | offending=0 strings=562 (json=283, landing=279) (0s) |
| check-overflow | PASS | routes=31 loads=248 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=191 a11y_small_text=101 (a11y = warnings; --strict-a11y to fail) (118s) |

## 2026-11-26T20:16:55Z — UI foundation: 05-ui.md

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (3s) |
| build | PASS | built in 1.01s, VITE_SUPABASE_URL=fixture (14s) |
| test | PASS | 9 passed (9); 40 passed (40) (8s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=139 allowlisted=41 temporary=36 (0s) |
| check-ru-latin | PASS | offending=0 strings=562 (json=283, landing=279) (0s) |
| check-overflow | PASS | routes=31 loads=248 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=191 a11y_small_text=101 (a11y = warnings; --strict-a11y to fail) (119s) |

## 2026-11-26T20:21:25Z — Тексты: 04-copy → locales

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.05s, VITE_SUPABASE_URL=fixture (13s) |
| test | PASS | 9 passed (9); 40 passed (40) (8s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=139 allowlisted=41 temporary=36 (0s) |
| check-ru-latin | PASS | offending=0 strings=801 (json=522, landing=279) (0s) |
| check-overflow | FAIL | routes=31 loads=248 overflow_failures=0 render_failures=2 page_errors=1 a11y_small_targets=191 a11y_small_text=101 (a11y = warnings; --strict-a11y to fail) (6983s) |

<details><summary>check-overflow: first lines of the failure</summary>

```
RENDER project settings /project/p1/settings @1440 dark: root text 0 chars, final path /project/p1/settings
ERROR project settings /project/p1/settings: pageerror: Failed to fetch dynamically imported module: http://127.0.0.1:4390/assets/App-DzPbowl1.js
RENDER not-found signed in /no-such-page @1440 dark: page.goto: net::ERR_NETWORK_IO_SUSPENDED at http://127.0.0.1:4390/no-such-page
check-overflow: routes=31 loads=248 overflow_failures=0 render_failures=2 page_errors=1 a11y_small_targets=191 a11y_small_text=101 (a11y = warnings; --strict-a11y to fail)
```
</details>

## 2026-11-27 — повтор check-overflow после шага «Тексты»

Предыдущий FAIL (render_failures=2, page_errors=1, ERR_NETWORK_IO_SUSPENDED, 6983 s) — машина уходила в сон. Повтор: PASS — routes=31 loads=248 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=191 a11y_small_text=101.


## 2026-11-27T08:46:50Z — слияние 4 групп, без legacy-bridge

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.22s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 12 passed (12); 75 passed (75) (9s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=167 allowlisted=5 temporary=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=813 (json=534, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=8 a11y_small_text=95 (a11y = warnings; --strict-a11y to fail) (123s) |

## 2026-11-27T08:57:21Z — 4 группы слиты; legacy-bridge удалён; проверка «Отправить» 360×553

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.19s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 12 passed (12); 75 passed (75) (9s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=167 allowlisted=5 temporary=0 (1s) |
| check-ru-latin | PASS | offending=0 strings=813 (json=534, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (131s) |
