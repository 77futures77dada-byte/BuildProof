# 04 — Тексты приложения (роль: контент)

Редакция 1, 2026-11-26. Этап 4 (параллельно с `03-wireframes.md`).

Источники (обязательны):
- `docs/design/design-brief.md` §1, §2.1б;
- `docs/design/01-business-flow.md` ред. 4: §0.3 (шлюз «почта», таблица ответов), §3.2–3.4 (пути, черновики, ошибки RPC), §4 (главные действия), §9 (обещания без продукта);
- `docs/design/06-audit-stage1-residual.md` (обязательные строки);
- `docs/design/critique-table.md`, `docs/design-inputs/buildproof-decisions.md`;
- текущие `src/i18n/locales/ru.json`, `en.json`, `et.json`; коды ошибок из `supabase/migrations/000–005` и `api/invite.ts` (только чтение).

Код и файлы локалей этим документом не меняются. Реализация переносит таблицу §2 в `ru.json` / `en.json` / `et.json` один к одному.

Обозначения в колонке «почему»:
- **нов.** — новый ключ; **изм.** — меняется текст; **изм. ET** / **изм. EN** — меняется только перевод;
- `01 §n` — `01-business-flow.md`; `R:<пункт>` — `06-audit-stage1-residual.md`; `CT n` — `critique-table.md`; `brief §n` — `design-brief.md`;
- **K15** и т.п. — строка готова, но выводится только после этого пункта Codex; **шлюз+** — только при открытом `VITE_EMAIL_GATE_OPEN`; **шлюз−** — только при закрытом; **legal** — только при заполненном `src/config/legal.ts`.

---

## 1. Правила тона

### 1.1. Как пишем
1. **Боль и результат, не функция.** Не «Модуль отчётов», а «Видно, где работа идёт, а где стоит». Каждая строка отвечает «что мне с этого» владельцу или «что нажать» рабочему.
2. **Коротко.** Одна мысль в предложении. Кнопка — глагол, 1–3 слова: «Отправить», «Добавить на объект». Ошибка — что случилось + что сделать: «Фото не загрузилось. Снимите ещё раз».
3. **Пустое состояние называет следующее действие и кто его делает** (brief §2.1 п.7): «На вас пока нет задач. Их ставит владелец».
4. **Обращение на «вы»**, без «пожалуйста» в кнопках. Владельца не учим («Не забудьте…»), а показываем факт.
5. **Роли:** Владелец / Бригадир / Рабочий / Заказчик. Не «Генподрядчик», не «Прораб», не «менеджер», не «администратор», не «сотрудник» в заголовках.
6. **Глаголы без рода**, где возможно: «{{name}} · Кровля: было 40%, стало 50%», а не «отметил/отметила». Имя человека подставляется, пол мы не знаем.
7. **Текст сервера не показываем никогда** (01 §0.3). Ключ без `{{error}}`.
8. **Честно о том, чего нет:** «Приглашение рабочих включится после настройки почты». Не «скоро», не «в разработке», не даты.

### 1.2. Запрещено
| Что | Вместо |
|---|---|
| «реальный», «реальное», «реально» | «фактический», «что отметила бригада» |
| обещания оффлайна, фоновой отправки, «отправим, когда появится сеть» (до теста на iPhone, 01 §3.4) | «Сохранено на телефоне, не отправлено. Откройте эту страницу, когда появится сеть» |
| геолокация, SMS, Telegram, push как готовые | не упоминаем в приложении |
| самообесценивание («новый продукт», «без громких обещаний», «пока сыро») | факт без оправданий |
| `[плейсхолдеры]` и пустые контакты в видимом тексте | строка с контактом выводится только при заполненном `legal.ts` |
| символы ○ ✓ → ● ✗, а также ← ▲ ■ ▸ ▾ в строках | значки только SVG; в тексте — слова |
| латиница в RU, кроме `scripts/check-ru-latin.allow.json` (BuildProof, PDF, WhatsApp, email, ID, ГБ, Eesti, English и др.) | «Почта», а не «Email»; «в обычном браузере телефона», а не «в Safari/Chrome» |
| выдуманные цифры («за 12 минут», «10 секунд», «экономит 5 часов») | цели дизайна не превращаем в обещания |
| «Принято» / «Ждёт проверки» в приложении до K15 | «Отмечено бригадой» / «Проверено» (R:И4-М2) |
| «и заказчик», «страница заказчика», «личная ссылка» до `client-links.md` / C3 | не упоминаем |

### 1.3. Словарь (одно слово на одну вещь)
| RU | EN | ET (`TODO native ET review`) |
|---|---|---|
| объект | site | objekt |
| этап | stage | etapp |
| отчёт | report | aruanne |
| Владелец | Owner | Omanik |
| Бригадир | Foreman | Brigadir |
| Рабочий | Worker | Tööline |
| Заказчик | Client | Tellija |
| почта | email | e-post |
| код из письма | code from the email | kood e-kirjast |
| на паузе | paused | pausil |
| не отправлено | not sent | saatmata |

EN: в существующих ключах «project» и «site» смешаны (`dashboard.title` = Projects, `tariff.*` = sites). Новые и изменённые ключи — только «site». Остальные EN-ключи («Projects», «Create project», «New project») переводятся на «site» тем же PR без смены RU — список в §6.

---

## 2. Ключи: изменённые и новые

Плюральные формы: RU `_one/_few/_many/_other`, EN и ET `_one/_other`. Каждая форма — отдельная строка; «—» в EN/ET значит «формы нет в этом языке».
Интерполяция — только `{{var}}`. Переименованная переменная помечена в «почему» как «код:».
Все ячейки ET — черновик, `TODO native ET review`.

### 2.1. `common`
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `common.unexpectedError` | Не получилось. Попробуйте ещё раз. | Something went wrong. Try again. | Ei õnnestunud. Proovige uuesti. | изм. Короче, без «непредвиденная» (§1.1 п.2) |
| `common.noCompany` | Компания ещё не настроена. Откройте «Объекты» и нажмите «Проверить снова». | Your company is not set up yet. Open “Sites” and press “Check again”. | Ettevõte pole veel seadistatud. Avage „Objektid“ ja vajutage „Kontrolli uuesti“. | изм. «Администратора» в фирме из 1 человека нет; компания создаётся сама (01 §3.1 шаг 3) |
| `common.sessionMissing` | Вы вышли из аккаунта. Войдите снова. | You are signed out. Sign in again. | Olete välja logitud. Logige uuesti sisse. | изм. «Сессия» — технический термин |
| `common.save` | Сохранить | Save | Salvesta | нов. 01 §3.1 шаг 3б |
| `common.later` | Позже | Later | Hiljem | нов. 01 §3.1 шаг 3б |
| `common.delete` | Удалить | Delete | Kustuta | нов. черновики, `stale` (01 §3.4) |
| `common.undo` | Отменить | Undo | Võta tagasi | нов. плашка отмены (01 §3.3) |
| `common.actions` | Действия | Actions | Toimingud | нов. подпись кнопки-меню «⋯» для чтения с экрана (01 §4) |
| `common.stay` | Остаться | Stay | Jää | нов. выход с черновиками (01 §3.4 правило 6) |
| `common.signOutAnyway` | Выйти всё равно | Sign out anyway | Logi ikkagi välja | нов. то же |
| `common.contact` | Связь: {{phone}}, {{email}} | Contact: {{phone}}, {{email}} | Kontakt: {{phone}}, {{email}} | нов. **legal**. Контакт в тупиках (brief §2.1б п.10) |

### 2.2. `roles`, `projectStatus`
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `roles.gc` | Владелец | Owner | Omanik | изм. brief §2.1 п.3 |
| `roles.foreman` | Бригадир | Foreman | Brigadir | изм. brief §2.1 п.3; «Töödejuhataja» — другая должность |
| `roles.worker` | Рабочий | Worker | Tööline | изм. ET: «Ehitaja» расходится с «tööline» во всех текстах |
| `projectStatus.paused` | На паузе | Paused | Pausil | изм. чип «На паузе» (01 §3.2 п.9) |

### 2.3. `auth` — вход по паролю (оба состояния шлюза)
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `auth.subtitle` | Войдите, чтобы увидеть свои объекты | Sign in to see your sites | Logige sisse, et näha oma objekte | изм. результат вместо «личный кабинет» |
| `auth.email` | Почта | Email | E-post | изм. Латиница; 01 §4 «Почта, не Email» |
| `auth.invalidCredentials` | Неверная почта или пароль. | Wrong email or password. | Vale e-post või parool. | изм. Латиница «email» |
| `auth.profileLoadFailed` | Не удалось загрузить профиль. Попробуйте ещё раз. | Could not load your profile. Try again. | Profiili ei õnnestunud laadida. Proovige uuesti. | изм. код: убрать `{{error}}` (`ProtectedRoute.tsx:32`) — текст сервера не показываем (01 §0.3) |
| `auth.tagline` | Фото и проценты по этапам от ваших рабочих. Видно, где работа идёт, а где стоит. | Photos and stage percentages from your workers. You see where work moves and where it stalls. | Fotod ja etappide protsendid teie töölistelt. Näete, kus töö käib ja kus seisab. | изм. R:И4-HIGH — убрать «и заказчика» |
| `auth.backHome` | На главную | Back to home | Avalehele | изм. символ «←» — только SVG (brief §1) |
| `auth.startFree` | Начать бесплатно | Start for free | Alusta tasuta | без изм. RU; выводится только **шлюз+** (R:М4-1) |
| `auth.signupLater` | Регистрация откроется после настройки почты. | Sign-up opens once email sending is set up. | Registreerimine avaneb, kui e-posti saatmine on seadistatud. | нов. **шлюз−**, вместо «Нет аккаунта? Начать бесплатно» (R:М4-1) |
| `auth.forgotPassword` | Забыли пароль? | Forgot your password? | Unustasite parooli? | нов. **шлюз+** (01 §3.2 п.1) |
| `auth.recoveryLater` | Восстановление пароля по почте включится после настройки почты. | Password recovery by email turns on once email sending is set up. | Parooli taastamine e-posti teel lülitub sisse, kui e-posti saatmine on seadistatud. | нов. **шлюз−**, вместо «Забыли пароль?» (01 §3.2 п.1); рядом `common.contact` только **legal** |
| `auth.signInPassword` | Войти с паролем | Sign in with password | Logi sisse parooliga | нов. экран `authentication_required` при **шлюз−** (R:Б4-М4) |

### 2.4. `auth` — вход по коду (**шлюз+**)
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `auth.signInWithCode` | Войти по коду из письма | Sign in with a code from email | Logi sisse e-kirja koodiga | нов. 01 §3.2 п.1 |
| `auth.sendCode` | Прислать код | Send code | Saada kood | нов. 01 §0.3, §4 |
| `auth.sendCodeTo` | Прислать код на {{email}} | Send code to {{email}} | Saada kood aadressile {{email}} | нов. 01 §0.3; маску «p•••@gmail.com» делает код, не строка |
| `auth.otherEmail` | Другая почта | Another email | Teine e-post | нов. 01 §0.3 |
| `auth.haveInviteCode` | У меня есть код из приглашения | I have a code from an invitation | Mul on kutse kood | нов. R:Б4-HIGH, `verifyOtp` `type:'invite'` |
| `auth.code` | Код из письма | Code from the email | Kood e-kirjast | нов. подпись поля, `autocomplete="one-time-code"` (01 §4) |
| `auth.codeHint` | Цифры из письма от BuildProof. Можно вставить. | The digits from the BuildProof email. You can paste them. | Numbrid BuildProofi e-kirjast. Võite need kleepida. | нов. R:Б4-М5 — поле 6–10 цифр, без «6 цифр» в тексте |
| `auth.signInWithCodeSubmit` | Войти | Sign in | Logi sisse | нов. главная кнопка экрана кода (01 §4); отдельный ключ, чтобы не путать с `common.signIn` в шапке |
| `auth.codeSent` | Код отправлен на {{email}}. Через минуту проверьте «Спам». | Code sent to {{email}}. If it is not there in a minute, check Spam. | Kood saadeti aadressile {{email}}. Kui minuti pärast pole, vaadake rämpsposti. | нов. 01 §0.3 «успех»; хранится в `sessionStorage` (R:Б4-М5) |
| `auth.resendIn` | Прислать снова через {{count}} с | Resend in {{count}} s | Saada uuesti {{count}} s pärast | нов. 01 §0.3, отсчёт 60 с; «с» не склоняется, плюралей нет |
| `auth.resend` | Прислать снова | Resend | Saada uuesti | нов. 01 §4 |
| `auth.retryAfter` | Новый код можно через {{count}} с | You can get a new code in {{count}} s | Uue koodi saate {{count}} s pärast | нов. `429` на адрес (01 §0.3); повтор раньше срока = отсчёт, не «письма не уходят» (R:Б4-М6) |
| `auth.projectLimit` | Сейчас письма не уходят. Попробуйте позже. | Emails are not going out right now. Try again later. | Praegu e-kirju ei saadeta. Proovige hiljem. | нов. `over_email_send_rate_limit` на проект (01 §0.3); «отправлено» не пишем |
| `auth.neutralSent` | Если адрес есть в BuildProof, код придёт. Через минуту проверьте «Спам». | If this address is in BuildProof, the code will arrive. If not there in a minute, check Spam. | Kui see aadress on BuildProofis, kood tuleb. Kui minuti pärast pole, vaadake rämpsposti. | нов. адрес не найден, только публичный `/login` (01 §0.3, R:Б4-М6) |
| `auth.sendFailed` | Не отправлено. Попробуйте ещё раз. | Not sent. Try again. | Ei saadetud. Proovige uuesti. | нов. сеть / прочее (01 §0.3) |
| `auth.codeInvalid` | Код не подошёл или устарел. Проверьте цифры или пришлите новый. | The code is wrong or expired. Check the digits or get a new one. | Kood ei sobi või on aegunud. Kontrollige numbreid või küsige uus. | нов. ответ `verifyOtp` (Supabase отдаёт `otp_expired` и на неверный, и на старый код) |
| `auth.linkExpired` | Код или ссылка устарели. Пришлём новый. | The code or link has expired. We will send a new one. | Kood või link on aegunud. Saadame uue. | нов. `#error=…otp_expired` / `access_denied` (01 §0.3, §4); кнопка `auth.sendCode` |
| `auth.linkOtherBrowser` | Ссылка открылась в другом браузере. Откройте её там, где просили код, или введите код из письма. | The link opened in a different browser. Open it where you asked for the code, or enter the code from the email. | Link avanes teises brauseris. Avage see seal, kus koodi küsisite, või sisestage kood e-kirjast. | нов. ошибка `pkce` (01 §0.3) |
| `auth.openInBrowser` | Если ссылка открылась внутри почты, откройте её в обычном браузере телефона. | If the link opened inside your mail app, open it in the phone’s normal browser. | Kui link avanes e-posti rakenduses, avage see telefoni tavalises brauseris. | нов. R:Б4-HIGH «Откройте в Safari/Chrome» — без латиницы (см. §7 вопрос 1) |
| `auth.emailInvalid` | Проверьте адрес: нужна почта вида имя@домен.ee | Check the address: it should look like name@domain.ee | Kontrollige aadressi: see peab olema kujul nimi@domeen.ee | нов. совпадает с лендингом `final.invalidEmail` |
| `auth.draftsWaiting_one` | {{count}} отчёт ждёт отправки | {{count}} report waiting to be sent | {{count}} aruanne ootab saatmist | нов. 01 §0.3 «N отчётов ждут отправки» |
| `auth.draftsWaiting_few` | {{count}} отчёта ждут отправки | — | — | нов. то же |
| `auth.draftsWaiting_many` | {{count}} отчётов ждут отправки | — | — | нов. то же |
| `auth.draftsWaiting_other` | {{count}} отчёта ждут отправки | {{count}} reports waiting to be sent | {{count}} aruannet ootab saatmist | нов. то же |
| `auth.signOutDrafts_one` | {{count}} отчёт не отправлен. Он уйдёт, только когда вы войдёте снова. | {{count}} report is not sent. It will go only after you sign in again. | {{count}} aruanne on saatmata. See läheb teele alles siis, kui uuesti sisse logite. | нов. 01 §3.4 правило 6 |
| `auth.signOutDrafts_few` | {{count}} отчёта не отправлены. Они уйдут, только когда вы войдёте снова. | — | — | нов. то же |
| `auth.signOutDrafts_many` | {{count}} отчётов не отправлены. Они уйдут, только когда вы войдёте снова. | — | — | нов. то же |
| `auth.signOutDrafts_other` | {{count}} отчёта не отправлены. Они уйдут, только когда вы войдёте снова. | {{count}} reports are not sent. They will go only after you sign in again. | {{count}} aruannet on saatmata. Need lähevad teele alles siis, kui uuesti sisse logite. | нов. то же |
| `auth.setPasswordTitle` | Задайте пароль | Set a password | Määrake parool | нов. бригадир после приглашения (01 §3.3 п.1) |
| `auth.newPassword` | Новый пароль (не короче {{min}} символов) | New password (at least {{min}} characters) | Uus parool (vähemalt {{min}} märki) | нов. то же |
| `auth.savePassword` | Сохранить пароль | Save password | Salvesta parool | нов. то же, главное действие |
| `auth.passwordTooShort` | Пароль короче {{min}} символов. | The password is shorter than {{min}} characters. | Parool on lühem kui {{min}} märki. | нов. то же |

### 2.5. `gate` — шлюз «почта»
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `gate.inviteLater` | Приглашение рабочих включится после настройки почты. | Inviting workers turns on once email sending is set up. | Tööliste kutsumine lülitub sisse, kui e-posti saatmine on seadistatud. | нов. **шлюз−**; под «Отметить первый этап», в «Людях объекта», в пустом списке (01 §0.3, §5.3) |
| `gate.startEarlier` | Хотите начать раньше: {{phone}} | Want to start sooner: {{phone}} | Soovite varem alustada: {{phone}} | нов. **legal**; **не выводить** до решения владельца о ручном заведении рабочих (R:М4-2) |

### 2.6. `dashboard`, `reportStatus`, список объектов
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `dashboard.emptyOther` | Вас ещё не добавили ни на один объект. Скажите владельцу фирмы: он добавляет людей на объект. | You have not been added to any site yet. Tell the company owner: they add people to sites. | Teid pole veel ühelegi objektile lisatud. Öelge firma omanikule: tema lisab inimesi objektidele. | изм. пустое состояние называет, кто действует (brief §2.1 п.7) |
| `dashboard.empty.step2` | Отметьте, на сколько готов первый этап. | Mark how far the first stage is. | Märkige, kui kaugel on esimene etapp. | изм. R:И4-HIGH — убрать WhatsApp; **шлюз−** |
| `dashboard.empty.step2Open` | Пригласите рабочего по почте. Он войдёт кодом из письма, без пароля. | Invite a worker by email. They sign in with a code from the email, no password. | Kutsuge tööline e-posti teel. Ta logib sisse e-kirja koodiga, ilma paroolita. | нов. **шлюз+** (01 §3.2 п.3б) |
| `dashboard.empty.step3` | Здесь будет видно, где работа идёт, а где стоит. | Here you will see where work moves and where it stalls. | Siin näete, kus töö käib ja kus seisab. | изм. **шлюз−**: рабочий пока отчитаться не может, не обещаем (brief §2.1 п.8) |
| `dashboard.empty.step3Open` | Рабочий присылает фото и процент. Вы видите, где работа стоит. | The worker sends a photo and a percentage. You see where work stalls. | Tööline saadab foto ja protsendi. Näete, kus töö seisab. | нов. **шлюз+** |
| `dashboard.groupActive` | В работе | Active | Käimas | нов. сортировка: активные выше (01 §3.2 п.5) |
| `dashboard.groupQuiet` | На паузе и завершённые | Paused and completed | Pausil ja lõpetatud | нов. то же |
| `reportStatus.none` | Никто не приглашён | Nobody invited yet | Kedagi pole kutsutud | изм. R:И4-HIGH — убрать «Пригласите рабочего»; **шлюз−** серым, без дней (01 §3.2 п.4) |
| `reportStatus.noneDays_one` | Никто не приглашён · {{count}} день | Nobody invited · {{count}} day | Kedagi pole kutsutud · {{count}} päev | нов. **шлюз+**, с 3-го дня (01 §3.2 п.4) |
| `reportStatus.noneDays_few` | Никто не приглашён · {{count}} дня | — | — | нов. то же |
| `reportStatus.noneDays_many` | Никто не приглашён · {{count}} дней | — | — | нов. то же |
| `reportStatus.noneDays_other` | Никто не приглашён · {{count}} дня | Nobody invited · {{count}} days | Kedagi pole kutsutud · {{count}} päeva | нов. то же |
| `reportStatus.noneWaiting` | Приглашены: {{names}} · отчётов нет | Invited: {{names}} · no reports | Kutsutud: {{names}} · aruandeid pole | изм. код: `{{name}}` → `{{names}}` (список через запятую); 01 §3.2 п.4 |
| `reportStatus.createdDaysAgo_one` | объект создан {{count}} день назад | site created {{count}} day ago | objekt loodi {{count}} päev tagasi | нов. хвост к `noneWaiting` (01 §3.2 п.4) |
| `reportStatus.createdDaysAgo_few` | объект создан {{count}} дня назад | — | — | нов. то же |
| `reportStatus.createdDaysAgo_many` | объект создан {{count}} дней назад | — | — | нов. то же |
| `reportStatus.createdDaysAgo_other` | объект создан {{count}} дня назад | site created {{count}} days ago | objekt loodi {{count}} päeva tagasi | нов. то же |
| `reportStatus.reportArrived` | Пришёл отчёт {{date}} | Report received {{date}} | Aruanne saabus {{date}} | нов. **K35**: чип на паузе; до даты паузы в `projects` не выводить (R:М4-6) |

Тексты `reportStatus.late_*` / `overdue_*` не меняются. Меняются пороги в `src/lib/reportStatus.ts` (сегодня / 1–2 / 3–6 / 7+, brief §2.1 п.5) — это код, не текст.

### 2.7. `overview` — обзор объекта, лента
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `overview.next.step1` | Отметьте, на сколько готов первый этап. | Mark how far the first stage is. | Märkige, kui kaugel on esimene etapp. | изм. R:И4-HIGH — было «ссылку в WhatsApp» |
| `overview.next.step2` | Отчёты, фото и проблемы появятся на этой странице. | Reports, photos and issues will appear on this page. | Aruanded, fotod ja probleemid ilmuvad sellele lehele. | изм. текст бывшего `step3`; шагов два |
| `overview.next.inviteOpen` | Пригласить рабочего | Invite a worker | Kutsu tööline | нов. **шлюз+**: главное действие дня 0 (01 §4) |
| `overview.notStartedReadOnly` | Отчётов пока нет. Первый отчёт присылает рабочий с объекта. | No reports yet. The first one comes from a worker on site. | Aruandeid veel pole. Esimese saadab tööline objektilt. | изм. называет, кто действует (brief §2.1 п.7) |
| `overview.noStages` | У объекта нет этапов. Создайте объект заново: 7 этапов добавятся сами. | This site has no stages. Create the site again: 7 stages are added for you. | Objektil pole etappe. Looge objekt uuesti: 7 etappi lisatakse ise. | изм. добавления этапа в UI нет; единственный путь — новый объект |
| `overview.openLastReport` | Открыть последний отчёт | Open the latest report | Ava viimane aruanne | нов. 01 §4 «Обзор, есть отчёты» |
| `overview.openPeople` | Открыть людей объекта | Open site people | Ava objekti inimesed | нов. 3+ дня без отчёта (01 §3.2 п.4а, §8 п.8) |
| `overview.feedTitle` | Что происходило | What happened | Mis toimus | нов. лента `project_activity` (01 §3.2 п.6) |
| `overview.feedEmpty` | Событий пока нет. Здесь появятся отчёты рабочих и ваши отметки. | Nothing yet. Workers’ reports and your updates will appear here. | Sündmusi veel pole. Siia ilmuvad tööliste aruanded ja teie märked. | нов. пустое состояние |
| `activity.report` | {{name}} · {{stage}}: было {{from}}%, стало {{to}}% | {{name}} · {{stage}}: was {{from}}%, now {{to}}% | {{name}} · {{stage}}: oli {{from}}%, nüüd {{to}}% | нов. без рода глагола (§1.1 п.6); без «→» |
| `activity.photo` | {{name}} · фото · {{stage}} | {{name}} · photo · {{stage}} | {{name}} · foto · {{stage}} | нов. вместо серверной `'Photo uploaded'` (K24) |
| `activity.bigJump` | крупный скачок +{{delta}}, не проверен | big jump +{{delta}}, not checked | suur hüpe +{{delta}}, kontrollimata | нов. до K15 (01 §3.2 п.6, §8 п.19) |

### 2.8. `known`, `people` — «Уже работают у вас», «Люди объекта»
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `known.title` | Уже работают у вас | Already work for you | Juba teie juures tööl | нов. 01 §3.2 п.3а; работает при **шлюз−** |
| `known.hint` | Люди вашей фирмы, которых ещё нет на этом объекте. | People in your company who are not on this site yet. | Teie firma inimesed, keda sellel objektil veel pole. | нов. только `worker` и `foreman` (R:М4-5) |
| `known.add` | Добавить на объект | Add to site | Lisa objektile | нов. главное действие для второго объекта (01 §8 п.4) |
| `known.added` | Добавлено на объект: {{name}} | Added to site: {{name}} | Objektile lisatud: {{name}} | нов. без рода |
| `known.addFailed` | Не добавлено. Попробуйте ещё раз. | Not added. Try again. | Ei lisatud. Proovige uuesti. | нов. ошибка `project_access` insert |
| `people.title` | Люди объекта | Site people | Objekti inimesed | нов. 01 §3.2 п.3в |
| `people.lastReport` | последний отчёт {{date}} | last report {{date}} | viimane aruanne {{date}} | нов. R:М4-7 — вместо вечного «приглашён» |
| `people.noReportsYet` | отчётов ещё нет | no reports yet | aruandeid veel pole | нов. R:М4-7 |
| `people.emptyClosed` | Кроме вас на объекте никого нет. Добавьте людей из «Уже работают у вас». Приглашение новых включится после настройки почты. | Nobody but you is on this site. Add people from “Already work for you”. Inviting new people turns on once email sending is set up. | Peale teie pole objektil kedagi. Lisage inimesi loendist „Juba teie juures tööl“. Uute kutsumine lülitub sisse, kui e-posti saatmine on seadistatud. | нов. **шлюз−**; если «Уже работают у вас» пуст, первое предложение без второго |
| `people.emptyOpen` | Кроме вас на объекте никого нет. Пригласите рабочего по почте. | Nobody but you is on this site. Invite a worker by email. | Peale teie pole objektil kedagi. Kutsuge tööline e-posti teel. | нов. **шлюз+** |
| `people.inviteMore` | Пригласить ещё человека | Invite another person | Kutsu veel üks inimene | нов. **шлюз+** (01 §4 «Люди объекта») |
| `people.sendCode` | Отправить код входа | Send sign-in code | Saada sisselogimiskood | нов. **шлюз+** (01 §3.2 п.3в) |
| `people.emailFor` | Почта для {{name}} | Email for {{name}} | E-post: {{name}} | нов. почта вводится заново (K27) |
| `people.emailNotOurs` | Такой почты нет среди ваших людей. Проверьте адрес. | This email is not among your people. Check the address. | Sellist e-posti teie inimeste seas pole. Kontrollige aadressi. | нов. R:Б4-М6 — владельцу явная ошибка, не нейтральный текст |

### 2.9. `invite` — приглашение (**шлюз+**; старые ключи удаляются, §3)
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `invite.title` | Пригласить рабочего | Invite a worker | Kutsu tööline | нов. 01 §3.2 п.3б |
| `invite.foreman` | Пригласить бригадира | Invite a foreman | Kutsu brigadir | нов. вторичная кнопка (01 §3.2 «ветка есть бригадир») |
| `invite.name` | Имя | Name | Nimi | нов. строка «Имя + почта» |
| `invite.email` | Почта | Email | E-post | нов. то же |
| `invite.addRow` | Ещё человек | One more person | Veel üks inimene | нов. несколько строк за раз (brief §2.1б п.1) |
| `invite.removeRow` | Убрать строку | Remove row | Eemalda rida | нов. то же |
| `invite.submit` | Пригласить ({{count}}) | Invite ({{count}}) | Kutsu ({{count}}) | нов. 01 §3.2 п.3б; число без склонения |
| `invite.hint` | Придёт письмо с кодом. Рабочий входит кодом, без пароля. | An email with a code will arrive. The worker signs in with the code, no password. | Tuleb e-kiri koodiga. Tööline logib koodiga sisse, ilma paroolita. | нов. отвечает на страх «рабочие не будут» (01 §5.2) |
| `invite.sent` | Приглашение отправлено на {{email}}. Если письма нет через минуту, пусть проверит «Спам». | Invitation sent to {{email}}. If it is not there in a minute, they should check Spam. | Kutse saadeti aadressile {{email}}. Kui minuti pärast pole, vaadaku rämpsposti. | нов. 01 §0.3 «успех» |
| `invite.ownEmail` | Это ваша почта. Укажите почту рабочего. | This is your email. Enter the worker’s email. | See on teie e-post. Sisestage töölise e-post. | нов. brief §2.1б п.1 |
| `invite.duplicate` | Этот адрес уже есть в списке выше. | This address is already in the list above. | See aadress on juba ülal loendis. | нов. «один адрес — одна строка» (01 §3.2 п.3б) |
| `invite.sameName` | У вас уже есть {{name}}. Это тот же человек? | You already have {{name}}. Is this the same person? | Teil on juba {{name}}. Kas see on sama inimene? | нов. М3-3 (01 §3.2 п.3б); без «он» |
| `invite.sameNameYes` | Да, добавить на объект | Yes, add to site | Jah, lisa objektile | нов. то же |
| `invite.sameNameNo` | Нет, другой человек | No, another person | Ei, teine inimene | нов. то же |
| `invite.emailTaken` | Этот адрес уже занят. Если человек уже работает у вас, добавьте его из «Уже работают у вас». Иначе нужен другой адрес. | This address is taken. If the person already works for you, add them from “Already work for you”. Otherwise use another address. | See aadress on juba kasutusel. Kui inimene juba töötab teie juures, lisage ta loendist „Juba teie juures tööl“. Muidu on vaja teist aadressi. | нов. `409 email_unavailable` (01 §0.3) |
| `invite.rateLimit` | Лимит {{count}} приглашений в час, неудачные попытки тоже считаются. Попробуйте позже. | Limit is {{count}} invitations per hour, failed attempts count too. Try again later. | Piirang on {{count}} kutset tunnis, ka ebaõnnestunud katsed loevad. Proovige hiljem. | нов. `429 invite_rate_limit` (01 §0.3); `count` = 20, родительный мн. ч. верен для 20 |
| `invite.invalidEmail` | Проверьте адрес почты. | Check the email address. | Kontrollige e-posti aadressi. | нов. `400 invalid_email` |
| `invite.invalidName` | Напишите имя: от 1 до 80 знаков. | Enter a name: 1 to 80 characters. | Sisestage nimi: 1 kuni 80 märki. | нов. `400 invalid_full_name` |
| `invite.failed` | Не отправлено. Попробуйте ещё раз. | Not sent. Try again. | Ei saadetud. Proovige uuesti. | нов. сеть и все технические коды (§2.14) |
| `invite.forbidden` | Приглашать может только владелец. | Only the owner can invite. | Kutsuda saab ainult omanik. | нов. `403 forbidden` |

### 2.10. `today`, `report` — экран рабочего и лист отчёта
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `today.report` | Сфотографировать: {{stage}} | Take a photo: {{stage}} | Pildista: {{stage}} | изм. код: добавить `{{stage}}`; камера сразу (01 §3.4) |
| `today.fromGallery` | Из галереи | From gallery | Galeriist | нов. 01 §3.4 вторично |
| `today.allDone` | Все ваши задачи сделаны. Работаете по этапу — сфотографируйте его кнопкой выше. | All your tasks are done. Working on a stage? Take a photo with the button above. | Kõik teie ülesanded on tehtud. Töötate etapiga? Pildistage see ülal oleva nupuga. | изм. глагол главной кнопки |
| `today.noTasks` | Задач на вас пока нет: их ставит владелец. Работаете по этапу — сфотографируйте его кнопкой выше. | No tasks for you yet: the owner assigns them. Working on a stage? Take a photo with the button above. | Teile pole veel ülesandeid: need annab omanik. Töötate etapiga? Pildistage see ülal oleva nupuga. | изм. называет, кто ставит задачи (brief §2.1 п.7) |
| `report.unfinished` | Вы не закончили отчёт | You did not finish the report | Te ei lõpetanud aruannet | нов. черновик `editing` (01 §3.4 правило 1) |
| `report.wasWill` | было {{from}}%, станет {{to}}% | was {{from}}%, will be {{to}}% | oli {{from}}%, saab {{to}}% | нов. 01 §3.4 порядок п.3; без «→» |
| `report.minus10` | −10 | −10 | −10 | нов. 01 §8 п.14 (знак минус U+2212) |
| `report.plus10` | +10 | +10 | +10 | нов. то же |
| `report.plus25` | +25 | +25 | +25 | нов. то же |
| `report.done100` | Готово 100% | Done 100% | Valmis 100% | нов. то же; лендинг `phone.all` меняется (§4) |
| `report.noChange` | Без изменений | No change | Muutuseta | нов. по умолчанию; только фото (01 §3.4 правило 3) |
| `report.stage` | Этап: {{stage}} | Stage: {{stage}} | Etapp: {{stage}} | нов. порядок п.5 |
| `report.changeStage` | Сменить | Change | Muuda | нов. то же |
| `report.reasonTitle` | Почему меньше? | Why lower? | Miks vähem? | нов. только при снижении (порядок п.6) |
| `report.reason.rework` | Переделка | Rework | Ümbertegemine | нов. decisions §5.6 |
| `report.reason.mistake` | Ошибка в учёте | Counting mistake | Viga arvestuses | нов. то же |
| `report.reason.demolition` | Снос | Demolition | Lammutamine | нов. то же |
| `report.bigJump` | Большой шаг. Владелец посмотрит фото. | Big step. The owner will look at the photo. | Suur samm. Omanik vaatab foto üle. | нов. скачок > 25 (01 §3.4) |
| `report.paused` | Объект на паузе. Отчёт всё равно примут. | The site is paused. Your report will still be accepted. | Objekt on pausil. Aruanne võetakse ikkagi vastu. | нов. плашка паузы (порядок п.7); сервер принимает отчёты на паузе (01 §0.1) |
| `report.send` | Отправить | Send | Saada | нов. sticky-кнопка листа (01 §4) |
| `report.retake` | Переснять | Retake | Pildista uuesti | нов. замена фото (`invalid_photo_path`) |
| `report.photoAlt` | Снимок для отчёта: {{stage}} | Report photo: {{stage}} | Aruande foto: {{stage}} | нов. `alt` миниатюры |

### 2.11. `send` — черновики и состояния отправки
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `send.sending` | Отправляется | Sending | Saadetakse | нов. brief §1 (значок стрелка-круг, SVG) |
| `send.sent` | Отправлено | Sent | Saadetud | нов. brief §1 (одна галочка, SVG) |
| `send.sentEarlier` | Отправлено: дошло раньше | Sent: it arrived earlier | Saadetud: jõudis kohale varem | нов. проверка по `storage_path` (01 §3.4 «Отправка» п.2); без «✓» |
| `send.queued` | Сохранено на телефоне, не отправлено. Откройте эту страницу, когда появится сеть. | Saved on the phone, not sent. Open this page when you have signal. | Telefoni salvestatud, saatmata. Avage see leht, kui levi on olemas. | нов. `queued`; единственный текст до теста на iPhone (01 §3.4, О3-8) |
| `send.unknown` | Нет сети — проверим, когда появится. | No signal — we will check when it is back. | Levi pole — kontrollime, kui see tuleb. | нов. `unknown` (01 §3.4, §8 п.11) |
| `send.stale` | Не принято: этап уже {{percent}}% | Not accepted: the stage is already {{percent}}% | Ei võetud vastu: etapp on juba {{percent}}% | нов. `stale` (01 §3.4 правило 4, R:Б4-М1) |
| `send.staleResend` | Отправить с новым % | Send with new % | Saada uue %-ga | нов. то же |
| `send.stageAhead` | Этап уже {{percent}}%. Ваше фото добавлено. | The stage is already {{percent}}%. Your photo was added. | Etapp on juba {{percent}}%. Teie foto lisati. | нов. автоматический случай правила 4; не при снижении с причиной (R:Б4-М1) |
| `send.bar` | Не отправлено: {{count}} | Not sent: {{count}} | Saatmata: {{count}} | нов. плашка (01 §3.4); число без склонения |
| `send.barChecking` | Проверяем: {{count}} | Checking: {{count}} | Kontrollime: {{count}} | нов. то же |
| `send.lastPhoto` | последний снимок {{time}} | last photo {{time}} | viimane foto {{time}} | нов. то же |
| `send.lastAttempt` | последняя попытка {{time}} | last attempt {{time}} | viimane katse {{time}} | нов. то же |
| `send.resend` | Отправить снова | Send again | Saada uuesti | нов. единственная главная кнопка при черновиках (01 §3.4) |
| `send.itemReason` | {{stage}}: {{reason}} | {{stage}}: {{reason}} | {{stage}}: {{reason}} | нов. причина по каждому черновику (R:Б4-М2); `reason` — строка из `send.*` / `errors.*` |
| `send.others_one` | На телефоне {{count}} отчёт другого человека. Уйдёт, когда он войдёт. | This phone has {{count}} report from another person. It will go when they sign in. | Telefonis on {{count}} teise inimese aruanne. See läheb teele, kui ta sisse logib. | нов. 01 §3.4 правило 5; без «Удалить» |
| `send.others_few` | На телефоне {{count}} отчёта другого человека. Уйдут, когда он войдёт. | — | — | нов. то же |
| `send.others_many` | На телефоне {{count}} отчётов другого человека. Уйдут, когда он войдёт. | — | — | нов. то же |
| `send.others_other` | На телефоне {{count}} отчёта другого человека. Уйдут, когда он войдёт. | This phone has {{count}} reports from another person. They will go when that person signs in. | Telefonis on {{count}} teise inimese aruannet. Need lähevad teele, kui ta sisse logib. | нов. то же |
| `send.limit` | Телефон хранит не больше {{max}} отчётов. Отправьте или удалите старые. | The phone keeps at most {{max}} reports. Send or delete old ones. | Telefon hoiab kuni {{max}} aruannet. Saatke või kustutage vanad. | нов. правило 7; `max` = 10 |
| `send.deleteConfirm` | Удалить этот отчёт с телефона? Фото не сохранится. | Delete this report from the phone? The photo will not be kept. | Kas kustutada see aruanne telefonist? Fotot ei säilitata. | нов. черновик не удаляется молча (01 §3.4 «Ошибки RPC») |

### 2.12. `review` — очередь проверки (**K15 / K32**, строки готовы, экран — заглушка)
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `review.title` | Крупные скачки | Big jumps | Suured hüpped | нов. **K15** (01 §3.3) |
| `review.checkN` | Проверить {{count}} | Check {{count}} | Kontrolli {{count}} | нов. **K15**; на `/dashboard` (01 §3.3 п.2) |
| `review.empty` | Проверять нечего. Крупные скачки появятся здесь, когда рабочие их отметят. | Nothing to check. Big jumps appear here when workers report them. | Kontrollida pole midagi. Suured hüpped ilmuvad siia, kui töölised need märgivad. | нов. **K15**; пустое состояние |
| `review.stub` | Проверка скачков появится позже. Пока крупный скачок помечен в ленте объекта. | Jump checks come later. For now a big jump is marked in the site feed. | Hüpete kontroll tuleb hiljem. Praegu on suur hüpe objekti voos märgitud. | нов. текст заглушки до K15 (01 §3.2 п.7) |
| `review.wasClaimed` | было {{from}}%, заявлено {{to}}% | was {{from}}%, claimed {{to}}% | oli {{from}}%, märgitud {{to}}% | нов. **K15**; строка очереди (01 §3.3); без «→» |
| `review.confirm` | Подтвердить | Confirm | Kinnita | нов. **K15** |
| `review.return` | Вернуть | Send back | Saada tagasi | нов. **K15** |
| `review.returnReason.wrongStage` | Фото не того этапа | Photo of the wrong stage | Vale etapi foto | нов. **K15**; причина одним касанием (01 §3.3 п.4) |
| `review.returnReason.tooHigh` | Процент завышен | Percentage too high | Protsent liiga suur | нов. **K15** |
| `review.returnReason.unclear` | На фото не видно работу | The work is not visible in the photo | Fotol pole tööd näha | нов. **K15** |
| `review.undoCount` | Подтверждено: {{count}} | Confirmed: {{count}} | Kinnitatud: {{count}} | нов. **K15**; плашка вверху списка + `common.undo` (01 §3.3) |
| `review.confirmedRow` | Подтверждено | Confirmed | Kinnitatud | нов. **K15**; свёрнутая строка; без «✓» |
| `review.confirmAllSmall` | Подтвердить все мелкие ({{count}}) | Confirm all small ({{count}}) | Kinnita kõik väikesed ({{count}}) | нов. **K15 / K21**; только ≤ 25 |
| `review.closedEarly` | Не подтверждено: страница закрылась раньше. | Not confirmed: the page closed too early. | Kinnitamata: leht suleti liiga vara. | нов. **K15** (01 §3.3 «Отправка») |
| `review.ownJump` | Свой скачок подтверждает владелец. | Your own jump is confirmed by the owner. | Oma hüppe kinnitab omanik. | нов. **K22** |

### 2.13. `status`, `project` — статусы, пауза, завершение
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `status.markedByCrew` | Отмечено бригадой | Marked by the crew | Brigaadi märgitud | нов. показываем сегодня (R:И4-М2) |
| `status.verified` | Проверено | Checked | Kontrollitud | нов. сегодня (R:И4-М2); значок галочка в круге, SVG. Что считать «проверенным» до K15 — §7 вопрос 3 |
| `status.accepted` | Принято | Accepted | Vastu võetud | нов. **K15**, до него не выводить (R:И4-М2) |
| `status.pending` | Ждёт проверки | Waiting for check | Ootab kontrolli | нов. **K15**; значок пустой круг, SVG |
| `status.withPending` | с учётом ждущих проверки: {{percent}}% | including waiting for check: {{percent}}% | koos kontrolli ootavatega: {{percent}}% | нов. **K15** (brief §2.1 п.4) |
| `project.pause` | Поставить на паузу | Pause | Peata | нов. меню «⋯» (01 §3.2 п.9) |
| `project.pauseConfirm` | Поставить объект на паузу? Он уйдёт вниз списка без красных отметок. Отчёты по нему всё равно принимаются. | Pause this site? It moves down the list without red marks. Reports are still accepted. | Kas peatada objekt? See liigub loendis alla, punaseid märke pole. Aruandeid võetakse ikka vastu. | нов. подтверждение (01 §4 «Пауза / завершение») |
| `project.resume` | Вернуть в работу | Back to work | Taasta töö | нов. 01 §3.2 п.9 |
| `project.complete` | Завершить объект | Complete the site | Lõpeta objekt | нов. 01 §3.2 п.10 |
| `project.completeConfirm` | Завершить объект? Он уйдёт вниз списка. Фото и история останутся. | Complete this site? It moves down the list. Photos and history stay. | Kas lõpetada objekt? See liigub loendis alla. Fotod ja ajalugu jäävad alles. | нов. то же |

### 2.14. `errors` — коды RPC и API
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `errors.authRequiredDrafts_one` | Войдите в этом браузере: {{count}} отчёт ждёт. | Sign in in this browser: {{count}} report is waiting. | Logige selles brauseris sisse: {{count}} aruanne ootab. | нов. `authentication_required` с черновиками (01 §3.4); кнопка `auth.sendCode` (**шлюз+**) или `auth.signInPassword` (**шлюз−**, R:Б4-М4) |
| `errors.authRequiredDrafts_few` | Войдите в этом браузере: {{count}} отчёта ждут. | — | — | нов. то же |
| `errors.authRequiredDrafts_many` | Войдите в этом браузере: {{count}} отчётов ждут. | — | — | нов. то же |
| `errors.authRequiredDrafts_other` | Войдите в этом браузере: {{count}} отчёта ждут. | Sign in in this browser: {{count}} reports are waiting. | Logige selles brauseris sisse: {{count}} aruannet ootab. | нов. то же |
| `errors.forbidden` | Нет доступа к объекту. Скажите владельцу. | No access to this site. Tell the owner. | Objektile pole ligipääsu. Öelge omanikule. | нов. `forbidden` (01 §3.4); черновик остаётся, «Удалить» вручную |
| `errors.photoRequired` | Для роста процента нужно фото. | A photo is needed to raise the percentage. | Protsendi tõstmiseks on vaja fotot. | нов. `photo_required_for_progress` |
| `errors.nothingToReport` | Добавьте фото или измените процент. | Add a photo or change the percentage. | Lisage foto või muutke protsenti. | нов. `nothing_to_report` |
| `errors.invalidPhotoPath` | Фото не загрузилось. Снимите ещё раз. | The photo did not upload. Take it again. | Foto ei laadinud üles. Pildistage uuesti. | нов. `invalid_photo_path`; кнопка `report.retake` |
| `errors.commentRequired` | Укажите, почему процент меньше. | Say why the percentage is lower. | Märkige, miks protsent on väiksem. | нов. `comment_required_for_decrease`; лист с текущим % |
| `errors.invalidPercent` | Процент должен быть от 0 до 100. | The percentage must be from 0 to 100. | Protsent peab olema 0 kuni 100. | нов. `invalid_percent` (кнопками не возникает; страховка) |
| `errors.taskFieldsRestricted` | Менять задачу может владелец или бригадир. Вы можете начать или завершить её. | Only the owner or foreman can edit the task. You can start or finish it. | Ülesannet saab muuta omanik või brigadir. Teie saate selle alustada või lõpetada. | нов. `task_fields_restricted` (`001`) |
| `errors.generic` | Не получилось. Попробуйте ещё раз. | Something went wrong. Try again. | Ei õnnestunud. Proovige uuesti. | нов. все прочие коды; текст сервера не показываем |

Сопоставление кодов, для которых новый ключ не нужен:

| Код | Источник | Ключ |
|---|---|---|
| сеть / таймаут `submit_stage_report` | — | `send.unknown` → проверка → `send.queued` |
| `authentication_required` без черновиков | все RPC | `common.sessionMissing` |
| `project_name_required` | `create_project_with_stages` | `createProject.nameRequired` |
| `invalid_locale`, `invalid_company_name`, `authentication_required` | `create_company_and_profile` | `onboarding.title` + `onboarding.text` |
| `forbidden` (обновление этапа, задачи) | `update_stage_progress`, задачи | `errors.forbidden` |
| `invite_rate_limit` / `429` | `reserve_company_invite`, `api/invite.ts` | `invite.rateLimit` |
| `email_unavailable` / `409` | `api/invite.ts` | `invite.emailTaken` |
| `invalid_email` | `api/invite.ts` | `invite.invalidEmail` |
| `invalid_full_name` | `api/invite.ts` | `invite.invalidName` |
| `forbidden` / `403` | `api/invite.ts` | `invite.forbidden` |
| `unauthorized` / `401` | `api/invite.ts` | `common.sessionMissing` |
| `invalid_invite`, `invalid_role`, `invalid_project_ids`, `invalid_locale`, `server_misconfigured`, `project_validation_failed`, `invite_reservation_failed`, `invite_failed`, `invite_setup_rollback_failed`, `invite_setup_failed_user_rolled_back` | `api/invite.ts`, `003` | `invite.failed` |
| `invalid_credentials`, `email_not_confirmed`, `over_request_rate_limit`, сеть | вход по паролю | `auth.invalidCredentials`, `auth.emailNotConfirmed`, `auth.rateLimited`, `auth.network` (без изменений) |
| `over_email_send_rate_limit` | `signInWithOtp` | `auth.projectLimit` |
| `429` на адрес | `signInWithOtp` | `auth.retryAfter` |
| `otp_expired` при `verifyOtp` | `verifyOtp` | `auth.codeInvalid` |
| `#error=…otp_expired` / `access_denied` | ссылка | `auth.linkExpired` |

### 2.15. `profile`, `onboarding`, `createProject`, `settings`
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `profile.title` | Как вас зовут? | What is your name? | Mis on teie nimi? | нов. необязательный шаг 3б (01 §3.1) |
| `profile.hint` | Имя видно в истории изменений вместо почты. | Your name is shown in the change history instead of your email. | Nimi on muudatuste ajaloos näha e-posti asemel. | нов. то же; домен почты как имя не показываем |
| `profile.name` | Ваше имя | Your name | Teie nimi | нов. `profiles.full_name` |
| `onboarding.title` | Компания не настроилась | Your company was not set up | Ettevõtet ei seadistatud | изм. экран только при ошибке RPC (01 §3.1 шаг 3) |
| `onboarding.text` | Аккаунт создан, но фирма не завелась. Нажмите «Проверить снова». | The account exists, but the company was not created. Press “Check again”. | Konto on olemas, kuid firmat ei loodud. Vajutage „Kontrolli uuesti“. | изм. убрать «Мы заведём… в течение рабочего дня»: ручной настройки больше нет |
| `onboarding.contact` | Не помогло — напишите нам: {{email}} | Still not working? Write to us: {{email}} | Ei aidanud? Kirjutage meile: {{email}} | нов. **legal** (01 §3.1 шаг 3) |
| `createProject.deadline` | Срок сдачи | Due date | Tähtaeg | изм. «Дедлайн» — заимствование |
| `createProject.noId` | Объект не создался. Попробуйте ещё раз. | The site was not created. Try again. | Objekti ei loodud. Proovige uuesti. | изм. без «идентификатора» |
| `settings.accessTitle` | Кто видит объект | Who sees this site | Kes objekti näeb | изм. язык результата; если `03` объединит экран с «Людьми объекта», ключи `settings.*` переходят в `people.*` |
| `settings.accessHint` | Отметьте, кто из вашей фирмы видит этот объект и может отчитываться. | Choose who in your company sees this site and can report. | Märkige, kes teie firmast seda objekti näeb ja saab aru anda. | изм. «сотрудники компании» → «ваша фирма» |
| `settings.empty` | Других людей в фирме пока нет. | There is nobody else in your company yet. | Firmas pole veel teisi inimesi. | изм. рядом `gate.inviteLater` (**шлюз−**) или `people.inviteMore` (**шлюз+**) |

### 2.16. `photos`, `tasks`, `issues`, `stages`, `image` — пустые состояния и ошибки
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `photos.empty` | Фото пока нет. Добавьте первое кнопкой «Добавить фото». | No photos yet. Add the first one with “Add photo”. | Fotosid veel pole. Lisage esimene nupuga „Lisa foto“. | изм. называет действие (brief §2.1 п.7) |
| `photos.emptyStage` | Для этого этапа фото пока нет. Рабочий добавляет его вместе с отчётом. | No photos for this stage yet. A worker adds one with a report. | Selle etapi fotosid veel pole. Tööline lisab foto koos aruandega. | изм. то же, называет кто |
| `tasks.empty` | Задач пока нет. Создайте задачу и назначьте исполнителя. | No tasks yet. Create one and assign someone. | Ülesandeid veel pole. Looge ülesanne ja määrake täitja. | изм. то же |
| `tasks.emptyWorker` | На вас пока нет задач. Их ставит владелец. | No tasks for you yet. The owner assigns them. | Teile pole veel ülesandeid. Need annab omanik. | изм. то же |
| `issues.empty` | Проблем пока нет. Если что-то мешает работе — «Сообщить о проблеме». | No issues yet. If something blocks the work, use “Report an issue”. | Probleeme veel pole. Kui miski takistab tööd, vajutage „Teata probleemist“. | изм. то же |
| `stages.empty` | У объекта нет этапов. Создайте объект заново: 7 этапов добавятся сами. | This site has no stages. Create the site again: 7 stages are added for you. | Objektil pole etappe. Looge objekt uuesti: 7 etappi lisatakse ise. | изм. как `overview.noStages` |
| `stages.progress` | Процент этапа: {{stage}} | Stage percentage: {{stage}} | Etapi protsent: {{stage}} | изм. подпись группы кнопок вместо ползунка (K5, 01 §8 п.14) |
| `image.canvasUnavailable` | Не удалось обработать изображение в этом браузере. | This browser could not process the image. | See brauser ei suutnud pilti töödelda. | изм. EN, ET: убрать «canvas» из видимого текста |

### 2.17. `tariff` — обязательно в этом PR (01 §8 п.16, §9 п.1–5)
ET сейчас целиком на английском (`et.json` `tariff.*` скопирован из EN) — все ключи переводятся.

| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `tariff.title` | Тариф | Plan | Hind | изм. ET |
| `tariff.back` | Объекты | Sites | Objektid | изм. символ «←» (brief §1); ET |
| `tariff.link` | Тариф | Plan | Hind | изм. ET |
| `tariff.lead` | {{price}} € за объект в месяц, + НДС. Рабочие бесплатно. | {{price}} € per site per month, + VAT. Workers are free. | {{price}} € objekti kohta kuus, + km. Töölised tasuta. | изм. 01 §9 п.2 — убрать «и заказчики» |
| `tariff.colObjects` | Активных объектов | Active sites | Aktiivseid objekte | изм. ET |
| `tariff.colPrice` | В месяц + НДС | Per month + VAT | Kuus + km | изм. ET |
| `tariff.objects_one` | {{count}} объект | {{count}} site | {{count}} objekt | изм. ET |
| `tariff.objects_other` | {{count}} объекта | {{count}} sites | {{count}} objekti | изм. ET |
| `tariff.capRow` | {{from}} и больше (до {{max}} объектов и {{gb}} ГБ; больше — по договорённости) | {{from}} or more (up to {{max}} sites and {{gb}} GB; more by agreement) | {{from}} või rohkem (kuni {{max}} objekti ja {{gb}} GB; rohkem kokkuleppel) | изм. ET |
| `tariff.days` | Считаем календарные дни от создания объекта до его завершения. Неполный месяц — по дням: цена × дни ÷ {{divisor}}. | We count calendar days from creating a site to completing it. A partial month is by the day: price × days ÷ {{divisor}}. | Arvestame kalendripäevi objekti loomisest kuni lõpetamiseni. Osaline kuu päevade kaupa: hind × päevad ÷ {{divisor}}. | изм. 01 §9 п.4 — убрать «Пауза не считается» (K19); «архива» в продукте нет, есть «Завершён» |
| `tariff.trial` | {{days}} дней бесплатно, без карты. Ничего не списывается. | {{days}} days free, no card. Nothing is charged. | {{days}} päeva tasuta, ilma kaardita. Midagi ei võeta. | изм. 01 §9 п.5 — убрать «только чтение» и напоминание; код: убрать аргумент `reminder` (`Tariff.tsx:53`) |
| `tariff.included` | До {{managers}} владельцев и бригадиров, рабочие без лимита. | Up to {{managers}} owners and foremen, unlimited workers. | Kuni {{managers}} omanikku ja brigadiri, töölised piiranguta. | изм. 01 §9 п.1 — убрать личные ссылки, страницу заказчика, PDF; «менеджеров» → роли (§7 вопрос 2) |
| `tariff.invoice` | Счёт — по договорённости, напишите нам. | Invoice by agreement, write to us. | Arve kokkuleppel, kirjutage meile. | изм. 01 §9 п.3 — до K19 выводить только **legal**; иначе строки нет |
| `tariff.noBilling` | Оплаты в приложении пока нет: здесь только условия. | There is no payment in the app yet: this page shows the terms only. | Rakenduses makset veel pole: siin on ainult tingimused. | изм. короче; «Ничего не списывается» уже в `tariff.trial`; ET |
| `tariff.contact` | Написать о продолжении | Write about continuing | Kirjuta jätkamisest | нов. **legal**, `mailto:` `LEGAL.email` (01 §4 «Тариф») |
| `tariff.toProjects` | К объектам | To sites | Objektide juurde | нов. главное действие при пустом `legal.ts` (01 §4) |

---

## 3. Ключи на удаление

| Ключ | Почему |
|---|---|
| `invite.whatsapp` | R:И4-HIGH, K1: ссылка в WhatsApp ведёт на `/login`, где рабочему войти нечем. Удаляется вместе с `InviteWorkerLink.tsx` |
| `invite.copy` | то же |
| `invite.copied` | то же |
| `invite.message` | то же |
| `overview.next.step3` | шагов дня 0 два; текст перенесён в `step2` (R:И4-HIGH) |
| `stages.decrease` | ползунка нет, кнопки «−10 / +10 / +25 / Готово 100%» (K5, 01 §8 п.14) |
| `stages.increase` | то же |
| `demo.badge`, `demo.projectName`, `demo.address`, `demo.overall`, `demo.lastUpdate`, `demo.activeIssues`, `demo.issue1`, `demo.issue2` (8 ключей) | в коде приложения не используются (`grep "demo\." src` — только лендинг `copy/*.ts`); в RU латиницы нет, но выдуманный объект в продукте не нужен. Перед удалением повторить поиск |
| `photos.linksFailed` | в коде не используется; строка кончается двоеточием под текст сервера (01 §0.3). Перед удалением повторить поиск |

Отдельно удаляются **формулировки** внутри изменённых ключей (не ключи): «и заказчика» (`auth.tagline`), «Пригласите рабочего» (`reportStatus.none`), «рабочие по личным ссылкам», «страница для заказчика», «выгрузка в PDF» (`tariff.included`), «Рабочие и заказчики» (`tariff.lead`), «Пауза не считается» (`tariff.days`), «только чтение», «Напоминание за N дней» (`tariff.trial`), «PDF-файлом… E-arve» (`tariff.invoice`), «Генподрядчик», «Прораб» (`roles.*`), «Обратитесь к администратору» (`common.noCompany`), «{{error}}» (`auth.profileLoadFailed`), «Мы заведём вашу компанию… в течение рабочего дня» (`onboarding.text`), символы «←» (`auth.backHome`, `tariff.back`).

---

## 4. Конфликты с лендингом (`src/features/landing/copy/*.ts`) — список для PR лендинга

Лендинг этим PR не меняется. Ниже — где его текст расходится с приложением после §2. Нумерация §9 — из `01-business-flow.md`.

| # | Ключ лендинга | Сейчас | Приложение говорит | Предложение |
|---|---|---|---|---|
| L1 | `phone.all` | «Всё» | `report.done100` «Готово 100%» | «Готово 100%» (§9 п.22, CT C8) |
| L2 | `how.steps[0].text` | «+10, +25, «Готово»» | «−10 / +10 / +25 / Готово 100%» | как в приложении (§9 п.15) |
| L3 | `phone.queued` | «Откройте страницу, когда появится сеть» | `send.queued` «Откройте эту страницу…» | одна строка на оба места |
| L4 | `dashboard.accepted`, `dashboard.withPending`, `dashboard.pendingCount`, `how.acceptedLabel`, `how.withPendingLabel`, `how.pendingJump`, `demo.accepted`, `demo.withPending`, `demo.pending`, `demo.pendingShort`, `demo.acceptedSmall`, `demo.legend.ok`, `demo.state.ok` | «принято», «ждёт проверки», «○» | до K15 только «Отмечено бригадой» / «Проверено»; символов нет | убрать или подписать мок (§9 п.11, 16, 18; R:И4-М2) |
| L5 | `how.title`, `how.steps[1]` | «Крупные скачки проверяет бригадир» | проверки нет до K15; `report.bigJump` «Владелец посмотрит фото» | «Рабочий снял. Вы видите, где работа идёт» (§9 п.13) |
| L6 | `how.lead`, `final.lead`, FAQ «Рабочие не будут» | ссылка от бригадира, WhatsApp, QR, «ни пароля» | WhatsApp-ссылки нет; вход кодом из письма — только **шлюз+** | после шлюза «приглашение по почте, вход кодом»; до шлюза — без пути рабочего (§9 п.14, 30, 35) |
| L7 | `how.steps[2]`, FAQ «Где мои фото», FAQ «Чем лучше WhatsApp» | ссылка и страница заказчика | `auth.tagline` без заказчика | убрать заказчика до `client-links.md` (§9 п.17, 31, 33; R:И4-HIGH) |
| L8 | `price.title` | «Рабочие и заказчики бесплатно» | `tariff.lead` «Рабочие бесплатно» | как в приложении (§9 п.6) |
| L9 | `price.included` | 4 пункта: менеджеры, личные ссылки, страница заказчика, PDF | `tariff.included` «До 3 владельцев и бригадиров, рабочие без лимита» | одна строка (§9 п.6) |
| L10 | `price.lead` | «до архива. Пауза не считается» | `tariff.days` «до его завершения», без паузы | как в приложении (§9 п.7) |
| L11 | `price.invoice` | «Счёт раз в месяц PDF… E-arve» | `tariff.invoice` «по договорённости» (**legal**) | как в приложении (§9 п.7) |
| L12 | `price.day31Strong`, `price.day31` | «только для чтения», «пришлём напоминание» | `tariff.trial` «Ничего не списывается» | убрать «только чтение» и напоминание (§9 п.7) |
| L13 | `dashboard.objects.voru`, `dashboard.aria` | красный «5 дней без отчёта» | шкала 3–6 жёлтый / 7+ красный | K16 — владелец (§9 п.12) |
| L14 | `demo.legend.bad`, `demo.state.bad` | «нет отчётов» красным | `reportStatus.none` «Никто не приглашён» серым | без красного у «нет отчётов» |
| L15 | `demo.personalLink`, `trust.kept[1]` | «личная ссылка», «своя ссылка на рабочего» | нет до C3 | убрать (§9 п.20, 25) |
| L16 | `demo.fields.taken`, «был офлайн» в `demo.stages.*`, `trust.kept[0]` | «Снято», `taken_at` | поля нет | убрать (§9 п.21, 25) |
| L17 | `final.emailLabel` | «Эл. почта» | `auth.email` «Почта» | «Почта» |
| L18 | `hero.humanLead` | «Новый продукт, без громких обещаний.» | самообесценивание запрещено | убрать слова, имя и телефон — **legal** (§9 п.9, CT 1.9) |
| L19 | `nav.cta`, `hero.ctaMain`, `final.submit` + `SignupSection` | регистрация открыта всегда | `auth.signupLater` при **шлюз−** (R:М4-1) | на лендинге нужна та же строка и тот же флаг |
| L20 | `trust.title` | «Что мы проверяем» | проверки нет до K15 | «Что остаётся в истории — и чего мы не обещаем» (R:И4-М4) |
| L21 | `trust.not[1]`, FAQ «нет сигнала» | «уходит, когда страница открыта», «жёлтая плашка наверху» | только `send.queued`; плашка над кнопкой, не жёлтая | до теста на iPhone — текст `send.queued` (§9 п.26, 32) |
| L22 | `trust.not[2]`, FAQ «ehituspäevik» | «выгружаем фотожурнал» | выгрузки нет | «Не заменяет ehituspäevik» без выгрузки (§9 п.27, R:И4-М4) |
| L23 | `trust.kept[3]`, `trust.dataText` | PDF, выгрузка «всегда», сроки ссылок, 12 месяцев | нет | «по запросу», остальное убрать (§9 п.25, 29) |
| L24 | FAQ «Срочная проблема», «Прогноз», «Как отменить» | push, письмо, прогноз, кнопка отмены | нет | убрать; отмена — «напишите нам» (§9 п.34) |
| L25 | `trust.not[3]` | «Заказчик видит эту пометку на своей странице» | страницы заказчика нет | «Процент — ход работ, не счёт» (§9 п.28) |
| L26 | `price.included[0]` | «менеджеров» | роли: Владелец / Бригадир | та же формулировка, что решат по §7 вопрос 2 |

---

## 5. Эстонские ключи для носителя языка

Все ET-строки §2 — черновик. Носителю в первую очередь (цена ошибки выше):
1. **Термины ролей и словарь §1.3:** `roles.gc` «Omanik», `roles.foreman` «Brigadir» (а не «Töödejuhataja»?), `roles.worker` «Tööline» (а не «Ehitaja»?), «aruanne» против «raport».
2. **Вход по коду:** `auth.signInWithCode`, `auth.haveInviteCode`, `auth.code`, `auth.codeHint`, `auth.codeSent`, `auth.neutralSent`, `auth.codeInvalid`, `auth.linkExpired`, `auth.linkOtherBrowser`, `auth.openInBrowser` («rämpspost» — так ли подписана папка «Спам» в Gmail/Outlook по-эстонски).
3. **Шлюз:** `gate.inviteLater`, `auth.recoveryLater`, `auth.signupLater` («lülitub sisse» звучит естественно?).
4. **Отправка с телефона:** `send.queued`, `send.unknown` («levi» против «võrk»), `send.stale`, `send.stageAhead`, `send.others_*`, `send.limit`.
5. **Ошибки:** `errors.*`, `invite.emailTaken`, `invite.rateLimit`, `people.emailNotOurs`.
6. **Лист отчёта:** `report.done100` «Valmis 100%», `report.reason.*`, `report.bigJump`, `report.paused`.
7. **Весь `tariff.*`** (сейчас по-английски), в т.ч. «+ km» вместо «+ käibemaks», «Hind» против «Pakett».
8. Плюрали ET `_one/_other` в `auth.draftsWaiting_*`, `auth.signOutDrafts_*`, `reportStatus.noneDays_*`, `reportStatus.createdDaysAgo_*`, `send.others_*`, `errors.authRequiredDrafts_*`: партитив («aruannet») после числа.

---

## 6. Только EN (RU не меняется)

Единый термин «site» (§1.3). В PR реализации поменять EN без смены RU:
`dashboard.title` Projects → Sites; `dashboard.pickProject` → Choose a site; `dashboard.createProject` → Create site; `createProject.heading` → New site; `createProject.submit` → Create site; `createProject.nameRequired` → Enter a site name; `overview.loading` → Loading site…; `overview.loadFailed` → Could not load the site.; `overview.noStages` / `stages.empty` / `tasks.empty` / `issues.empty` — уже в §2.

---

## 7. Открытые вопросы

1. **«Safari/Chrome» в подсказке для ссылки из почты** (R:Б4-HIGH). Названия латиницей, в allowlist их нет. В §2 — «в обычном браузере телефона». Если подсказка без названий не работает на тесте, добавить `Safari`, `Chrome` в `scripts/check-ru-latin.allow.json` — решает оркестратор.
2. **«Владельцев и менеджеров»** (01 §9 п.1, `PRICING.includedManagers`). Ролей «менеджер» нет; в §2 — «владельцев и бригадиров». Нужно подтвердить: места считаются по ролям `gc` + `foreman`? Тогда та же формулировка на лендинге (L26).
3. **Что значит «Проверено» до K15.** R:И4-М2 разрешает «Проверено» сейчас. Сегодня в БД нет подтверждения. Предлагаю: «Проверено» — только значение, которое поставил сам владелец или бригадир (`update_stage_progress`), остальное — «Отмечено бригадой». Нужно решение оркестратора, иначе «Проверено» не выводить.
4. **Что говорим фирме, где у рабочих нет почты** (01 §7 п.3) — строки нет, ждёт владельца.
5. `gate.startEarlier` готова, но не выводится до решения владельца о ручном заведении рабочих (R:М4-2).
6. `tariff.days` «от создания объекта до его завершения» — правило счёта по-прежнему гипотеза (K19); при отказе владельца от правила строку убрать целиком.
