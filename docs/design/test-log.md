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
