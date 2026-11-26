# 04 — Тексты приложения (роль: контент)

Редакция 2, 2026-11-26. Этап 4 (параллельно с `03-wireframes.md`).
Ред. 2 закрывает HIGH/MED по текстам из `06-audit-stage34-{mart,foreman,investor}-r1.md` (метки [М-H1], [Б-M4], [И-7] и т.п.) и решения оркестратора раунда 1 (бриф §2.4). **04 — канонический источник имён ключей**; соответствие звёздочных ключей 03 — §8.

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
- **K15** и т.п. — строка готова, но выводится только после этого пункта Codex («K15, не выводить»); **шлюз+** — только при открытом `VITE_EMAIL_GATE_OPEN`; **шлюз−** — только при закрытом; **legal** — только при заполненном `src/config/legal.ts`;
- **K34** — строка про код из письма: нужен K34 (код `{{ .Token }}` в шаблонах писем входа и приглашения). Шлюз открывается только после K34 и проверки обоих шаблонов на стенде [И-M1]; без K34 строки с «кодом» не выводятся;
- роль в «почему» (`gc`, `foreman`, `worker`, `client`) — кому показывается строка; без пометки — всем.

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
8. **Честно о том, чего нет:** «Приглашение рабочих включится после настройки почты». Не «скоро», не «появится позже», не «в разработке», не даты.
9. **Одна строка — одна роль, если действие у ролей разное** [М-M2, И-5]. Совет «сделайте X» получает только тот, кто может X. Остальным — «Скажите владельцу» / «Спросите владельца».
10. **«Есть» пишем только про то, что работает в этой сборке** (бриф §2.2). Строка зависит от шлюза — у неё два ключа (`auth.tagline` / `auth.taglineOpen`).
11. **Контакт** [М-L6, И-L3]: `common.contactPhone` и `common.contactEmail` — отдельные строки, каждая только при заполненном поле `legal.ts`. Склейки и висящих запятых нет. Нет ни одного поля — блок не выводится.

### 1.2. Запрещено
| Что | Вместо |
|---|---|
| «реальный», «реальное», «реально» | «фактический», «что отметила бригада» |
| обещания оффлайна, фоновой отправки, «отправим, когда появится сеть», «проверим, когда появится» (до теста на iPhone, 01 §3.4) [Б-H1, И-3] | «Сохранено на телефоне, не отправлено. Откройте «Сегодня», когда будет сеть»; «Не знаем, дошёл ли отчёт. Фото сохранено на телефоне» |
| «появится позже», «этапы можно поменять», «ссылка для заказчика появится позже» [И-12] | не пишем вовсе |
| «владелец посмотрит», «бригадир проверит» до K15 [И-M2] | «Он будет отмечен в ленте объекта» |
| геолокация, SMS, Telegram, push как готовые | не упоминаем в приложении |
| самообесценивание («новый продукт», «без громких обещаний», «пока сыро») | факт без оправданий |
| `[плейсхолдеры]` и пустые контакты в видимом тексте | строка с контактом выводится только при заполненном `legal.ts` |
| символы ○ ✓ → ● ✗, а также ← ▲ ■ ▸ ▾ в строках | значки только SVG; в тексте — слова |
| латиница в RU, кроме `scripts/check-ru-latin.allow.json` (BuildProof, PDF, WhatsApp, email, ID, ГБ, Eesti, English и др.); названия браузеров | «Почта», а не «Email»; «в обычном браузере телефона» (бриф §2.4) |
| выдуманные цифры («за 12 минут», «10 секунд», «экономит 5 часов») | цели дизайна не превращаем в обещания |
| «Принято» / «Ждёт проверки» / «Проверено» в приложении до K15 | «Отметил владелец» / «Отметил бригадир» / «Отмечено бригадой» (бриф §2.4, [И-H1]) |
| условия тарифа, которые владелец не решил (что после пробного периода, счёт дней, места владельцев) | только решения из `buildproof-decisions.md`; остальное — «K19, не выводить» |
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
| `common.noCompany` | Компания ещё не настроена. Откройте «Объекты» — настроим заново. | Your company is not set up yet. Open “Sites” and we will set it up again. | Ettevõte pole veel seadistatud. Avage „Objektid“ — seadistame uuesti. | изм. «Администратора» в фирме из 1 человека нет; на «Объектах» RPC компании запускается сам (01 §3.1 шаг 3) [М-L2] |
| `common.offline` | Нет сети | No connection | Ühendus puudub | нов. `NetBar`, только при `navigator.onLine === false` [Б-H1, И-10] |
| `common.slow` | Долго грузится. Проверьте сеть. | Taking long to load. Check your connection. | Laadimine võtab kaua. Kontrollige ühendust. | нов. `app-loading` [И-10] |
| `common.reload` | Обновить | Reload | Laadi uuesti | нов. кнопка к `common.slow` |
| `send.details` | Подробнее | Details | Täpsemalt | нов. `today`, плашка черновиков [Б-M10]; [03 §12] |
| `common.sessionMissing` | Вы вышли из аккаунта. Войдите снова. | You are signed out. Sign in again. | Olete välja logitud. Logige uuesti sisse. | изм. «Сессия» — технический термин |
| `common.save` | Сохранить | Save | Salvesta | нов. 01 §3.1 шаг 3б |
| `common.later` | Позже | Later | Hiljem | нов. 01 §3.1 шаг 3б |
| `common.contactPhone` | Телефон: {{phone}} | Phone: {{phone}} | Telefon: {{phone}} | нов. **legal**, только при заполненном `phone`; своя строка — висящих запятых нет [М-L6, И-L3] [03 §12] |
| `common.contactEmail` | Почта: {{email}} | Email: {{email}} | E-post: {{email}} | нов. **legal**, только при заполненном `email` [03 §12] |
| `common.delete` | Удалить | Delete | Kustuta | нов. черновики, `stale` (01 §3.4) |
| `common.undo` | Отменить | Undo | Võta tagasi | нов. плашка отмены (01 §3.3) |
| `common.actions` | Действия | Actions | Toimingud | нов. подпись кнопки-меню «⋯» для чтения с экрана (01 §4) |
| `common.stay` | Остаться | Stay | Jää | нов. выход с черновиками (01 §3.4 правило 6) |
| `common.signOutAnyway` | Выйти всё равно | Sign out anyway | Logi ikkagi välja | нов. то же |

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
| `auth.tagline` | Ход работ по этапам: проценты, фото и история изменений. Видно, где работа идёт, а где стоит. | Work progress by stage: percentages, photos and change history. You see where work moves and where it stalls. | Töö käik etappide kaupa: protsendid, fotod ja muudatuste ajalugu. Näete, kus töö käib ja kus seisab. | изм. **шлюз−**: без обещания фото от рабочих [М-H3, И-13]; R:И4-HIGH — без заказчика |
| `auth.taglineOpen` | Фото и проценты по этапам от ваших рабочих. Видно, где работа идёт, а где стоит. | Photos and stage percentages from your workers. You see where work moves and where it stalls. | Fotod ja etappide protsendid teie töölistelt. Näete, kus töö käib ja kus seisab. | нов. **шлюз+** [М-H3] |
| `auth.backHome` | На главную | Back to home | Avalehele | изм. символ «←» — только SVG (brief §1) |
| `auth.startFree` | Начать бесплатно | Start for free | Alusta tasuta | без изм. RU; выводится только **шлюз+** (R:М4-1) |
| `auth.signupLater` | Регистрация откроется после настройки почты. | Sign-up opens once email sending is set up. | Registreerimine avaneb, kui e-posti saatmine on seadistatud. | нов. **шлюз−**, вместо «Нет аккаунта? Начать бесплатно» (R:М4-1) |
| `auth.forgotPassword` | Забыли пароль? | Forgot your password? | Unustasite parooli? | нов. **шлюз+** (01 §3.2 п.1) |
| `auth.recoveryLater` | Восстановление пароля по почте включится после настройки почты. | Password recovery by email turns on once email sending is set up. | Parooli taastamine e-posti teel lülitub sisse, kui e-posti saatmine on seadistatud. | нов. **шлюз−**, вместо «Забыли пароль?» (01 §3.2 п.1); рядом `common.contactPhone` / `common.contactEmail` только **legal** |
| `auth.signInPassword` | Войти с паролем | Sign in with password | Logi sisse parooliga | нов. экран `authentication_required` и `login-link-error` при **шлюз−** (R:Б4-М4, [И-4]) |
| `auth.linkExpiredClosed` | Ссылка устарела. Войдите по паролю. | The link has expired. Sign in with your password. | Link on aegunud. Logige sisse parooliga. | нов. **шлюз−**: `#error=…otp_expired` / `access_denied`; кнопка `auth.signInPassword` [И-4] |

### 2.4. `auth` — вход по коду (**шлюз+**, нужен **K34** — код в шаблоне письма)
Все строки раздела выводятся только при **шлюз+**; шлюз открывается только после K34 [И-M1].
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `auth.signInWithCode` | Войти по коду из письма | Sign in with a code from email | Logi sisse e-kirja koodiga | нов. 01 §3.2 п.1 |
| `auth.sendCode` | Прислать код | Send code | Saada kood | нов. 01 §0.3, §4 |
| `auth.sendCodeTo` | Прислать код на {{email}} | Send code to {{email}} | Saada kood aadressile {{email}} | нов. 01 §0.3; маску «p•••@gmail.com» делает код, не строка |
| `auth.otherEmail` | Другая почта | Another email | Teine e-post | нов. 01 §0.3 |
| `auth.haveInviteCode` | У меня есть код из приглашения | I have a code from an invitation | Mul on kutse kood | нов. R:Б4-HIGH, `verifyOtp` `type:'invite'` |
| `auth.inviteTitle` | Вход по приглашению | Sign in with an invitation | Sisselogimine kutsega | нов. заголовок `login-invite-code` [И-10, Б-M10] |
| `auth.inviteEmailLabel` | Почта, на которую пришло приглашение | Email the invitation came to | E-post, kuhu kutse tuli | нов. подпись поля `login-invite-code` [И-10]; [03 §12] |
| `auth.resetTitle` | Сброс пароля | Reset password | Parooli lähtestamine | нов. `login-code-request` в режиме сброса [И-10] |
| `auth.skipUseCode` | Пропустить, войду кодом | Skip, I will sign in with a code | Jäta vahele, login koodiga | нов. `auth-set-password`, вторично [И-10] |
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
| `auth.codeInvalid` | Код не подошёл или устарел. Проверьте цифры или запросите новый. | The code is wrong or expired. Check the digits or request a new one. | Kood ei sobi või on aegunud. Kontrollige numbreid või küsige uus. | нов. ответ `verifyOtp` (Supabase отдаёт `otp_expired` и на неверный, и на старый код); «запросите», не «пришлите» [Б-L5] |
| `auth.checkEmailAndCode` | Код не подошёл. Проверьте цифры и почту выше. | The code did not work. Check the digits and the email above. | Kood ei sobinud. Kontrollige numbreid ja ülal olevat e-posti. | нов. `login-invite-code`: ошибка часто в почте [Б-M11]; [03 §12] |
| `auth.linkExpired` | Код или ссылка устарели. | The code or link has expired. | Kood või link on aegunud. | нов. оба состояния шлюза; дальше `auth.linkExpiredResend` + `auth.sendCode` (**шлюз+** **K34**) или `auth.linkExpiredClosed` (**шлюз−**) [И-4] [03 §12] |
| `auth.linkExpiredResend` | Пришлём новый. | We will send a new one. | Saadame uue. | нов. **шлюз+** **K34**, рядом `auth.sendCode` [И-4] [03 §12] |
| `auth.linkOtherBrowser` | Ссылка открылась в другом браузере. Откройте её там, где просили код, или введите код из письма. | The link opened in a different browser. Open it where you asked for the code, or enter the code from the email. | Link avanes teises brauseris. Avage see seal, kus koodi küsisite, või sisestage kood e-kirjast. | нов. ошибка `pkce` (01 §0.3) |
| `auth.openInBrowser` | Если ссылка открылась внутри почты, откройте её в обычном браузере телефона. | If the link opened inside your mail app, open it in the phone’s normal browser. | Kui link avanes e-posti rakenduses, avage see telefoni tavalises brauseris. | нов. R:Б4-HIGH; без названий браузеров (бриф §2.4) |
| `auth.emailInvalid` | Проверьте адрес: нужна почта вида имя@домен.ee | Check the address: it should look like name@domain.ee | Kontrollige aadressi: see peab olema kujul nimi@domeen.ee | нов. совпадает с лендингом `final.invalidEmail` |
| `auth.draftsWaiting_one` | {{count}} отчёт ждёт отправки. Войдите, и он уйдёт. | {{count}} report is waiting to be sent. Sign in and it will go. | {{count}} aruanne ootab saatmist. Logige sisse ja see läheb teele. | нов. 01 §0.3; что делать — [М-L3]. Оба состояния шлюза |
| `auth.draftsWaiting_few` | {{count}} отчёта ждут отправки. Войдите, и они уйдут. | — | — | нов. то же |
| `auth.draftsWaiting_many` | {{count}} отчётов ждут отправки. Войдите, и они уйдут. | — | — | нов. то же |
| `auth.draftsWaiting_other` | {{count}} отчёта ждут отправки. Войдите, и они уйдут. | {{count}} reports are waiting to be sent. Sign in and they will go. | {{count}} aruannet ootab saatmist. Logige sisse ja need lähevad teele. | нов. то же |
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
| `dashboard.empty.step2` | Отметьте, на сколько готов первый этап. | Mark how far the first stage is. | Märkige, kui kaugel on esimene etapp. | изм. R:И4-HIGH — убрать WhatsApp; **шлюз−** |
| `dashboard.empty.step2Open` | Пригласите рабочего по почте. Он войдёт кодом из письма, без пароля. | Invite a worker by email. They sign in with a code from the email, no password. | Kutsuge tööline e-posti teel. Ta logib sisse e-kirja koodiga, ilma paroolita. | нов. **шлюз+** **K34** (01 §3.2 п.3б) |
| `dashboard.empty.step3` | Здесь будет видно, где работа идёт, а где стоит. | Here you will see where work moves and where it stalls. | Siin näete, kus töö käib ja kus seisab. | изм. **шлюз−**: рабочий пока отчитаться не может, не обещаем (brief §2.1 п.8) |
| `dashboard.empty.step3Open` | Рабочий присылает фото и процент. Вы видите, где работа стоит. | The worker sends a photo and a percentage. You see where work stalls. | Tööline saadab foto ja protsendi. Näete, kus töö seisab. | нов. **шлюз+** |
| `dashboard.groupActive` | В работе | Active | Käimas | нов. сортировка: активные выше (01 §3.2 п.5) |
| `dashboard.groupPaused` | На паузе | Paused | Pausil | нов. отдельная группа «На паузе» [М-L4, И-L5] [r2-Q3] |
| `dashboard.groupCompleted` | Завершены | Completed | Lõpetatud | нов. то же |
| `dashboard.emptyForeman` | Вас ещё не добавили ни на один объект. Скажите владельцу фирмы. | You have not been added to any site yet. Tell the company owner. | Teid pole veel ühelegi objektile lisatud. Öelge firma omanikule. | нов. `foreman`; замена `dashboard.emptyOther` [03 §12] |
| `dashboard.emptyWorker` | Вас ещё не добавили ни на один объект. Скажите владельцу фирмы. | You have not been added to any site yet. Tell the company owner. | Teid pole veel ühelegi objektile lisatud. Öelge firma omanikule. | нов. `worker`; замена `dashboard.emptyOther` [03 §12] |
| `dashboard.workerLastReport` | Ваш последний отчёт: {{date}} | Your last report: {{date}} | Teie viimane aruanne: {{date}} | нов. `dashboard-worker` [И-10] |
| `dashboard.workerNoReport` | Вы ещё не отправляли отчётов | You have not sent any reports yet | Te pole veel aruandeid saatnud | нов. то же, без отчётов |
| `dashboard.emptyClient` | Владелец фирмы ещё не открыл вам объект. | The company owner has not opened a site for you yet. | Firma omanik pole teile veel objekti avanud. | нов. `client`, **K8** (заказчика не приглашаем); «Подрядчик» → роль из словаря [И-L10] |
| `reportStatus.markedByOwner` | Отметил владелец {{date}} | Marked by the owner {{date}} | Omanik märkis {{date}} | нов. **шлюз−** и без отчётов рабочих: чип карточки, свежесть по своим отметкам [М-H1], решение оркестратора п.4 |
| `reportStatus.markedByForeman` | Отметил бригадир {{date}} | Marked by the foreman {{date}} | Brigadir märkis {{date}} | нов. то же, отметка бригадира |
| `reportStatus.none` | Никто не приглашён | Nobody invited yet | Kedagi pole kutsutud | изм. R:И4-HIGH — убрать «Пригласите рабочего». Только **шлюз+**, нет отметок; при **шлюз−** вместо неё `reportStatus.noMarks` [03 §12] |
| `reportStatus.noMarks` | Отметок пока нет | No marks yet | Märkeid veel pole | нов. **шлюз−**, `day0`: серым, без дней [М-H1] [03 §12] |
| `reportStatus.noneDays_one` | Никто не приглашён · {{count}} день | Nobody invited · {{count}} day | Kedagi pole kutsutud · {{count}} päev | нов. **шлюз+**, с 3-го дня (01 §3.2 п.4) |
| `reportStatus.noneDays_few` | Никто не приглашён · {{count}} дня | — | — | нов. то же |
| `reportStatus.noneDays_many` | Никто не приглашён · {{count}} дней | — | — | нов. то же |
| `reportStatus.noneDays_other` | Никто не приглашён · {{count}} дня | Nobody invited · {{count}} days | Kedagi pole kutsutud · {{count}} päeva | нов. то же |
| `reportStatus.noneWaiting` | Добавлены: {{names}} · отчётов ещё нет | Added: {{names}} · no reports yet | Lisatud: {{names}} · aruandeid veel pole | изм. код: `{{name}}` → `{{names}}` (список через запятую); «Добавлены», не «Приглашены»: при **шлюз−** людей добавляют, а не приглашают [И-9]; форма мн. ч. без рода |
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
| `overview.next.action` | Отметить первый этап | Mark the first stage | Märgi esimene etapp | без изм. RU; **главная кнопка дня 0** при **шлюз−** (и у `foreman` при любом шлюзе) [М-M1, М-H2]; в 03 = `overview.markFirstStage*`. Состояние `day0` = нет ни одной отметки и ни одного отчёта |
| `overview.next.inviteOpen` | Пригласить рабочего | Invite a worker | Kutsu tööline | нов. **шлюз+**, только `gc`: главное действие дня 0 (01 §4, [М-H2]) |
| `overview.markStage` | Отметить этап | Mark a stage | Märgi etapp | нов. главная при `self-marked` (шлюз−, есть свои отметки, нет отчётов рабочих) и при `stale-3plus` без людей на объекте [М-H1] |
| `overview.notStartedReadOnly` | Отчётов пока нет. Ход работ появится здесь. | No reports yet. Progress will appear here. | Aruandeid veel pole. Töö käik ilmub siia. | изм. `client` (и `worker` без отчётов): без «присылает рабочий» при **шлюз−** [М-M3] |
| `overview.openLastReport` | Открыть последний отчёт | Open the latest report | Ava viimane aruanne | нов. 01 §4; только если последний отчёт сделал **не** текущий пользователь [М-H1] |
| `overview.openPeople` | Кто давно не отчитывался | Who has not reported lately | Kes pole ammu aru andnud | нов. только `gc`, 3+ дня без отчёта и есть люди на объекте (01 §3.2 п.4а); подпись говорит, что будет на экране [М-M9] |
| `overview.staleForeman` | Давно нет отчёта от: {{names}}. Скажите владельцу. | No report for a while from: {{names}}. Tell the owner. | Ammu pole aruannet: {{names}}. Öelge omanikule. | нов. `foreman`, 3+ дня: главной кнопки нет, «Люди объекта» бригадиру недоступны [М-H2] |
| `overview.readyPercent` | {{percent}}% готово | {{percent}}% done | {{percent}}% valmis | нов. `project-overview-owner` [И-10] |
| `overview.updatedAt` | обновлено {{date}} | updated {{date}} | uuendatud {{date}} | нов. [03 §12] |
| `stages.emptyOwner` | У объекта нет этапов. | This site has no stages. | Objektil pole etappe. | нов. `gc`; замена `overview.noStages` и `stages.empty`, без совета «создайте заново» [И-5, М-M10] [03 §12] |
| `overview.showHouse` | Показать дом | Show the house | Näita maja | нов. 3D-дом свёрнут [И-10, М-L1] |
| `overview.allPhotos` | Все фото | All photos | Kõik fotod | нов. [И-10] |
| `overview.allIssues` | Все проблемы | All issues | Kõik probleemid | нов. [И-10] |
| `overview.feedAll` | Вся история | Full history | Kogu ajalugu | нов. лента на мобильном [М-M11]; [03 §12] |
| `overview.feedTitle` | Что происходило | What happened | Mis toimus | нов. лента `project_activity` (01 §3.2 п.6) |
| `overview.feedEmpty` | Событий пока нет. Здесь появятся отчёты рабочих и ваши отметки. | Nothing yet. Workers’ reports and your updates will appear here. | Sündmusi veel pole. Siia ilmuvad tööliste aruanded ja teie märked. | нов. пустое состояние |
| `activity.report` | {{name}} · {{stage}}: было {{from}}%, стало {{to}}% | {{name}} · {{stage}}: was {{from}}%, now {{to}}% | {{name}} · {{stage}}: oli {{from}}%, nüüd {{to}}% | нов. без рода глагола (§1.1 п.6); без «→» |
| `activity.photo` | {{name}} · фото · {{stage}} | {{name}} · photo · {{stage}} | {{name}} · foto · {{stage}} | нов. вместо серверной `'Photo uploaded'` (K24) |
| `activity.bigJump` | крупный скачок +{{delta}}, не проверен | big jump +{{delta}}, not checked | suur hüpe +{{delta}}, kontrollimata | нов. до K15 (01 §3.2 п.6, §8 п.19) |

### 2.8. `known`, `people` — «Уже работают у вас», «Люди объекта»
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `known.title` | Уже работают у вас | Already working for you | Juba teie juures tööl | нов. 01 §3.2 п.3а; работает при **шлюз−** |
| `known.hint` | Люди вашей фирмы, которых ещё нет на этом объекте. | People in your company who are not on this site yet. | Teie firma inimesed, keda sellel objektil veel pole. | нов. только `worker` и `foreman` (R:М4-5) |
| `known.add` | Добавить на объект | Add to site | Lisa objektile | нов. главное действие для второго объекта (01 §8 п.4) |
| `known.added` | Добавлено на объект: {{name}} | Added to site: {{name}} | Objektile lisatud: {{name}} | нов. без рода |
| `known.addFailed` | Не добавлено. Попробуйте ещё раз. | Not added. Try again. | Ei lisatud. Proovige uuesti. | нов. ошибка `project_access` insert |
| `people.title` | Люди объекта | Site people | Objekti inimesed | нов. 01 §3.2 п.3в |
| `people.lastReport` | последний отчёт {{date}} | last report {{date}} | viimane aruanne {{date}} | нов. R:М4-7 — вместо вечного «приглашён» |
| `people.noReportsYet` | отчётов ещё нет | no reports yet | aruandeid veel pole | нов. R:М4-7 |
| `people.emptyClosed` | Кроме вас на объекте никого нет. Добавьте людей из «Уже работают у вас». Приглашение новых включится после настройки почты. | Nobody but you is on this site. Add people from “Already working for you”. Inviting new people turns on once email sending is set up. | Peale teie pole objektil kedagi. Lisage inimesi loendist „Juba teie juures tööl“. Uute kutsumine lülitub sisse, kui e-posti saatmine on seadistatud. | нов. **шлюз−**; если «Уже работают у вас» пуст, первое предложение без второго |
| `people.emptyOpen` | Кроме вас на объекте никого нет. Пригласите рабочего по почте. | Nobody but you is on this site. Invite a worker by email. | Peale teie pole objektil kedagi. Kutsuge tööline e-posti teel. | нов. **шлюз+** |
| `people.inviteMore` | Пригласить ещё человека | Invite another person | Kutsu veel üks inimene | нов. **шлюз+** (01 §4 «Люди объекта») |
| `people.sendCode` | Отправить код входа | Send sign-in code | Saada sisselogimiskood | нов. **шлюз+** (01 §3.2 п.3в) |
| `people.emailFor` | Почта для {{name}} | Email for {{name}} | E-post inimesele {{name}} | нов. почта вводится заново (K27); ET по смыслу «почта для» [И-L12] |
| `people.all` | Все люди | All people | Kõik inimesed | нов. `project-people` [И-10] |
| `people.sendCodeAgain` | Отправить код для повторного входа | Send a code to sign in again | Saada kood uuesti sisselogimiseks | нов. **шлюз+** **K34**, `/people` из `stale-3plus` [М-M9]; без рода («вошёл») [03 §12] |
| `people.remove` | Убрать с объекта | Remove from site | Eemalda objektilt | нов. `gc`, меню строки; `project_access` delete [М-M1, И-10] |
| `people.removeConfirm` | Убрать {{name}} с объекта? Отчёты и фото останутся в истории. Вернуть можно через «Уже работают у вас». | Remove {{name}} from this site? Reports and photos stay in the history. You can add them back from “Already working for you”. | Kas eemaldada {{name}} objektilt? Aruanded ja fotod jäävad ajalukku. Tagasi saab lisada loendist „Juba teie juures tööl“. | нов. `confirm-remove-person`: последствие; без рода |
| `people.removed` | Убрано с объекта: {{name}} | Removed from site: {{name}} | Objektilt eemaldatud: {{name}} | нов. итог; без рода |
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
| `invite.hint` | Придёт письмо с кодом. Рабочий входит кодом, без пароля. | An email with a code will arrive. The worker signs in with the code, no password. | Tuleb e-kiri koodiga. Tööline logib koodiga sisse, ilma paroolita. | нов. **K34**; отвечает на страх «рабочие не будут» (01 §5.2) |
| `invite.sent` | Приглашение отправлено на {{email}}. Если письма нет через минуту, пусть проверит «Спам». | Invitation sent to {{email}}. If it is not there in a minute, they should check Spam. | Kutse saadeti aadressile {{email}}. Kui minuti pärast pole, vaadaku rämpsposti. | нов. 01 §0.3 «успех» |
| `invite.ownEmail` | Это ваша почта. Укажите почту рабочего. | This is your email. Enter the worker’s email. | See on teie e-post. Sisestage töölise e-post. | нов. brief §2.1б п.1 |
| `invite.duplicate` | Этот адрес уже есть в списке выше. | This address is already in the list above. | See aadress on juba ülal loendis. | нов. «один адрес — одна строка» (01 §3.2 п.3б) |
| `invite.sameName` | У вас уже есть {{name}}. Это тот же человек? | You already have {{name}}. Is this the same person? | Teil on juba {{name}}. Kas see on sama inimene? | нов. М3-3 (01 §3.2 п.3б); без «он» |
| `invite.sameNameYes` | Да, добавить на объект | Yes, add to site | Jah, lisa objektile | нов. то же |
| `invite.sameNameNo` | Нет, другой человек | No, another person | Ei, teine inimene | нов. то же |
| `invite.emailTaken` | Этот адрес уже занят. Если человек уже работает у вас, добавьте его из «Уже работают у вас». Иначе нужен другой адрес. | This address is taken. If the person already works for you, add them from “Already working for you”. Otherwise use another address. | See aadress on juba kasutusel. Kui inimene juba töötab teie juures, lisage ta loendist „Juba teie juures tööl“. Muidu on vaja teist aadressi. | нов. `409 email_unavailable` (01 §0.3) |
| `invite.rateLimit` | Больше {{count}} приглашений в час нельзя. Попробуйте через час. | No more than {{count}} invitations per hour. Try again in an hour. | Tunnis saab saata kuni {{count}} kutset. Proovige tunni pärast. | нов. `429 invite_rate_limit` (01 §0.3); без технических подробностей [М-L7]; `count` = 20 |
| `invite.invalidEmail` | Проверьте адрес почты. | Check the email address. | Kontrollige e-posti aadressi. | нов. `400 invalid_email` |
| `invite.invalidName` | Напишите имя: от 1 до 80 знаков. | Enter a name: 1 to 80 characters. | Sisestage nimi: 1 kuni 80 märki. | нов. `400 invalid_full_name` |
| `invite.failed` | Не отправлено. Попробуйте ещё раз. | Not sent. Try again. | Ei saadetud. Proovige uuesti. | нов. сеть и все технические коды (§2.14) |
| `invite.forbidden` | Приглашать может только владелец. | Only the owner can invite. | Kutsuda saab ainult omanik. | нов. `403 forbidden` |

### 2.10. `today`, `report` — экран рабочего и лист отчёта
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `today.report` | Сфотографировать | Take a photo | Pildista | изм. главная кнопка; этап — `report.stage` над кнопкой, не в подписи: на 360 не влезает [Б-M4] [03 §12]; камера сразу (01 §3.4) |
| `today.fromGallery` | Из галереи | From gallery | Galeriist | нов. 01 §3.4 вторично |
| `today.otherStage` | Другой этап | Another stage | Teine etapp | нов. выбор этапа, затем камера [Б-M7, Б-M10] |
| `today.continue` | Продолжить | Continue | Jätka | нов. черновик `editing` [Б-M10] |
| `today.objectPercent` | Объект: {{percent}}% | Site: {{percent}}% | Objekt: {{percent}}% | нов. [Б-M10, И-10]; [03 §12] |
| `today.myTasks` | Мои задачи | My tasks | Minu ülesanded | изм. как в каркасе 03 §6.1 [Б-L7] |
| `today.lastReport` | Мой последний отчёт: {{stage}} · {{date}} | My last report: {{stage}} · {{date}} | Minu viimane aruanne: {{stage}} · {{date}} | нов. [Б-M10] [03 §12] |
| `today.staleWaiting_one` | {{count}} отчёт ждёт решения | {{count}} report needs a decision | {{count}} aruanne vajab otsust | нов. черновики `stale` [И-10] |
| `today.staleWaiting_few` | {{count}} отчёта ждут решения | — | — | нов. то же |
| `today.staleWaiting_many` | {{count}} отчётов ждут решения | — | — | нов. то же |
| `today.staleWaiting_other` | {{count}} отчёта ждут решения | {{count}} reports need a decision | {{count}} aruannet vajab otsust | нов. то же |
| `today.allDone` | Все ваши задачи сделаны. Отчёт по этапу — кнопкой выше. | All your tasks are done. Report on a stage with the button above. | Kõik teie ülesanded on tehtud. Etapi aruanne — ülal oleva nupuga. | изм. короче [Б-L6] |
| `today.noTasks` | Задач на вас пока нет: их ставит владелец или бригадир. Отчёт по этапу — кнопкой выше. | No tasks for you yet: the owner or foreman assigns them. Report on a stage with the button above. | Teile pole veel ülesandeid: need annab omanik või brigadir. Etapi aruanne — ülal oleva nupuga. | изм. называет, кто ставит задачи; короче [Б-L6, И-L8] |
| `report.title` | Отчёт | Report | Aruanne | нов. заголовок листа [Б-M10, И-10] |
| `report.addPhoto` | Добавить фото | Add photo | Lisa foto | нов. лист `gc`/`foreman` без камеры, вторичная [М-M6] [03 §12] |
| `report.unfinished` | Вы не закончили отчёт | You did not finish the report | Te ei lõpetanud aruannet | нов. черновик `editing` (01 §3.4 правило 1) |
| `report.wasWill` | было {{from}}%, станет {{to}}% | was {{from}}%, will be {{to}}% | oli {{from}}%, saab {{to}}% | нов. 01 §3.4 порядок п.3; без «→» |
| `report.minus10` | −10 | −10 | −10 | нов. 01 §8 п.14 (знак минус U+2212) |
| `report.plus10` | +10 | +10 | +10 | нов. то же |
| `report.plus25` | +25 | +25 | +25 | нов. то же |
| `report.done100` | 100% | 100% | 100% | нов. то же; «Готово 100%» не влезает в кнопку 74 px [Б-M5], решение оркестратора п.5; лендинг `phone.all` меняется (§4) |
| `report.noChange` | Без изменений | No change | Muutuseta | нов. по умолчанию и ссылка сброса при M ≠ N (≥ 48 px) [Б-M6]; только фото (01 §3.4 правило 3) |
| `report.stage` | Этап: {{stage}} | Stage: {{stage}} | Etapp: {{stage}} | нов. порядок п.5 |
| `report.changeStage` | Сменить | Change | Muuda | нов. то же; смена сбрасывает шаги в «Без изменений» [Б-M7] |
| `stagePicker.title` | Выберите этап | Choose a stage | Valige etapp | нов. лист выбора этапа `stage-picker` [Б-M7]; [03 §12] |
| `report.yourPercent` | Ваш отчёт: {{percent}}% | Your report: {{percent}}% | Teie aruanne: {{percent}}% | нов. [Б-M10] |
| `report.reasonTitle` | Почему меньше? | Why lower? | Miks vähem? | нов. только при снижении (порядок п.6) |
| `report.pickReason` | Выберите причину | Choose a reason | Valige põhjus | нов. подпись неактивной «Отправить» при снижении [Б-M9, И-10] |
| `report.reason.rework` | Переделка | Rework | Ümbertegemine | нов. decisions §5.6 |
| `report.reason.mistake` | Ошибка в учёте | Counting mistake | Viga arvestuses | нов. то же |
| `report.reason.demolition` | Снос | Demolition | Lammutamine | нов. то же |
| `report.bigJump` | Большой скачок. Он будет отмечен в ленте объекта. | Big jump. It will be marked in the site feed. | Suur hüpe. See märgitakse objekti voos. | нов. **K15, не выводить** [03 §12]; без «владелец посмотрит» (бриф §2.4); только `worker` |
| `report.paused` | Объект на паузе. Отчёт можно отправить. | The site is paused. You can still send a report. | Objekt on pausil. Aruande saab ikka saata. | нов. плашка паузы на листе и на `today` (порядок п.7); без «примут» — перекликается со скрытым «Принято» [И-L9] |
| `report.send` | Отправить | Send | Saada | нов. sticky-кнопка листа (01 §4) |
| `report.closeSending` | Закрыть. Отчёт сохранён на телефоне. | Close. The report is saved on the phone. | Sulge. Aruanne on telefoni salvestatud. | нов. через 3 с после «Отправить» лист можно закрыть [Б-M1]; без «пока открыт» [r2-Q6]; [03 §12] |
| `report.retake` | Переснять | Retake | Pildista uuesti | нов. явная вторичная кнопка рядом с миниатюрой (≥ 48 px); касание миниатюры фото не заменяет [Б-M8], решение п.5; и для `invalid_photo_path` |
| `report.photoAlt` | Снимок для отчёта: {{stage}} | Report photo: {{stage}} | Aruande foto: {{stage}} | нов. `alt` миниатюры |

### 2.11. `send` — черновики и состояния отправки
| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `send.sending` | Отправляется | Sending | Saadetakse | нов. brief §1; форма значка — только `02-type.md` §8 [М-M5] |
| `send.sent` | Отправлено | Sent | Saadetud | нов. то же |
| `send.sentEarlier` | Отправлено: дошло раньше | Sent: it arrived earlier | Saadetud: jõudis kohale varem | нов. проверка по `storage_path` (01 §3.4 «Отправка» п.2); без «✓» |
| `send.queued` | Сохранено на телефоне, не отправлено. Откройте «Сегодня» в BuildProof, когда будет сеть. | Saved on the phone, not sent. Open “Today” in BuildProof when you have signal. | Telefoni salvestatud, saatmata. Avage BuildProofis „Täna“, kui levi on olemas. | нов. `queued`; не «эту страницу» [Б-M2] [03 §12]; единственный текст до теста на iPhone (01 §3.4); **вариант рабочего** («Сегодня») [r2-Q1] |
| `send.queuedOwner` | Сохранено на телефоне, не отправлено. Откройте «Обзор объекта» в BuildProof, когда будет сеть. | Saved on the phone, not sent. Open “Project overview” in BuildProof when you have signal. | Telefoni salvestatud, saatmata. Avage BuildProofis „Objekti ülevaade“, kui levi on olemas. | нов. [r2-Q1] вариант владельца/бригадира: у них нет «Сегодня» |
| `send.unknown` | Не знаем, дошёл ли отчёт. Фото сохранено на телефоне. | We do not know if the report arrived. The photo is saved on the phone. | Me ei tea, kas aruanne jõudis kohale. Foto on telefoni salvestatud. | нов. `unknown`: отвечает «дошло ли» и «где фото»; без «нет сети» и «проверим, когда появится» [Б-H1, И-3, М-M7], решение п.2 |
| `send.unknownHint` | Откройте «Сегодня», когда будет сеть, — проверим. | Open “Today” when you have signal and we will check. | Avage „Täna“, kui levi on olemas, — kontrollime. | нов. вторая строка `unknown`, **вариант рабочего** («Сегодня») [Б-H1] [03 §12] [r2-Q1] |
| `send.unknownHintOwner` | Откройте «Обзор объекта», когда будет сеть, — проверим. | Open “Project overview” when you have signal and we will check. | Avage „Objekti ülevaade“, kui levi on olemas, — kontrollime. | нов. [r2-Q1] вариант владельца/бригадира |
| `send.unknownAction` | Проверить ещё раз | Check again | Kontrolli uuesti | нов. кнопка `unknown`: проверка по `storage_path`, затем повтор [Б-H1], решение п.2; **единственная** кнопка `unknown` [r2-Q9] |
| `send.stale` | Не принято: этап уже {{percent}}% | Not accepted: the stage is already {{percent}}% | Ei võetud vastu: etapp on juba {{percent}}% | нов. `stale` (01 §3.4 правило 4, R:Б4-М1) |
| `send.staleResend` | Отправить с новым % | Send with new % | Saada uue %-ga | нов. то же |
| `send.stageAhead` | Этап уже {{percent}}%. Ваше фото добавлено. | The stage is already {{percent}}%. Your photo was added. | Etapp on juba {{percent}}%. Teie foto lisati. | нов. автоматический случай правила 4; не при снижении с причиной (R:Б4-М1) |
| `send.bar` | Не отправлено: {{count}} | Not sent: {{count}} | Saatmata: {{count}} | нов. плашка (01 §3.4); число без склонения |
| `send.barChecking` | Не знаем, дошли ли: {{count}} | Not sure if they arrived: {{count}} | Pole teada, kas jõudsid: {{count}} | нов. то же; говорит, что именно неизвестно [Б-H1] |
| `send.lastPhoto` | последний снимок {{time}} | last photo {{time}} | viimane foto {{time}} | нов. то же |
| `send.lastAttempt` | последняя попытка {{time}} | last attempt {{time}} | viimane katse {{time}} | нов. то же |
| `send.resend` | Отправить снова | Send again | Saada uuesti | нов. единственная главная кнопка при черновиках (01 §3.4); только в состоянии `queued`, не в `unknown` [r2-Q9] |
| `send.itemReason` | {{stage}}: {{reason}} | {{stage}}: {{reason}} | {{stage}}: {{reason}} | нов. причина по каждому черновику (R:Б4-М2); `reason` — строка из `send.*` / `errors.*` |
| `send.others_one` | На телефоне {{count}} отчёт другого человека. Уйдёт после входа этого человека. | This phone has {{count}} report from another person. It will go when they sign in. | Telefonis on {{count}} teise inimese aruanne. See läheb teele, kui ta sisse logib. | нов. 01 §3.4 правило 5; без «Удалить»; без рода [И-L1] |
| `send.others_few` | На телефоне {{count}} отчёта другого человека. Уйдут после входа этого человека. | — | — | нов. то же |
| `send.others_many` | На телефоне {{count}} отчётов другого человека. Уйдут после входа этого человека. | — | — | нов. то же |
| `send.others_other` | На телефоне {{count}} отчёта другого человека. Уйдут после входа этого человека. | This phone has {{count}} reports from another person. They will go when that person signs in. | Telefonis on {{count}} teise inimese aruannet. Need lähevad teele, kui ta sisse logib. | нов. то же |
| `send.limit` | Телефон хранит не больше {{max}} отчётов. Отправьте или удалите старые. | The phone keeps at most {{max}} reports. Send or delete old ones. | Telefon hoiab kuni {{max}} aruannet. Saatke või kustutage vanad. | нов. правило 7; `max` = 10 |
| `send.deleteConfirm` | Удалить этот отчёт с телефона? Фото не сохранится. | Delete this report from the phone? The photo will not be kept. | Kas kustutada see aruanne telefonist? Fotot ei säilitata. | нов. черновик не удаляется молча (01 §3.4 «Ошибки RPC») |

### 2.12. `review` — очередь проверки (**K15 / K32 — не выводить**)
Решение оркестратора п.1: все строки раздела готовы, но до K15 не выводятся нигде. При `k15-off` вход в `/review` не показывается (03 §4.7); заглушки нет, строка «появится позже» удалена [М-M7, И-L2].

| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `review.title` | Крупные скачки | Big jumps | Suured hüpped | нов. **K15, не выводить** (01 §3.3) |
| `review.checkN` | Проверить {{count}} | Check {{count}} | Kontrolli {{count}} | нов. **K15, не выводить**; на `/dashboard` (01 §3.3 п.2); в 03 = `dashboard.reviewN*` |
| `review.empty` | Проверять нечего. Крупные скачки появятся здесь, когда рабочие их отметят. | Nothing to check. Big jumps appear here when workers report them. | Kontrollida pole midagi. Suured hüpped ilmuvad siia, kui töölised need märgivad. | нов. **K15, не выводить**; пустое состояние |
| `review.wasClaimed` | было {{from}}%, заявлено {{to}}% | was {{from}}%, claimed {{to}}% | oli {{from}}%, märgitud {{to}}% | нов. **K15, не выводить**; строка очереди (01 §3.3); без «→» |
| `review.confirm` | Подтвердить | Confirm | Kinnita | нов. **K15, не выводить** |
| `review.return` | Вернуть | Send back | Saada tagasi | нов. **K15, не выводить** |
| `review.returnReason.wrongStage` | Фото не того этапа | Photo of the wrong stage | Vale etapi foto | нов. **K15, не выводить**; в 03 = `review.reason.*` |
| `review.returnReason.tooHigh` | Процент завышен | Percentage too high | Protsent liiga suur | нов. **K15, не выводить** |
| `review.returnReason.unclear` | На фото не видно работу | The work is not visible in the photo | Fotol pole tööd näha | нов. **K15, не выводить** |
| `review.returnSend` | Вернуть с этой причиной | Send back with this reason | Saada tagasi selle põhjusega | нов. **K15, не выводить**; главная листа `review-return-reason`, если 03 оставит «выбор + кнопка» [Б-L3] |
| `review.undoN` | Отменить все ({{count}}) | Undo all ({{count}}) | Võta kõik tagasi ({{count}}) | нов. **K15, не выводить**; одна кнопка плашки вместо пары счётчик + `common.undo`; отменяет **все** ожидающие подтверждения текущей плашки; число обновляется только после окончания касания; окно — до конца окна последней строки [Б-M12] [03 §12] [r2-Q7] |
| `review.confirmedRow` | Подтверждено | Confirmed | Kinnitatud | нов. **K15, не выводить**; свёрнутая строка + `common.undo`; без «✓» |
| `review.confirmAllSmall` | Подтвердить все мелкие ({{count}}) | Confirm all small ({{count}}) | Kinnita kõik väikesed ({{count}}) | нов. **K21, не выводить**: мелких в очереди сейчас нет по определению [Б-M15] |
| `review.closedEarly` | Не подтверждено: страница закрылась раньше. | Not confirmed: the page closed too early. | Kinnitamata: leht suleti liiga vara. | нов. **K15, не выводить** (01 §3.3 «Отправка») |
| `review.ownJump` | Свой скачок подтверждает владелец. | Your own jump is confirmed by the owner. | Oma hüppe kinnitab omanik. | нов. **K22, не выводить** |

### 2.13. `status`, `project` — статусы, пауза, завершение
До K15 подписи значения этапа — только по автору последней отметки (бриф §2.4, решение п.1, [И-H1]).

| Ключ | RU | EN | ET (`TODO native ET review`) | Почему |
|---|---|---|---|---|
| `status.markedByOwner` | Отметил владелец | Marked by the owner | Omanik märkis | нов. сегодня: автор `gc` (бриф §2.4) |
| `status.markedByForeman` | Отметил бригадир | Marked by the foreman | Brigadir märkis | нов. сегодня: автор `foreman` (бриф §2.4) |
| `status.markedByCrew` | Отмечено бригадой | Marked by the crew | Brigaadi märgitud | нов. сегодня: автор `worker` (R:И4-М2, бриф §2.4) |
| `status.verified` | Проверено | Checked | Kontrollitud | нов. **K15, не выводить**: своё значение никто не проверял (бриф §2.4, [И-H1]) |
| `status.accepted` | Принято | Accepted | Vastu võetud | нов. **K15, не выводить** (R:И4-М2) |
| `status.pending` | Ждёт проверки | Waiting for check | Ootab kontrolli | нов. **K15, не выводить** |
| `status.withPending` | с учётом ждущих проверки: {{percent}}% | including waiting for check: {{percent}}% | koos kontrolli ootavatega: {{percent}}% | нов. **K15, не выводить** (brief §2.1 п.4) |
| `status.returned` | Вернули: {{reason}} | Sent back: {{reason}} | Tagasi saadetud: {{reason}} | нов. **K15, не выводить**: строка `rejected` у рабочего, `reason` — из `review.returnReason.*` [Б-M14], решение п.5 |
| `status.returnedHint.photo` | Переснимите фото. | Retake the photo. | Pildistage uuesti. | нов. **K15, не выводить**; причина возврата «фото неясное» [r2-Q8] |
| `status.returnedHint.percent` | Поставьте процент заново. | Set the percent again. | Määrake protsent uuesti. | нов. **K15, не выводить**; причина «процент слишком высокий» [r2-Q8] |
| `status.returnedHint.other` | Посмотрите причину и отправьте заново. | Read the reason and send again. | Vaadake põhjus üle ja saatke uuesti. | нов. **K15, не выводить**; прочие причины; под `status.returned` на «Сегодня» [r2-Q8] |
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
| `onboarding.creating` | Заводим вашу фирму… | Setting up your company… | Seadistame teie firmat… | нов. `profile-not-configured` во время RPC [М-M1, И-10]; в 03 «Готовим ваш кабинет» — слово «кабинет» не используем |
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
| `photos.empty` | Фото пока нет. Первое — кнопкой «Сфотографировать» выше. | No photos yet. Take the first one with “Take a photo” above. | Fotosid veel pole. Esimese saate nupuga „Pildista“ ülal. | изм. `gc`/`foreman`/`worker`: кнопки «Добавить фото» в 03 нет, главная — `photos.takePhoto` [И-6, М-M1], решение п.6 |
| `photos.emptyStage` | Для этого этапа фото пока нет. | No photos for this stage yet. | Selle etapi fotosid veel pole. | изм. без «рабочий добавляет» при **шлюз−** [М-M3]; кнопка `photos.takePhoto` рядом |
| `photos.takePhoto` | Сфотографировать | Take a photo | Pildista | нов. главная экрана «Фото» без этапа; этап выбирается на листе [И-10, М-M1] |
| `photos.emptyClient` | Фото пока нет. | No photos yet. | Fotosid veel pole. | нов. `client`: без кнопки [И-6] |
| `tasks.empty` | Задач пока нет. Создайте задачу и назначьте исполнителя. | No tasks yet. Create one and assign someone. | Ülesandeid veel pole. Looge ülesanne ja määrake täitja. | изм. **шлюз+**: называет действие; при **шлюз−** — `tasks.emptyClosed` [М-M3] |
| `tasks.emptyClosed` | Задач пока нет. Запишите задачу, чтобы не забыть. | No tasks yet. Write one down so it is not forgotten. | Ülesandeid veel pole. Kirjutage ülesanne üles, et see ei ununeks. | нов. **шлюз−**: назначать некого [М-M3] [03 §12] |
| `tasks.emptyWorker` | На вас пока нет задач. Их ставит владелец или бригадир. | No tasks for you yet. The owner or foreman assigns them. | Teile pole veel ülesandeid. Need annab omanik või brigadir. | изм. задачи ставит и бригадир [Б-L6, И-L8] |
| `tasks.finish` | Готово | Done | Valmis | изм. как в каркасе 03 §5.5/§6.1 [Б-L7] |
| `issues.empty` | Проблем пока нет. Если что-то мешает работе — «Сообщить о проблеме». | No issues yet. If something blocks the work, use “Report an issue”. | Probleeme veel pole. Kui miski takistab tööd, vajutage „Teata probleemist“. | изм. то же |
| `stages.emptyAsk` | Этапы ещё не заданы. Спросите владельца. | Stages are not set yet. Ask the owner. | Etappe pole veel määratud. Küsige omanikult. | нов. `foreman`/`worker`/`client`; также `today` и `project-overview-client` без этапов [Б-M10, И-5], решение п.6; в 03 = `today.noStages*` |
| `overview.clientPaused` | Работы на паузе | Work is paused | Tööd on pausil | нов. `client`, **K8** [М-M1, И-10]; [03 §12] |
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
| `tariff.capRow` | {{from}} и больше (до {{max}} объектов; больше — по договорённости) | {{from}} or more (up to {{max}} sites; more by agreement) | {{from}} või rohkem (kuni {{max}} objekti; rohkem kokkuleppel) | изм. код: убрать аргумент `gb` — объём в приложении не виден и не считается [М-M8]; ET |
| `tariff.days` | Счёт по календарным дням: пауза не считается, неполный месяц — по дням (цена × дни ÷ {{divisor}}). | Billed by calendar days: paused days do not count, a partial month is by the day (price × days ÷ {{divisor}}). | Arve kalendripäevade järgi: paus ei loe, osaline kuu päevade kaupa (hind × päevad ÷ {{divisor}}). | изм. **K19, не выводить**: правило из decisions §5.9, показываем только вместе с биллингом [М-M8, И-8] [03 §12] |
| `tariff.trial` | {{days}} дней бесплатно, без карты. | {{days}} days free, no card. | {{days}} päeva tasuta, ilma kaardita. | изм. решение владельца (decisions §1 п.3); что после пробного периода и от чего считать — ждёт владельца, не пишем [И-8], решение п.8; код: убрать аргумент `reminder` (`Tariff.tsx:53`) |
| `tariff.invoice` | Счёт — по договорённости, напишите нам. | Invoice by agreement, write to us. | Arve kokkuleppel, kirjutage meile. | изм. **K19, не выводить** (01 §9 п.3) [03 §12] |
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
| `stages.decrease` | ползунка нет, кнопки «−10 / +10 / +25 / 100%» (K5, 01 §8 п.14) |
| `stages.increase` | то же |
| `demo.badge`, `demo.projectName`, `demo.address`, `demo.overall`, `demo.lastUpdate`, `demo.activeIssues`, `demo.issue1`, `demo.issue2` (8 ключей) | в коде приложения не используются (`grep "demo\." src` — только лендинг `copy/*.ts`); в RU латиницы нет, но выдуманный объект в продукте не нужен. Перед удалением повторить поиск |
| `photos.linksFailed` | в коде не используется; строка кончается двоеточием под текст сервера (01 §0.3). Перед удалением повторить поиск |
| `dashboard.emptyOther` | заменён на `dashboard.emptyForeman` / `dashboard.emptyWorker` [03 §12] |
| `overview.noStages` | заменён на `stages.emptyOwner` (владелец) / `stages.emptyAsk` (остальные) [03 §12] |
| `stages.empty` | то же |
| `tariff.included` | ред. 2: «до N владельцев и бригадиров» — второго владельца не пригласить (`api/invite.ts`: только `foreman`, `worker`, `client`), места не считаются [И-7]; решение оркестратора п.8. Код: убрать `<li>` и аргумент `managers` (`Tariff.tsx:54`) |

Отдельно удаляются **формулировки** внутри изменённых ключей (не ключи): «и заказчика» (`auth.tagline`), «Пригласите рабочего» (`reportStatus.none`), «Рабочие и заказчики» (`tariff.lead`), «Пауза не считается» (`tariff.days`), «и {{gb}} ГБ» (`tariff.capRow`), «только чтение», «Напоминание за N дней», «Ничего не списывается» (`tariff.trial`), «PDF-файлом… E-arve» (`tariff.invoice`), «Генподрядчик», «Прораб» (`roles.*`), «Обратитесь к администратору» (`common.noCompany`), «{{error}}» (`auth.profileLoadFailed`), «Мы заведём вашу компанию… в течение рабочего дня» (`onboarding.text`), символы «←» (`auth.backHome`, `tariff.back`), «Приглашены» (`reportStatus.noneWaiting`), «Владелец посмотрит» (`report.bigJump`), «Создайте объект заново» (`overview.noStages`, `stages.empty`), «эту страницу» (`send.queued`), «проверим, когда появится» (`send.unknown`).

Ред. 2 также снимает ключ, который был только в ред. 1 этого документа: `review.stub` («появится позже», [М-M7, И-L2]); `common.contact` (заменён на `common.contactPhone` / `common.contactEmail`), `review.undoCount` (заменён на `review.undoN`), `today.reportStage` (этап — `report.stage`); `dashboard.groupQuiet` заменён на `dashboard.groupPaused` / `dashboard.groupCompleted`.

---

## 4. Конфликты с лендингом (`src/features/landing/copy/*.ts`) — список для PR лендинга

Лендинг этим PR не меняется. Ниже — где его текст расходится с приложением после §2. Нумерация §9 — из `01-business-flow.md`.

| # | Ключ лендинга | Сейчас | Приложение говорит | Предложение |
|---|---|---|---|---|
| L1 | `phone.all` | «Всё» | `report.done100` «100%» | «100%» (§9 п.22, CT C8; ред. 2 — решение п.5) |
| L2 | `how.steps[0].text` | «+10, +25, «Готово»» | «−10 / +10 / +25 / 100%» | как в приложении (§9 п.15) |
| L3 | `phone.queued` | «Откройте страницу, когда появится сеть» | `send.queued` «…Откройте «Сегодня», когда будет сеть» | одна строка на оба места [Б-M2] |
| L4 | `dashboard.accepted`, `dashboard.withPending`, `dashboard.pendingCount`, `how.acceptedLabel`, `how.withPendingLabel`, `how.pendingJump`, `demo.accepted`, `demo.withPending`, `demo.pending`, `demo.pendingShort`, `demo.acceptedSmall`, `demo.legend.ok`, `demo.state.ok` | «принято», «ждёт проверки», «○» | до K15 только «Отметил владелец» / «Отметил бригадир» / «Отмечено бригадой»; «Проверено» нет; символов нет | убрать или подписать мок (§9 п.11, 16, 18; бриф §2.4) |
| L5 | `how.title`, `how.steps[1]` | «Крупные скачки проверяет бригадир» | проверки нет до K15; `report.bigJump` «Большой скачок. Он будет отмечен в ленте объекта» | «Рабочий снял. Вы видите, где работа идёт» (§9 п.13) |
| L6 | `how.lead`, `final.lead`, FAQ «Рабочие не будут» | ссылка от бригадира, WhatsApp, QR, «ни пароля» | WhatsApp-ссылки нет; вход кодом из письма — только **шлюз+** | после шлюза «приглашение по почте, вход кодом»; до шлюза — без пути рабочего (§9 п.14, 30, 35) |
| L7 | `how.steps[2]`, FAQ «Где мои фото», FAQ «Чем лучше WhatsApp» | ссылка и страница заказчика | `auth.tagline` без заказчика | убрать заказчика до `client-links.md` (§9 п.17, 31, 33; R:И4-HIGH) |
| L8 | `price.title` | «Рабочие и заказчики бесплатно» | `tariff.lead` «Рабочие бесплатно» | как в приложении (§9 п.6) |
| L9 | `price.included` | 4 пункта: менеджеры, личные ссылки, страница заказчика, PDF | `tariff.included` удалён; остаётся `tariff.lead` «Рабочие бесплатно» [И-7] | блок убрать, оставить «Рабочие бесплатно» (§9 п.6) |
| L10 | `price.lead` | «до архива. Пауза не считается» | `tariff.days` — **K19, не выводить** | убрать правило счёта дней до K19 (§9 п.7, [И-8]) |
| L11 | `price.invoice` | «Счёт раз в месяц PDF… E-arve» | `tariff.invoice` «по договорённости» (**legal**) | как в приложении (§9 п.7) |
| L12 | `price.day31Strong`, `price.day31` | «только для чтения», «пришлём напоминание» | `tariff.trial` «30 дней бесплатно, без карты» — о том, что после, ничего | убрать «только чтение», «ничего не списывается», напоминание; что после — решает владелец (§9 п.7, [И-8]) |
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
| L26 | `price.included[0]` | «До 3 владельцев и менеджеров» | `tariff.included` удалён | убрать (см. L9) |
| L27 | `hero.trust` | «потом от 29 € за объект…» | `tariff.trial` ничего не говорит о «потом» | «потом» — решает владелец; при сохранении цены рядом — без слов о том, что происходит с данными |
| L28 | `phone.*` (мок экрана рабочего) | одна строка «Отправить» | главная «Сфотографировать» + «Этап: …»; «Переснять» явной кнопкой | мок привести к экрану приложения после реализации |

---

## 5. Эстонские ключи для носителя языка

Все ET-строки §2 — черновик. Носителю в первую очередь (цена ошибки выше):
1. **Термины ролей и словарь §1.3:** `roles.gc` «Omanik», `roles.foreman` «Brigadir» (а не «Töödejuhataja»?), `roles.worker` «Tööline» (а не «Ehitaja»?), «aruanne» против «raport».
2. **Вход по коду:** `auth.signInWithCode`, `auth.haveInviteCode`, `auth.code`, `auth.codeHint`, `auth.codeSent`, `auth.neutralSent`, `auth.codeInvalid`, `auth.linkExpired`, `auth.linkOtherBrowser`, `auth.openInBrowser` («rämpspost» — так ли подписана папка «Спам» в Gmail/Outlook по-эстонски).
3. **Шлюз:** `gate.inviteLater`, `auth.recoveryLater`, `auth.signupLater` («lülitub sisse» звучит естественно?).
4. **Отправка с телефона:** `send.queued`, `send.unknown`, `send.unknownAction`, `send.barChecking` («levi» против «võrk»), `send.stale`, `send.stageAhead`, `send.others_*`, `send.limit`, `report.closeContinues`.
5. **Ошибки:** `errors.*`, `invite.emailTaken`, `invite.rateLimit`, `people.emailNotOurs`, `auth.checkEmailAndCode`, `auth.linkExpiredClosed`.
6. **Лист отчёта и «Сегодня»:** `today.report` «Pildista», `report.stage`, `report.reason.*`, `report.bigJump` («hüpe» против «samm»), `report.paused`, `report.retake`, `today.staleWaiting_*`.
7. **Подписи автора отметки:** `status.markedByOwner` «Omanik märkis», `status.markedByForeman`, `status.markedByCrew` «Brigaadi märgitud», `reportStatus.markedByOwner` / `markedByForeman`.
8. **Весь `tariff.*`** (сейчас по-английски), в т.ч. «+ km» вместо «+ käibemaks»; `tariff.title` «Hind» = «цена», EN «Plan» — нужен ли «Pakett» [И-L12].
9. Плюрали ET `_one/_other` в `auth.draftsWaiting_*`, `auth.signOutDrafts_*`, `reportStatus.noneDays_*`, `reportStatus.createdDaysAgo_*`, `send.others_*`, `errors.authRequiredDrafts_*`, `today.staleWaiting_*`: партитив («aruannet») после числа.
10. `people.emailFor` «E-post inimesele {{name}}», `people.removeConfirm`, `known.title` «Juba teie juures tööl».

---

## 6. Только EN (RU не меняется)

Единый термин «site» (§1.3). В PR реализации поменять EN без смены RU:
`dashboard.title` Projects → Sites; `dashboard.pickProject` → Choose a site; `dashboard.createProject` → Create site; `createProject.heading` → New site; `createProject.submit` → Create site; `createProject.nameRequired` → Enter a site name; `overview.loading` → Loading site…; `overview.loadFailed` → Could not load the site.; `overview.noStages` / `stages.empty` / `tasks.empty` / `issues.empty` — уже в §2.

---

## 7. Открытые вопросы

Закрыто ред. 2:
- ~~Названия браузеров в подсказке~~ — бриф §2.4: «в обычном браузере телефона», без названий.
- ~~«Владельцев и менеджеров»~~ — решение оркестратора п.8: `tariff.included` удалён (§3).
- ~~Что значит «Проверено» до K15~~ — бриф §2.4 (изм.): «Проверено» до K15 не выводится; подписи по автору (§2.13).

Открыто:
1. **Что говорим фирме, где у рабочих нет почты** (01 §7 п.3) — строки нет, ждёт владельца.
2. `gate.startEarlier` готова, но не выводится до решения владельца о ручном заведении рабочих (R:М4-2).
3. **Тариф:** что после пробного периода, от чего считать 30 дней, правило счёта дней (`tariff.days`, K19) — ждёт владельца; до решения в приложении только цена, потолок и «30 дней бесплатно, без карты».
4. **Шлюз− × пустой `legal.ts` = нет восстановления пароля** [М-H4]. Текст тут не поможет: это условие выпуска (бриф §3), а не строка.
5. **K34** — условие открытия шлюза (код в шаблонах писем) [И-M1]; без него строки §2.4, `invite.hint`, `dashboard.empty.step2Open` не выводятся.

---

## 8. Соответствие ключей 03 → 04

Звёздочные ключи из `03-wireframes.md` / `03-screens.json` (по аудитам r1). Канон — правая колонка. Новые недостающие ключи из 03 §12 добавляются сюда по мере списка UX.

| Ключ в 03 | Ключ в 04 |
|---|---|
| `overview.markFirstStage*` | `overview.next.action` |
| `overview.inviteWorker*` | `overview.next.inviteOpen` |
| `overview.staleForeman*` | `overview.staleForeman` |
| `today.cameraCta*` | `today.report` + `report.stage` над кнопкой |
| `today.noStages*` | `stages.emptyAsk` |
| `photos.takePhoto*` | `photos.takePhoto` |
| `drafts.retry*` | `send.resend` |
| `drafts.staleTitle*` | `send.stale` |
| `drafts.stay*` | `common.stay` |
| `report.sendNewPercent*` | `send.staleResend` |
| `dashboard.reviewN*` | `review.checkN` |
| `status.bigJump*` | `activity.bigJump` |
| `review.reason.*` | `review.returnReason.*` |
| `review.returnSend*` | `review.returnSend` |
| `people.inviteN*` | `invite.submit` |
| `people.inviteLater*` | `gate.inviteLater` |
| `people.remove*` | `people.remove`, `people.removeConfirm` |
| `common.offline*` | `common.offline` |
| `common.slow*` | `common.slow` + `common.reload` |
| `auth.inviteTitle*` | `auth.inviteTitle` |
| `auth.resetTitle*` | `auth.resetTitle` |
| `onboarding.creating*` | `onboarding.creating` |
| `common.signIn` в `login-code-enter`, `login-invite-code` | `auth.signInWithCodeSubmit` |
| `hint-open-in-safari-chrome` | `auth.openInBrowser` |
| «Вы вошли как {почта}» | `auth.signedInAs` (без изм.) |
| «Добавить фото» в листе без фото (`gc`/`foreman`) | `report.addPhoto` |
| чип свежести «Отчёт сегодня», «N дней без отчёта» | `reportStatus.today`, `reportStatus.yesterday`, `reportStatus.late_*`, `reportStatus.overdue_*` (без изм.) |
| «Подрядчик ещё не добавил этапы» (заказчик) | `stages.emptyAsk` |
| `overview.noStages`, `stages.empty` (владелец) | `stages.emptyOwner` |
| `dashboard.emptyOther` | `dashboard.emptyForeman`, `dashboard.emptyWorker` |
| `common.contact` | `common.contactPhone`, `common.contactEmail` |
| `review.undoCount` + `common.undo` | `review.undoN` (строка — `common.undo`) |
| имена 03 §12, совпадающие с 04 | без изменений: ключ 04 = ключ 03 |
| `onboarding.creating` «Готовим ваш кабинет» | `onboarding.creating` «Заводим вашу фирму…» (слово «кабинет» не используем) |
| `overview.openPeople` «Кто молчит 3+ дня» | `overview.openPeople` «Кто давно не отчитывался» (мягче, тот же смысл) |
| `reportStatus.noneWaiting` «На объекте: …» | «Добавлены: …» — решение оркестратора п.7 |
| «Работы на паузе» (заказчик) | `overview.clientPaused` |
| «Ваш последний отчёт: {дата}» | `dashboard.workerLastReport` |
| «Мой последний отчёт» | `today.lastReport` |
