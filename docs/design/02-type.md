# 02 — Шрифт (Исследователь, 2026-11-25)

**Итог.** Фаворит: **Onest** (variable, ось wght 100–900). Запасной: **Geologica** (variable, только ось wght).
Plex исключён по решению владельца и в сравнении не участвует.

Всё ниже проверено по самим файлам шрифтов. Для разбора таблиц `cmap`, `GSUB`, `hmtx`, `OS/2` и `fvar` использован Python fontTools 4.69.1 (поставлен во временную папку, не в проект). Размеры взяты из байтов скачанных файлов.
Рендер: `docs/design/type-test/index.html` (полностью локальный, `@font-face` → `./fonts/`).

## 1. Источник файлов (версии закреплены)
Все файлы взяты с `https://cdn.jsdelivr.net/npm/<пакет>@<версия>/files/<файл>`:

| Гарнитура | Статические веса | Variable |
|---|---|---|
| Inter | `@fontsource/inter@5.3.0` | `@fontsource-variable/inter@5.3.0` |
| Manrope | `@fontsource/manrope@5.3.0` | `@fontsource-variable/manrope@5.3.0` |
| Golos Text | `@fontsource/golos-text@5.3.0` | `@fontsource-variable/golos-text@5.3.0` |
| Onest | `@fontsource/onest@5.3.1` | `@fontsource-variable/onest@5.3.1` |
| Geologica | `@fontsource/geologica@5.3.0` | `@fontsource-variable/geologica@5.3.0` |
| Roboto Flex | `@fontsource/roboto-flex@5.3.0` (только 400) | `@fontsource-variable/roboto-flex@5.3.0` |
| PT Sans | `@fontsource/pt-sans@5.3.0` (400, 700) | variable-пакета нет |

Лицензия во всех `package.json` указана как `OFL-1.1`. Тексты лицензий лежат в `type-test/fonts/OFL-*.txt`. Для Golos Text tnum дополнительно сверен с исходником `google/fonts` (`ofl/golostext/GolosText[wght].ttf`, Version 2.004).

## 2. Отсев (проверка по файлам)
Как читать таблицу:
- «Эст.» — все `õäöüšž` и `ÕÄÖÜŠŽ` есть в `cmap` объединения subset-ов latin + latin-ext.
- «Кир.» — весь алфавит а–я и Ё/ё есть в cyrillic.
- «tnum» — есть ли фича в `GSUB` latin-файла (в нём лежат цифры).
- «tnum ровный» — получают ли все цифры 0–9 после подстановки tnum одинаковую ширину по `hmtx`.
- КБ — сумма трёх subset-ов (latin + latin-ext + cyrillic), без cyrillic-ext, greek и vietnamese.

| Шрифт | Эст. | Кир. | tnum | tnum ровный | КБ: variable | КБ: 400+600+700 | Итог |
|---|---|---|---|---|---|---|---|
| Inter | да | да | да | да | 148.5 | 198.8 | **вне**: вес. Даже 400+600 = 131.9 КБ > 120 |
| Manrope | да | да | да | да | 53.2 | 88.8 | шорт-лист |
| Golos Text | да | да | да | **нет**: `.tf`-цифры 580/585/605/610/620 ед. | 77.3 | 77.3 | **вне**: tnum не выравнивает. Так и в исходнике google/fonts v2.004 |
| Onest | да | да | да | да (плюс `. , :`) | 76.2 | 101.8 | шорт-лист |
| Geologica | да | да | да | да в variable. В static «6.tf» = 1299 против 1296 ед. (0.15 %, незаметно) | 62.3 | 108.9 | шорт-лист |
| Roboto Flex | да | да | **нет** (есть только pnum) | цифры моноширинные по умолчанию | 71.7 | — (только 400) | **вне**: по правилу «нет tnum». Плюс характер «Android по умолчанию» |
| PT Sans | да | да | **нет** (нет ни tnum, ни pnum) | цифры моноширинные по умолчанию | — | 400+700 = 203.0 | **вне**: нет tnum и вес > 120 |

Проверка на латиницу эстонского. Golos Text, Onest и Geologica прошли полностью. `õ ä ö ü` лежат в latin-файле (U+00F5…U+00FC), `š ž` — в latin-ext (U+0161, U+017E). Поэтому latin-ext обязателен, иначе `š ž` уйдут в системный шрифт.

## 3. Метрики шорт-листа (latin, вес 400, из `OS/2` и контуров)
| | Manrope | Onest | Geologica |
|---|---|---|---|
| x-height / em | 0.540 | 0.527 | 0.495 (variable 0.480) |
| x-height / cap | 0.75 | 0.75 | 0.71 |
| Толщина штриха `l` / em (насколько тёмный текст при 400) | 0.073 (светлый) | 0.087 | 0.110 (тёмный) |
| Ширина «Элва, Кооли 5 · кровля 60% · 5 дней без отчёта» при 17 px | 373 px | 385 px | 397 px |
| То же, ET «Ülemiste õhtune töö · šahti žürii · 60% valmis» | 347 px | 351 px | 368 px |
| `l` выше `I`? (верх l / верх I) | 1.021 | 1.000 (одинаковые) | 1.029 |
| `0` уже `O`? (ширина 0 / O) | 0.71 (лучше всех) | 0.83 | 0.78 |
| tnum затрагивает | 0–9 | 0–9 и `. , :` (даты 01.11.2026 встают ровно) | 0–9 |
| Оси variable | wght 200–800 | wght 100–900 | wght 100–900 |

Наблюдения по рендеру (`type-test/index.html`, Chromium 1243, 1×):
- **I / l / 1.** Ни у одного из трёх у `l` нет хвостика: это фичи `cv`/`ss`, а в subset-ах Google/fontsource их нет. Хвостик есть только у Golos Text, но Golos выбыл из-за tnum. У Manrope `I`, `l` и `|` геометрически одинаковы, это худший вариант. У Onest и Geologica `1` отличается флажком, `I` и `l` почти не различаются. Вывод для UI: в коде доступа и номерах ссылок рабочих не смешивать `I`/`l`, а алфавит кодов брать без `I l O 0`.
- **3/8, 6/9.** У всех трёх различимы при 17 px. У Onest апертуры `3`, `6`, `9` самые открытые.
- **Апертуры `а е с з э`.** Onest открытый. Manrope геометрический, концы штрихов почти горизонтальные. Geologica плотнее и темнее.
- **Блик (contrast 0.55).** Geologica 400 читается лучше всех за счёт толщины. Onest 400 нормально. Manrope 400 бледнеет, для основного текста на улице ему нужен 500.
- **Характер.** Manrope — частый шрифт стартап-лендингов, геометричный и «модный». Это против требования «не стартап-игрушка». Onest — спокойный нейтральный гротеск. Geologica — крепкий, «инженерный», но заголовки 600 при 28 px выглядят тяжело.

## 4. Оценка (0–5; вес критерия в скобках)
| Критерий | Manrope | **Onest** | Geologica |
|---|---|---|---|
| Читаемость 390 px на улице: x-height, апертуры, штрих (×3) | 3 | **4** | 4 |
| Различимость 1/l/I, 0/O, 3/8, 6/9 (×2) | 2 | **3** | 3 |
| Табличные цифры: проценты и даты (×2) | 4 | **5** (`. , :` тоже) | 4 |
| Вес ≤ 120 КБ (×1) | 5 (53 КБ) | **4** (76 КБ) | 5 (62 КБ) |
| Характер «надёжный, не игрушка» (×2) | 2 | **4** | 4 |
| Экономия ширины на 390 px (×1) | 5 | **4** | 3 |
| **Итого (макс. 55)** | **35** | **44** | **42** |

**Фаворит — Onest.** Самые открытые формы и нейтральный характер. Единственный, у кого tnum ровняет ещё и точку, запятую и двоеточие: в датах `01.11.2026` и во времени `08:30` столбцы встают ровно. Вписывается в бюджет с запасом: 76.2 КБ за все веса.
**Запасной — Geologica.** Темнее при 400, что лучше на солнце, и легче по весу. Но шире: строка карточки на 390 px переносится раньше. Заголовки тяжелее, tnum только для цифр.

## 5. Что кладём в `public/fonts/` (фаворит Onest)
Variable, одна ось wght. Используем 400 (текст), 500 (текст на экранах рабочего и на улице), 600 (заголовки, цифры), 700 (крупная цифра готовности).

| Файл (`public/fonts/onest/`) | Источник | Байт |
|---|---|---|
| `onest-latin-wght-normal.woff2` | `@fontsource-variable/onest@5.3.1/files/` | 33 760 |
| `onest-latin-ext-wght-normal.woff2` | там же | 28 452 |
| `onest-cyrillic-wght-normal.woff2` | там же | 15 860 |
| `OFL.txt` | `@fontsource-variable/onest@5.3.1/LICENSE` | 4 378 |
| **Итого woff2** | | **78 072 Б = 76.2 КБ** |

Что реально грузит браузер:
- Русская страница: latin + cyrillic = 49 620 Б (48.5 КБ).
- Эстонская: latin + latin-ext = 62 212 Б (60.8 КБ). latin-ext грузится только при появлении `š ž` и подобных букв.

Статическая альтернатива 400+600 весит 68 976 Б. Она отклонена: нет 500 для улицы, файлов 6 вместо 3.

Запасной вариант Geologica (`public/fonts/geologica/`):

| Файл | Байт |
|---|---|
| `geologica-latin-wght-normal.woff2` | 24 944 |
| `geologica-latin-ext-wght-normal.woff2` | 22 404 |
| `geologica-cyrillic-wght-normal.woff2` | 16 428 |
| **Итого** | **63 776 Б = 62.3 КБ** |

Источник: `@fontsource-variable/geologica@5.3.0/files/`.

### CSS для `src/styles/tokens.css` (Onest)
`unicode-range` скопированы из `@fontsource-variable/onest@5.3.1/index.css`.
```css
@font-face {
  font-family: "Onest";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/onest/onest-cyrillic-wght-normal.woff2") format("woff2");
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}
@font-face {
  font-family: "Onest";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/onest/onest-latin-ext-wght-normal.woff2") format("woff2");
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329,
    U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: "Onest";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/onest/onest-latin-wght-normal.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
:root {
  --font-sans: "Onest", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
/* проценты, даты, время, суммы */
.num, [data-num] { font-variant-numeric: tabular-nums; }
```
Preload: только `onest-latin-wght-normal.woff2` (`<link rel="preload" as="font" type="font/woff2" crossorigin>`), потому что он нужен на всех трёх языках.

### CSS для запасного (Geologica)
Блоки те же, меняются только `font-family: "Geologica"` и пути `/fonts/geologica/geologica-<subset>-wght-normal.woff2`. `unicode-range` совпадают: проверено по `@fontsource-variable/geologica@5.3.0/index.css`.

## 6. Важно для UI-дизайнера (найдено при проверке)
1. **`○` (U+25CB), `✓` (U+2713) и `→` (U+2192) нет ни в одном subset-е** всех трёх шрифтов. Они не попадают в `unicode-range`, и в cmap latin-файла их тоже нет. Браузер нарисует их системным шрифтом, разным на iPhone, Android и Windows. Значки статуса («ждёт проверки ○», «проверено ✓») делать inline-SVG, а не символом шрифта. Символы `€`, `№`, `−`, `·` в subset-ах есть.
2. tnum включать явно (`font-variant-numeric: tabular-nums`) на процентах, датах, времени и суммах. По умолчанию у всех трёх цифры пропорциональные.
3. В кодах и ссылках рабочих не использовать алфавит с `I l 1 O 0`: ни у одного из трёх шрифтов `I` и `l` надёжно не различаются.
4. Основной текст на экранах рабочего — вес 500. При 400 текст на солнце бледнеет: см. блок «блик» в рендере.
5. Не подключать Google Fonts ни через `<link>`, ни через `@import`. Все файлы локальные.
