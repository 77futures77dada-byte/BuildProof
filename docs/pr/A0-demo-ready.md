# A0 · claude/demo-ready: a reliable demo before 11 November

## What was done

**Project list**
- The warning icon next to «без проблем» is gone. The icon and the amber pill appear only when there are open issues.
- Report status is always a shape plus text:
  - ● «Отчёт сегодня»
  - ○ «Отчёт вчера»
  - ▲ «N дня без отчёта» (2–4 days, amber)
  - ■ «N дней без отчёта» (5 or more, red)
  - ○ «Отчётов пока нет, ждём первый отчёт от <рабочий>». If no worker has access to the site: «…Пригласите рабочего».
- A paused or finished site never turns amber or red.
- **Bug fix:** freshness used to be read from `project_stages.updated_at`, but stages get that timestamp when the project is created. A new site therefore showed «обновлён сегодня». The list and the «Обновлено» tile on the overview now use the latest `stage_history` change or photo.
- The logic is in `src/lib/reportStatus.ts`, with tests.

**Empty states**
- Company with no sites: «Заведите первый объект», three steps and one button, «Создать первый объект». The duplicate button in the header is hidden in this state.
- New site with no reports, for the owner or foreman: «Что дальше», three steps and the main button «Отметить первый этап». Below it is «Отправить ссылку рабочему в WhatsApp», which opens `wa.me` with a ready message, plus «Скопировать текст».
  - The message carries the general sign-in address (`/login`) until Codex ships personal worker links (C3).
- For a client: a short line with no buttons.
- On a new site the «Обновлено» tile shows a grey ring instead of a red dot.

**Sign-up and login**
- Sign-up on the landing is e-mail + password (`signUp`). There is no magic link or code (this branch carries commit `3de8237`, which missed PR #4).
- After sign-up, an account without a company sees «Аккаунт создан. Мы настроим компанию» instead of «Профиль не настроен». The screen has three actions: «Проверить снова», «Выйти» and «← На главную».
- Login page:
  - one line about what the product is
  - «← На главную»
  - «Нет аккаунта? Начать бесплатно», which goes to `/#start` and scrolls to the form
- Supabase errors are translated. «Почта ещё не подтверждена» appears only if Supabase actually returns `email_not_confirmed`, so with confirmation switched off it never shows. Raw English from Supabase no longer reaches the screen.

**Screenshots:** `docs/screens/`, 390×844 and 1440×900. Screens:
- login
- «аккаунт создан»
- empty company
- project list
- site overview
- new site
- stages
- issues
- tariff
- the worker's «Сегодня»
- the worker's issue form with a photo (390 only)

`docs/screens/capture.mjs` takes them from the real app, but the Supabase answers are replaced with demo data inside the browser. No account is needed and nothing goes to the real database. While capturing it also checks two things:
- no horizontal scroll
- no Latin words on the Russian screens

Result: no page errors. The only Latin is «px» in the photo hint, see below.

**Checks:**
- lint: clean
- `tsc -b`: clean
- tests: 38/38
- `ALLOW_PLACEHOLDERS=1 npm run build`: OK

The plain `npm run build` stops on the legal placeholders in the footer (`[номер]`, `[провайдер…]`). This was already the case on main.

## What I set aside

- **Calling the C0 onboarding RPC.** `create_company_and_profile` does not exist yet. I wrote the proposal in `docs/contracts/onboarding.md` and stopped there; the client does not call it.
- **Real-phone check.** I had no iPhone or Android. The 390 px check was in desktop Chrome with phone emulation; findings are below.
- **`buildproof-decisions.md`** is not in the repo or on this machine. I worked from `docs/contracts/reports.md` and the code. Please add the file to the repo.

## Phone 390 px: «Сегодня» and creating an issue with a photo (emulation)

What works:
- «Сегодня»: the big «Отчитаться по этапу» button, task cards with «Начать» / «Завершить», no horizontal scroll.
- The issue form: the photo is attached and the preview shows. The «Заменить» / «Убрать» buttons work.

What does not work or gets in the way:
1. The button says «Создать замечание» and the form «Новое замечание», but the tab is «Проблемы». The UI uses two words for the same thing.
2. The form has 6 fields plus a photo; for a worker on site that is long. Priority, responsible person and deadline could be hidden for the worker, or moved to A1 (the single report).
3. The hint «Фото уменьшается до 1600px…» is technical and has the Latin «px». A worker does not need it.
4. The «Ответственный» placeholder is cut off at 390 px.
5. The photo input has no `capture`. On iPhone the system offers camera or library, which is OK, but it is one extra tap.
6. Not checked: the actual upload over mobile data, the camera on a real phone, and behaviour without signal. Those belong to A1 and the airplane-mode test.

## What remains

- **Codex, C0:** `create_company_and_profile` (see `docs/contracts/onboarding.md`). After that, sign-up goes straight to the empty project list.
- **Supabase:** check that «Confirm email» is off until we have our own SMTP. If it is on, sign-up says «Аккаунт создан, войдите», but sign-in will fail until the user clicks the link in the default Supabase e-mail.
- **Codex, C3:** personal worker links. Then the WhatsApp message carries the worker's own link instead of `/login`.
- **A7:** native-speaker review of the new ET strings (`auth.*`, `onboarding.*`, `reportStatus.*`, `dashboard.empty.*`, `overview.next.*`, `invite.*`). I wrote them, not a native speaker.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
