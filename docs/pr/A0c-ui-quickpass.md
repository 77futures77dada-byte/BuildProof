# A0c · claude/ui-quickpass: «Объекты» and «Обзор объекта» in the landing style

**Base:** fresh `origin/main` (A0 and A0b already merged).

## What was done

Only the outer layer of the screens changed. Data, logic, routes and dictionaries are untouched, and no dependencies were added.

- **One scoped stylesheet**, `src/styles/app-skin.css`, loaded in the app chunk only. The landing chunk does not grow. It applies inside `.bp`, the wrapper of «Объекты» and of the project shell (`ProjectLayout`).
  - Inside `.bp`, Tailwind's palette variables (slate, sky, green, amber, red) point at the prototype tokens: navy `#0b2a4a`, paper, line, ok, warn, bad. Existing utility classes pick up the new colours without changes to markup.
  - A few `bp-*` hook classes cover what tokens cannot do alone. Outside `.bp` they have no effect.
- **Fonts:** IBM Plex Sans Condensed for headings, IBM Plex Sans for text. They come from the same self-hosted files as the landing (`public/fonts`, via `features/landing/fonts.css`).
- **Main button:** yellow `#ffc72c` with navy text, 56 px high: «Создать объект», «Создать первый объект», «Отметить первый этап». Other primary buttons are solid navy, which inverts correctly in dark mode.
- **Statuses:** shape plus text on a tinted pill:
  - ● green «Отчёт сегодня»
  - ▲ amber «N дня без отчёта»
  - ■ red «N дней без отчёта»
  - ○ neutral outline for the rest

  «N открытых» issues use an amber pill with the warning icon.
- **Large readiness figure:** 34–44 px Condensed, on the list cards and in the overview's «Готовность» tile. Bars are navy on a line-coloured track, as in the prototype.
- **Cards:** surface background, a 1 px line border, 14 px radius and the prototype shadow. Section headings are 22 px Condensed.
- **Light and dark theme** from `prefers-color-scheme`, with `:root[data-theme]` honoured like on the landing. Dark mode is on for «Объекты» and the overview tab only. The other project tabs share the shell but are not redrawn yet, so they stay light (see below).
- **Touch targets ≥ 48 px** on both screens:
  - header links
  - language switcher
  - «Выйти»
  - tabs
  - the per-stage photo / task / issue actions (were 36 px)
  - the 3D model's stage chips and «Проиграть стройку» (were 32–36 px)
  - the WhatsApp line
- **Body text 17 px** (Tailwind `text-sm` and `text-base`). Small print is 15 px.
- **3D model block:** keeps its own dark palette. A `bp-native` class restores the stock colours inside it; only its buttons got larger.

**Screenshots, before → after:** `docs/screens/quickpass/{before,after}-<screen>-<light|dark>-<390x844|1440x900>.png`. Screens: `dashboard`, `dashboard-empty`, `overview`, `overview-new`. In the "before" set dark equals light, because the app had no dark theme. The full A0 set in `docs/screens/` was regenerated: the shared project shell changed on every tab.

**Checks:**
- lint clean
- `tsc -b` clean
- tests 38/38
- `ALLOW_PLACEHOLDERS=1 npm run build` OK
- `SET=quickpass` in `docs/screens/capture.mjs`, on every screen at 390 and 1440, light and dark: no horizontal scroll, no Latin words, base font 17 px, no touch target under 48 px at 390. The full set also passes the scroll and Latin checks.

## What I set aside

- **Dark theme on the other project tabs** (Этапы, Фото, Задачи, Проблемы, Настройки) and on modals. Their inner markup is not ready for it, and that is A6 (redraw after the mock-ups). They now get the light skin from the shared shell; it reads well in the screenshots.
- **Plex Mono for labels and the language switcher**, as in the prototype. Fonts load with `font-display: optional`, and the mono face often arrives too late: Cyrillic labels then fell back to Courier. Labels use Plex Sans with letter-spacing instead.

## What remains

- **IBM Plex Sans Condensed has only Latin files in `public/fonts`.** Russian headings fall back to `Arial Narrow` or the system font, as on the landing. To fix: add `ibm-plex-sans-condensed-{600,700}-cyrillic(-ext).woff2`. This is a font file, not a dependency, but it is a separate decision.
- **First visit shows system fonts** (`font-display: optional`, as on the landing); Plex appears from the second view on. The capture script now loads every page twice, so the screenshots show what a returning user sees.
- **On a 390 px phone the «Объекты» header takes two rows** (logo, then Тариф / language / Выйти) to keep 48 px targets without horizontal scroll.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
