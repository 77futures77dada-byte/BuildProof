# claude/links-ui: worker and client links (UI)

**Base:** `claude/overview-b` (density follow-up) + `origin/main` with Codex PR #15 (`codex/worker-client-links`). Merge `claude/overview-b` first; this branch then lands on main without conflicts.
**Contracts:** `docs/contracts/worker-links.md`, `docs/contracts/client-links.md`. `api/` and `supabase/` are not touched.

## What was done
1. **«Ссылки» tab** (`/project/:id/links`, owner only).
   - Worker and client links: a list (name, state, expiry, last use), creation (1–90 days, default 30), and revocation with confirmation.
   - A new link is shown once, then copy / share. The token lives only in memory and is never logged.
   - State is recomputed every minute, so an expired link does not stay «Действует». Offline, the screen says so next to the actions.
   - «Отправить ссылку рабочему» on «Люди» and on the day-0 overview leads here, not to `/login`. Worker links need no email gate.
2. **Client visibility.** Per stage there are «Показывать заказчику» and a separate «Показывать фото»; turning a stage off also hides its photos (`POST /api/client-visibility`).
3. **Owner preview «как заказчик».** It uses `POST /api/client-view` and renders `ClientProjectView`, the same component as the client page.
4. **Review queue.** On by default, because K15 is in the DB (migrations 006/007); `VITE_REPORT_REVIEW=false` turns it off. «Проверить отчёты» is in the project header for owner and foreman, and the owner can confirm.
   - **Bug fixed:** the queue sent `p_decision`, but the RPC takes `p_confirm`, so confirmations never went through.
   - **Link reports:** they show the link's name and do not count as «свои».
5. **Worker page** `/w#t=…` (no account, worker zone, light theme by default).
   - Shows the stages and a report sheet: 1–5 photos (compressed to ≤ 2 MiB each and ≤ 2.8 MiB total, `taken_at` read from EXIF before compression), growth or decrease with a reason.
   - Drafts go through the same IndexedDB queue as the app. States: «Отправляется…», «Сохранено на телефоне, не отправлено», «Отправлено ✓». Retries run, and each error code has its own text.
   - Below the sheet: «Мои последние отчёты».
6. **Client page** `/c#t=…`.
   - Shows only what the API returns (confirmed reports), with the disclaimer «% — ход работ, не основание для оплаты».
   - Empty state: «Владелец пока не открыл этапы».
   - BuildProof support contact when `legal.ts` is filled.
7. **Token safety.**
   - The token travels only in the URL fragment, which never reaches a server. An inline script in `index.html` moves it into memory and clears the address bar before the first paint.
   - It is stored on the device so the page opens again tomorrow and from a bookmark, and it is deleted when the API says the link is invalid. Unsent drafts survive that.
   - `/w` and `/c` set `robots: noindex,nofollow` and `referrer: no-referrer` while open.
   - Probe: the page gets the token, the URL shows `/w`, and no request URL carries the token.

## Checks
`node scripts/run-checks.mjs --strict-a11y`: all PASS.
- lint 0, build, tests 137, check-tokens 0, check-contrast 116/0, check-ru-latin 0.
- check-overflow: 37 routes including links / review / `/w` / `/c` / missing link, with `/api` mocks in `scripts/lib/fixtures-links-*.mjs`; overview-fit 6/6 at 1440×900 and 1366×768.

**Fit trade-off.** The 3D height gave 10 px to the new header controls so the overview still fits on one screen.

## Critics
`docs/design/06-audit-links-r{1..3}.md`: one agent with three roles plus a token-security section.
- r1: 0 HIGH / 12 MED, fixed except the items waiting for Codex.
- r2: 0 HIGH / 0 MED.
- r3: 0 HIGH / 0 MED. Two clean passes in a row.

LOW left for later: a new link can be closed without copying (no confirmation), and the raw report status shows in «Мои последние отчёты».

## Decisions
- **The links tab is separate from «Люди».** A link is not an account: no email, no profile.
- **A new link on the same phone reuses the local draft id,** so unsent drafts from the old link are not orphaned. A stage from another object returns «Этапа больше нет» and waits for the worker.
- **noindex and referrer are meta tags.** Vercel headers would also cover the first response; see below.

## Waiting for Codex
- **`report_count`** in the link `list` response, so each link can show how many reports it has sent.
- **`project_name`** in `GET /api/worker-link-stages`. The worker header shows the worker's name until then.
- **`GET` for client visibility.** The current state comes from the preview plus this device's last choice; the screen says so.
- **`company_name` / contractor contact** in `client-view`. The client page now shows BuildProof support, not the contractor.
- **Optional:** `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer` for `/w` and `/c` in `vercel.json`.

## Waiting for the owner
- **Estonian and English texts.** The `links.*`, `workerLink.*`, `linkPage.*`, `clientView.*`, `house.*` keys were translated by the agents and need a native speaker.
- **Phone check.** The 5-photo sheet on a real 360×640 phone, and the 48 px «×» under each thumbnail.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
