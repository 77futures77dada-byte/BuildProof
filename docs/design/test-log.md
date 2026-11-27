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

## 2026-11-27T09:11:10Z — правки критиков r1

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.17s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 13 passed (13); 80 passed (80) (10s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=168 allowlisted=5 temporary=0 (1s) |
| check-ru-latin | PASS | offending=0 strings=820 (json=541, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (132s) |

## 2026-11-27T09:18:41Z — правки критиков r2

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.23s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 13 passed (13); 80 passed (80) (9s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=169 allowlisted=5 temporary=0 (1s) |
| check-ru-latin | PASS | offending=0 strings=827 (json=548, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (132s) |

## 2026-11-27T09:23:57Z — LOW после r3

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.12s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 13 passed (13); 80 passed (80) (9s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=169 allowlisted=5 temporary=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=819 (json=540, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (133s) |

## 2026-11-27T13:21:27Z — r4 (инлайн): блок черновика, отступ шапки листа

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (3s) |
| build | PASS | built in 1.25s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 13 passed (13); 80 passed (80) (9s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=169 allowlisted=5 temporary=0 (1s) |
| check-ru-latin | PASS | offending=0 strings=819 (json=540, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (140s) |

## 2026-11-27T13:41:57Z — ui-weight-fix: на ступень легче

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.16s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 13 passed (13); 80 passed (80) (9s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=169 allowlisted=5 temporary=0 (1s) |
| check-ru-latin | PASS | offending=0 strings=819 (json=540, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (134s) |

## 2026-11-27T13:56:17Z — navy-theme: токены, переключатель, 3D на токенах

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.16s, VITE_SUPABASE_URL=fixture (18s) |
| test | PASS | 14 passed (14); 84 passed (84) (10s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=171 allowlisted=3 temporary=0 (1s) |
| check-contrast | PASS | pairs=74 failures=0 drift=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=823 (json=544, landing=279) (0s) |
| check-overflow | FAIL | routes=32 loads=256 overflow_failures=24 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 theme_failures=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (131s) |

<details><summary>check-overflow: first lines of the failure</summary>

```
OVERFLOW login /login @360: scrollWidth 477 > 360; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
OVERFLOW login /login @390: scrollWidth 477 > 390; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
OVERFLOW protected-signed-out /dashboard @360: scrollWidth 477 > 360; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
OVERFLOW protected-signed-out /dashboard @390: scrollWidth 477 > 390; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
OVERFLOW not-found /no-such-page @360: scrollWidth 477 > 360; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
OVERFLOW not-found /no-such-page @390: scrollWidth 477 > 390; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
OVERFLOW onboarding (no company) /dashboard @360: scrollWidth 477 > 360; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
OVERFLOW onboarding (no company) /dashboard @390: scrollWidth 477 > 390; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
OVERFLOW not-found signed in /no-such-page @360: scrollWidth 477 > 360; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
OVERFLOW not-found signed in /no-such-page @390: scrollWidth 477 > 390; div.flex.min-h-svh.flex-col > header.flex.items-center.justify-between > div.inline-flex.shrink-0.gap-2 (w 168, right 477)
```
</details>

## 2026-11-27T14:06:34Z — navy-theme: шапка входа с переносом

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (4s) |
| build | PASS | built in 1.76s, VITE_SUPABASE_URL=fixture (26s) |
| test | PASS | 14 passed (14); 84 passed (84) (11s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=171 allowlisted=3 temporary=0 (1s) |
| check-contrast | PASS | pairs=74 failures=0 drift=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=823 (json=544, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 theme_failures=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (138s) |

## 2026-11-27T14:15:21Z — navy r1: правки критиков

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=1 errors=0 (3s) |
| build | PASS | built in 2.08s, VITE_SUPABASE_URL=fixture (23s) |
| test | PASS | 14 passed (14); 105 passed (105) (13s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=171 allowlisted=3 temporary=0 (1s) |
| check-contrast | PASS | pairs=114 failures=0 drift=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=824 (json=545, landing=279) (1s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 theme_failures=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (160s) |

## 2026-11-27T14:24:31Z — navy r2: шапка не закреплена на телефоне, проверка sticky-top

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.13s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 14 passed (14); 105 passed (105) (9s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=171 allowlisted=3 temporary=0 (1s) |
| check-contrast | PASS | pairs=114 failures=0 drift=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=824 (json=545, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 theme_failures=0 send_checks=8 send_failures=0 sticky_failures=0 landing_small_targets=8 landing_small_text=95 (169s) |

## 2026-11-27T14:29:20Z — navy r3: порядок фокуса в шапке

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.24s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 14 passed (14); 105 passed (105) (9s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=171 allowlisted=3 temporary=0 (1s) |
| check-contrast | PASS | pairs=114 failures=0 drift=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=824 (json=545, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 theme_failures=0 send_checks=8 send_failures=0 sticky_failures=0 landing_small_targets=8 landing_small_text=95 (171s) |

## 2026-11-27T13:58:55Z — C K15 and company email

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.39s, VITE_SUPABASE_URL=fixture (17s) |
| test | PASS | 13 passed (13); 80 passed (80) (13s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=169 allowlisted=5 temporary=0 (1s) |
| check-ru-latin | PASS | offending=0 strings=819 (json=540, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (a11y = warnings; --strict-a11y to fail) (151s) |

## 2026-11-27T14:03:56Z — C final before commit

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.89s, VITE_SUPABASE_URL=fixture (26s) |
| test | PASS | 13 passed (13); 80 passed (80) (14s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=169 allowlisted=5 temporary=0 (1s) |
| check-ru-latin | PASS | offending=0 strings=819 (json=540, landing=279) (1s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (a11y = warnings; --strict-a11y to fail) (151s) |

## 2026-11-27T14:14:37Z — C public-domain gate final

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.19s, VITE_SUPABASE_URL=fixture (16s) |
| test | PASS | 13 passed (13); 80 passed (80) (10s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=169 allowlisted=5 temporary=0 (1s) |
| check-ru-latin | PASS | offending=0 strings=819 (json=540, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (a11y = warnings; --strict-a11y to fail) (140s) |

## 2026-11-27T14:41:50Z — C 006 backfill and sequential confirmation

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (4s) |
| build | PASS | built in 2.37s, VITE_SUPABASE_URL=fixture (24s) |
| test | PASS | 13 passed (13); 80 passed (80) (17s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=169 allowlisted=5 temporary=0 (1s) |
| check-ru-latin | PASS | offending=0 strings=819 (json=540, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 send_checks=8 send_failures=0 landing_small_targets=8 landing_small_text=95 (a11y = warnings; --strict-a11y to fail) (183s) |

## 2026-11-27T14:40:06Z — overview-b: панель 33% · 3D · этапы

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (3s) |
| build | PASS | built in 1.20s, VITE_SUPABASE_URL=fixture (20s) |
| test | PASS | 14 passed (14); 105 passed (105) (10s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=172 allowlisted=3 temporary=0 (0s) |
| check-contrast | PASS | pairs=114 failures=0 drift=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=824 (json=545, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=256 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 theme_failures=0 send_checks=8 send_failures=0 sticky_failures=0 landing_small_targets=8 landing_small_text=95 (222s) |

## 2026-11-27T14:49:07Z — overview-b r1: чипы-легенда, точки цвета в списке, ширина 1024

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.34s, VITE_SUPABASE_URL=fixture (17s) |
| test | PASS | 14 passed (14); 105 passed (105) (10s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=172 allowlisted=3 temporary=0 (1s) |
| check-contrast | PASS | pairs=114 failures=0 drift=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=824 (json=545, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=320 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 theme_failures=0 send_checks=8 send_failures=0 sticky_failures=0 landing_small_targets=8 landing_small_text=95 (199s) |

## 2026-11-27T14:53:41Z — overview-b: 4/4/4 до 1279 px

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.43s, VITE_SUPABASE_URL=fixture (17s) |
| test | PASS | 14 passed (14); 105 passed (105) (10s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=172 allowlisted=3 temporary=0 (1s) |
| check-contrast | PASS | pairs=114 failures=0 drift=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=824 (json=545, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=320 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 theme_failures=0 send_checks=8 send_failures=0 sticky_failures=0 landing_small_targets=8 landing_small_text=95 (198s) |

## 2026-11-27T14:59:34Z — overview-b r2: точки с navy-обводкой, только десктоп

| check | result | key numbers |
|---|---|---|
| lint | PASS | warnings=0 errors=0 (2s) |
| build | PASS | built in 1.20s, VITE_SUPABASE_URL=fixture (15s) |
| test | PASS | 14 passed (14); 105 passed (105) (10s) |
| check-tokens | PASS | total=0 hex=0 colorfn=0 font=0 palette=0 small=0 weight=0 base=0 files=0 scanned=172 allowlisted=3 temporary=0 (1s) |
| check-contrast | PASS | pairs=114 failures=0 drift=0 (0s) |
| check-ru-latin | PASS | offending=0 strings=824 (json=545, landing=279) (0s) |
| check-overflow | PASS | routes=32 loads=320 overflow_failures=0 render_failures=0 page_errors=0 a11y_small_targets=0 a11y_small_text=0 theme_failures=0 send_checks=8 send_failures=0 sticky_failures=0 landing_small_targets=8 landing_small_text=95 (194s) |
## 2026-11-27 — worker/client links backend

Изменения проверены в чистой ветке `codex/worker-client-links` от `origin/main` (`64fd2b1`, включает миграцию 006). Ни одна миграция не применялась.

| check | result | details |
|---|---|---|
| `npm run lint` | PASS | без ошибок |
| `ALLOW_PLACEHOLDERS=1 npm run build` | PASS | production build завершён; только предупреждения Vite о размере чанка и смешанном dynamic/static import |
| `npm test` | PASS | 14 файлов, 105 тестов |
| API tests | PASS | 5 тестов: bearer auth, роль, чужой проект, энтропия токена, хэш |
| `git diff --check` | PASS | whitespace проверка чистая |
| pgTAP | NOT RUN | 17 утверждений добавлены в `supabase/tests/worker_client_links.sql`; `psql`, Docker и Supabase CLI недоступны в окружении |

Обзор безопасности выполнен для трёх ролей (взломщик с чужой ссылкой, владелец фирмы, бригадир на объекте), по два прохода на каждый пункт. HIGH: 0, MED: 0 в обоих проходах.

| пункт | проход 1 | проход 2 |
|---|---|---|
| права подтверждения отчётов | HIGH 0 / MED 0 — роль, самоподтверждение и фирменная область проверены в RPC | HIGH 0 / MED 0 — пакетное подтверждение ограничено accepted и порогом проекта; self-review запрещён |
| ссылки рабочих | HIGH 0 / MED 0 — проверены хэш токена, срок, отзыв, лимиты и ограничение project_id | HIGH 0 / MED 0 — повтор запроса идемпотентен, фото и последние отчёты привязаны к конкретной ссылке |
| ссылки заказчиков | HIGH 0 / MED 0 — фильтр status=confirmed и видимость этапа проверены; фото требуют отдельного согласия | HIGH 0 / MED 0 — preview использует ту же RPC-фильтрацию; данные комментариев и соседних фирм не возвращаются |

Ограничение проверки: из-за отсутствия pgTAP runtime выводы по SQL основаны на чтении миграций и тестового сценария, а не на выполнении в PostgreSQL.
