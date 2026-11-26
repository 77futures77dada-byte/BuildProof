# Редизайн приложения — где остановились (2026-11-26)

Ветка `claude/app-redesign`, worktree `C:\Users\eesti\Desktop\Buildproof-claude-redesign`.
Источник решений — `design-brief.md` (приоритет: residual > brief > 01 > 03). Значки — только `02-type.md` §8.

## Готово
- Этап 0: `00-inventory.md`, проверки `scripts/run-checks.mjs` (lint, build, test, check-tokens, check-ru-latin, check-overflow) → `test-log.md`.
- Этап 1 (4 цикла, остаток `06-audit-stage1-residual.md`), этап 2 (закрыт, `06-audit-stage2-final-r4.md`), этапы 3+4 (закрыты, `06-audit-stage34-r4.md`).
- Этап 5 «основа»: см. последние коммиты `feat(ui)` / `chore(fonts)` и `05-ui.md` §«Миграция» (временные исключения check-tokens по файлам).

## Дальше (по порядку)
1. Если основа не доделана — доделать по `05-ui.md` до зелёного `node scripts/run-checks.mjs`.
2. Перенести `04-copy.md` в `src/i18n/locales/{ru,en,et}.json` одним шагом (новые, изменённые, удалённые ключи; ET с пометкой в 04).
3. Экраны параллельно (у каждого агента свои файлы, каждый снимает свои временные исключения из `scripts/check-tokens.allow.json`):
   а) `Dashboard`, `ProjectDashboard`/обзор, карточки;
   б) `Today` рабочего + лист отчёта + черновики IndexedDB (01 §3.4, brief §2.1б п.4, §2.5 режим «Снижение»);
   в) очередь проверки, `Issues`, `Photos`, `Tasks`, `Stages`, вид заказчика;
   г) `Login` (пароль / код / код приглашения / otp_expired, за флагом `VITE_EMAIL_GATE_OPEN`), `Tariff`, `NotFound`, `ProfileNotConfigured`, онбординг.
   Обязательные пункты: `06-audit-stage1-residual.md` «Закрываем на реализации».
4. Добавить в `check-overflow.mjs` DOM-проверку: «Отправить» видна на 360×553 (рост и снижение), `--strict-a11y` (касания ≥ 48, текст ≥ 17) должен быть зелёным.
5. Финал: 0 временных исключений, все проверки зелёные, три критика по коду/DOM (Sonnet, по diff), таблица разбора внешней критики (`critique-table.md`), PR-описание + список «ждёт владельца» (brief §3).
6. Потом PR лендинга `claude/landing-v2` по `docs/design-inputs/claude-code-landing-rewrite-v2-prompt (1).md`.

## Экономия лимита
Критики и правка документов — Sonnet, только diff. Opus — только для кода. Коммиты — только явными путями (в worktree одновременно работают агенты).
