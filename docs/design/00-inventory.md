# 00 — Инвентаризация экранов и расхождений (этап 0, baseline «до»)

Дата: 2026-11-25. Ветка `claude/app-redesign` (от `8f9d2e8`). Аудитор этапа 0, только чтение, код не менялся.
Скриншоты не снимались (решение владельца, см. `design-brief.md` §0). Все числа ниже получены командами из раздела 3; их можно перепроверить.

## 1. Сводка: цифры, которые надо довести до нуля

| Метрика | Сейчас | Цель |
|---|---|---|
| Экранов вне новой единой темы (`src/styles/tokens.css` ещё нет) | **22 из 22** прод-экранов (+1 dev) | 0 |
| — из них вообще вне `.bp` (сток Tailwind или отдельная тема `.lp`) | **14** | 0 |
| — в `.bp`, но без тёмной темы (светлые всегда) | **6** | 0 |
| — в `.bp` со скином и тёмной темой | **2** (Объекты, Обзор объекта) | — |
| Жёстких цветов hex/rgb, регэксп из задания (`#[0-9a-fA-F]{3,8}\|rgb\(`) | **300** вхождений в 198 строках, 9 файлов | 0 |
| — плюс `rgba(` (регэксп задания его **не ловит**) | **18** | 0 |
| — плюс `index.html` `<meta name="theme-color" content="#0284c7">` | **1** | 0 |
| **Итого жёстких цветов** | **319** (из них 3D-остров: 24 — кандидат в исключение) | 0 |
| Классов Tailwind с фиксированной палитрой (`bg-slate-…`, `text-white` и т. п.) | **432** в 47 файлах (из них 3D-остров: 78) | 0 |
| Посторонних объявлений шрифта (`font-family`, `fontFamily`, стеки `--display/--sans/--mono`, `font-mono`) | **30** (21 `font-family` + 6 стеков + 1 `fontFamily` + 2 `font-mono`) | 0 вне `tokens.css` |
| — дополнительно `font:`-шорткаты, ссылающиеся на `var(--display/--sans/--mono)` | 49 (landing.css 42, app-skin.css 7) | перевести на токены |
| Мелкий текст в классах (`text-xs`, `text-sm`, `text-[11px]`) | **136** (xs 40, sm 92, `[11px]` 4) | см. §5 |
| Мелкий текст в CSS (< 17 px) | **42** (landing.css 38, app-skin.css 3, index.css 1) | см. §5 |
| Касания явно < 48 px (`size-8/9`, `min-h-8/9/11`, `h-6`, `py-0.5/1.5`) | **18** вхождений + базовые `Button`/`TextField` | 0 |
| Файлы IBM Plex в `public/fonts` | **16 woff2 = 288 136 байт** + лицензия | удалить |

Главные выводы:
- Тёмная тема в приложении есть только у двух экранов. Она включается **только системной настройкой** (`prefers-color-scheme: dark`); переключателя нет, `data-theme` на `<html>` код нигде не ставит. При тёмной системе пользователь видит тёмные «Объекты» и «Обзор», затем светлые вкладки «Этапы/Фото/Задачи/Проблемы/Настройки» в той же шапке, затем светлые «Тариф» и «Вход».
- **Все модальные окна рендерятся через `createPortal(..., document.body)`** (`src/components/Modal.tsx:32`), то есть **вне `.bp`**: сток-палитра Tailwind, шрифт `system-ui`, `text-sm` = 14 px. На тёмном «Обзоре» формы фото/задачи/проблемы открываются светлыми.
- Заголовочный шрифт `IBM Plex Sans Condensed` подключён **только с латиницей** (`fonts.css:15–18`, нет cyrillic-сабсетов). Русские заголовки всегда падают в `'Arial Narrow'`/`system-ui`. Все Plex-шрифты с `font-display: optional`: при первом визите почти всегда остаётся системный шрифт.
- Отдельной клиентской read-only ссылки **нет**. «Клиент» — это вошедший пользователь с ролью `client` («Заказчик»): видит те же вкладки, что прораб, кроме «Настроек», без кнопок правки.
- Регистрации как отдельного маршрута **нет**: это секция `#start` на лендинге (`SignupSection.tsx`), ссылка «Начать бесплатно» со страницы входа ведёт на `/#start`.
- Роли в коде: `client | gc | foreman | worker` (`src/types/db.ts:12`). Подписи в `ru.json`: `gc` — «Генподрядчик» (= владелец фирмы), `foreman` — «Прораб» (в брифе «бригадир»), `worker` — «Рабочий», `client` — «Заказчик». Расхождение терминов «прораб/бригадир» стоит закрыть в `design-brief.md`.

## 2. Как устроены тема и шрифт сейчас (трассировка CSS)

| Слой | Файл | Что делает |
|---|---|---|
| Глобально | `src/index.css` | `@import 'tailwindcss'`; `body { font-family: system-ui, 'Segoe UI', Roboto, sans-serif; color: slate-800; background: slate-50 }` (сток). `.site-loop .t-mono` — `ui-monospace…`. На ≤ 640 px поля ввода 16 px. |
| Лендинг | `src/features/landing/landing.css` (scope `.lp`) | Свои токены `--ink/--paper/--yellow…` (hex), шрифты `--display: 'IBM Plex Sans Condensed'`, `--sans: 'IBM Plex Sans'`, `--mono: 'IBM Plex Mono'`; тёмная тема по `prefers-color-scheme` или `:root[data-theme='dark']`. `@import './fonts.css'`. |
| Скин приложения | `src/styles/app-skin.css` (scope `.bp`), подключён в `src/routes/AuthenticatedRoutes.tsx:16` | Копия тех же токенов (hex продублированы), **перенаправляет переменные палитры Tailwind** (`--color-slate-*`, `--color-sky-50/100/600/700/800`, `green-100/500–800`, `amber-100/500/800`, `red-100/500–800`) на токены; шкала текста: `text-xs` = 15 px, `text-sm` = `text-base` = 17 px, `text-lg` = 21 px. Тёмная тема только для `.bp[data-skin-dark]`. `@import '../features/landing/fonts.css'` (второй раз, в чанк приложения). |
| Тёмная тема | `app-skin.css:102–137` | `@media (prefers-color-scheme: dark) :root:not([data-theme='light']) .bp[data-skin-dark]` + `:root[data-theme='dark'] .bp[data-skin-dark]`; фон `body` красится через `:has(.bp[data-skin-dark])`. `data-skin-dark` ставят только `Dashboard.tsx:41` (всегда) и `ProjectLayout.tsx:57` (только на индексе `/project/:id`). |
| `.bp-native` | `app-skin.css:140–159`, используют `HouseModel.tsx:114`, `HouseModelBlock.tsx:20` | Возвращает **стоковую** палитру slate/sky и стоковые размеры текста (12/14/16/18 px) внутри 3D-острова. Шрифт не сбрасывает: наследует `--sans` (Plex Sans). |
| Шрифты | `src/features/landing/fonts.css` | 16 `@font-face`, все `font-display: optional`. |
| `index.html` | — | Нет `<link rel=preload>` шрифтов, нет `font-family`. Есть `theme-color #0284c7` (старый sky-600). |

Невыкрашенные внутри `.bp` оттенки (их переменные не перенаправлены, поэтому в `.bp` они остаются стоковыми и не меняются в тёмной теме): `sky-200` (6), `sky-500` (6), `sky-300`, `sky-900` (2), `red-50` (2), `red-200`, `red-400`, `red-900`, `amber-50` (`Tariff.tsx`), `slate-950`, `green-300` (dev-страница), `black` (3), `text-white` (19), `border-white` (5), `outline-white` (4), `ring-white` (1). `bg-white` перекрашен отдельным правилом `.bp .bg-white` (60 вхождений). Пример утечки: `ErrorMessage` (`bg-red-50 border-red-200 text-red-900`), фокус-кольца полей (`focus:border-sky-500 focus:ring-sky-200`) в `TextField`, `TaskCard`, `TaskForm`, `IssueForm`, `PhotoUploadForm`, `Photos`.

Фактически применяемый шрифт:
- **`.lp` и `.bp`**: текст — `'IBM Plex Sans'` (при `optional` на первом визите — `system-ui / -apple-system / 'Segoe UI'`); заголовки h1/h2, логотип, `.bp-pct` — `'IBM Plex Sans Condensed'`, для кириллицы всегда `'Arial Narrow'`/`system-ui`; лендинг-«брови», переключатель языка — `'IBM Plex Mono'`.
- **Вне `.bp`/`.lp`** (вход, 404, тариф, «профиль не настроен», спиннер, ошибка профиля, все модалки): `system-ui, 'Segoe UI', Roboto, sans-serif`.

## 3. Команды и исключения

```
grep -rnE "#[0-9a-fA-F]{3,8}|rgb\(" src --include=*.tsx --include=*.ts --include=*.css      # 198 строк
grep -rnoE "#[0-9a-fA-F]{3,8}|rgb\(" src --include=*.tsx --include=*.ts --include=*.css     # 300 вхождений
grep -rnoE "rgba\(" src --include=*.tsx --include=*.ts --include=*.css                      # 18
grep -rn "font-family" src index.html                                                        # 21 строка
grep -rnoE "\b(bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|accent|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(-[0-9]{2,3})?\b" src --include=*.tsx --include=*.ts   # 432
grep -rnoE "\btext-(xs|sm)\b|\btext-\[(1[0-6]|[0-9])(\.[0-9]+)?px\]" src --include=*.tsx --include=*.ts            # 136
```

Исключения (не-цвета): проверено `grep -rnoE "#[0-9a-fA-F]{3,8}[g-zG-Z_]"` — **0 совпадений**; якоря вида `#start`, `#top` регэкспом не ловятся (буквы вне hex). Все 300 вхождений — настоящие цвета, исключать нечего. Числовых цветов `0x…` (three.js) — 0. `hsl()/oklch()` — 0; `color-mix()` — 3 (в `app-skin.css`, на токенах, не считаются). `#` в i18n-JSON не проверялся (вне `--include`).

Замечание к регэкспу задания: `rgb\(` не ловит `rgba(` — 18 вхождений проходят мимо. Будущий `scripts/check-tokens.mjs` должен ловить `rgba?\(` и `hsla?\(`, а также `index.html`.

## 4. Таблица экранов

Обозначения: **.bp** — внутри обёртки скина; **dark** — тёмная тема по системе возможна; «палитра» — число классов фиксированной палитры в файле экрана (без вложенных компонентов); «hex» — hex/rgb(a) в файле.

### 4.1 Маршруты и состояния

| # | Маршрут | Роль(и) | Компонент | .bp | dark | Шрифт фактически | Палитра / hex в файле | Примечание |
|---|---|---|---|---|---|---|---|---|
| 1 | `/` | гость | `src/features/landing/LandingPage.tsx` (+ `Hero`, `BelowFold`: `HowItWorks` с `SiteLoop`, `DemoObjectSection`, `InfoSections`, `Footer`) | нет, своя обёртка `.lp` | да (система / `data-theme`) | Plex Sans / Condensed (без кириллицы) / Mono | hex: landing.css 84, DemoObjectSection 20, parts 2, SiteLoop.tsx 38, siteLoopScene.ts 109; палитра SiteLoop 2 | Отдельный набор токенов, копия скина |
| 2 | `/#start` (секция) | гость | `src/features/landing/SignupSection.tsx` | `.lp` | да | Plex | — | **Регистрация**. Состояния: `sending`, `invalidEmail`, `shortPassword`, `exists`, `failed`, `created` |
| 3 | `/login` | гость | `src/pages/Login.tsx` (`TextField`, `Button`, `ErrorMessage`, `LanguageSwitcher`) | **нет** | нет | system-ui | 10 / 0 | Ссылка «назад» `min-h-11` (44 px) |
| 4 | `*` | любая (без авторизации) | `src/pages/NotFound.tsx` | **нет** | нет | system-ui | 3 / 0 | Ссылка всегда на `/dashboard` |
| 5 | любой защищённый, загрузка | любая | `FullPageSpinner` (`src/components/Spinner.tsx`) из `ProtectedRoute` | **нет** | нет | system-ui | 2 / 0 | |
| 6 | любой защищённый, ошибка профиля | любая | `ProtectedRoute.tsx:30` + `ErrorMessage` | **нет** | нет | system-ui | 4 (ErrorMessage) / 0 | |
| 7 | любой защищённый, профиля нет | вошедший без профиля/компании | `src/pages/ProfileNotConfigured.tsx` (`CenteredCard`) | **нет** | нет | system-ui | 4 + 3 / 0 | Также из `Dashboard.tsx:28` |
| 8 | `/dashboard` | gc | `src/pages/Dashboard.tsx` (`ProjectListCard`, `CreateProjectForm`, `NextSteps`) | да | да (всегда `data-skin-dark`) | Plex | 5 / 0 | Ссылка «Тариф», кнопка «Создать объект» (`bp-main`). Состояния: загрузка, ошибка, пусто (`NextSteps` 3 шага), форма создания |
| 9 | `/dashboard` | foreman, client | то же, `ProjectListCard` | да | да | Plex | — | Если объект один — редирект на `/project/:id`. Пусто: `dashboard.emptyOther` |
| 10 | `/dashboard` | worker | то же, `WorkerProjectCard` | да | да | Plex | — | Заголовок «Выберите объект»; если объект один — редирект на `/project/:id/today` |
| 11 | `/tariff` | любой вошедший (ссылка только у gc, **маршрут по роли не закрыт**) | `src/pages/Tariff.tsx` | **нет** | нет | system-ui | 18 / 0 | `bg-amber-50` строка «потолка»; таблица `text-sm`, шапка `text-xs` |
| 12 | `/project/:id/*` (оболочка) | все | `src/components/ProjectLayout.tsx` | да | только на индексе | Plex | 7 / 0 | Вкладки: gc — Обзор, Этапы, Фото, Задачи, Проблемы, Настройки; foreman/client — то же без Настроек; worker — Сегодня, Этапы, Фото, Проблемы. Активная вкладка `border-sky-600 text-sky-700` |
| 13 | `/project/:id` | gc, foreman, client (worker → `today`) | `src/pages/ProjectHome.tsx` → `src/pages/ProjectDashboard.tsx` (`HouseModelBlock`, `StageActionButtons`, `NextSteps`, `InviteWorkerLink`, `UrgentBadge`, `ProgressBar`) | да | **да** | Plex; внутри 3D — Plex, но стоковые размеры | 42 / 0 | Состояния: загрузка, ошибка, нет этапов, «не начато» (gc/foreman: `NextSteps` + приглашение в WhatsApp; client: прогресс + текст read-only), обычный. Client: действия по этапам скрыты. `text-[11px]` ×3 (`bp-eyebrow`, тренд) |
| 14 | `/project/:id/today` | worker (остальные → обзор) | `src/pages/Today.tsx` (`TaskCard variant=worker`, `ProgressBar`) | да | **нет** | Plex | 13 / 0 | Главная кнопка «Отчёт» — `bg-sky-600` (не жёлтая `bp-main`), ведёт на вкладку Этапы (`TODO(A2)`). Пусто: «нет задач» / «всё сделано» |
| 15 | `/project/:id/stages` | все; правка gc/foreman/worker, client read-only | `src/pages/Stages.tsx` (`StageCard`, `StageProgressControl`, `StageHistoryPanel`) | да | нет | Plex | 5 / 0 | Пусто: `stages.empty`; метка «только просмотр» `text-xs text-slate-400` |
| 16 | `/project/:id/photos` | все; загрузка gc/foreman/worker | `src/pages/Photos.tsx` (`PhotoUploadForm`, `ImagePicker`) | да | нет | Plex | 20 / 0 | Фильтр по этапу; пусто: «нет фото» / «нет фото этапа»; форма инлайн |
| 17 | `/project/:id/tasks` | gc/foreman (создание, карточки manager), worker («Мои задачи»), client (readonly) | `src/pages/Tasks.tsx` (`TaskForm`, `TaskCard`) | да | нет | Plex | 9 / 0 | У рабочего вкладки «Задачи» нет, но маршрут открыт. Пусто: разный текст для рабочего |
| 18 | `/project/:id/issues` | все; создание gc/foreman/worker, смена статуса gc/foreman | `src/pages/Issues.tsx` (`IssueForm`, `IssueCard`) | да | нет | Plex | 9 / 0 | Пусто: `issues.empty` |
| 19 | `/project/:id/settings` | gc (остальные → обзор) | `src/pages/Settings.tsx` (`MemberAccessRow`, `Toggle`) | да | нет | Plex | 8 / 0 | Ошибка «нет компании», пусто, список доступа |
| 20 | `/dev/house-3d` | только `import.meta.env.DEV` | `src/features/house3d/House3DDevPage.tsx` | нет | нет | system-ui | 25 / 0 | В прод не попадает; в счёт 22 не входит |

Пустая заглушка: `Suspense fallback={null}` в `App.tsx` и `main.tsx` — при загрузке чанков пользователь видит пустой экран (фон `body` стоковый `slate-50`).

### 4.2 Модальные окна (все через портал в `body`, **вне `.bp`**, без dark, шрифт system-ui, оверлей `bg-black/75`)

| # | Где открывается | Роль(и) | Содержимое | Файл |
|---|---|---|---|---|
| 21 | Обзор → действие «фото» в строке этапа | gc, foreman | `PhotoUploadForm` (11 палитра) | `ProjectDashboard.tsx:238` |
| 22 | Обзор → «задача» | gc, foreman | `TaskForm` (11) | `ProjectDashboard.tsx:238` |
| 23 | Обзор → «проблема» | gc, foreman | `IssueForm` (25) | `ProjectDashboard.tsx:238` |
| 24 | Сегодня → задача выполнена, прикрепить фото | worker | `PhotoUploadForm` | `Today.tsx:108` |
| 25 | Задачи → задача выполнена, прикрепить фото | worker | `PhotoUploadForm` | `Tasks.tsx:133` |
| 26 | Фото → просмотр | все | `figure` `bg-black`, подпись `bg-white` | `Photos.tsx:109` |
| 27 | Проблемы → увеличить фото | все | `img` `bg-black` | `IssueCard.tsx:96` |

Правило счёта «22 прод-экрана»: строки 1–2 (лендинг с регистрацией) = 1 экран; строки 8–10 («Объекты» для трёх ролей) = 1 экран с состояниями; оболочка 12 — не экран; dev-страница 20 — вне счёта; каждая модалка 21–27 — отдельный экран (каждая форма проверяется отдельно).

- вне `.bp` — **14**: лендинг, вход, 404, спиннер, ошибка профиля, «профиль не настроен», тариф (7) + модалки 21–27 (7);
- в `.bp` без dark — **6**: строки 14–19;
- в `.bp` с dark — **2**: «Объекты» (8–10) и «Обзор» (13).

### 4.3 Клиент, рабочий, тёмная тема — что неочевидно

- **Клиент (`client`, «Заказчик»)**: нет публичной read-only ссылки, нет отдельного экрана. Входит по паролю, видит «Объекты» → «Обзор» с вкладками Этапы, Фото, Задачи (readonly), Проблемы; без кнопок правки, без «Настроек». Если объект один — сразу «Обзор».
- **Рабочий**: «Сегодня» (14) — главный экран; вкладки растянуты на всю ширину, `py-3 text-base`. Экран «Сегодня» в `.bp`, но **светлый всегда**, а «Объекты» рабочего (10) — тёмный при тёмной системе.
- **Тёмная тема**: только `prefers-color-scheme`. Внутри одной оболочки проекта Обзор тёмный, остальные вкладки светлые (`ProjectLayout.tsx:53–57`, комментарий «other tabs are not redrawn yet»).

## 5. Подсчёты по файлам

### 5.1 Жёсткие цвета hex / rgb / rgba

| Файл | hex+`rgb(` (регэксп задания) | `rgba(` | Всего | Область |
|---|---|---|---|---|
| `src/components/siteLoopScene.ts` | 109 | 0 | 109 | анимация лендинга |
| `src/features/landing/landing.css` | 73 | 11 | 84 | лендинг (токены `.lp` + прямые цвета, напр. `:136`, `:139`, `:141`, `:142`) |
| `src/components/SiteLoop.tsx` | 38 | 0 | 38 | анимация лендинга (SVG) |
| `src/styles/app-skin.css` | 36 | 5 | 41 | скин приложения (токены + `body` `#0a1d33`) |
| `src/features/landing/DemoObjectSection.tsx` | 19 | 1 | 20 | лендинг (SVG-схема, `:9–12`, `:151`, `:153`, `:180`, `:197`) |
| `src/features/house3d/palette.test.ts` | 11 | 0 | 11 | 3D (тест) |
| `src/features/house3d/palette.ts` | 10 | 0 | 10 | 3D |
| `src/features/landing/parts.tsx` | 2 | 0 | 2 | лендинг (логотип `:11–12`) |
| `src/features/house3d/houseScene.ts` | 2 | 0 | 2 | 3D (`:143`) |
| `src/features/house3d/HouseModel.tsx` | 0 | 1 | 1 | 3D (`:140`) |
| `index.html` | 1 | 0 | 1 | `theme-color` |
| **Итого** | **301** (300 в `src` + 1 `index.html`) | **18** | **319** | |

В `src/pages/*` и `src/components/*` (кроме `SiteLoop*`) hex/rgb **нет** — их цветовой долг целиком в классах палитры (§5.2).

**3D-остров `src/features/house3d/` — кандидат в исключение (не решено):** 24 жёстких цвета (`palette.ts` 10: фон `HOUSE_BG #0b2a4a`, 7 цветов этапов, `OTHER_STAGE_COLOR`, `CONTOUR_COLOR`; `houseScene.ts` 2; `HouseModel.tsx` 1 rgba; `palette.test.ts` 11) и 78 классов палитры (`HouseModel.tsx` 25, `House3DDevPage.tsx` 25, `StageCard.tsx` 12, `HouseModelBlock.tsx` 9, `StageRows.tsx` 7). WebGL-материалы получают числа, а не CSS-переменные; решать UI-дизайнеру: либо читать токены через `getComputedStyle`, либо исключение в `check-tokens.mjs` с обоснованием. Аналогичный вопрос для `SiteLoop` / `siteLoopScene.ts` (147 цветов, SVG/canvas-анимация лендинга).

### 5.2 Классы фиксированной палитры Tailwind (432)

| Файл | Кол-во | | Файл | Кол-во |
|---|---|---|---|---|
| `pages/ProjectDashboard.tsx` | 42 | | `pages/Issues.tsx` | 9 |
| `features/house3d/HouseModel.tsx` | 25 | | `features/house3d/HouseModelBlock.tsx` | 9 |
| `features/house3d/House3DDevPage.tsx` | 25 | | `components/TextField.tsx` | 9 |
| `components/IssueForm.tsx` | 25 | | `components/ReportStatusBadge.tsx` | 9 |
| `pages/Photos.tsx` | 20 | | `pages/Settings.tsx` | 8 |
| `pages/Tariff.tsx` | 18 | | `components/WorkerProjectCard.tsx` | 8 |
| `components/TaskCard.tsx` | 16 | | `components/StageProgressControl.tsx` | 8 |
| `pages/Today.tsx` | 13 | | `features/house3d/StageRows.tsx` | 7 |
| `features/house3d/StageCard.tsx` | 12 | | `components/ProjectLayout.tsx` | 7 |
| `components/IssueCard.tsx` | 12 | | `components/LanguageSwitcher.tsx` | 7 |
| `components/TaskForm.tsx` | 11 | | `components/StageHistoryPanel.tsx` | 6 |
| `components/ProjectListCard.tsx` | 11 | | `components/ProjectStatusBadge.tsx` | 6 |
| `components/PhotoUploadForm.tsx` | 11 | | `components/NextSteps.tsx` | 6 |
| `pages/Login.tsx` | 10 | | `pages/Stages.tsx` | 5 |
| `components/StageActionButtons.tsx` | 10 | | `pages/Dashboard.tsx` | 5 |
| `components/Button.tsx` | 10 | | `pages/ProfileNotConfigured.tsx` | 4 |
| `pages/Tasks.tsx` | 9 | | `components/Toggle.tsx` | 4 |
| `components/StageCard.tsx` | 4 | | `components/ErrorMessage.tsx` | 4 |
| `components/CreateProjectForm.tsx` | 4 | | `pages/NotFound.tsx` | 3 |
| `components/InviteWorkerLink.tsx` | 3 | | `components/ImagePicker.tsx` | 3 |
| `components/CenteredCard.tsx` | 3 | | `components/UrgentBadge.tsx` | 2 |
| `components/Spinner.tsx` | 2 | | `components/SiteLoop.tsx` | 2 |
| `components/ProgressBar.tsx` | 2 | | `components/MemberAccessRow.tsx` | 2 |
| `components/Modal.tsx` | 1 | | | |

По оттенкам: `white` 89 (`bg-white` 60, `text-white` 19, `border-white` 5, `outline-white` 4, `ring-white` 1), `slate-900` 40, `slate-500` 40, `slate-200` 40, `slate-300` 26, `slate-700` 25, `slate-600` 25, `slate-400` 23, `sky-600` 16, `slate-100` 13, `sky-700` 13, `slate-800` 12, `slate-50` 8, `sky-500` 6, `sky-200` 6, `red-600` 5, `red-800` 4, `sky-800` 3, `sky-100` 3, `green-800` 3, `green-100` 3, `black` 3, прочие ≤ 2. Без 3D-острова и `SiteLoop`: **352**. Варианты `hover:`/`focus:` входят в счёт (их 32).

### 5.3 Объявления шрифта

| Файл:строка | Что | Считается |
|---|---|---|
| `src/features/landing/fonts.css:3–18` | 16 × `@font-face` IBM Plex (Mono 400/500, Sans 400–600, Sans Condensed 600/700 — только latin/latin-ext) | 16 |
| `src/features/landing/landing.css:53` | `font-family: var(--display)` | 1 |
| `src/features/landing/landing.css:13–15` | стеки `--display/--sans/--mono` (Plex) | 3 |
| `src/styles/app-skin.css:168` | `font-family: var(--display)` | 1 |
| `src/styles/app-skin.css:53–55` | стеки `--display/--sans/--mono` (Plex, копия) | 3 |
| `src/index.css:11` | `body` `system-ui, 'Segoe UI', Roboto, sans-serif` | 1 |
| `src/index.css:31`, `:34` | `.site-loop .t-sans` inherit, `.t-mono` ui-monospace | 2 |
| `src/features/landing/DemoObjectSection.tsx:176` | SVG `fontFamily="var(--sans)"` | 1 |
| `src/components/SiteLoop.tsx:206`, `src/features/house3d/House3DDevPage.tsx:76` | класс `font-mono` | 2 |
| **Итого** | | **30** |
| `font:`-шорткаты с `var(--display/--sans/--mono)` | landing.css 42, app-skin.css 7 | 49 (отдельно) |

`index.html`: `font-family` нет, preload шрифтов нет.

### 5.4 Мелкий текст (цель — тело ≥ 17 px)

Важно: внутри `.bp` `text-sm` = 17 px (нарушения нет), `text-xs` = 15 px (нарушение); вне `.bp` и в модалках `text-sm` = 14 px, `text-xs` = 12 px; в `.bp-native` — стоковые 12/14 px. `text-[11px]` = 11 px везде.

| Файл | xs | sm | [Npx] | | Файл | xs | sm | [Npx] |
|---|---|---|---|---|---|---|---|---|
| `pages/ProjectDashboard.tsx` | 4 | 6 | 3 | | `components/TaskForm.tsx` | 0 | 4 | 0 |
| `pages/Photos.tsx` | 3 | 6 | 0 | | `components/TaskCard.tsx` | 3 | 1 | 0 |
| `features/house3d/House3DDevPage.tsx` | 3 | 5 | 0 | | `components/StageHistoryPanel.tsx` | 3 | 1 | 0 |
| `components/IssueForm.tsx` | 0 | 7 | 0 | | `components/ProjectListCard.tsx` | 2 | 1 | 1 |
| `pages/Tariff.tsx` | 1 | 5 | 0 | | `pages/Today.tsx` | 0 | 3 | 0 |
| `features/house3d/HouseModel.tsx` | 3 | 3 | 0 | | `pages/Stages.tsx` | 1 | 2 | 0 |
| `features/house3d/HouseModelBlock.tsx` | 0 | 5 | 0 | | `pages/Settings.tsx` | 1 | 2 | 0 |
| `pages/Tasks.tsx` | 0 | 4 | 0 | | `pages/ProfileNotConfigured.tsx` | 1 | 2 | 0 |
| `pages/Login.tsx` | 0 | 4 | 0 | | `components/ProjectLayout.tsx` | 1 | 2 | 0 |
| `pages/Issues.tsx` | 0 | 4 | 0 | | `components/PhotoUploadForm.tsx` | 0 | 3 | 0 |
| `features/house3d/StageCard.tsx` | 1 | 3 | 0 | | `components/IssueCard.tsx` | 2 | 1 | 0 |
| `components/TextField.tsx` | 2 | 2 | 0 | | `pages/NotFound.tsx` | 0 | 2 | 0 |
| `pages/Dashboard.tsx` | 1 | 1 | 0 | | `features/house3d/StageRows.tsx` | 0 | 2 | 0 |
| `components/NextSteps.tsx` | 1 | 1 | 0 | | `components/MemberAccessRow.tsx` | 1 | 1 | 0 |
| `components/InviteWorkerLink.tsx` | 0 | 2 | 0 | | по 1: `WorkerProjectCard` sm, `UrgentBadge` xs, `StageProgressControl` sm, `StageCard` sm, `Spinner` sm, `SiteLoop` sm, `ReportStatusBadge` xs, `ProjectStatusBadge` xs, `LanguageSwitcher` xs, `ImagePicker` xs, `ErrorMessage` sm, `CreateProjectForm` xs, `Button` sm | | | |
| **Итого** | **40** | **92** | **4** | | | | | |

CSS < 17 px: `landing.css` 38 (строки 59, 70, 79, 84, 99, 101, 111, 116, 118, 124, 132, 136, 139, 141, 142, 163, 165, 170, 176, 178, 182, 190, 193, 200, 204, 212, 213, 215, 228, 235, 241, 244, 247, 265, 269, 270, 272, 275 — 12–16 px); `app-skin.css` 3 (`:216` 14 px переключатель языка, `:282` 13 px `.bp-eyebrow`, `:304` 15 px `.bp-pill`); `index.css:25` 16 px (поля ввода на мобильном).

### 5.5 Касания < 48 px (очевидные)

| Файл:строка | Класс | Размер |
|---|---|---|
| `components/StageProgressControl.tsx:99`, `:123` | `size-8` кнопки −/+ | 32 px |
| `components/StageActionButtons.tsx:19` | `size-9` | 36 px, но в `.bp` перекрыто `.bp-stage-actions button` → 48 px (в `.bp-native` и модалках — нет) |
| `components/LanguageSwitcher.tsx:40` | `min-h-8 min-w-9` | 32 px; в шапке `.bp-nav` → 48 px, на «Входе» и «Тарифе» — 32 px |
| `components/IssueForm.tsx:117` | `summary min-h-8` | 32 px |
| `features/house3d/HouseModel.tsx:134`, `:145` | `min-h-8`, `min-h-9` | 32/36 px; `.bp .bp-native button` даёт 48 px только `<button>` |
| `components/Toggle.tsx:18` | `h-6 w-11` | 24 px |
| `pages/Login.tsx:58` | `min-h-11` | 44 px |
| `components/TaskCard.tsx:42`, `pages/Photos.tsx:56` | `select py-1.5 text-sm` | ≈ 32–38 px |
| `components/Button.tsx:12` (база всех кнопок) | `px-4 py-2 text-sm` | ≈ 36 px вне `.bp`, ≈ 42 px в `.bp`; 48+ только с `bp-main`/`bp-tap` или в `.bp-nav` |
| `components/TextField.tsx:23` | `px-3 py-2 text-sm` | ≈ 36–42 px |
| бейджи `py-0.5` (`IssueCard:83`, `TaskCard:84`, `ProjectStatusBadge:14`, `UrgentBadge:12`, `ProjectListCard:55`) | не кнопки | — |

Ещё: `StageActionButtons.tsx:38` `lg:invisible` — на десктопе действия появляются только при наведении.

## 6. IBM Plex: что удалить

| Что | Где | Размер / строки |
|---|---|---|
| `ibm-plex-mono-400-{cyrillic-ext,cyrillic,latin-ext,latin}.woff2` | `public/fonts/` | 6 912 + 8 356 + 13 348 + 14 708 |
| `ibm-plex-mono-500-{cyrillic-ext,cyrillic,latin-ext,latin}.woff2` | `public/fonts/` | 6 972 + 8 460 + 13 432 + 14 888 |
| `ibm-plex-sans-{cyrillic-ext,cyrillic,latin-ext,latin}.woff2` | `public/fonts/` | 23 568 + 29 512 + 30 964 + 45 712 |
| `ibm-plex-sans-condensed-600-{latin-ext,latin}.woff2` | `public/fonts/` | 16 044 + 19 816 |
| `ibm-plex-sans-condensed-700-{latin-ext,latin}.woff2` | `public/fonts/` | 16 092 + 19 352 |
| **Итого woff2** | 16 файлов | **288 136 байт** |
| `LICENSE-IBM-Plex.txt` | `public/fonts/` | 4 363 байт |
| 16 правил `@font-face` + 2 строки комментария | `src/features/landing/fonts.css:1–18` (файл целиком) | |
| `@import './fonts.css'` | `src/features/landing/landing.css:7` | |
| `@import '../features/landing/fonts.css'` | `src/styles/app-skin.css:15` | |
| Стеки `'IBM Plex …'` в `--display/--sans/--mono` | `landing.css:13–15`, `app-skin.css:53–55` | |
| Комментарий про Plex Mono | `app-skin.css:278–279` | |
| Preload в `index.html` | — | **нет** |
| Записи в `package.json` / `package-lock.json` | — | **нет** (шрифты самохостятся из `public/`, npm-пакета нет) |
| `vercel.json`, `vite.config.ts`, `scripts/*` | — | упоминаний нет |
| Документы (не код) | `docs/pr/A0c-ui-quickpass.md`, `docs/design-inputs/landing-prototype/index.html`, `loop.html` | не трогать (входные/история) |

## 7. Что передать следующим этапам

1. Модалки вне `.bp` — самый массовый источник «выбивающихся» экранов. Портал нужно монтировать в контейнер с темой или переносить токены на `:root`.
2. Тема должна жить на `:root`/`html` (`tokens.css`), а не на обёртке страницы: сейчас 14 экранов не имеют обёртки вовсе.
3. Переназначение палитры Tailwind в `.bp` неполное (см. §2): после перехода на токены классы палитры надо убрать, а не перекрашивать.
4. Решить исключения для `house3d` и `SiteLoop` (171 жёсткий цвет из 319) до включения строгого `check-tokens.mjs`.
5. `/tariff` не закрыт по роли; вкладка «Задачи» у рабочего скрыта, но маршрут открыт — для UX-проектировщика (03).
6. Термины ролей: «Генподрядчик/Прораб» в `ru.json` против «владелец/бригадир» в брифе.
