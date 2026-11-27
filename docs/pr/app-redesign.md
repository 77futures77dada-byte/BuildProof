# A6 · claude/app-redesign: the whole app on one design system

**Base:** `origin/main` at 8f9d2e8 (includes Codex PR #9 with `create_company_and_profile`).
**Size:** 83 commits; `src/` + `scripts/` 139 files, +9134 / −2549. The rest is design docs (`docs/design/`) and screenshots.
**Not touched:** `supabase/`, `api/` (Codex). No new runtime dependencies.

## What was done

### Foundation
- **Design tokens.** One themed root (`#bp-root`, `data-zone="landing|app|field"`), light and dark from `prefers-color-scheme`. Colors and fonts exist only in `src/styles/tokens.css`. See `docs/design/05-ui.md`.
- **Font.** Onest variable, self-hosted. IBM Plex was removed.
- **Shared components** in `src/components/ui/`:
  - Button, StatusIcon, StatusChip, ProjectCard, ReportCard, StageRow, ProgressBar, UnsentBanner
  - Tabs, FormField, EmptyState, UndoBar, StickyActionBar
  - Sheet: with browser history, the system "back" closes it; it is locked for the first 3 s of a send
  - PercentStepper, ConfirmDialog, NetBar, FreshnessChip, Skeleton, Disclosure, FilterChips, PhotoViewer
- **Strict `check-tokens`.** 0 violations and 0 temporary exceptions. The 5 permanent exceptions (3D/WebGL, the landing canvas, `theme-color`) each carry a reason.
- **Texts.** All texts are in `src/i18n/locales/{ru,en,et}.json` and follow `04-copy.md`. There is no Cyrillic in code outside the locales.

### Screens
| Group | Screens |
|---|---|
| Objects and overview | `/dashboard` for every role, create-project form, project shell with role tabs, overview with one main action by role and state, freshness chips, 3D house on desktop only |
| Worker report | `/project/:id/today` camera-first; report sheet (growth −10/+10/+25/100%, decrease mode with reasons); stage picker; stale-draft decision; IndexedDB drafts with an independent send queue and per-draft reason; sign-out with drafts asks first; `?stage=` from «Этапы» preselects the stage |
| Project tabs | Stages (owner/foreman mark sheet `StageMarkSheet`, history), Photos (viewer), Tasks, Issues (forms in sheets), People (`/settings`: last report date, send login code, remove, invite by role), pause / complete / resume confirm, review queue `/review` behind `VITE_REPORT_REVIEW` (off) |
| Sign-in and system | Password sign-in. Code / invite-code / link-error flows behind `VITE_EMAIL_GATE_OPEN` (closed by default). Route by role after sign-in. Tariff, 404, app loading, profile error, «Как вас зовут?» onboarding. Sign-up on the app and landing behind the same gate |

### Mandatory items from `06-audit-stage1-residual.md`, all closed
- **И4-HIGH:** no WhatsApp button and no `InviteWorkerLink → /login`. With the gate closed, day 0 is «Отметить первый этап». `auth.tagline` was rewritten.
- **Б4-HIGH:** the invitation works by code, `verifyOtp({ type: 'invite' })`. The link stays as a fallback with an «Откройте в Safari/Chrome» hint.
- **М4-1, Б4-М4:** sign-up and code flows sit behind the gate. With the gate closed, everything leads to password sign-in.
- **Б4-М5:** «код отправлен» survives a reload (`sessionStorage`). The code field takes 6–10 digits, paste works, and it uses `one-time-code`.
- **Б4-М6:** the owner gets an explicit «Такой почты нет среди ваших людей». The public `/login` gives a neutral reply. A resend before the limit shows a seconds countdown.
- **М4-5:** «Уже работают у вас» lists only worker and foreman.
- **М4-7:** a person's status is «последний отчёт {дата}» or «отчётов ещё нет». After sign-in, routing is by role.
- **Б4-М1:** a decrease with a reason is never changed automatically. It becomes «Не принято: этап уже N%» with a choice.
- **Б4-М2:** drafts are sent independently. A stuck draft does not block the rest, and each draft shows its own reason.
- **Б4-М3:** a confirmed review row stays until its undo window ends, then collapses only when no finger is on the screen. With reduced motion there is no animation.
- **И4-М2:** only «Отметил владелец / Отметил бригадир / Отмечено бригадой» appear until K15.
- **М4-6:** a paused project shows «На паузе» and no «Пришёл отчёт» chip.
- `created_at` was added to `PROJECT_COLUMNS`.

### Checks: `node scripts/run-checks.mjs --strict-a11y`, all PASS (`docs/design/test-log.md`)
| check | result |
|---|---|
| lint (oxlint + check-tokens) | 0 warnings, 0 errors |
| build (fixture Supabase) | PASS |
| test (vitest) | 13 files, 80 tests (drafts queue, decrease rule, double-send guard, route by role, code validation, freshness, `?stage=`) |
| check-tokens | total 0, temporary 0 |
| check-ru-latin | 0 offending |
| check-overflow | 32 routes × 4 widths × 2 schemes: overflow 0, render 0, page errors 0; touch < 48 px: 0; text < 17 px: 0 |
| **report-send (new)** | «Отправить» fully visible and not covered at 360×553 and 390×553, growth and decrease, light and dark: 8/8. Negative test: the button moved off screen gives 8/8 failures. |

The landing `/` is counted separately (`landing_small_*`: 8 targets, 95 texts) until the landing PR.

### Critics
Three independent critics (`docs/design/critics.md`), working from the diff, 4 rounds: `docs/design/06-audit-stage5-*-r{1..4}.md`.

| Critic | r1 | r2 | r3 | r4 |
|---|---|---|---|---|
| «Март» (owner) | 0 HIGH / 8 MED | 0 / 3 | 0 / 0 | — |
| «Бригадир» (field) | 3 HIGH / 6 MED | 0 / 5 | 0 / 0 | 0 / 0 |
| «Инвестор» (trust) | 0 HIGH / 7 MED | 0 / 3 | 0 / 0 | — |

Stage criterion met for all three: two passes in a row with no HIGH and at most 3 MED.

The r1 HIGHs, all fixed with tests where possible:
- a double tap on «Отправить» sent the report twice;
- after a cancelled camera, the next shot overwrote an old draft's photo;
- a draft with a permanent error could be neither opened nor deleted.

### Screenshots
`docs/screens/redesign/<NN-screen>-<light|dark>-<390x844|1440x900>.png`, 33 files. Light at both sizes; dark at 390 for the worker screens (today, report sheet, decrease mode). Script: `docs/screens/redesign/capture.mjs`.

## What I rejected (and why)
- **«Готово 100%» as the button label (critique C8).** The button says «100%». This was decided in `04-copy.md` L1, and «Готово 100%» does not fit a third of the width at 360 px.
- **Statuses «Принято / Ждёт проверки / Проверено».** They are not shown until K15 exists in the database (И4-М2). The review queue is built but hidden behind `VITE_REPORT_REVIEW`.
- **Three verb forms in «Отметил владелец / бригадир», «Отмечено бригадой» (Март r3 LOW 1).** This is intentional: the wording names who set the number, as И4-М2 requires.
- **The 3D house on phones.** It is shown on desktop only. On a phone it pushed the main action down (Март r1).
- **Signed-out visitor with an empty `legal.ts` (Инвестор r3 LOW 3).** They see «подключаем по приглашению» and only «Войти». No contact means no promise we cannot keep.

## What is left (not in this PR)
- **Photos tab.** «Фото» still uploads directly, not through the drafts queue. With bad network a photo from this tab is not kept on the phone.
- **Overview issue links.** An issue on the overview opens the «Проблемы» list, not the exact issue: `IssueCard` has no anchor yet.
- **Report sheet in owner mode.** It is not built. The owner marks stages through `StageMarkSheet` (no camera, no decrease reason, because `update_stage_progress` does not take one).
- **Large-jump line.** The «крупный скачок» line in the overview feed shows only with K15 on and a jump over 25.
- **«На паузе и завершённые» fold.** The dashboard does not fold paused and completed objects when there are ≥ 5 active: there is no key for the shared heading yet.
- **Landing PR.** A separate PR (`claude/landing-v2`). It also lifts the landing exemption from the 17 px text rule.

## Waiting for the owner
- **`src/config/legal.ts` details:** founder name, phone, email, OÜ, registry code, KMKR, hosting, mail provider, analytics, DPA term.
  - Without them every contact line is hidden, and the tariff shows «К объектам» instead of «Написать о продолжении».
  - A build with placeholders fails unless `ALLOW_PLACEHOLDERS=1` is set.
- **Founder photo** and 3 sentences about yourself (landing).
- **Trial period.** From which day it counts (account or object) and how to show the date. What happens on day 31 (data, access, reminder email).
- **Prices.** 29 €/object with a 99 € cap, compared with Skywerk / Fieldwire / Bauhub. Whether to offer a refund guarantee, and its wording.
- **Real numbers** («Уже N объектов») — only if true.
- **WhatsApp «before» screenshots** — only real ones, with written consent from every participant.
- **Your own SMTP** and the Vercel variables for `api/invite.ts`, checked on staging. This opens the email gate (`VITE_EMAIL_GATE_OPEN=true`). The first firms are onboarded by hand.
- **Sign-in paths in embedded browsers.** Check code sign-in and the invitation link inside the Gmail and Outlook in-app browsers.
- **Field tests on a real iPhone:**
  - drafts and auto-retry in airplane mode;
  - the Onest font on the street, in sunlight.
- **Estonian texts.** A native speaker should check them, especially the keys added in this PR.
- **What the client sees.** Only verified items, or accepted plus verified (`decisions.md` vs `reports.md` §4).
- **Activation.** Proposed rule: a firm counts as activated when at least 1 of its objects is activated.
- **Workers added by hand.** Does the founder add workers manually («Хотите начать раньше: {телефон}»)? Until decided, that line is hidden.

## Waiting for Codex
- **K34:** Supabase email templates (sign-in and invitation) with `{{ .Token }}`. The invitation link in `api/invite.ts` should lead to `/login?mode=invite&email=…`; now it leads to `/login`.
- **K15:** in `stage_reports`, the fields `status`, `claimed_percent` and `previous_confirmed_percent`; the RPC `review_stage_report`; the link `photos.report_id`. These switch on `/review` and the statuses «Принято / Проверено».
- **K35:** a pause date in `projects`, needed for «Пришёл отчёт» on paused objects.
- **Server check that an email belongs to this firm.** «Такой почты нет среди ваших людей» now relies on `signInWithOtp(shouldCreateUser:false)` refusing. `profiles` has no email column, so an RPC is needed.
- **`update_stage_progress` with a decrease reason**, for the owner's mark sheet.
- **C3 `worker_links`:** how a worker on iOS gets back tomorrow without a home-screen icon. Today it is a bookmark plus the last email on the device.
- **Staging check:** which error `signInWithOtp` returns for an unknown address, and whether `verifyOtp` tells a wrong code from an expired one.
- **Production build guard.** Block deploys to the main domain while `legal.ts` holds placeholders.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
