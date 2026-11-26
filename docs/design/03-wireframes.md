# 03 — Каркасы экранов (роль: UX-проектировщик)

Редакция 2 от 2026-11-26: правки по `06-audit-stage34-{mart,foreman,investor}-r1.md` (метки [М-Hn], [М-Mn], [Б-Hn], [Б-Mn], [И-Hn], [И-Mn], LOW — [М-Ln], [И-Ln]) и решениям оркестратора (бриф §2.3, §2.4, решения 1–14 раунда 3+4 r1 — [О34-n]).
Машиночитаемая версия: `docs/design/03-screens.json` (тот же набор `id`; UI-этап сверяет покрытие по нему).

Источники: `design-brief.md`, `00-inventory.md`, `01-business-flow.md` ред. 4, `06-audit-stage1-residual.md`, `02-type.md` §6–§8, `docs/contracts/reports.md`, `docs/contracts/client-links.md`, `04-copy.md`, код `src/pages`, `src/components` на `8f9d2e8`.
Приоритет при расхождении (бриф §2.3): residual > бриф > 01 > 03. Формы значков — только `02-type.md` §8.

Тексты здесь — **рабочие подписи**, не финальная копия. Где нужен текст, стоит ключ `copy:<ключ>`. **Имена ключей — из `04-copy.md`** (он главный для имён). Ключи со `*` в 04 пока нет: они перечислены в §12 для автора текстов.

---

## 0. Общие правила для всех экранов

### 0.1 Жёсткие ограничения (проверяются на UI-этапе)

| # | Правило | Как проверяем |
|---|---|---|
| Ж1 | Касание ≥ 48 × 48 px у всего, что нажимается (ссылки, чипы-фильтры, вкладки, переключатели, «⋯», «Закрыть»). Главная кнопка ≥ 56 px. Между соседними целями ≥ 8 px; кнопки % — ≥ 12 px; «Подтвердить»/«Вернуть» — ≥ 16 px | DOM: `getBoundingClientRect` всех `a, button, [role=button], input, select, summary, label[for]` |
| Ж2 | Текст ≥ 17 px по таблице ролей `02-type.md` §6.1. На маршрутах рабочего и бригадира вес 400 запрещён; цифры ≥ 600. `--muted` и вес 400 — только длинный текст владельца на ≥ 1024 px | computed style |
| Ж3 | Статус = SVG-значок + слово. Цвет никогда не единственный признак. Символы `○ ✓ → ● ✗ ▲` в строках интерфейса запрещены (regex `02-type.md` §8). Латиница в RU — только из allowlist (`BuildProof`, единицы) | `check-ru-latin` + regex по `src/**` |
| Ж4 | Одна главная (жёлтая, `--accent`) кнопка на экран или ни одной. Двух жёлтых блоков подряд нет. Плашка «не отправлено» — свой токен `--unsent-*`, не жёлтый | DOM: счёт `[data-main]` ≤ 1 в видимой области |
| Ж5 | Лист отчёта: sticky «Отправить» видна, и **ни один нужный для отправки элемент (кнопки %, причины снижения, «Сменить», подпись неактивной кнопки) не оказывается под ней** на **360 × 560** и **375 × 553** (видимая область с панелями браузера) во всех состояниях: без изменений, рост, снижение с причинами, пауза, черновики, режим владельца [О34-4, Б-M9] | Playwright, 2 размера × 6 состояний; у каждого нужного элемента `bottom` ≤ `top` кнопки |
| Ж6 | Нет горизонтального скролла страницы на 360, 390, 768, 1024, 1440. Внутренний скролл полосы вкладок владельца и строки чипов-фильтров разрешён. Этап на 30 знаков не ломает строки | `scripts/check-overflow.mjs` + фикстура длинного этапа |
| Ж7 | Тема одна: токены на `:root` (`tokens.css`), тёмная по системе + `data-theme`. Ни один экран, лист или модалка не выпадает из темы. Внешние точки шва — `/` и `/#start` — проверяются тем же сравнением [М-L5] | computed `--bg`/`font-family` по всем `id` |
| Ж8 | **Все модалки, листы и диалоги рендерятся внутри корня темы.** Портал `Modal` монтируется в контейнер `#bp-portal` внутри корня с токенами (или токены на `:root`, тогда портал в `body` наследует их). Оверлей — токен `--scrim`. Фокус уходит в диалог и возвращается на кнопку-источник; `Esc` и «Закрыть» (≥ 48 px) — всегда, кроме первых 3 с отправки (§6.2) | DOM: у `[role=dialog]` computed `font-family` = Onest, `color` = `--fg` |
| Ж9 | Тупиков нет: у каждого экрана есть путь вперёд и путь назад. **Ни одно действие не ведёт на пустую страницу** (например, «Люди» без людей и без формы) и **на страницу, закрытую для роли** [О34-1, О34-2] | §1 + `03-screens.json` (`navigatesTo` × `roles`) |
| Ж10 | Загрузка без пустого экрана: `Suspense fallback={null}` заменяется на `app-loading` | DOM |

### 0.2 Словарь состояний (одинаков в `.md` и `.json`)

| id состояния | Что значит | Как выглядит |
|---|---|---|
| `loading` | данные грузятся | скелет блоков в будущих размерах, без прыжков |
| `error` | запрос не прошёл (не сеть) | `ErrorBlock`: SVG `stale` + текст + «Попробовать ещё раз» (вторичная). Текст сервера не показываем |
| `offline` | `navigator.onLine === false` | полоса `NetBar` вверху: `copy:common.offline*` «Нет сети». **Слова «нет сети» — только здесь**, не в состояниях отправки [Б-H1]. Данные на экране остаются. Отправка форм неактивна с подписью, кроме листа отчёта (он пишет черновик) |
| `empty` | данных нет, и это нормально | `EmptyState`: что здесь будет + следующее действие **и кто может его сделать сегодня** (при `gate-closed` — только владелец/бригадир) [М-M3] |
| `day0` | у объекта **нет ни одной отметки и ни одного отчёта** (ни `stage_history`, ни `stage_reports`, ни фото к этапу) [М-H1] | см. §5.1 |
| `self-marked` | `gate-closed`; есть отметки владельца/бригадира (`update_stage_progress`), отчётов рабочих нет [О34-1] | свежесть считается по последней отметке; чип `copy:reportStatus.markedByOwner*` «Отметил владелец {дата}» / `copy:reportStatus.markedByForeman*` «Отметил бригадир {дата}» |
| `has-reports` | есть отчёты рабочих | свежесть по последнему отчёту или отметке (что позже) |
| `stale-3plus` | 3+ дня без отчёта **и без отметки** | см. §5.1; главное зависит от шлюза и роли |
| `no-reports` | у этапа/человека нет ни одного отчёта | значок `none` (пунктирное кольцо, бриф §2.3 П10) + текст. Не красный |
| `marked` | значение поставлено, никто его не проверял. **До K15 — единственный статус отчёта** [О34-3] | чип без значка `ok`: автор `gc` → «Отметил владелец» (`copy:status.markedByOwner*`), `foreman` → «Отметил бригадир» (`copy:status.markedByForeman*`), `worker` → «Отмечено бригадой» (`copy:status.markedByCrew`) |
| `accepted` | **K15**: отчёт засчитан без проверки (≤ 25 п.) | чип «Принято» `copy:status.accepted` |
| `pending` | **K15**: скачок > 25, ждёт проверки | SVG `pending` + `copy:status.pending`. До K15 у скачка **нет особого сообщения** нигде, кроме нейтральной строки ленты `copy:activity.bigJump` [О34-3] |
| `confirmed` | **K15/K32**: проверено вторым человеком | SVG `ok` + «Проверено» `copy:status.verified`. **До K15 слово «Проверено» не выводится нигде** (бриф §2.4) |
| `rejected` | **K15**: отчёт вернули | SVG `rejected` + `copy:status.returned*` «Вернули: {причина}» — видит и рабочий [О34-7] |
| `unsent` | есть черновики `queued`/`unknown` | `UnsentBanner` вместо главной кнопки (`02-type.md` §6.2) |
| `stale-draft` | черновик устарел | карточка решения в листе (§6.4) |
| `paused` | `projects.status = paused` | чип «На паузе» (SVG `paused`), без цвета свежести, объект ниже активных. Чипа «Пришёл отчёт» нет до K35 |
| `completed` | `projects.status = completed` | чип «Завершён» (SVG `done-flag`), ниже паузы |
| `gate-closed` | `VITE_EMAIL_GATE_OPEN` ≠ `true` (**сборка сегодня**) | нет «Пригласить», «Войти по коду», «Забыли пароль?», «Отправить код входа», регистрации; нет «Никто не приглашён»; нет «Кто молчит» |
| `gate-open` | флаг включён. **Включается только после 7 пунктов 01 §0.3 и закрытия K34: шаблоны писем приглашения и входа с `{{ .Token }}` проверены на стенде** [И-M1] | эти кнопки есть |
| `legal-empty` / `legal-filled` | `src/config/legal.ts` пуст / заполнен | контакт и «Написать о продолжении» — только при `legal-filled`; иначе блок скрыт целиком. **В продакшене `legal-empty` невозможен:** prebuild `scripts/check-placeholders.mjs` валит сборку без `ALLOW_PLACEHOLDERS=1`. Тупик «шлюз закрыт × legal пуст» на входе (нет восстановления пароля и нет контакта) — **блокер выпуска**, а не состояние продукта [О34-14, М-H4] |
| `k15-off` / `k15-on` | флаг сборки на статусы отчётов (предложение `VITE_REPORT_REVIEW`) | `marked` против `accepted`/`pending`/`confirmed`/`rejected`; очередь проверки скрыта при `k15-off` |

### 0.3 Сетка

- **Мобильный (база 390, проверка 360):** одна колонка, поля 16 px, контент 358 (328 на 360). Шапка 56 px. Sticky-кнопки учитывают `env(safe-area-inset-bottom)` (до 34 px).
- **Планшет 768:** одна колонка, `max-width: 720`.
- **Десктоп ≥ 1024:** контейнер 1120; список объектов — строки-таблица; обзор — две колонки 7/5; листы — диалог `max-width: 560`, высота ≤ 90 vh.
- **1440:** тот же контейнер 1120 по центру.

---

## 1. Карта навигации

```
/  (лендинг, отдельный PR)
 ├─ «Войти» ─────────────────────────────► /login
 └─ #start регистрация (только шлюз+) ──► /dashboard

/login  [login-password | login-code-request | login-code-enter | login-invite-code | login-link-error]
 └─ сессия ─► маршрут по роли (residual М4-7):
       gc ─────────────► /dashboard
       foreman/client ─► /dashboard (1 объект → /project/:id)
       worker ─────────► 1 объект → /project/:id/today; иначе /dashboard
       профиля нет ────► создание компании на /dashboard → ошибка → profile-not-configured

/dashboard (gc) ─ карточка ─► /project/:id
              ├─ «Создать объект» ─► create-project ─► /project/:id (day0)
              ├─ «Тариф» (шапка, только gc) ─► /tariff ─► «К объектам»
              └─ «Проверить N» (k15-on) ─► /review

/project/:id (шапка: логотип = «К объектам», вкладки)
 ├─ Обзор ── «Отметить этап» ─► report-sheet (режим владельца/бригадира)
 │        ├─ шлюз+, gc: «Пригласить рабочего» ─► /project/:id/settings#invite («Люди»)
 │        ├─ шлюз+, gc, 3+ дня: «Кто молчит 3+ дня» ─► /project/:id/settings?focus=silent
 │        ├─ «Открыть последний отчёт» (автор ≠ я) ─► photo-viewer
 │        └─ «⋯» (gc) ─► project-status-confirm
 ├─ Этапы ── «Отметить» ─► report-sheet
 ├─ Фото ─── «Сфотографировать» ─► камера ─► report-sheet; плитка ─► photo-viewer
 ├─ Задачи ─ «Новая задача» ─► task-form; «Готово» с этапом ─► report-sheet
 ├─ Проблемы ─ «Сообщить о проблеме» ─► issue-form; фото ─► issue-photo-zoom
 └─ Люди (только gc, маршрут /settings) ─ «Добавить на объект», «Пригласить» (шлюз+), «Отправить код входа» (шлюз+)

/project/:id/today (worker) ─ «Сфотографировать» ─► камера ─► report-sheet ─► today
                           ├─ «Другой этап» ─► stage-picker ─► камера ─► report-sheet
                           └─ плашка «не отправлено» ─ «Отправить снова»

/review (k15-on) ─ «Подтвердить» / «Вернуть» ─► UndoBar «Отменить (N)» ─ уход/скрытие ─► отправка
*  (404) ─► сессия есть: /dashboard; нет: /login и «/»
```

Правила:
- **Бригадир никогда не попадает на «Люди» (`/settings`)**: вкладки нет, ни одна его кнопка туда не ведёт; прямой заход → обзор [О34-2, М-H2].
- **Ни одна кнопка не ведёт на «Люди», если там пусто и действовать нечем.** При `gate-closed` переход на «Люди» с обзора есть, только если в блоке «Уже работают у вас» кто-то есть [О34-1].
- «Назад»: в оболочке проекта — логотип/«К объектам»; у рабочего с одним объектом логотип ведёт на `today`. Лист и модалка закрываются «Закрыть»/`Esc`/системной «назад» (лист пишет запись в `history`). Закрытый лист со снимком не теряет снимок: черновик `editing` уже записан.

---

## 2. Оболочки

### 2.1 `shell-app` — шапка вне объекта (`/dashboard`, `/tariff`, `/review`)

Блоки: логотип (ссылка на `/dashboard`, ≥ 48 px) · «Тариф» (**только gc**; у остальных ссылки нет; `/tariff` для не-gc → `/dashboard`) [О34-12] · язык (≥ 48 px) · «Выйти».
- «Выйти» при своих черновиках → `signout-drafts-confirm`.
- Имя и роль — на ≥ 1024 справа от логотипа. Роли: «Владелец / Бригадир / Рабочий / Заказчик» (`copy:roles.*`).

### 2.2 `shell-project` — оболочка `/project/:id/*`

Блоки:
1. Шапка: логотип/«К объектам» · язык · «Выйти».
2. Название объекта (22–28 px) + чип статуса, если не «активный». Адрес — 17 px.
3. Вкладки:
   - **gc:** Обзор · Этапы · Фото · Задачи · Проблемы · Люди (маршрут остаётся `/project/:id/settings`, бриф §2.3 В2);
   - **foreman:** Обзор · Этапы · Фото · Задачи · Проблемы;
   - **client:** как сейчас — Обзор · Этапы · Фото · Задачи · Проблемы, без действий (бриф §2.3 В3);
   - **worker:** Сегодня · Этапы · Фото · Проблемы, растянуты.
   Вкладка 17/600, ≥ 48 px, активная — `--fg` + полоса 3 px. У владельца на 360 полоса скроллится внутри себя, активная прокручивается в видимую область, справа градиент-намёк.
4. Контент.

Состояния: `loading` (вкладки видны сразу), `error` («Нет доступа к объекту» + «К объектам»), `paused`, `completed`. Тёмная тема одинакова на всех вкладках (`data-skin-dark` уходит).

---

## 3. Вход и системные экраны

### 3.1 `login-password` — `/login`
- **Главная:** «Войти» `copy:common.signIn`.
- **Блоки (390):**
  1. Логотип + строка о продукте по шлюзу: `gate-closed` — `copy:auth.tagline` в формулировке без рабочих («Ход работ по этапам: проценты, фото и история изменений…»); `gate-open` — `copy:auth.taglineOpen*` («…от ваших рабочих») [М-H3, И-M13].
  2. «Почта» `copy:auth.email`, `autocomplete=email`, `inputmode=email`, 56 px.
  3. «Пароль», показать/скрыть (≥ 48 px).
  4. Ошибка под полями (17/600, SVG `stale`).
  5. **Главная «Войти».**
  6. `gate-open`: `copy:auth.signInWithCode` → `login-code-request`; `copy:auth.forgotPassword` → `login-code-request` (режим сброса). `gate-closed`: `copy:auth.recoveryLater` + `copy:common.contactPhone*` / `copy:common.contactEmail*` (каждая часть — только если заполнена) [М-L6].
  7. `gate-open`: `copy:auth.haveInviteCode` → `login-invite-code`.
  8. Черновики на устройстве: `copy:auth.draftsWaiting_*` («N отчётов ждут отправки. Войдите, и они уйдут») [М-L3].
  9. Низ: `gate-open` — `copy:auth.startFree` → `/#start`; `gate-closed` — `copy:auth.signupLater` + контакт при `legal-filled`. `copy:auth.backHome` (≥ 48), язык.
- **Десктоп:** карточка 420 px по центру.
- **Состояния:** `loading`, `submitting`, `error-credentials` (`copy:auth.invalidCredentials`), `error-not-confirmed`, `error-rate`, `offline`, `gate-closed`, `gate-open`, `drafts-waiting`, `legal-filled`, `hash-error` (`#error=` → `login-link-error`). `legal-empty` — только dev-сборка (§0.2).
- **Навигация:** из лендинга, 404, `ProtectedRoute` (сохраняем `from`), выхода. Вперёд — маршрут по роли. Назад — «На главную».

### 3.2 `login-code-request` — `/login?mode=code` (`gate-open`)
- **Главная:** `copy:auth.sendCodeTo` «Прислать код на p•••@gmail.com» (почта в `bp:lastEmail`) или `copy:auth.sendCode`.
- **Блоки:** заголовок (вход / `copy:auth.resetTitle*` в режиме сброса) · маска почты + `copy:auth.otherEmail` / поле «Почта» · главная · `copy:auth.signInPassword` · строка черновиков.
- **Состояния (01 §0.3):** `sending`; `sent` → `login-code-enter`; `rate-address` `copy:auth.retryAfter` (отсчёт); `rate-project` `copy:auth.projectLimit`; `unknown-address` — нейтрально `copy:auth.neutralSent` и переход к вводу кода; `offline`/`error` `copy:auth.sendFailed`.

### 3.3 `login-code-enter` — `/login?mode=code&step=enter`
- **Главная:** `copy:auth.signInWithCodeSubmit`.
- **Блоки:** `copy:auth.codeSent` · поле `copy:auth.code` (одно поле, `inputmode=numeric`, `autocomplete=one-time-code`, 6–10 цифр, вставка; 20/600 без tnum) · главная · `copy:auth.resend` (неактивна 60 с, `copy:auth.resendIn`) · `copy:auth.otherEmail`.
- «Код отправлен на {почта}» хранится в `sessionStorage` (residual Б4-М5).
- **Состояния:** `idle`, `verifying`, `wrong-code` `copy:auth.codeInvalid` (поле не очищаем), `expired` → `login-link-error`, `resend-countdown`, `offline`.
- **Бюджет касаний:** iOS ≈ 6 (прислать → Почта → письмо → копировать/подсказка → назад → вставить → «Войти»), Android ≈ 5 (код из уведомления).

### 3.4 `login-invite-code` — `/login?mode=invite[&email=…]` (`gate-open`)
- **Главная:** `copy:auth.signInWithCodeSubmit` (`verifyOtp({email, token, type:'invite'})`).
- **Блоки:** заголовок `copy:auth.inviteTitle*` · **почта: пришла в URL — подставлена, видна маской, рядом `copy:auth.otherEmail`**; иначе поле `copy:auth.inviteEmailLabel*` (`autocomplete=email`, `inputmode=email`) [О34-10, Б-M11] · поле кода · главная · подсказка `copy:auth.openInBrowser` (без названий браузеров) [И-M11] · `copy:auth.signInPassword`.
- **Ошибки:** Supabase `verifyOtp` отвечает одной ошибкой и на неверный код, и на неверную почту, поэтому текст один — `copy:auth.checkEmailAndCode*` «Проверьте почту и код». Если на стенде ответы окажутся разными — `copy:auth.codeInvalid` и `copy:auth.emailInvalid` раздельно.
- **Состояния:** `idle`, `email-prefilled`, `verifying`, `wrong-code-or-email`, `expired` → `login-link-error`, `offline`.
- **Бюджет касаний:** почта подставлена из ссылки — открыть письмо → скопировать код → открыть ссылку → вставить → «Войти» ≈ 5; почта руками — +1 поле.
- **После успеха:** бригадир → `auth-set-password`; рабочий → `today`.
- Ссылка в письме должна вести на `/login?mode=invite&email=…` — пункт K34 (Codex/владелец).

### 3.5 `login-link-error` — `/login#error=…` (`otp_expired`, `access_denied`, PKCE в другом браузере)
- **`gate-open`:** главная `copy:auth.sendCode`; текст `copy:auth.linkExpired` + `copy:auth.linkExpiredResend*` «Пришлём новый»; PKCE — `copy:auth.linkOtherBrowser`; вторично «Ввести код» → `login-code-enter`, `copy:auth.signInPassword`.
- **`gate-closed`:** главная `copy:auth.signInPassword`; текст только `copy:auth.linkExpired` «Код или ссылка устарели.» — **без «пришлём новый»** [О34-11, И-M4].
- Тупика нет: всегда два пути.

### 3.6 `auth-set-password` — после входа по коду приглашения (`gate-open`; необязательно, бриф §2.3 П12)
- **Главная:** `copy:auth.savePassword`.
- **Блоки:** `copy:auth.setPasswordTitle` · `copy:auth.newPassword` с показом · `copy:auth.passwordTooShort` как ошибка · главная · `copy:auth.skipUseCode*` → `/dashboard`.
- **Состояния:** `saving`, `too-short`, `error`, `offline`.

### 3.7 `app-loading`
- **Главная:** нет. Логотип + спиннер, фон `--bg`. Через 10 с — `copy:common.slow*` + `copy:common.reload*` (вторичная).

### 3.8 `profile-load-error`
- **Главная:** нет; вторичная «Попробовать ещё раз» + «Выйти». `copy:auth.profileLoadFailed` без `{{error}}`.
- **Состояния:** `error`, `offline`, `retrying`.

### 3.9 `profile-not-configured`
- **Главная:** `copy:onboarding.checkAgain`. Только при ошибке RPC `create_company_and_profile`; в норме `/dashboard` сам вызывает RPC — состояние `creating-company` (скелет + `copy:onboarding.creating*`).
- **Блоки:** `copy:onboarding.title` · `copy:onboarding.text` · `copy:auth.signedInAs` · главная · «Выйти» · `copy:onboarding.contact` при `legal-filled` · «На главную».
- **Состояния:** `creating-company`, `error`, `checking`, `offline`, `legal-filled`.

### 3.10 `onboarding-name` — «Как вас зовут?» (необязательный, 01 §3.1 п.3б)
- **Главная:** `copy:common.save` → `profiles.full_name`. Вторично `copy:common.later`.
- **Блоки:** `copy:profile.title` · `copy:profile.name` · `copy:profile.hint` · главная · «Позже». Один раз после создания компании, если `full_name` пуст.

### 3.11 `not-found` — `*`
- **Главная:** нет; по сессии: есть — «К объектам»; нет — «Войти» и «На главную». Текст `copy:notFound.text`, в теме, 17 px.

### 3.12 `signup` — `/#start` (лендинг, вне этого PR; фиксируем шлюз)
- `gate-open` — форма, главная «Создать аккаунт». `gate-closed` — `copy:auth.signupLater` + контакт при `legal-filled`, без формы.

---

## 4. Вне объекта

### 4.1 `dashboard-owner` — `/dashboard`, `gc`
- **Главная:** 0 объектов — `copy:dashboard.empty.action` «Создать первый объект». `k15-on` и N > 0 — `copy:review.checkN`. Иначе **нет** (карточка — крупная цель). «Создать объект» — вторичная справа от заголовка.
- **Блоки (390):**
  1. (`k15-on`, N > 0) полоса + главная «Проверить N» → `/review`.
  2. (свои черновики) `UnsentBanner compact`: `copy:send.bar` → `copy:send.resend`.
  3. Заголовок `copy:dashboard.title` + «Создать объект».
  4. Группа `copy:dashboard.groupActive`: **хуже по свежести сверху** (7+ → 3–6 → 1–2 → сегодня). Свежесть = последний отчёт рабочего **или** последняя отметка владельца/бригадира, что позже [О34-1]. Объекты `day0` при `gate-closed` — в общем порядке, без подъёма.
  5. Группа `copy:dashboard.groupQuiet` «На паузе и завершённые» (одна группа: пауза, затем завершённые) [М-L4, имя из 04].
- **`ProjectCard` (мобильный):** название (18/600) + % (32/700) · адрес · полоса · **чип свежести** (`FreshnessChip`):
  - `day0`, `gate-closed`: `copy:reportStatus.noMarks*` «Отметок пока нет» (серый, без дней);
  - `day0`, `gate-open`, никого нет: `copy:reportStatus.none` «Никто не приглашён» — **только шлюз+**; с 3-го дня `copy:reportStatus.noneDays_*` + значок предупреждения (`--pending-ink`, не жёлтый), не выше объектов с простоем 7+;
  - люди на объекте, отчётов нет: `copy:reportStatus.noneWaiting` в формулировке «На объекте: {имена} · отчётов ещё нет» [И-M9];
  - `self-marked`: `copy:reportStatus.markedByOwner*` / `markedByForeman*` «Отметил владелец {дата}»; через 3+ дня — та же строка со значком `fresh-3-6`;
  - отчёты рабочих: «Отчёт сегодня» / «N дней без отчёта» по шкале брифа (сегодня / 1–2 / 3–6 / 7+);
  · чип проблем (SVG `issue` + число) или ничего. Пауза — чип «На паузе» вместо свежести. Чипа «Пришёл отчёт» нет до K35. Вся карточка — одна ссылка, ≥ 96 px.
- **Десктоп ≥ 1024:** строки-таблица: название + адрес | готовность | свежесть | проблемы | (`k15-on`) ждут проверки. Группа «На паузе и завершённые» свёрнута, если активных ≥ 5.
- **Состояния:** `loading`, `error`, `offline`, `empty`, `creating`, `creating-company`, `day0`, `self-marked`, `no-reports`, `paused`, `completed`, `unsent`, `k15-on/off`, `gate-open/closed`.
- Сортировка по имени уходит; в `PROJECT_COLUMNS` добавляется `created_at` (residual «Март r3»).

### 4.2 `create-project` — форма на `/dashboard`
- **Главная:** `copy:createProject.submit`. Вторично `copy:common.cancel`.
- **Блоки:** `copy:createProject.name` (обяз.) · `copy:createProject.address` · `copy:createProject.deadline` (нативный `date`, 56 px) · `copy:createProject.stagesHint` **с текстом ru.json без изменений** («добавятся 7 этапов…»), без обещания править этапы [О34-13, И-M12].
- **Состояния:** `idle`, `invalid`, `saving`, `error`, `offline`. Успех → `/project/:id`.

### 4.3 `dashboard-foreman` — `/dashboard`, `foreman`
- 1 объект → `/project/:id`. Иначе как 4.1 без «Создать объект» и без «Тарифа».
- **Главная:** `k15-on` и N > 0 — «Проверить N»; иначе нет.
- **Пусто:** `copy:dashboard.emptyForeman*` «Вас ещё не добавили на объект. Скажите владельцу» + «Выйти» [М-M2].

### 4.4 `dashboard-worker` — `/dashboard`, `worker`
- 1 объект → `today`. Иначе `WorkerProjectCard`.
- **Главная:** нет; при черновиках — `copy:send.resend` в `UnsentBanner`.
- **Карточка:** название · % · полоса · `copy:dashboard.workerLastReport*` «Ваш последний отчёт: {дата}» · шеврон; ≥ 80 px.
- **Пусто:** `copy:dashboard.emptyWorker*` + «Выйти».

### 4.5 `dashboard-client` — `/dashboard`, `client` (как сейчас, без действий)
- 1 объект → `/project/:id`. Иначе `ProjectCard readonly`: то же, что видно сейчас (бриф §2.3 В3), без кнопок.
- **Пусто:** `copy:dashboard.emptyClient*` «Владелец фирмы ещё не открыл вам объект» [И-L10].

### 4.6 `tariff` — `/tariff` (только gc)
- **Главная:** `legal-filled` — `copy:tariff.contact` (`mailto:LEGAL.email`). Иначе ссылка `copy:tariff.toProjects`.
- **Показываем только решения владельца из `decisions.md`** [О34-12]:
  1. `copy:tariff.title`;
  2. `copy:tariff.lead` — 29 € за объект в месяц, + НДС, рабочие бесплатно;
  3. таблица «объектов → €/мес» (из тех же 29 € и потолка): строка потолка — рамка + слово «потолок 99 €», без «ГБ» [М-M8];
  4. `copy:tariff.trial` — «30 дней бесплатно, без карты. Ничего не списывается»;
  5. `copy:tariff.days` — **только если закрыт K19**, в формулировке «по календарным дням, пауза не считается — так будет считаться счёт»; до K19 строки нет;
  6. `copy:tariff.noBilling`;
  7. главная или ссылка.
- **Не показываем:** `tariff.included` («до 3 владельцев…») [И-M7], `tariff.invoice`, даты конца пробного периода.
- Ссылка «Тариф» при `legal-empty` не скрывается: открытая цена — решение брифа §2.2; на проде `legal-empty` невозможен (§0.2).
- **Таблица на 360:** 2 колонки, без горизонтального скролла. Десктоп: таблица 560 + условия справа.
- **Состояния:** `legal-filled`, `k19-on`, `k19-off`, `non-gc-redirect`.

### 4.7 `review-queue` — `/review` (бригадир; владелец, если бригадира нет или отчёту > 48 ч) — **только `k15-on`**
- **Главная:** `copy:review.confirm` в строке; главный стиль только у верхней необработанной строки, у остальных — вторичный того же размера (бриф §2.3 В6).
- **Блоки (390):**
  1. `UndoBar` — **одна плашка** sticky под шапкой: `copy:review.undoN*` «Отменить (N)». Кнопки отмены в строках нет [О34-6, Б-M12]. «Отменить (N)» отменяет **все** подтверждения, чьё окно ещё не кончилось. Плашка исчезает, когда кончилось окно последнего.
  2. Фильтр-чипы по объекту (если объектов > 1).
  3. Строки `ReviewRow` (≥ 120 px): превью 96 × 96 (касание → `photo-viewer`) · «Имя · Этап» (18/600) · `copy:review.wasClaimed` «было N% [SVG-стрелка] заявлено M%» (tnum) · «ждёт 3 ч» (17/600) · `copy:review.confirm` и `copy:review.return` на противоположных краях, зазор ≥ 16 px.
- **«Подтвердить все мелкие» в этой очереди нет** [О34-6, Б-M15]: здесь только скачки > 25. Отдельного списка «Мелкие отметки» нет, пока нет пути K21 (бриф §2.3 П13).
- **Подтверждение:** «Подтвердить» неактивна до загрузки превью. Касание → строка остаётся на месте с чипом `copy:review.confirmedRow` на всё окно **7 с** (бриф §2.3 П1); после окна исчезает с анимацией высоты, только если палец не на экране; `prefers-reduced-motion` — без анимации. Запрос уходит после окна (RPC отмены нет, K32).
- **Ждущие подтверждения отправляются сразу** (окно считается законченным): при уходе с экрана, на `visibilitychange → hidden` и на `pagehide` (`fetch` с `keepalive`) [О34-6, Б-M13]. Не дошло — при следующем открытии строка снова в очереди с `copy:review.closedEarly`.
- **Десктоп:** одна колонка 720 + справа крупное превью выбранной строки.
- **Состояния:** `loading`, `error`, `offline` (кнопки неактивны с подписью), `empty` (`copy:review.empty`), `preview-loading`, `undo-window`, `sending`, `send-failed` (строка возвращается), `closed-early`, `self-report` (`copy:review.ownJump`, без кнопок, K22).
- **Навигация:** из «Проверить N» на `/dashboard` и обзоре (`/review?project=:id`). Пустая очередь → «К объектам».

### 4.8 `review-return-reason` — лист причины возврата (`k15-on`)
- **Главная:** `copy:review.return`. Причины одним касанием: `copy:review.returnReason.tooHigh`, `.unclear`, `.wrongStage`. Вторично «Отмена».

---

## 5. Внутри объекта

### 5.1 `project-overview-owner` — `/project/:id`, роли `gc`, `foreman`

Главное действие — по роли и состоянию, ровно одно [О34-1, О34-2, М-H1, М-H2]. Строки проверяются сверху вниз, срабатывает первая подходящая:

| Состояние | gc (владелец) | foreman (бригадир) |
|---|---|---|
| `paused` / `completed` | нет; «Вернуть в работу» — в «⋯» | нет |
| `no-stages` | нет; `copy:stages.emptyOwner*` без совета создать объект заново; в «⋯» доступно «Завершить объект» [О34-8, М-M10] | нет; `copy:stages.emptyAsk*` «Этапы ещё не заданы. Спросите владельца» |
| `unsent` (свои черновики) | `copy:send.resend` в плашке; кнопка карточки — вторичная | то же |
| `k15-on`, есть ждущие | `copy:review.checkN` → `/review?project=:id` | то же |
| `day0`, `gate-closed` | `copy:overview.markStage*` «Отметить этап» → `report-sheet` (режим владельца, первый незавершённый этап) | то же |
| `day0`, `gate-open` | `copy:overview.next.inviteOpen` «Пригласить рабочего» → `/settings#invite` | «Отметить этап» (приглашает только владелец) |
| `stale-3plus`, `gate-open` | `copy:overview.openPeople` «Кто молчит 3+ дня» → `/settings?focus=silent` [М-M9] | нет главной; строка `copy:overview.staleForeman*` «Давно нет отчёта от: {имена}. Скажите владельцу» |
| `stale-3plus`, `gate-closed` | «Отметить этап». Если в «Уже работают у вас» есть люди — вторично «Все люди» → `/settings` | «Отметить этап» |
| `self-marked` (`gate-closed`) | «Отметить этап» (этап последней правки или первый незавершённый) | то же |
| `has-reports`, последнее — не моё | `copy:overview.openLastReport` → `photo-viewer` | то же |
| `has-reports`, последнее — моё | «Отметить этап» | то же |

- **Блоки (390):**
  1. `UnsentBanner` (свои черновики).
  2. **Карточка состояния:** `copy:overview.readyPercent*` «{N}% готово» (40/700); при `k15-on` вторая строка `copy:status.withPending` · чип свежести (по §4.1) · одна строка «что делать» + главная из таблицы. `day0` + `gate-closed`: строка `copy:gate.inviteLater`; строка с телефоном (`gate.startEarlier`) не выводится (residual М4-2).
  3. **«Уже работают у вас»** `copy:known.title` — только gc и только если в фирме есть `worker`/`foreman` без доступа к объекту: до 3 строк + `copy:known.add`; «Все люди» `copy:people.all*` → `/settings`. Работает при `gate-closed`.
  4. **Этапы** — `StageRow`: название · % (tnum) · полоса · чип свежести этапа · `StatusChip` последнего значения (`marked`: «Отметил владелец» / «Отметил бригадир» / «Отмечено бригадой»; при `k15-on` — свои статусы) · «⋯» (≥ 48) → «Отметить / Задача / Проблема». Касание строки → `report-sheet` этого этапа.
  5. **Что происходило** `copy:overview.feedTitle` — лента `project_activity` «кто · что · когда» **и на мобильном**: свёрнута до 3 строк, раскрытие `copy:overview.feedAll*` [О34-9, М-M11]; пусто — `copy:overview.feedEmpty`. Скачок > 25 в ленте — нейтральная строка `copy:activity.bigJump` (без «не проверен», без «посмотрит»).
  6. **Последние фото** — 3 в ряд, `copy:overview.allPhotos*` → `/photos`.
  7. **Открытые проблемы** — до 3, `copy:overview.allIssues*`.
  8. **3D-дом** — свёрнут на всех ширинах, `copy:overview.showHouse*` [М-L1].
  9. «⋯» объекта (только gc): `copy:project.pause` / `copy:project.complete` / `copy:project.resume` → `project-status-confirm`.
- **Убираем:** 4 плитки статистики (`text-[11px]`); `InviteWorkerLink` (WhatsApp); `NextSteps` с 3 шагами; отдельный сигнал «крупный скачок, не проверен» в карточке.
- **Десктоп ≥ 1024:** левая колонка (7): карточка состояния, этапы, лента. Правая (5): люди объекта кратко (gc), «Уже работают у вас», проблемы, фото, 3D-дом.
- **Состояния:** `loading`, `error`, `offline`, `no-stages`, `day0`, `self-marked`, `has-reports`, `stale-3plus`, `gate-open/closed`, `marked`, `accepted`/`pending`/`confirmed` (`k15-on`), `paused`, `completed`, `unsent`.

### 5.2 `project-overview-client` — `/project/:id`, `client` (как сейчас)
- **Главная:** нет.
- **Блоки:** «{N}% готово» + `copy:overview.updatedAt*` · этапы только чтение · последние фото · проблемы (как сейчас) · 3D-дом свёрнут.
- `day0` — `copy:overview.notStartedReadOnly` в формулировке без рабочих («Отчётов пока нет. Ход работ появится здесь») [М-M3]. `no-stages` — `copy:stages.emptyAsk*`. `paused` — `copy:overview.clientPaused*`.
- Ссылка заказчика (`client-links.md`) не строится; **никакой строки о ней** (бриф §2.3 В4) [О34-13].

### 5.3 `stages` — `/project/:id/stages`
- **Главная:** нет (в строке «Отметить»).
- **Блоки:** `StageRow` развёрнутый: название · % · полоса · последний отчёт/отметка «{дата} · {имя}» · `StatusChip` · «Отметить» (вторичная, ≥ 48) → `report-sheet` · «История» (раскрытие, ≥ 48).
- Ползунок и автосохранение уходят. gc/foreman — режим владельца (фото по желанию, `update_stage_progress`); worker — режим рабочего (`submit_stage_report`, K14); client — без кнопок.
- **`empty`:** gc — `copy:stages.emptyOwner*`; остальные — `copy:stages.emptyAsk*` [О34-8].
- **Состояния:** `loading`, `error`, `offline`, `empty`, `no-reports`, `marked`, `accepted`, `pending`, `confirmed`, `rejected`, `paused`, `history-loading`, `history-empty`.

### 5.4 `photos` — `/project/:id/photos`
- **Главная:** gc/foreman/worker — `copy:photos.takePhoto*` «Сфотографировать» → камера → `report-sheet` (режим «только фото», этап выбирается в листе). Вторично `copy:today.fromGallery`. Client — нет.
- **Блоки:** главная · фильтр-чипы по этапу (≥ 48) вместо `<select>` · сетка 2 колонки (3 на 768, 4–6 на десктопе), подпись на `--scrim` «{дата} · {имя}».
- **`empty`:** с правом снимать — `copy:photos.empty` «Фото пока нет. Первое — кнопкой «Сфотографировать» выше» (кнопки «Добавить фото» нет) [О34-9, И-M6]; client — `copy:photos.emptyClient*`.
- **Состояния:** `loading`, `error`, `offline`, `empty`, `empty-stage` (`copy:photos.emptyStage` без «рабочий добавляет…» при `gate-closed`), `image-failed`, `unsent` (черновики первыми плитками с чипом «Не отправлено», SVG `unsent`).

### 5.5 `tasks` — `/project/:id/tasks`
- **Главная:** gc/foreman — `copy:tasks.create` → `task-form`. Worker — маршрут ведёт на `today`. Client — нет (видит как сейчас, бриф §2.3 В3).
- **Блоки:** главная · активные `TaskCard` (срок tnum; просрочено — SVG `stale` + слово; `select` 56 px) · «Выполненные (N)» — раскрытие ≥ 48, шеврон SVG.
- «Готово» у задачи с этапом → `report-sheet`.
- **`empty`:** `gate-closed` — `copy:tasks.emptyClosed*` «Задач пока нет. Задача — напоминание для вас и бригадира»; `gate-open` — `copy:tasks.empty` [М-M3].
- **Состояния:** `loading`, `error`, `offline`, `empty`, `no-active`, `saving`, `card-error`, `worker-redirect`.

### 5.6 `issues` — `/project/:id/issues`
- **Главная:** gc/foreman/worker — `copy:issues.create` → `issue-form`. Client — нет.
- **Блоки:** главная · активные `IssueCard` (срочность — чип SVG `urgent` + слово, не только рамка) · фото → `issue-photo-zoom` · «Кто · Срок» · статус-чип · кнопка следующего статуса (gc/foreman) · «Решённые (N)».
- **`empty`:** `copy:issues.empty` (текст 04, без «владелец увидит») [И-L7].
- **Состояния:** `loading`, `error`, `offline`, `empty`, `no-active`, `card-saving`, `card-error`.

### 5.7 `project-people` — «Люди», маршрут `/project/:id/settings` (только gc)
- **Главная:** `gate-open` — `copy:invite.submit` «Пригласить (N)» (активна при ≥ 1 заполненной строке). `gate-closed` — нет; `copy:known.add` у людей — вторичные.
- **Блоки (390):**
  1. **Люди объекта** `copy:people.title` (кроме владельца): имя · роль · `copy:people.lastReport` / `copy:people.noReportsYet` · чип свежести · `gate-open`: `copy:people.sendCode` (с `?focus=silent` — `copy:people.sendCodeAgain*` «Отправить код, чтобы вошёл снова») · «⋯» → `copy:people.remove*` → `confirm-remove-person`.
     С `?focus=silent` молчащие 3+ дня — сверху, строка выделена рамкой и значком [М-M9].
  2. **«Уже работают у вас»** `copy:known.title` — только `worker`/`foreman` фирмы без доступа: `copy:known.add`, после — `copy:known.added`; ошибка `copy:known.addFailed`.
  3. **Пригласить** (`gate-open`, `#invite`): `copy:invite.title`, строки `copy:invite.name` + `copy:invite.email` (`copy:invite.addRow`, до 10) · проверки: `copy:invite.ownEmail`, `copy:invite.duplicate`, `copy:invite.sameName` + `sameNameYes`/`sameNameNo` · главная. `gate-closed`: `copy:gate.inviteLater` вместо формы.
  4. Итог по строкам: `copy:invite.sent`, `copy:invite.emailTaken`, `copy:invite.rateLimit`, `copy:invite.failed`; после — `copy:people.inviteMore`.
  5. `copy:invite.foreman` — вторичная ссылка (`gate-open`).
- Строки про ссылку заказчика нет [О34-13]. `Toggle` уходит — явные «Добавить»/«Убрать».
- **Десктоп:** слева люди объекта, справа «Уже работают у вас» + форма.
- **Состояния:** `loading`, `error`, `offline`, `empty-people` (`copy:people.emptyClosed` / `copy:people.emptyOpen`), `empty-company`, `focus-silent`, `gate-open/closed`, `inviting`, `invite-result-*`, `adding`, `add-error`, `no-company` (`copy:common.noCompany` + «К объектам»), `non-gc-redirect`.
- **Вход:** вкладка «Люди» (gc) и кнопки обзора gc; по Ж9 при `gate-closed` кнопки обзора ведут сюда, только если блок 2 не пуст.

### 5.8 `send-login-code` — лист из строки человека (gc, `gate-open`)
- **Главная:** `copy:people.sendCode` (`signInWithOtp`, не `api/invite.ts`).
- **Блоки:** `copy:people.emailFor` · поле почты (подсказка — последний адрес сессии) · главная · «Отмена».
- Ошибки владельцу — явные: `copy:people.emailNotOurs`; повтор раньше срока — `copy:auth.retryAfter`; лимит проекта — `copy:auth.projectLimit`.
- **Состояния:** `idle`, `sending`, `sent`, `not-found`, `rate-address`, `rate-project`, `offline`, `error`.

### 5.9 `project-status-confirm` — пауза / завершение / возврат (gc)
- **Главная:** действие (`copy:project.pause` и т. д.). Текст `copy:project.pauseConfirm` / `copy:project.completeConfirm`. Вторично «Отмена».

### 5.10 `confirm-remove-person` — «Убрать с объекта» (gc)
- **Главная:** `copy:people.remove*`. Текст `copy:people.removeConfirm*` («{имя} больше не увидит этот объект. Его отчёты останутся»). Вторично «Отмена».

---

## 6. Отчёт

### 6.1 `today` — `/project/:id/today`, `worker`
- **Главная:** `copy:today.report` «Сфотографировать» (`capture="environment"`). **Этап — строкой над кнопкой** `copy:report.stage` «Этап: {имя}», не в кнопке [О34-4, Б-M4]; обрезка многоточием. Этап по умолчанию: этап задачи «в работе» → этап последнего своего отчёта (если его вернули — этот этап) → первый незавершённый. При `unsent` главная — `copy:send.resend`, «Сфотографировать» вторичная (Ж4).
- **Блоки (390):**
  1. `UnsentBanner`: SVG `unsent` · `copy:send.bar` · `copy:send.barChecking` · `copy:send.lastPhoto` · `copy:send.lastAttempt` · раскрытие `copy:send.details*` с причиной по каждому застрявшему (`copy:send.itemReason`) · главная `copy:send.resend`.
  2. (`editing`) `copy:report.unfinished` + миниатюра + `copy:today.continue*` → `report-sheet`.
  3. (`k15-on`, последний отчёт вернули) **«Мой последний отчёт»** поднимается сюда: чип `rejected` + `copy:status.returned*` «Вернули: {причина}» [О34-7, Б-M14].
  4. Строка `copy:report.stage` + главная (56 px) + вторичные `copy:today.fromGallery` и `copy:today.otherStage*` → `stage-picker` → камера.
  5. `copy:today.objectPercent*` «Объект: {N}%» + полоса.
  6. «Мои задачи» (`copy:today.myTasks`): `TaskCard worker`; «Готово» с этапом → `report-sheet`.
  7. `copy:today.lastReport*` «Мой последний отчёт: {этап} · {дата}» + `StatusChip` (`marked` до K15).
  8. Чужие черновики: `copy:send.others_*` (без «Удалить»).
- **Состояния:** `loading`, `error` (камера работает, если этапы в кэше), `offline`, `empty-tasks` (`copy:today.noTasks`), `all-done` (`copy:today.allDone`), `unsent`, `unknown`, `stale-draft` (`copy:today.staleWaiting_*` → лист), `editing-draft`, `drafts-limit` (`copy:send.limit`, только без сети), `paused` (`copy:report.paused` одной строкой, без красного), `foreign-drafts`, `no-stages` (`copy:stages.emptyAsk*`), `auth-required` (`copy:errors.authRequiredDrafts_*` → `login-code-request` при `gate-open`, `login-password` при `gate-closed`), `marked`, `accepted`, `pending`, `confirmed`, `rejected`.
- **Навигация:** вход по роли (1 объект), `dashboard-worker`, логотип рабочего. Камера → `report-sheet` → `today` (`SendStateRow`: «Отправляется» → «Отправлено»).

### 6.2 `report-sheet` — лист отчёта
Полноэкранный лист на мобильном, диалог 560 на десктопе, в корне темы (Ж8). Заголовок `copy:report.title*`.

**Два режима** [О34-4, М-M6]:
- **Режим рабочего** (`worker`): камера открывается **до** листа; лист — после снимка. Отправка — `submit_stage_report` (фото обязательно при росте).
- **Режим владельца/бригадира** (`gc`, `foreman`): лист открывается **сразу, без камеры** (из «Отметить этап», «Отметить», «⋯», «Готово» у задачи). На месте миниатюры — плитка `copy:report.addPhoto*` «Добавить фото» (вторичная, ≥ 48; камера, вторично галерея). Без фото — `update_stage_progress`; с фото — `submit_stage_report` (бриф §2.3 В1). Из «Фото → Сфотографировать» снимок уже есть.

- **Главная:** `copy:report.send` (sticky, ≥ 56, safe-area). В `stale-draft` — `copy:send.staleResend`. Неактивна при снижении без причины: подпись **в самой кнопке** `copy:report.pickReason*` «Выберите причину» (не отдельной строкой).
- **Порядок блоков (DOM фиксирован, 01 §3.4); раскладка на 360 × 560:**

| # | Блок | Высота |
|---|---|---|
| — | шапка: «Закрыть» (48) · `copy:report.title*` | 56 |
| 1–3 | одна строка-сетка (DOM-порядок 1, 2, 3 сохраняется): слева **миниатюра 72 × 72** (в режиме владельца без фото — плитка «Добавить фото» того же размера); справа «{объект} · {имя}» (17/600, обрезка) и `copy:report.wasWill` «было N% [SVG-стрелка] станет M%» (M 32/700). Касание миниатюры — **просмотр** снимка крупно [О34-4, Б-M8]. Миниатюра **не меняет размер** ни в одном состоянии: лист не прыгает под пальцем [Б-M6] | 80 |
| — | строка действий: `copy:report.retake` «Переснять» (вторичная, ≥ 48; нет в режиме без фото) и, только при M ≠ N, `copy:report.noChange` «Без изменений» (ссылка ≥ 48, возвращает M = N) | 48 |
| 4 | `PercentStepper` — **сетка 2 × 2**, кнопки ≥ 56 px высотой, зазор ≥ 12 px: верхний ряд `copy:report.plus10` «+10» · `copy:report.plus25` «+25»; нижний ряд `copy:report.minus10` «−10» · `copy:report.done100` «100%». «−10» — вторичный вид (контур); по горизонтали не соседствует с «+10». В пределах 0–100; по умолчанию — состояние «Без изменений» (ни одна не нажата, M = N) | 124 |
| 5 | `copy:report.stage` «Этап: {имя}» · `copy:report.changeStage` (≥ 48) → `stage-picker`. **Смена этапа после снимка сохраняет фото и сбрасывает M к текущему % нового этапа** [О34-4, Б-M7] | 48 |
| 6 | причины снижения (только M < N): `copy:report.reasonTitle` + 3 чипа (`copy:report.reason.rework`, `.mistake`, `.demolition`) в 2 ряда | 0 / 112 |
| 7 | **одна** строка-плашка на все сообщения (пауза, черновики): «На паузе · Не отправлено: 1». Сообщения о большом скачке **нет до K15** [О34-3] | 0 / 40 |
| — | sticky «Отправить»: 16 + 56 + safe-area (до 34) | 106 |

Бюджет 360 × 560 без снижения: 56 + 80 + 48 + 124 + 48 + 40 + 106 = 502 ≤ 560.
Снижение + плашка: 56 + 80 + 48 + 124 + 48 + 112 + 40 + 106 = 614 > 560. Поэтому при показе причин (до первого кадра, в той же отрисовке, что и причины) строка действий переносится **в шапку листа** (две иконки-кнопки 48 с подписями `aria-label`), а плашка 7 — в значок с числом в шапке (касание раскрывает). Итог 56 + 80 + 124 + 48 + 112 + 106 = 526 ≤ 560 (и ≤ 553 на 375 × 553). Перестройка идёт **ниже** точки касания «−10» и выше неё ничего не сдвигает (строка действий уходит вверх, в шапку, освобождая место ниже миниатюры) — UI-этап проверяет, что `top` кнопки «−10» не меняется. Все причины видны над кнопкой (Ж5).

- **Отправка и закрытие** [О34-5, Б-M1, Б-M2]:
  - `sending`: SVG `sending` + `copy:send.sending`. «Закрыть» неактивна **первые 3 с**, затем активна с подписью `copy:report.closeSending*` «Отправка продолжится»; системная «назад» — так же. После закрытия отправка идёт дальше, итог — `SendStateRow` и плашка на экране-источнике.
  - `sent`: лист закрывается; на источнике `SendStateRow` `copy:send.sent` (SVG `sent`, **не** галочка `ok`).
  - `queued` / `unknown`: **лист закрывается сам**. Рабочий — всегда на `today`, владелец/бригадир — на экран-источник; там сверху `UnsentBanner` с этим отчётом и главной `copy:send.resend`. Тексты называют «Сегодня», а не «эту страницу»: `copy:send.queued` («…Откройте «Сегодня» в BuildProof, когда будет сеть»), `copy:send.unknown` («Не знаем, дошёл ли отчёт. Фото сохранено на телефоне» + «Откройте «Сегодня», когда будет сеть — проверим») [Б-H1, И-M3]. Слов «нет сети» в этих текстах нет.
- **Состояния листа:** `editing`, `no-photo` (режим владельца), `no-change` (только фото), `increase`, `decrease-needs-reason`, `paused`, `sending`, `sending-closable` (после 3 с), `sent`, `unknown`, `queued`, `stale-draft`, `already-higher` (`copy:send.stageAhead` — только для роста; снижение с причиной не меняется само, residual Б4-М1), `drafts-limit`, `offline`, ошибки RPC (01 §3.4): `auth-required`, `forbidden` (`copy:errors.forbidden` + «Удалить»), `photo-required` (`copy:errors.photoRequired` → «Сфотографировать»), `nothing-to-report` (`copy:errors.nothingToReport`), `invalid-photo-path` (`copy:errors.invalidPhotoPath`), `already-sent` (`copy:send.sentEarlier`).
- **Закрытие без отправки:** снимок остаётся черновиком `editing`; на `today` — `copy:report.unfinished`.

### 6.3 `stage-picker` — лист выбора этапа [Б-M7]
- **Главная:** нет (одно касание по строке выбирает).
- **Блоки:** `copy:stagePicker.title*` «Выберите этап» · строки ≥ 56 px: название слева, текущий % справа (tnum), текущий этап отмечен значком и словом · «Закрыть».
- Из листа: выбор сохраняет фото и ставит M = % выбранного этапа. Из `today` («Другой этап»): выбор → сразу камера.
- **Состояния:** `loading`, `error`, `offline` (из кэша), `empty` (`copy:stages.emptyAsk*`).

### 6.4 `stale-draft` — решение по устаревшему черновику (часть листа)
- **Главная:** `copy:send.staleResend`.
- **Блоки:** SVG `stale` + `copy:send.stale` «Не принято: этап уже N%» · миниатюра · «Ваш отчёт: M%» · `PercentStepper` от N · главная · «Удалить» (вторичная, `copy:send.deleteConfirm`).

### 6.5 `signout-drafts-confirm`
- **Главная:** `copy:common.stay`. Вторично `copy:common.signOutAnyway`. Текст `copy:auth.signOutDrafts_*`.

---

## 7. Модалки (все 7 из `00` §4.2) — внутри корня темы (Ж8)

| id | Было | Станет | Главная | Состояния |
|---|---|---|---|---|
| `modal-overview-photo` (#21) | Обзор → «фото» в строке → `PhotoUploadForm` | `report-sheet` (режим владельца, этап подставлен) | `copy:report.send` | как `report-sheet` |
| `task-form` (#22) | Обзор → «задача» → `TaskForm` | `task-form` в `Sheet` (из «⋯» строки — этап подставлен; с вкладки «Задачи») | `copy:tasks.create` | `idle`, `invalid`, `saving`, `error`, `offline` |
| `issue-form` (#23) | Обзор → «проблема» → `IssueForm` | `issue-form` в `Sheet` | `copy:issues.submit` | `idle`, `invalid`, `photo-preparing`, `saving`, `photo-failed`, `error`, `offline` |
| `modal-today-task-photo` (#24) | Сегодня → «Готово» с этапом → `PhotoUploadForm` | `report-sheet` (режим рабочего), после отправки задача закрывается | `copy:report.send` | как `report-sheet` + `task-close-failed` |
| `modal-tasks-task-photo` (#25) | Задачи → «Готово» с этапом → `PhotoUploadForm` | `report-sheet` (режим владельца/бригадира) | `copy:report.send` | то же |
| `photo-viewer` (#26) | Фото → просмотр | `PhotoViewer gallery`: фото на `--scrim`, подпись 17/600 «отправлено {дата}» · имя · этап · `StatusChip`. «Снято {время}» — только когда появится `taken_at` (K15) [И-L6]. «Закрыть» ≥ 48, листание ≥ 48 | нет | `loading`, `image-failed`, `offline` |
| `issue-photo-zoom` (#27) | Проблемы → увеличить фото | `PhotoViewer single` | нет | `loading`, `image-failed` |

- **task-form:** `copy:tasks.name` · `copy:tasks.assignee` (`select` 56) · `copy:tasks.stage` · `copy:tasks.deadline` · главная · «Отмена».
- **issue-form:** `copy:issues.titleField` · «Срочно / Не срочно» — две кнопки-переключателя ≥ 48 (`copy:issues.urgent` / `copy:issues.notUrgent`) · `copy:issues.photo` (камера сразу) · `copy:issues.more` — раскрытие ≥ 48 · главная.

Прочие диалоги и листы — тоже в корне темы: `project-status-confirm`, `confirm-remove-person`, `signout-drafts-confirm`, `send-login-code`, `review-return-reason`, `stage-picker`, подтверждение удаления черновика (часть `stale-draft`).

---

## 8. Покрытие

### 8.1 `06-audit-stage1-residual.md`

| Пункт | Где |
|---|---|
| И4-HIGH (WhatsApp, `InviteWorkerLink`, `reportStatus.none`, `auth.tagline`) | §5.1 «Убираем»; §4.1 (`none` — только шлюз+); §3.1 блок 1 |
| Б4-HIGH (код приглашения `type:'invite'`) | §3.4 |
| М4-1 (регистрация за шлюзом) | §3.1 блок 9; §3.12 |
| М4-3 | §3.4 |
| М4-5 («Уже работают у вас» — `worker`/`foreman`) | §5.1 блок 3; §5.7 блок 2 |
| М4-7, Б4-М7 (статус человека; маршрут по роли) | §5.7 блок 1; §1 |
| Март r3 (`created_at`) | §4.1 |
| Б4-М1 (снижение с причиной не меняется само) | §6.2 `already-higher`; §6.4 |
| Б4-М2 (черновики независимы, причина по каждому) | §6.1 блок 1 |
| Б4-М3 (строка очереди до конца окна, вне касания, reduced-motion) | §4.7 |
| Б4-М4 (`authentication_required` при шлюзе− → пароль) | §6.1 `auth-required`; §3.5 |
| Б4-М5 (sessionStorage, 6–10 цифр, бюджеты iOS/Android) | §3.3 |
| Б4-М6, М4-4 (явная ошибка владельцу) | §5.8; §3.2 |
| И4-М2 (статусы до K15) | §0.2 `marked`; бриф §2.4: «Проверено» до K15 нет |
| И4-М4 | лендинг-PR |
| М4-6 («Пришёл отчёт» на паузе нет) | §0.2 `paused`; §4.1 |
| М4-2 (строка с телефоном не выводится) | §5.1 блок 2 |
| Б4-М7 (возврат завтра) | §3.2 `bp:lastEmail`; C3 ждёт |
| И4-М1, И4-М3 | метрик «успех/активация» нет ни на одном экране |

### 8.2 Аудит этапа 3+4, раунд 1 (пункты про 03)

| Пункт | Решение | Где |
|---|---|---|
| М-H1 (день 0 при шлюзе− обрывается) | `day0` определён; `self-marked`; «Отметить этап»; свежесть по отметкам | §0.2, §4.1, §5.1 |
| М-H2 (бригадир → «Люди») | главные по роли; бригадир не попадает на «Люди» | §1, §5.1 |
| М-H3, И-M13 (`auth.tagline`) | две строки по шлюзу | §3.1 |
| М-H4 (шлюз− × legal пуст) | блокер выпуска: prebuild `check-placeholders.mjs` | §0.2 |
| И-H1 («Проверено» до K15) | «Проверено» до K15 нет; `marked` с автором | §0.2, §5.1, §9 |
| Б-H1, И-M3, М-M7 (`send.unknown`) | «нет сети» только в `NetBar`; текст называет «Сегодня» | §0.2, §6.2 |
| М-M1, Б-M10, И-M10 (ключи) | имена из 04; новые — §12 | весь файл, §12 |
| М-M2 (тексты не той роли) | `stages.emptyOwner`/`emptyAsk`; `dashboard.emptyForeman`/`emptyWorker`; скачок без сообщения | §4.3, §4.4, §5.3, §6.2 |
| М-M3 (пустые при шлюзе−) | варианты без рабочих | §5.2, §5.4, §5.5 |
| М-M4 | заменено решением И-H1 (бриф §2.4) | §0.2 |
| М-M5 (03 не обновлён по брифу) | §10/§11 закрыты, решения вписаны | §10, §11 |
| М-M6 (лист без фото для владельца) | режим владельца | §6.2 |
| М-M8 (тариф) | только решения владельца; `days` только с K19; без ГБ | §4.6 |
| М-M9 («Кто молчит 3+ дня») | `?focus=silent`, «Отправить код, чтобы вошёл снова» | §5.1, §5.7 |
| М-M10 (мусорный объект) | «Завершить объект» в «⋯» при `no-stages`; без совета пересоздать | §5.1 |
| М-M11 (лента на мобильном) | блок «Что происходило», свёрнут | §5.1 |
| Б-M1, Б-M2 (лист в `busy`, после `queued`) | «Закрыть» через 3 с; лист закрывается сам | §6.2 |
| Б-M3 (силуэты `sent`/`unsent`, `unknown`) | вне 03: правка `02-type.md` §8 — см. §11 | §11 |
| Б-M4 (длинная главная) | этап над кнопкой | §6.1 |
| Б-M5, Б-M6 (кнопки %) | сетка 2 × 2, «100%», «−10» вторичная, миниатюра фиксирована, «Без изменений» | §6.2 |
| Б-M7 (смена этапа) | `stage-picker`; фото остаётся, M сбрасывается | §6.2, §6.3 |
| Б-M8 (касание миниатюры) | просмотр; «Переснять» — кнопка | §6.2 |
| Б-M9 (360 × 560) | Ж5 и бюджет | §0.1, §6.2 |
| Б-M11, О34-10 (почта в коде приглашения) | подстановка из URL; одна ошибка «Проверьте почту и код» | §3.4 |
| Б-M12, Б-M13, Б-M15 (очередь) | одна «Отменить (N)»; отправка на `hidden`/`pagehide`; без «мелких» | §4.7 |
| Б-M14 (возврат рабочему) | `rejected` + причина на `today` | §0.2, §6.1 |
| И-M1 (K34) | условие `gate-open` | §0.2 |
| И-M2 (`report.bigJump`) | до K15 сообщения нет | §6.2 |
| И-M4 (`auth.linkExpired`) | «пришлём новый» только шлюз+ | §3.5 |
| И-M5 (пересоздать объект) | как М-M10, О34-8 | §5.1, §5.3 |
| И-M6 (`photos.empty`) | ссылка на «Сфотографировать» | §5.4 |
| И-M7, И-M8 (тариф) | `included` не показываем; `days` только K19 | §4.6 |
| И-M9 (`noneWaiting`) | «На объекте: … · отчётов ещё нет» | §4.1 |
| И-M11 (латиница браузеров) | `copy:auth.openInBrowser`, блок `hint-open-in-browser` | §3.4 |
| И-M12 (обещания в 03) | убраны строка про ссылку заказчика и «этапы можно поменять» | §4.2, §5.2, §5.7 |
| LOW: М-L1, М-L3, М-L4, М-L5, М-L6, И-L6, И-L7, И-L10, Б-LOW 1–2 | приняты | §5.1, §3.1, §4.1, §0.1, §7, §5.6, §4.5, §4.7, JSON |
| М-M8 п.3 (скрыть «Тариф» при `legal-empty`) | **не принято:** открытая цена — решение брифа §2.2; на проде `legal-empty` невозможен (§0.2) | §4.6 |

---

## 9. Компоненты для UI-этапа

Все — на токенах `tokens.css`, без новых библиотек. Значки — один набор `<StatusIcon kind>` inline SVG (`02-type.md` §8).

| Компонент | Варианты | Состояния | Где |
|---|---|---|---|
| `Button` | `main` (жёлтая, 56, 20/600, ≤ 1 на экран, `data-main`), `secondary` (контур 2 px, 48, 18/600), `ghost` (48), `danger-secondary`; `block`/`inline` | default, hover, focus-visible (кольцо 3 px), pressed, disabled (причина текстом в кнопке или рядом), loading | везде |
| `LinkButton` | как `Button`, `<a>`/`Link` | те же | навигация |
| `StatusIcon` | отчёт: `pending`, `ok`, `rejected`, `stale`; отправка: `sending`, `sent`, `unsent`, `unknown`; свежесть: `fresh-today`, `fresh-1-2`, `fresh-3-6`, `fresh-7plus`, `none` (пунктирное кольцо); объект: `paused`, `done-flag`; прочее: `issue`, `urgent`, `arrow`, `chevron`, `photo-add` | форма различима в одном цвете | везде |
| `StatusChip` | `report`: `marked-owner`, `marked-foreman`, `marked-crew` (сегодня); `accepted`, `pending`, `confirmed`, `rejected` (+причина) — только `k15-on`; `send`; `project`; `issue`; `urgent` | — | карточки, строки |
| `FreshnessChip` | today / 1–2 / 3–6 / 7+; `no-marks` (шлюз−); `none` и `none-days` (только шлюз+); `on-project-no-reports`; `marked-by` («Отметил владелец {дата}»); `paused` | — | `ProjectCard`, `StageRow`, `PersonRow` |
| `ProjectCard` | `owner`, `foreman`, `worker`, `client`; `mobile` / `row` (≥ 1024) | default, pressed, skeleton, day0, self-marked, paused, completed | `/dashboard` |
| `GroupHeader` | «В работе», «На паузе и завершённые»; свёрнут / развёрнут | — | `/dashboard` |
| `StateCard` | ветки таблицы §5.1 × роль (gc / foreman) | skeleton | обзор |
| `ActivityFeed` | `compact` (3 строки + «Вся история»), `full` | loading, empty | обзор (мобильный и десктоп) |
| `StageRow` | `overview`, `stages`, `readonly` | default, pressed, no-reports, marked, k15-статусы, history-open | обзор, этапы |
| `ReportCard` | `feed`, `viewer`, `mine` (today, в т. ч. «Вернули: …») | статусы, «отправлено {дата}» | обзор, фото, today |
| `ReviewRow` | — | preview-loading (кнопка неактивна), ready, confirmed-in-window (чип, без кнопки отмены), collapsing (не при касании; reduced-motion — без анимации), returned, send-failed, closed-early, self-report | `/review` |
| `UndoBar` | одна плашка «Отменить (N)», sticky вверху | visible, counting, hidden | `/review` |
| `UnsentBanner` | `full`, `compact` | queued, unknown, stale, mixed, retrying, foreign-drafts, limit, details-open | today, dashboard, обзор, фото |
| `SendStateRow` | — | sending, sent, unsent, unknown | после закрытия листа |
| `ReportSheet` | режим `worker` (камера первая) / `manager` (без камеры, «Добавить фото»); источник: today, stage, photo, task, resume-draft, stale-resolution | §6.2 | — |
| `PercentStepper` | сетка 2 × 2, ≥ 56 px, зазор ≥ 12; «−10» вторичная | no-change (по умолчанию), changed, at-0, at-100, decrease (показывает причины) | лист; тот же компонент на лендинге |
| `ThumbPreview` | миниатюра 72 × 72 фиксированная; плитка «Добавить фото» | photo, no-photo, preview-open | лист |
| `StagePicker` | лист со строками ≥ 56 | current, default, loading | лист, today |
| `ReasonPicker` | снижение (3), возврат (3) | none-selected, selected | лист, очередь |
| `Sheet` | `fullscreen` / `dialog` (≥ 1024, 560); портал в корень темы, ловушка фокуса, `history` | open, busy-locked (первые 3 с), busy-closable, closing | все листы |
| `ConfirmDialog` | обычный / разрушительный | idle, saving, error | пауза, выход, удаление, «Убрать с объекта» |
| `PhotoViewer` | gallery / single | loading, image-failed | фото, проблемы, очередь, обзор |
| `Tabs` | `owner` (скролл внутри полосы), `worker` (растянуты) | active, focus, overflow-hint | `shell-project` |
| `AppHeader` | `app`, `project` | — | все |
| `TextField` | text, email (`inputmode=email`), password (показать), date, select (нативный 56), textarea | default, focus, filled, invalid, disabled | формы |
| `EmailPrefilled` | маска почты + «Другая почта» | — | вход по коду / приглашению |
| `CodeField` | 6–10 цифр, одно поле | idle, verifying, wrong, expired | вход |
| `InviteRows` | «Имя + Почта», + строка | row-idle, row-invalid, row-own-email, row-duplicate, row-name-match, row-sent, row-taken, row-limit, row-failed | «Люди» |
| `PersonRow` | `on-project`, `in-company` | last-report, no-reports, silent-highlighted, adding, add-error, code-sent | «Люди», обзор |
| `EmptyState` | со шагом и тем, кто его делает; варианты по роли и шлюзу | — | все списки |
| `ErrorBlock` | inline / page | error, retrying | все |
| `NetBar` | — | offline, back-online (2 с) | все |
| `Skeleton` | card, row, tile, header | — | все `loading` |
| `ProgressBar` | thin, thick; вторая отметка «с учётом ждущих» (`k15-on`) | 0, partial, 100 | все |
| `FilterChips` | этапы, объекты | selected, default | фото, очередь |
| `Disclosure` | «Выполненные», «Решённые», «История», «Подробнее», «Вся история» | open, closed | задачи, проблемы, этапы, обзор |
| `LanguageSwitcher` | шапка, вход (≥ 48) | — | все |

---

## 10. Открытые вопросы

Все вопросы ред. 1 (В1–В7) — **решено: бриф §2.3**. Решения вписаны в текст:
В1 — §6.2 (два режима листа); В2 — §2.2, §5.7 (маршрут `/settings`, вкладка «Люди»); В3 — §2.2, §4.5, §5.2 (заказчик как сейчас); В4 — §5.2, §5.7 (строки нет); В5 — §5.1, §5.3; В6 — §4.7; В7 — §4.1 (шкала брифа; `reportStatus.ts`/`format.ts` приводятся к ней на UI-этапе).

Новых открытых вопросов к оркестратору нет. Зависимости вне 03: K15, K19, K21, K32, K34, K35.

## 11. Противоречия

П1–П13 ред. 1 — **решено: бриф §2.3** (П1 — 7 с; П2 — строка до конца окна; П3 — заменено брифом §2.4: до K15 «Проверено» нет; П4–П8 — по residual; П9 — значки только `02-type.md` §8; П10 — пунктирное кольцо; П11 — не жёлтый; П12 — `auth-set-password` принят; П13 — `review_worker_day` не используем, «мелкие» в очереди убраны).

Осталось вне 03, для других ролей:
- **Б-M3 → `02-type.md` §8:** развести силуэты `sent` и `unsent` (сейчас лоток со стрелкой вверх/вниз — одна форма на солнце), внести `unknown` («?» в круге) в §8, добавить пару в тест «значки в одном цвете» 24 px под вуалью.
- **Бриф §2.1б п.6** всё ещё пишет окно отмены «5 с», а §2.3 — «7 с». Нужна правка брифа.

---

## 12. Ключи, которых нет в `04-copy.md` (для автора текстов)

Смысл — рабочий; формулировку, RU/EN/ET и окончательное имя даёт 04. Ключи 04, которые надо **изменить** по решениям, отмечены «изм.».

| Ключ | Смысл / рабочий текст | Где |
|---|---|---|
| `common.offline` | «Нет сети» (только `NetBar`) | §0.2 |
| `common.slow`, `common.reload` | «Долго грузится. Проверьте сеть» / «Обновить» | §3.7 |
| `common.contactPhone`, `common.contactEmail` | контакт по частям, без висящей запятой (замена `common.contact`) | §3.1 |
| `auth.tagline` (изм.) | шлюз−: без рабочих («Ход работ по этапам: проценты, фото и история изменений…») | §3.1 |
| `auth.taglineOpen` | шлюз+: «…от ваших рабочих» | §3.1 |
| `auth.resetTitle` | заголовок режима сброса пароля | §3.2 |
| `auth.inviteTitle` | заголовок экрана кода приглашения | §3.4 |
| `auth.inviteEmailLabel` | «Почта, на которую пришло приглашение» | §3.4 |
| `auth.checkEmailAndCode` | «Проверьте почту и код» | §3.4 |
| `auth.linkExpired` (изм.) | только «Код или ссылка устарели.» | §3.5 |
| `auth.linkExpiredResend` | «Пришлём новый.» (шлюз+) | §3.5 |
| `auth.skipUseCode` | «Пропустить, войду кодом» | §3.6 |
| `auth.draftsWaiting_*` (изм.) | + «Войдите, и они уйдут» | §3.1 |
| `onboarding.creating` | «Готовим ваш кабинет» | §3.9 |
| `dashboard.emptyForeman`, `dashboard.emptyWorker` | «Вас ещё не добавили на объект. Скажите владельцу» (раздельно, замена `dashboard.emptyOther`) | §4.3, §4.4 |
| `dashboard.emptyClient` | «Владелец фирмы ещё не открыл вам объект» | §4.5 |
| `dashboard.workerLastReport` | «Ваш последний отчёт: {{date}}» | §4.4 |
| `reportStatus.noMarks` | «Отметок пока нет» (шлюз−, `day0`) | §4.1 |
| `reportStatus.markedByOwner`, `reportStatus.markedByForeman` | «Отметил владелец {{date}}» / «Отметил бригадир {{date}}» (чип свежести) | §4.1 |
| `reportStatus.noneWaiting` (изм.) | «На объекте: {{names}} · отчётов ещё нет» | §4.1 |
| `status.markedByOwner`, `status.markedByForeman` | «Отметил владелец» / «Отметил бригадир» (чип значения) | §0.2 |
| `status.verified` (изм.) | только **K15**; до K15 не выводится | §0.2 |
| `status.returned` | «Вернули: {{reason}}» (**K15**) | §0.2, §6.1 |
| `overview.markStage` | «Отметить этап» | §5.1 |
| `overview.openPeople` (изм.) | «Кто молчит 3+ дня» (шлюз+) | §5.1 |
| `overview.staleForeman` | «Давно нет отчёта от: {{names}}. Скажите владельцу» | §5.1 |
| `overview.readyPercent` | «{{percent}}% готово» | §5.1, §5.2 |
| `overview.updatedAt` | «обновлено {{date}}» | §5.2 |
| `overview.clientPaused` | «Работы на паузе» | §5.2 |
| `overview.notStartedReadOnly` (изм.) | без рабочих: «Отчётов пока нет. Ход работ появится здесь» | §5.2 |
| `overview.allPhotos`, `overview.allIssues`, `overview.showHouse`, `overview.feedAll` | «Все фото», «Все проблемы», «Показать дом», «Вся история» | §5.1 |
| `people.all` | «Все люди» | §5.1 |
| `people.sendCodeAgain` | «Отправить код, чтобы вошёл снова» | §5.7 |
| `people.remove`, `people.removeConfirm` | «Убрать с объекта» / последствия | §5.10 |
| `stages.emptyOwner` | для владельца, без совета создать объект заново (замена `overview.noStages`/`stages.empty`) | §5.1, §5.3 |
| `stages.emptyAsk` | «Этапы ещё не заданы. Спросите владельца» (бригадир, рабочий, заказчик) | §5.1–§5.3, §6.1, §6.3 |
| `photos.takePhoto` | «Сфотографировать» | §5.4 |
| `photos.empty` (изм.) | «Фото пока нет. Первое — кнопкой «Сфотографировать» выше» | §5.4 |
| `photos.emptyClient` | «Фото пока нет» | §5.4 |
| `photos.emptyStage` (изм.) | без «рабочий добавляет» при шлюзе− | §5.4 |
| `tasks.emptyClosed` | «Задач пока нет. Задача — напоминание для вас и бригадира» | §5.5 |
| `today.report` (изм.) | «Сфотографировать» — **без** `{{stage}}`; этап — `report.stage` над кнопкой | §6.1 |
| `today.otherStage`, `today.continue`, `today.objectPercent`, `today.lastReport`, `today.staleWaiting_*` | «Другой этап», «Продолжить», «Объект: {{percent}}%», «Мой последний отчёт: {{stage}} · {{date}}», «{{count}} отчёт ждёт решения» | §6.1 |
| `send.details` | «Подробнее» | §6.1 |
| `send.unknown` (изм.) | «Не знаем, дошёл ли отчёт. Фото сохранено на телефоне» + «Откройте «Сегодня», когда будет сеть — проверим» | §6.2 |
| `send.queued` (изм.) | «…Откройте «Сегодня» в BuildProof, когда будет сеть» (не «эту страницу») | §6.2 |
| `send.barChecking` (изм.) | «Не знаем, дошли ли: {{count}}» | §6.1 |
| `report.title` | «Отчёт» | §6.2 |
| `report.addPhoto` | «Добавить фото» (режим владельца) | §6.2 |
| `report.pickReason` | «Выберите причину» (подпись неактивной главной) | §6.2 |
| `report.closeSending` | «Отправка продолжится» | §6.2 |
| `report.done100` (изм.) | «100%» | §6.2 |
| `report.bigJump` (изм.) | до K15 не выводится | §6.2 |
| `stagePicker.title` | «Выберите этап» | §6.3 |
| `review.undoN` | «Отменить ({{count}})» (замена пары `review.undoCount` + `common.undo`) | §4.7 |
| `review.confirmAllSmall` (изм.) | в очереди не используется (до пути K21) | §4.7 |
| `review.stub` (изм.) | не используется: при `k15-off` очереди нет | §4.7 |
| `tariff.days` (изм.) | только K19: «по календарным дням, пауза не считается — так будет считаться счёт» | §4.6 |
| `tariff.included`, `tariff.invoice` (изм.) | не выводятся | §4.6 |
| `tariff.capRow` (изм.) | без «{{gb}} ГБ» | §4.6 |
