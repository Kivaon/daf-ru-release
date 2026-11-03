## Актуальная точка входа — 2026-10-12

Сначала читать [HANDOFF-NEXT.md](../../HANDOFF-NEXT.md): v80 опубликована; новый формат нумерации согласован, но ещё не реализован. Документ содержит проверенные результаты, ограничения и следующие шаги. Уточнение пользователя: вести описание в Markdown Codex, не менять раздел сайта «О проекте».

# DAF-RU — состояние сессии 2026-10-04

## Продолжение

Не создавать новый проект. Сначала читать PROJECT.md и SPEC.md, проверять git status и актуальную версию Sites. Сайт: https://daf-ru.mffkk78khq.chatgpt.site; project_id — в .openai/hosting.json.

Основная папка: /Users/kivaonmac/Documents/Codex/2026-09-22/referenced-chatgpt-conversation-this-is-an.
Текущий выпуск готовится в существующем checkout: /Users/kivaonmac/Documents/Codex/2026-10-03/referenced-chatgpt-conversation-this-is-an/work/daf-ru-parser-release.
Основа выпуска — опубликованная версия 67, commit 6a9392d7ceef3d14f1324999eae7c8122624b03b. У основной папки HEAD d3df54e: перед будущей публикацией сверить удалённую ветку; не откатывать опубликованные изменения.

## Сделано

- Сохранён выпущенный парсер типографских кавычек, не восстанавливающий потерянный текст.
- Включены изменения предыдущего аудита: идентичность tractate+ref, различение ошибки чтения и отсутствия статьи, инструкция локальной БД, typecheck, документация.
- Добавлена «Подготовить весь лист» для editor/admin: личная очередь, полный оригинал, Раши/Тосафот обеих сторон составной реплики, копирование задания, частичный JSON-импорт и ручная проверка.
- Автосохранение приватного черновика через 1,8 секунды без публикации, включая исходный незаконченный ответ. Закрытие ждёт сохранения; при несохранённых изменениях вкладка предупреждает перед уходом.
- «Сохранить и дальше» атомарно дополняет все части и открывает следующий незавершённый пункт. Готовые статьи пропускаются; пропуск и выбор пункта сохраняются. Доступ с другого устройства — под тем же аккаунтом.
- Непустые опубликованные поля и исторические комментарии сохраняются. Конфликт версий очереди, конкурентная правка статьи, разные сохранённые объяснения/переводы или изменение состава не перезаписываются молча.
- Миграция 0003 только создаёт editor_batches. Прямой AI API не подключён.

## Проверка

35 тестов проходят: refs/импорт, приватность, восстановление, обе стороны composite, переход, отсутствие частичной публикации и конфликты. Проверены настоящие Sefaria Bekhorot 2a (12 пунктов) и Avodah Zarah 11b:12–12a:1. Локальный браузер: вставка → публикация → следующий пункт; 1 из 12; сохранение и восстановление некорректного JSON. Исправлено пересечение стилей очереди с основной навигацией. Тестовые статьи записывались исключительно в локальную БД через локальный QA proxy, который не входит в исходники выпуска.

## Ограничения / следующий этап

Границы composite остаются эвристикой; редактор видит предупреждение и полный исходник. Очередь фиксирует снимок Sefaria на старте. Нужны эталоны mapping PDF, история правок/рецензирование и перенос строгой проверки refs/защиты конкуренции в старый API одиночного редактора. Не переписывать накопленные материалы для решения этих задач.

## Выпуск

Опубликована версия 68, статус succeeded, commit 5628db89901cdcd004908bc98b4a4283026a45cc. Typecheck и production build прошли. Основная папка синхронизирована по изменённым файлам без изменения Git HEAD. Этот локальный итог выпуска добавлен после публикации; исходный снимок версии 68 содержит предрелизную запись. Резервные копии заменённых локальных файлов находятся в work/before-batch-sync рядом с release checkout.

## 2026-10-05 — закрывающие скобки

По примеру пользователя добавлено suggestClosingBrackets: только предложение суффикса, без автоматического изменения ответа или дописывания текста. Кнопка доступна в пакетном и одиночном импорте, включая ранее сохранённые повреждённые черновики. Добавлены проверки недостающих pages/document, скобок внутри строк и отказов при обрыве текста/значений. Публикация этого изменения следует после проверок.

Выпущено: версия 69, succeeded, commit 7920896f9d606aed9cd45df13039c3a24245a4e8. 38 тестов, typecheck и сборка прошли. Исходники синхронизированы в основную папку; её Git HEAD не изменён.

## 2026-10-05 — автоматическое восстановление и диагностика

Кнопки восстановления убраны. readModelResponse автоматически применяет безопасный суффикс, затем UI валидирует данные. responseDiagnostics сообщает ошибки на русском с позицией, фрагментом, путём и ref. Пакетный редактор восстанавливает старый сырой черновик и сохраняет результат; повторное автосохранение не должно применять сырой ответ поверх ручных изменений. Одиночный импорт использует общий importDraft, сохраняет существующие поля частичного ответа и исторические комментарии. Раздельные сообщения о повторном/чужом ref и типе поля. 42 теста и typecheck прошли до финальной сборки.

Выпущено: версия 70, succeeded, commit 4f20f35e80a76c52f2d90d565cca068a9cbb1812. 42 теста, typecheck и production build прошли. Основная папка синхронизирована без изменения её Git HEAD.

Цвета статусов очереди: Готово — зелёный #23733b, Черновик — коричневый #80502e, Подготовить — чёрный #000. Меняется только цвет надписи, логика статусов прежняя.

Цвета опубликованы: версия 71, succeeded, commit 2ddb6a641943ab4e85c1e24fa64d60e83ddb484e. Сборка прошла.

По уточнению со скриншотом увеличен именно шрифт статусов очереди: 14px вместо 11px, font-weight 600, line-height 1.4; цвета сохранены.

Размер и жирность статусов опубликованы: версия 72, succeeded, commit 78e69d9d34cf8a281433677e6729d8cda2b5a71e. Сборка прошла.

## 2026-10-05 — Карта перевода

Добавлен отдельный экран /translation-map с 37 трактатами и 5374 кликабельными ячейками существующих сторон. Прямоугольники имеют рамки даже при нулевом прогрессе, номера только в шапке; оси sticky внутри двухмерной прокрутки. Левые и общие итоги, точные пропорции, подсказки ячеек, обновление статистики. Переход на пустой Брахот 2b проверен в браузере: автоматически открылся пакет из 19 реплик.

Denominator: 81574 подтверждённых refs в Sefaria Wikisource; глобальный объём неполон из-за Shekalim и Nazir 33b, честно показано в UI. 129 доступных сторон Назира сохранены. Для составной статьи готовность проверяется на обеих сторонах; единица карты — физический ref, а не уникальный unit_ref. Черновики всех редакторов объединены по ref, без выдачи личного текста. Неполные опубликованные строки тоже розовые. Открытие пустого пакета не считается работой.

Миграция 0004 schema-only проверена и применена локально. SQL-агрегаты защищены editor/admin, анонимный API 401, reader 403. 48 тестов прошли; typecheck прошёл. Браузер подтвердил sticky top/left, scrollWidth16700 и 5374 ссылки. Локальные тестовые данные не переносить в production. Email и Ready for review не добавлялись. Публикация после окончательной сборки.

Карта опубликована: версия 73, succeeded, commit 021a8cecf7e9900d0594b3f8d060cb830aad023f. Typecheck и production build прошли. Основная папка синхронизирована по изменённым файлам без изменения Git HEAD.


## Mailjet notifications (2026-10-06)
- Recipient and confirmed sender: pitronot@proton.me. Server-only MAILJET_API_KEY / MAILJET_SECRET_KEY in Sites secrets; never copy to source or browser.
- Both single and batch publication atomically register a mail_jobs record before article writes. Initial article snapshot and canonical sorted refs deduplicate first completion, including composite units. Private drafts do not enqueue.
- Completion uses the translation-map source requirements (Gemara and all source Rashi/Tosafot). Previously complete articles are suppressed; future edits do not resend. No review status added.
- Worker waitUntil processes one due job per page/API visit. Errors do not undo article saves. Retries have backoff and run on later visits, not an unattended timer; if the site is idle, retries wait. Mailjet CustomCampaign + DeduplicateCampaign protect retries from duplicate delivery.
- Admin-only /notifications sends one deduplicated connection-test email; /api/notifications GET reports recent job states/errors without secrets. Provider acceptance does not prove inbox delivery.
- Verification: 52 tests passed, typecheck passed, local migration applied. Production build and Mailjet connection-test result recorded below after publication.

Release confirmed: live version 74, commit 3fe2568b83c192b2514f7e67fe98fdb374968623, Sites env revision 2, deployment appgdep_6ac419a87ff08191bf2b3ebb8ee27fb4 succeeded. Build passed. Production admin /notifications test POST accepted by Mailjet; UI displayed acceptance. Inbox delivery awaits user's observation. No article was created for this test. Original checkout synchronized (18 files), backup in current task work/before-mailjet-sync.

Sender changed at user request to kivaon@gmail.com; both sender addresses confirmed by user. Recipient remains pitronot@proton.me. Test campaign connection-test-gmail-v2 permits one fresh test without replaying existing article notifications. Prior inbox delivery NOT confirmed: user only found activation messages.

## 2026-10-10 — phone smart-quote recovery

Release prepared from live v75 in work/daf-ru-quotes-release. Deferred Sefaria/geometry WIP remains in work/daf-ru-parser-release and is NOT included.

Root cause: old parser only opened smart strings with “ and closed with ”. The phone response opens two translation values with ”. Recovery ran but failed; readModelResponse then reported the original input at column 2. Existing parser now recognizes either glyph at token boundaries and preserves internal paired smart quotes, guillemets and ASCII escapes. Strict JSON still returns before recovery.

Batch paste and old-draft adoption normalize recovered raw once before autosave, so reopening does not reapply raw over manual edits. Single import also uses the same readModelResponse → parseModelResponse → importDraft path.

Verification: 55 tests pass, typecheck passes. Exact tests/fixtures/chullin-105b-phone.txt passes parsing, schema, draft save/reopen and changeBatch publication. Local browser with actual Sefaria Chullin 105b: pasted exact fixture into item 9, all fields populated, clicked Save and next; status Ready, 1/19, moved to item 10. GET /api/articles confirms exact title/translation and two Rashi, zero Tosafot. Single-ref database storage flattens parts into translation (existing behavior), while parsed response retains parts.length=1 and pages.length=1. QA used isolated local DB only.

Published v76, succeeded, commit e9ef95c61c767a5748a1932e96202172320a0dca. Production build passed.

## 2026-10-10 — combined copy/paste recovery
Existing recovery now composes BOM/fence cleanup, outside-string whitespace normalization, smart quotes and safe closing suffix. Existing diagnostics walker rejects duplicate fields before import and identifies invisible syntax characters with code/position. Batch recovery notice is generalized. 61 tests and typecheck pass, including original and damaged Chullin fixtures through schema, draft save/reopen and real changeBatch publication with isolated SQLite. No new browser run in this follow-up; prior v76 UI path remains unchanged apart from notification wording. Deferred geometry WIP excluded.

## 2026-10-11 — Sefaria, PDF и Nazir (подготовка выпуска)

Продолжено с опубликованной v77 (9e4143fbffb8f4cb352c1c6c1789f256244cb135). Новый checkout существующего Sites: work/daf-ru-release в задаче 2026-10-11. Соседний work/daf-ru был во время паузы оформлен как GitHub backup; не менять его remote/историю. Старый WIP сохранён в work/wip-preserved и исходной папке parser-release.

Исправления JSON v77 оставлены без изменений. Sefaria refs/полные тексты отделены от геометрии PDF; добавлен выбор любой реплики, PDF показывается при отсутствии Гемары и при ошибке получения источников. Ошибка текстового слоя не препятствует рендеру. Единый обработчик связей учитывает диапазоны через стороны, отклоняет неполный ответ. Исправлен Node JSON import attribute.

Nazir 33a: 2 реплики, 2 Раши к 33a:1, 1 Тосафот к 33a:2. Nazir 33b: подтверждённо нет Гемары. Печатные продолжения доступны отдельно по полным текстам и ссылкам на исходные статьи; 31b:3:1 пересекает 33a/33b. В список WIP добавлены проверенные вхождения 34a:4:1 на 33a, 31b:10:1 и 32a:9:1 на 33b. Связи нельзя выводить из номера печатной стороны. Указатель не претендует на охват всего корпуса. Пустая очередь не создаётся, 0/0 не становится готовностью. Source-only кэш требований карты до 2026-10-10T22:00Z перепроверяется.

Аудит текущей БД: 64 строки articles в 7 трактатах (старый список был 43), ожидаемые/фактические 150 Раши и 31 Тосафот. Пропущенных/посторонних refs, дублей и пустых обязательных полей не выявлено. Все 580 текстов комментариев на 20 проверенных страницах совпали между links и явными диапазонами texts Sefaria. Полная филологическая оценка переводов не выполнена; исторические оригиналы в articles отсутствуют, поэтому отсутствие смысловых сокращений не гарантируется. Отчёт и точные refs: outputs/DAF-RU-audit.md и DAF-RU-audit-refs.json в задаче 2026-10-11; снимки/скрипты — work/audit. Production articles не изменялись.

Браузер: реальный PDF 33b отображается; на 33a доступен выбор 33a:2 с полным Тосафот. В отдельном локальном QA proxy намеренно подставлен другой PDF: геометрия не сопоставляется, но источники, editor tools и очередь из двух статей доступны. QA proxy и локальная БД не входят в выпуск. Статус итоговых проверок/публикации — следующей записью.

Итоговая проверка перед публикацией: 67/67 тестов, typecheck и git diff --check проходят. Парсер/диагностика JSON не отличаются от v77. UI с отказавшей геометрией: Nazir 33a:2 → пакет → полный Tosafot on Nazir 33a:2:1 → JSON → «Сохранить и дальше» → 1/2 готово, следующий пункт. Это только local-source-qa в отдельной локальной БД. Production build и номер публикации записываются после завершения Sites.


Опубликована v78, succeeded, 2026-10-11. Commit: 0469bc4e9f4464ab36cf76d8d794caf6145de343. Deployment: appgdep_6acb73dc2cc481918220242998280ff4. Production build прошёл. Публичный доступ сохранён; env revision 2. Проверены 67 тестов, typecheck, UI импорта/сохранения при отказе геометрии и статистика 33a/33b. Существующие статьи не перезаписывались. Эта запись добавлена локально после публикации.


2026-10-12: добавлен общий нижний колонтитул © 2026 Pitronot Group · Версия 79 · Опубликовано 12.10.2026. Следующим выпускам обновлять номер/дату в app/layout.tsx.

Опубликована v79, succeeded, commit 6e0ef6dfedf2602126dceff76ab98045506b541a. Typecheck и production build прошли; footer подтверждён в HTML опубликованной страницы.

## v80 — printed location clarification and source refresh
Live v79 UI audit confirmed all six known Nazir 32b Tosafot printed on 33a/33b are present (32b:3,4,5,6,9:2,10). Semantic refs did not reveal physical locations. Source cards now show verified printed occurrences and direct PDF links; unknown locations are not guessed. Opening an existing single-article draft appends newly linked source comments while preserving saved translations. Existing database content is not changed. Typecheck and 69 tests pass.

## 2026-10-12 — подготовка v81: два адреса
Реализован согласованный формат и текст перехода без ссылки в карточках оригиналов и печатном указателе. Сверено изображение audit/nazir33b.png с началами комментариев Sefaria: правая колонка сверху вниз (входящее продолжение 31b:3:1, затем 31b:4:1 … 32a:3:1); левая колонка сверху вниз (32a:5:1 … 32b:10:1). Всего 26 вхождений; добавлен 32a:7:1 на позиции 15; 32b:3:1 = 22. Входящее продолжение считается первым. Для 33a номера пока неизвестны. Ни порядок JSON, ни семантическая нумерация не используются как физические номера. Реальные API Sefaria Index Rashi/Tosafot on Nazir проверены: schema Daf/Line/Comment, alt_structs только Chapters; физического указателя там нет. Переводы, refs, JSON recovery и AboutProject не изменены. 72 теста прошли; статус сборки/публикации записать после выпуска.

Выпуск подтверждён: v81, succeeded, commit c407bca0b34a8b77dec4def3aedc224c55e16b41, deployment appgdep_6acd1ede37b48191bdaef49a959b493b. 72 теста, typecheck, production build прошли. Локальный браузер Nazir 32b:3 подтвердил новую подпись и общую PDF-кнопку. Отдельная browser QA production и страниц 33a/33b не выполнена. Публичный доступ сохранён. Осталось расширить физический указатель за пределы 26 Тосафот Nazir 33b. Эта запись добавлена после публикации.


## 18.10.2026 — локально реализован индекс начал и новый формат (не опубликовано)
В существующем daf-ru-release добавлены commentary-starts.json и проверяемый импорт отчёта. 145 refs / 144 начала Назир 31a–34a; номера отдельно по типам, входящие продолжения не нумеруются. Двойной Tosafot 34a:4:2 / 34a:8:1 сохраняет оба refs с одним адресом 34a:6. Для Раши 31b/34a ordinal намеренно отсутствует до разбора остатков Викитекста. Старые ordinal в индексе вхождений удалены, пропущенный 31b:10:2 добавлен на 33b.
Подписи в карточках и редакторах: «на Назир 32b:3:1», при другой странице начала «(см. на стр.33b)». Продолжение на следующем листе не меняет адрес начала. Служебных надписей о непроверенном адресе нет. Полные тексты, ключи Sefaria, переводы, JSON recovery и «О проекте» не менялись. Подробности и ограничения: COMMENTARY-LOCATIONS.md в checkout.
Проверки: 73 теста, typecheck; локальный браузер Nazir 32b:3 подтвердил обе подписи Раши/Тосафот. Не проводилась новая визуальная сверка печатных страниц.
Sites get_site подтвердил опубликованную v81, commit c407bca0b34a8b77dec4def3aedc224c55e16b41. Автоматическая проверка разрешений отклонила передачу credential через stdin штатному site-workflow helper: approval required, sandbox_approval=false; подробная причина не дана. Network и отдельное разрешение на .git не сняли блокировку. Обход не предпринимался; open/save/deploy не выполнены. Footer остаётся v81, новые изменения только локальны и не закоммичены.
Следующее: разрешить штатную синхронизацию Sites, затем проверить актуальный head с сохранением этих изменений, обновить footer под фактический выпуск, build/save/deploy и проверить production. Далее разобрать остатки Раши 31b/34a и расширять физический индекс; не повторять уже выполненный прогон.

Итоговая production-сборка 18.10.2026 прошла; повторно 73/73 теста и git diff --check.

## 18.10.2026 (Claude Code) — разведка запасного пути и правила совместной работы
Коммит e6dc18d проверен (73 теста, typecheck, build). Публикация не выполнена: блокировка write_stdin в Codex сохраняется и в новом треде. Добавлены COLLABORATION.md (правила для Claude Code и Codex) и MIGRATION-CLOUDFLARE.md (находки и план переноса; вход через заголовки oai-authenticated-user-* работает только на Sites). Cloudflare не затрагивался, прод и БД не менялись. Следующее: выгрузка боевой БД силами Codex (задача в MIGRATION-CLOUDFLARE.md) и решение пользователя по запасному хостингу.

## 19.10.2026 (Claude Code) — подготовка переезда на Cloudflare
Добавлены адаптер входа Cloudflare Access (app/cfAccess.ts, chatgpt-auth.ts, маршруты signin/signout), wrangler.cloudflare.jsonc, сборка `build:cloudflare`, scripts/remap-user-ids.sql. На Sites ничего не меняется: 77 тестов, typecheck, обе сборки прошли. В Cloudflare ничего не создавалось, Sites v81 и БД не менялись. Следующее: шаги из MIGRATION-CLOUDFLARE.md (D1, выгрузка БД через Codex, Access, секреты, деплой на workers.dev). Не проверено вживую: проверка JWT на реальном Access и CPU ≤10 мс.

## 19.10.2026 (Claude Code) — D1 создана в Cloudflare
По явному разрешению пользователя: wrangler login (OAuth, аккаунт Kivaon@gmail.com), создана D1 `daf-ru` (регион WEUR, id 47d1d8c3-cbab-40fd-b5f2-ce52ce8d951b, вписан в wrangler.cloudflare.jsonc), применены миграции 0000–0005. База пуста: данных из Sites нет. Worker, Access, секреты не создавались. Следующее: выгрузка БД из Sites (Codex).


## 2026-10-19T00:08:14+03:00 — Codex: попытка штатной read-only выгрузки production D1
Sites project appgprj_6ab23ab53a348191af22a74097e2b628: get_site подтвердил v81 и public; сайт, данные и доступ не менялись. HEAD в начале 5d200d0, рабочая папка чистая. Штатный read_database_overview вернул DB и все пять таблиц: articles, users, editor_batches, translation_map_sources, mail_jobs. Пробное read_database_table_rows(articles, limit=1, offset=0) вернуло model_projection.truncated=true, truncated_values=2, omitted_columns=0, omitted_rows=0: длинные значения обрезаются уже при одной строке, поэтому эти результаты непригодны для полного SQL/JSON снимка. Среди доступных Sites tools нет отдельного экспорта, COUNT или произвольного SELECT.
2026-10-19T00:08:14+03:00: шаг проверки экспорта в Sites Settings через штатный UI остановлен отказом: Computer Use is not allowed to use the app 'com.openai.codex' for safety reasons. Повторных попыток и обходов не было; credential не запрашивались.
Каталог db-snapshot не создан; SQL/JSON файлы отсутствуют. Числа строк источника до/после, число уникальных (tractate, ref), INSERT-counts, SHA-256, общий размер и сверка пяти статей не получены; полнота и консистентность снимка не подтверждены. Значения users/mail_jobs не читались и не выводились. Следующий допустимый шаг: пользователь проверяет штатный экспорт в Sites Settings; если его нет — отдельное явное разрешение на добавление и публикацию временного админского маршрута полного чтения пяти таблиц с проверками полноты. Маршрут не добавлен, публикация не выполнялась. Код не менялся; тесты/сборки не запускались, коммит не создавался.


## 2026-10-19T00:15:07+03:00 — Codex: read-only выгрузка по TASK-db-export v2, частичный результат
Каталог вне репозитория: /Users/kivaonmac/Documents/Codex/2026-10-12/10-12-daf-ru/outputs/db-snapshot-20261019-0011. Sites v81 не менялась. Перечислены все строки штатными read_database_table_rows(limit=1) до next_offset=null: articles=64 (уникальных tractate/ref=64), users=4, mail_jobs=21, editor_batches=10, translation_map_sources=13. Это числа перечисления; независимый COUNT до/после недоступен. users/mail_jobs полностью сохранены в JSON и INSERT-only SQL с колонками в порядке db/schema.ts; INSERT-count=4/21, проверена обратная загрузка SQLite без потери значений. articles-registry.json/csv содержат 8 коротких полей, без недоступных length(). editor_batches обрезана в 10/10 строк, translation_map_sources в 4/13, они не выгружены. SQL SELECT/count/max/length/substr инструментом не поддерживаются, N не найден.
2026-10-19T00:15:07+03:00: публичный GET /api/articles после разрешения сети вернул HTTP 403 Forbidden; выгрузка статей остановлена, повторов, credential и обходов не было. Полная БД, согласованность снимка до/после и сверка 5 статей не подтверждены. Следующий шаг: забрать полные статьи по реестру из разрешённой пользовательской сессии; для длинных приватных таблиц нужен штатный экспорт или отдельно согласованный временный admin read-only маршрут. Код и production не менялись, тесты/сборка не требовались, коммит не создавался.
Общий размер файлов: 101638 байт. SHA-256:
- README.md: 320a2bd2501d105d851c188f4b19d44782502635ae8788cc97a484c015b58229
- SHA256SUMS: 1496626e7761baec22067503995f50d8ac1a2e23fa3ce8e98cd46c8c9dd8c7ec
- articles-registry.csv: 30241a9b2b7d181c714261000f12ff92d82f86de73b875d21fbde6f17a6ae9f0
- articles-registry.json: cd90f24a7481ed2dd521c4222873a960aba87782e08de4dd814b503a0ab90d03
- mail_jobs.json: 5efb70af556dbe82ea1c51b310a27c7e5a0f0e6e19de4f0a52c5444a90bcbbdd
- mail_jobs.sql: 0ee0e01c9280936686b1f0fa39a3e1267286a98334ad3c61f04b928d5aa95c26
- read-metadata.json: 69915493d4905e16f346134b291f13d895b29477d932f9718d549b3e34daee3b
- report.json: 44bccf3327a3872a813431e064178460013be476d5ad2271c1399abe593d4e6d
- users.json: 0beec93a5f067d3838ed23ef012bf6b944af14f1e99a4b711c08fd63db524f18
- users.sql: ca6a976e849d98f3a67a7fd3f704c4c4307b97502f3624bc2757066d573c5425

2026-10-19T00:15:59+03:00 — Codex: по явной просьбе пользователя повторно проверен один публичный GET /api/articles без credential. После выдачи сетевого разрешения ответ HTTP 403 Forbidden. Выгрузка статей не начата; дальнейших попыток/обходов нет, production и данные не менялись.

## 19.10.2026 (Claude Code) — данные загружены в D1 daf-ru
Статьи (64/64) получены с публичного /api/articles (Codex получил 403 из своей среды), метаданные сверены с реестром Codex, 150 Раши/31 Тосафот совпали с аудитом 11.10. По разрешению пользователя в D1 daf-ru загружены articles, users (4), mail_jobs (21, все sent) и выполнен scripts/remap-user-ids.sql (user_id → cf:<email>). НЕ перенесены: editor_batches (10) и translation_map_sources (13) — инструмент Sites обрезает длинные значения. Worker, Access и секреты ещё не созданы; Sites v81 не менялась.

## 19.10.2026 (Claude Code) — воркер задеплоен на workers.dev (тест)
Зарегистрирован поддомен kivaon.workers.dev (по просьбе пользователя), воркер daf-ru задеплоен: https://daf-ru.kivaon.workers.dev (версия 25fa72b8). Чтение проверено: /, /api/articles, статика — 200 за ~0,25–0,45 с; /admin, /translation-map, /notifications без входа → 307; /api/users → 403; ошибок лимита CPU (1102) нет на ~30 запросах. Точное CPU-время не измерено (wrangler tail событий не вернул). Вход пока не работает: в vars остались заглушки (DAFRU_ADMIN_EMAIL, CF_ACCESS_*), Access и секреты Mailjet не настроены. Sites v81 остаётся продом. Не перенесены editor_batches и translation_map_sources.

## 19.10.2026 (Claude Code) — Cloudflare Access подключён
Приложение Access защищает только daf-ru.kivaon.workers.dev/signin-with-chatgpt (политика MyPolicy: Allow, Everyone, One-time PIN). В wrangler.cloudflare.jsonc прописаны CF_ACCESS_TEAM_DOMAIN=daf-ru.cloudflareaccess.com и CF_ACCESS_AUD (не секреты). DAFRU_ADMIN_EMAIL хранится секретом воркера (не в репозитории). Деплой 7267b3f3. Проверено curl: /signin-with-chatgpt → 302 на страницу входа Access, чтение и /api/articles открыты (200), /admin без входа 307. НЕ проверено: реальный вход с OTP и признание пользователя сайтом (cookie CF_Authorization на всех путях). Секреты Mailjet не заданы (письма не уйдут).

## 19.10.2026 (Claude Code) — админ после входа через Access
Пользователь вошёл через Access под своей рабочей почтой и не получил роль admin: в базе админом был старый аккаунт с Apple-relay почтой, а рабочая почта числилась reader. Секрет DAFRU_ADMIN_EMAIL заменён, роль в D1 повышена до admin. Аккаунты с Apple-relay почтой (код One-time PIN на них, вероятно, не доходит) удаляются; старый admin-аккаунт указан автором статей — перед удалением решить, на кого перепривязать authorUserId.

## 20.10.2026 (Claude Code) — уборка пользователей в D1 daf-ru
По решению пользователя: аккаунты с Apple-relay почтой удалены; авторство всех 64 статей перепривязано на рабочий аккаунт пользователя (он же прежний админ, имя в базе исправлено), сирот нет. Остальные записи (mail_jobs, editor_batches) на пользователей не ссылались. translation_map_sources — кэш Sefaria, переносить не нужно. Не опубликовано в GitHub (последний push c243b7c).


## 2026-10-20T01:35:54+03:00 — Codex: Mailjet и остаток данных перед закрытием Sites
Локально исправлены ссылки в почтовых уведомлениях: origin из запроса вместо фиксированного Sites URL. Тестовая кампания стабильна на origin и отличается для нового размещения; ID реальных mail_jobs не менялись, sent не переигрываются. Добавлены регрессионные тесты ссылок, изоляции тестовых кампаний и ссылки в реальном payload. Проверки: 79/79 тестов, typecheck, build:cloudflare и git diff --check прошли. Код и эта запись подготовлены для одного локального коммита; GitHub push и публикации не выполнялись.
Mailjet: восстановлены подтверждённые сведения по HANDOFF/PROJECT, значения секретов не читались. Логин аккаунта, название API-ключа, точный исторический способ валидации отправителя и тариф не установлены. Инструкция пользователю с порядком самостоятельной установки ключей, reset/reuse, проверкой /notifications и официальными источниками: /Users/kivaonmac/Documents/Codex/2026-10-12/10-12-daf-ru/outputs/MAILJET-CLOUDFLARE-20261020.md (вне репозитория). Проверка runtime 10 мс CPU и 30 с waitUntil, cold-cache Sefaria, реальная отправка/доставка остаются невыполненными; риски и следующий отдельный этап описаны в инструкции. Cloudflare и Mailjet не изменялись.
translation_map_sources подтверждён как восстанавливаемый source-only кэш: db/translationMapStore.ts хранит только refs требований и fetched_at, app/api/translation-map POST пересоздаёт их через Sefaria; ручных переводов и личного материала нет, перенос не нужен.
Штатным read-only инструментом Sites перечислены все 10 editor_batches (next_offset=null); два владельца по точному совпадению с Sites users, обновления 05–12.10.2026, самое свежее 12.10.2026. Все state_json обрезаны: содержимое не сохранялось, оценка заполненности невозможна. Короткий реестр JSON/CSV, приватный отчёт о владельцах/страницах/ревизиях/времени и SHA256SUMS сохранены вне репозитория: /Users/kivaonmac/Documents/Codex/2026-10-12/10-12-daf-ru/outputs/db-snapshot-20261020-0134/. Почты, имена и ID пользователей в эту запись не включены. Sites v81 и данные не менялись. Перед закрытием Sites пользователь должен решить судьбу этих черновиков; перенос через аккаунты владельцев или временный admin-export требует отдельного решения и согласованной публикации.

## 20.10.2026 (Claude Code) — проверка и выкладка правок Mailjet от Codex
Коммит 2508329 (ссылки в письмах и тестовая кампания по origin) проверен: 79 тестов, typecheck. Воркер перевыложен (версия d9780935): чтение 200, /admin без входа 307, /api/notifications без входа 403. Секреты воркера: только DAFRU_ADMIN_EMAIL; MAILJET_API_KEY/MAILJET_SECRET_KEY ещё НЕ заданы (письма не уходят) — пользователь вводит их сам по MAILJET-CLOUDFLARE-20261020.md. Черновики: 10 штук в старом Sites (9 у основного аккаунта, 1 у редактора; самый объёмный — 125 ревизий), содержимое не перенесено.

## 21.10.2026 (Claude Code) — черновики редактора перенесены в D1 daf-ru
Пользователь выгрузил 9 своих черновиков со старого Sites (скрипт в консоли Safari под его входом) и по его просьбе они загружены в editor_batches под его аккаунтом: Bava Batra 175b, Bekhorot 2a, Berakhot 2a, Chullin 105b (125 ревизий), Nazir 31a/31b/32a, Pesachim 2a/2b. Проверено в D1: JSON валиден, длина state_json совпала с исходником по всем девяти. Пустая Pesachim 2b (rev 0), созданная на новом сайте 19.10, заменена старой (rev 10). Chullin 105b не влез в одну SQL-команду (лимит D1) и загружен частями. Не перенесён один пустой черновик другого редактора (rev 0, Bava Metzia 102a). Выгрузка осталась у пользователя в ~/Downloads (личные данные, в git не добавлять). Остаётся: ключи Mailjet (вводит пользователь), решение о закрытии старого Sites.

## 03.11.2026 (Claude Code) — вход по коду, Mailjet на новом сайте, письма пользователям
- Вход: в Zero Trust добавлен One-time PIN (раньше был только вход участников аккаунта, из-за чего новые пользователи получали «restricted to members of the account»); вход «Cloudflare» из приложения убран, срок сессии продлён до месяца. Регистрация нового пользователя проверена.
- Mailjet: оба секрета заданы пользователем (`wrangler secret put`), тестовое письмо с /notifications дошло, ссылка ведёт на новый сайт.
- Сверка данных старого и нового сайта через публичный API: 64 из 64 статей идентичны (все поля, кроме автора, которого API не отдаёт). Черновики: 9 личных перенесены и сверяются хешами скриптом в консоли Safari (результат — в записи пользователя); десятый (пробный, ревизия 0, другой пользователь) по решению пользователя не переносился.
- Новое (локально, коммит ниже, НЕ выложено): письма пользователям. Письмо 1 — при первой регистрации (читатель), письмо 2 — когда админ в «Пользователи» выдаёт право редактора (reader→editor). Таблица `user_mail_jobs` (миграция 0006: при применении существующие пользователи помечаются как уже получившие письмо 1), `db/userMail.ts`, хуки в `app/roles.ts`, `app/api/users/route.ts`, отправка в `worker/index.ts`. `sendMail` принимает адрес получателя (по умолчанию прежний). Тесты 82/82, typecheck и build:cloudflare прошли.
- Перед выкладкой: `npx wrangler d1 migrations apply daf-ru --remote --config wrangler.cloudflare.jsonc`, затем деплой; только с подтверждения пользователя. Известный риск: отправитель gmail.com, у Mailjet нет подписи домена — письма на Gmail могут попадать в спам.
- Не проверено: фактическая доставка писем 1 и 2 на реальные адреса; результат сверки 9 черновиков; закрытие старого Sites (после сверки).

## 03.11.2026 (Claude Code) — выкладка писем пользователям
По подтверждению пользователя: миграция 0006 применена к D1 daf-ru (3 существующих пользователя помечены как получившие письмо 1), Worker выложен, версия aabc715f. Проверено: / и /api/articles 200, /api/users и /api/notifications без входа 403, секреты на месте. Не проверено: фактическая отправка писем 1 и 2 (нужен новый пользователь и выдача права редактора).

## 03.11.2026 (Claude Code) — кнопка «Удалить» в админке (локально, не выложено)
`DELETE /api/users` + `db/userAdmin.ts`: удаляет пользователя и его черновики (editor_batches); админа и авторов опубликованных статей удалить нельзя (403/409); себя удалить нельзя. В админке рядом с правом редактора кнопка «Удалить» с подтверждением. Письмо 1 повторно не уходит: запись `welcome:<user_id>` в `user_mail_jobs` остаётся. Тесты 83/83, typecheck и build:cloudflare прошли. Не выложено, ждёт подтверждения.

## 03.11.2026 (Claude Code) — выкладка кнопки «Удалить»
По подтверждению пользователя Worker выложен, версия 127ef830. Проверено: / и /api/articles 200, /api/users и DELETE /api/users без входа 403, /admin без входа 307. Саму кнопку под админом не нажимали.

## 03.11.2026 (Claude Code) — выкладка текстов писем
По подтверждению пользователя Worker выложен, версия 3543203e: письмо 1 и письмо 2 в редакции пользователя, подпись «Команда DAF-RU». Проверено: / и /api/articles 200, /api/users без входа 403. Фактическая отправка писем не проверена (нужен новый пользователь и выдача права редактора).

## 03.11.2026 (Claude Code) — подсветка Раши/Тосафот на листе (локально, не выложено)
Жалоба: на Бехорот 46а из двух Раши к реплике подсвечен один. Причины в `app/PdfDafViewer.tsx` (поиск диббура по словам текстового слоя PDF): (1) слова текстовых блоков с настоящим ивритом (logical order, pdf.js) получали позиции слева направо, т. е. в обратном порядке; (2) слова сортировались по `round(y/5)`, и жирный диббур с базовой линией на 1 пт ниже попадал в соседнюю «строку». Из-за этого `מתני' יש בכור לנחלה` не находился в колонке Раши, а находился в тексте Гемары (подсветка зелёным на Гемаре). Исправление: `app/pdfWordOrder.ts` (`tokenLeft`, `readingOrder` — строки по базовой линии с допуском 3,5 пт, `line` = номер строки), для комментариев используется новый порядок. Раши: зелёный ярче (`.rashiPdfHighlight`). Проверка на Бехорот 46а по Sefaria: Раши найдено 24 из 24 (было 20); 5 комментариев, находившихся в Гемаре или в сносках, теперь в колонке Раши; Тосафот без изменений (5 из 6). Тесты 85/85. Остаётся: поиск диббура всё ещё идёт по всем словам листа — если диббур не найден в комментарии, он может подсветиться в Гемаре (там же есть эти слова); можно исключить уже сопоставленные слова Гемары. Проверить на других листах после выкладки.

## 03.11.2026 — наведение на дибур Раши/Тосафот подсвечивает реплику

- Наведение на дибур Раши/Тосафот на PDF (любой комментарий листа, не только выбранной реплики) временно подсвечивает реплику Гемары, к которой он привязан по данным Sefaria (`comment.base`); клик выбирает эту реплику. Комментарий, привязанный к нескольким репликам, подсвечивает все.
- Удалены `locateDiburInGemara` (поиск слов дибура внутри реплики), синяя метка и закрепление по клику.
- Курсор над зонами слов и диббуров не меняется (`cursor:default`).
- Не сделано: подсветка всего текста комментария; наведение на карточки справа.

## 03.11.2026 — поиск диббуров Раши/Тосафот по колонкам

- Причина жалоб (Бехорот 46а): диббуры искались среди всех слов листа, и около половины находились в тексте Гемары (Мишны) с теми же словами, а не в Раши/Тосафот.
- Теперь `app/pdfCommentary.ts`: слова берутся только из размерной полосы Раши/Тосафот (≥9,5 пт и меньше Гемары на 1,5 пт), читаются колонка за колонкой (`columnOrder`), а `findDiburim` собирает слово из 2–3 соседних кусков (нун в мелком шрифте теряется или заменяется пробелом), игнорирует нун при сравнении и допускает начало печатного диббура со 2-го/3-го слова Sefaria. Код нун `\u0017` добавлен в таблицу глифов.
- Проверка по данным Sefaria на листах Бехорот 45а–48б (скрипт не в репозитории): Раши найдено 198 из 201, Тосафот 34 из 36, все в полосе Раши/Тосафот.
- `readingOrder` удалён (заменён `columnOrder`).

## 03.11.2026 — крупные первые слова диббуров, сторона колонки, загрузка PDF

- Первые слова диббура Раши/Тосафот на листе набраны крупнее остальных (шрифт вне полосы комментариев): они не подсвечивались («אמר» в «אמר אמימר הלכתא…», «יש» в «יש בכור לנחלה»). Теперь `addOpeningWords` в `app/pdfCommentary.ts` добавляет их справа от найденного начала на той же строке; поиск допускает начало диббура со 2-го слова (и 3-го для длинных).
- `findCommentary`: сторона страницы каждого комментатора определяется по однозначным совпадениям и имеет приоритет; если на своей стороне не найдено — берётся общий поиск (внизу листа колонки шире Гемары).
- Проверка по данным Sefaria на листах Бехорот 45а–48б: Раши 199 из 201, Тосафот 34 из 36 (Тосафот: все крупные первые слова добавлены).
- Загрузка PDF: таймаут 20 с и один повтор в `fetchPdf`; прокси `/api/daf-pdf` кеширует ответ на стороне Cloudflare и отвечает 504, если шас.орг молчит 15 с. Причина «вечной загрузки» не воспроизведена; вероятно, редкий долгий ответ внешнего сервера.

## 03.11.2026 — жирный шрифт диббура, крупные диббуры, комментарии соседних листов

- Печатный диббур набран жирным шрифтом и заканчивается там, где кончается этот шрифт: `findDiburim` продлевает найденное до конца жирного куска (Sefaria цитирует короче: «הבא אחר נפלים» → печать «הבא אחר נפלים שיצא ראשו»). Поле `font` добавлено в слова.
- Диббуры Тосафот набраны крупным жирным шрифтом (выше Гемары, свой шрифт) — такие слова теперь входят в поток комментариев; найдено Раши 199/201, Тосафот 36/36 на листах Бехорот 45а–48б.
- Комментарии соседних листов, продолжение которых напечатано на этом листе (`findOverflow`: слова, не занятые комментариями листа; доля ≥ 80 %, не менее 3 слов диббура, печатных слов не больше, чем слов диббура + 1): при наведении подсказка у курсора «Раши/Тосафот · см. 46б», клик открывает тот лист. Комментарии берутся из `boundaries.previous/next` (`neighborComments`).
- Известное ограничение: совпадения коротких диббуров соседних листов отсеиваются нарочно (лучше без подсказки, чем с ложной).

## 03.11.2026 — зоны Раши/Тосафот по колонкам вместо сторон страницы

- Ошибка: диббур Раши «ובן ט' שיצא ראשו מת» находился в крупных жирных словах Тосафот («ואיידי… בן ט' שיצא ראשו מת»), и подсветка Раши (зелёная) ложилась на диббур Тосафот (терракотовый) — два цвета в одном диббуре.
- `splitColumns` (`app/pdfCommentary.ts`) делит слова комментариев на колонки; `labelColumns` определяет, чья колонка — по диббурам, найденным целиком; `findCommentary` ищет диббуры комментатора только в его и неразмеченных колонках, а в чужих — лишь целиком и только то, что не нашлось. Старое голосование по сторонам страницы удалено.
- Строка колонки не разрывается по пробелу (до 7 × 7 pt), если в нём стоят неискомые метки (сноски и т. п.): так диббур «הא מוקמינן ליה / לקמן דבהרשאה קמיירי» на 47б больше не теряется.
- Сопоставление терпит различие в написании с буквами י/ו («ליה» / «לה»).
- Проверка по Sefaria на 45а–48б: Раши 200/201, Тосафот 34/36 (не находятся «האב פטור» 48б, Тосафот 45а:11:1 и 46б:4:1 — последний напечатан на 46а).

## 03.11.2026 — оценка совпадения, пропуск слов, контекст комментария

- `findDiburim` (`app/pdfCommentary.ts`): слово диббура даёт оценку (1 — те же буквы, 0,7 — близкое написание), а не «да/нет». Слово, которого нет в печати, больше не обрывает цепочку: следующее ищется от того же места; цена непонятого слова — его доля в оценке (порог 58 % оценки, пропущено не больше 40 % слов).
- Из нескольких мест для диббура выбирается то, за которым в печати идёт текст самого комментария (первые 8 слов после диббура, из Sefaria). Это сняло почти все нарушения порядка: из ~35 до ~10 на листах 45а–48б.
- Порядок комментариев в Sefaria (`46a:2:3`) — вторичная проверка: диббур, выпавший из порядка, переносится на равноценное место между соседями, но никогда не отбрасывается; перенос только если оценка (с контекстом) не хуже текущей более чем на 0,1.
- Итог на 45а–48б: Раши 200/201, Тосафот 34/36, как и раньше; ожидаемый выигрыш — в правильном выборе места у коротких и повторяющихся диббуров.

## 03.11.2026 — выравнивание колонок с текстом Sefaria, наведение на любое слово комментария

- `app/pdfAlignment.ts`: колонки листа (слова из `splitColumns`) выравниваются с полным текстом Раши и Тосафот Sefaria (локальное выравнивание, слова с ошибками и разрывами терпятся). Колонка выравнивается несколько раз: лучший кусок забирается, остаток выравнивается снова, поэтому колонка, где Раши переходит в Тосафот, делится по месту стыка. Каждое слово получает комментатора и комментарий; слова между двумя словами комментария тоже ему принадлежат.
- `app/pdfLocate.ts` (`locateCommentary`): сочетание двух способов. Диббур, найденный целиком по словам (с учётом текста комментария), в приоритете; если по словам не найден — берётся начало комментария из выравнивания, но только если оно набрано своим (жирным) шрифтом; комментарии соседних листов — только последние/первые 3 каждого комментатора (`SPILL_COMMENTS`), диббур целиком или ≥ 6 выровненных слов. Результат: диббуры и «зоны» (слово → комментарий).
- `PdfDafViewer.tsx`: невидимые кнопки диббуров заменены слоем `.commentaryPad`, который по положению курсора находит слово зоны; наведение на любое слово комментария подсвечивает его диббур и (если реплика не выбрана) реплику; клик выбирает реплику; для комментария соседнего листа — подсказка «см. 46б» и переход. Курсор не меняется. Минус: слова комментариев больше не доступны с клавиатуры (раньше кнопки диббуров были фокусируемы).
- Проверка (Sefaria + PDF shas.org): Бехорот 45а–48б: 234/237 диббуров по словам + 1 по выравниванию, 2 нет (напечатаны на соседнем листе), покрытие слов зонами 99%. Эрувин 2а, 76б: 44/44; Зевахим 2а, 20б: 50/50; Сукка 2а, 3б: 51/51; Шаббат 12б: 32/32. Шаббат 2а: 5 комментариев Раши (3:1–3:5) не находятся — старый поиск находил их ложно внутри Тосафот. Время расчёта 0,4–1,2 с на лист (Node).
- Границы размерной полосы комментариев: от 9,5 pt до (Гемара − 1,0 pt); слова Гемарного шрифта от 11,8 pt в полосу не входят (Эрувин: Тосафот набран 12 pt).
- `PDF`: прокси `/api/daf-pdf` повторяет запрос к шас.орг один раз, клиент — до трёх раз с паузой.
- Не проверено: Рашбам вместо Раши (Бава Батра с 29-го листа): комментатор в Sefaria назван иначе, зон нет.

## 03.11.2026 — знак «מתני'/גמ'», переход на реплику другого листа, цвета

- Знак «מתני'» / «גמ'» в начале реплики (отдельное слово справа от диббура на той же строке) приклеивается к диббуру, который за ним следует, и красится в его цвет (`addOpeningWords`).
- Клик по комментарию, чья реплика на другом листе, открывает лист и выбирает эту реплику (`openComment` и `pendingBlock` в `HomeClient.tsx`, ранее только открывался лист).
- Цвета: Раши светлее (`rgba(0,184,92,.34)`), Тосафот — голубой (`rgba(52,132,214,.32)`); акценты Тосафот в правой панели (заголовок, рамка карточки, подпись) тоже голубые, чтобы цвета совпадали.
- В `findCommentary` то, что не нашлось в колонках своего комментатора, ищется и в чужих, если диббур найден целиком или за ним идёт собственный текст комментария (`context ≥ 0,5`); цитата того же места в чужом комментарии под это не подходит.
- Проверочный скрипт теперь считает положение слов тем же преобразованием `viewport.transform`, что и приложение, и отбрасывает слова вне страницы (без этого часть листов считалась неверно).
- Итог (Sefaria + PDF shas.org, листы Бехорот 45а–48б, Хулин 2а/12б/78а/78б, Эрувин 2а/76б, Зевахим 2а/20б, Шаббат 2а/12б/21б, Сукка 2а/3б, Бава Кама 2а/20б, Брахот 3б/20а): из 709 комментариев диббур найден у 695 (98 %). Не находятся в основном комментарии, напечатанные на соседнем листе, и совпадения только внутри цитат в Тосафот (Шаббат 2а, 3:x; Хулин 78б, 3:1, 3:2, 5:1, 9:2). Хулин 78б — страница, где Раши и Тосафот стоят рядом без Гемары между ними; её колонки сливаются в одну, это слабое место.

## 03.11.2026 — наведение на знак «גמ'/מתני'», обратная подсветка, закрытие рабочих потоков PDF

- Слова, приклеенные к диббуру (крупные первые слова и знак «גמ'» / «מתני'»), попадают в зоны комментария и выходят вперёд зон выравнивания (`locatedZones.unshift`), а над ними убираются кнопки реплики Гемары (`replyHits`): наведение на знак работает как наведение на комментарий или его диббур.
- Обратная симметрия: при наведении на реплику подсвечиваются диббуры её комментариев (`previewedRefs`), как при наведении на комментарий подсвечивается реплика.
- `PdfDafViewer.tsx`: после отрисовки листа (и при отмене) закрывается документ pdf.js (`loadingTask.destroy()`), раньше каждое открытие листа оставляло рабочий поток; в тестовом браузере при частой смене листов загрузка зависала на «Загружаем оригинальный PDF…». Что это та же причина, что и у зависания на боевом сайте, не подтверждено.

## 03.11.2026 — один вывод листа и нежная подсветка при наведении на реплику

- Лист рисовался дважды: сначала без текста Sefaria и комментариев (эффект запускался с пустыми `segments`), потом заново. Теперь `PdfDafViewer` получает `dataReady` и не начинает работу, пока текст и комментарии не загружены; всё это время закрыто сообщение «Загружаем лист и комментарии Sefaria…», затем «Размечаем лист…» с пояснением, что подсветка появится по окончании. Если Sefaria недоступна (`status === "error"`), лист рисуется без подсветки, как раньше.
- Диббуры, показанные временно (при наведении на реплику или комментарий), нежнее зафиксированных (класс `previewDibur`: прозрачность 0,2 против 0,42).
- Проверка в тестовом браузере (Бехорот 46а): один непрерывный экран ожидания, затем готовый лист; у выбранной реплики 6 диббуры `rgba(0,190,90,.42)`, при наведении на реплику 7 — `rgba(0,190,90,.2)` и `rgba(10,150,255,.2)`.

## 03.11.2026 — знак «גמ'/מתני'» из колонки комментариев больше не входит в подсветку реплики

- Причина: выравнивание Гемары с Sefaria искало первое слово реплики («גמ'», «מתני'») среди всех слов нужного размера и могло взять знак из колонки Раши/Тосафот; подсветка реплики (45б, реплика 2) тогда захватывала «גמ' סומקא» в колонке комментариев.
- Теперь слова, вошедшие в зоны комментариев (диббур вместе со знаком), убираются из слов реплики, а подсветка реплики пересчитывается без них (`PdfDafViewer.tsx`, после `locatedZones`). Прежнее исключение из кнопок реплики (`replyHits`) удалено как ненужное.
- Проверка: на боевом сайте (версия 36e16cb8) подсветка реплики 45б:2 накрывала знак на (156; 212); на новой сборке ни одна из 19 реплик 45б его не накрывает.

## 03.11.2026 — касание на телефоне: комментарий выбирает свою реплику

- Клик по слою комментариев (`.commentaryPad`) брал комментарий из состояния наведения (`hoveredComment`), а на сенсорном экране перед касанием нет движения указателя, поэтому касание комментария ничего не делало (касание реплики работало: у её слов свои кнопки). Теперь место берётся из самого клика (`zoneAt`).
- Проверка (имитация касания без предшествующего движения, Бехорот 46а): выбрана реплика 1, касание тела комментария реплики 6 — выбралась реплика 6.
- На сенсорном экране нет наведения, поэтому временные нежные подсветки (реплика → диббуры, комментарий → реплика) там не видны; касание сразу выбирает реплику.

## 03.11.2026 — при открытии листа показывается активная реплика

- `app/pdfScroll.ts` (`centerScroll`) и эффект в `PdfDafViewer.tsx`: когда лист открыт заново (старт, выбор листа, переход по комментарию соседнего листа, соседние листы), окно прокручивается так, что по горизонтали середина окна = середина зоны Гемары (все найденные реплики, а не комментарии рядом), а по вертикали видна активная реплика по центру; реплика выше окна показывается с начала. Масштаб читателя не меняется.
- Срабатывает один раз на лист (`centeredFor`, `readyUrl`), после того как лист нарисован с актуальными данными: `dataReady` теперь требует, чтобы сегменты принадлежали открытому листу (`segments[0].id` начинается с номера листа), иначе при смене листа лист один раз рисовался со старыми данными.
- Проверка: математика — тестами (`tests/pdf-scroll.test.ts`); в тестовом браузере раньше подтверждено срабатывание на старте (прокрутка менялась), а итоговый вариант (центр по зоне Гемары) в браузере не проверен: панель браузера была скрыта, и рисование листа стояло.

## 03.11.2026 — размер печати Раши/Тосафот читается с самого листа (Бехорот 4а/4б)

- Причина потери зоны Тосафот на 4б: размер комментариев считался постоянным (≥ 9,5 пт), а на ранних листах Бехорот Тосафот набран 9 пт (Раши 11 пт; 4а: Тосафот 635 слов по 9 пт). Слова Тосафот выпадали из потока, у них не было ни зон, ни диббуров.
- `app/pdfSizes.ts` (`commentarySizes`): размер считается комментариями, если почти все его слова (кроме шрифта Гемары) — слова Раши/Тосафот из Sefaria (порог 90 %; у Гемары до 86 %, у сносок до 60 %, у комментариев на проверенных листах 93–100 %); малые размеры в пределах пункта от комментарийного (жирные диббуры, на некоторых листах десятки подмножеств шрифта) берутся тоже. В потоке комментариев — объединение этих размеров и прежней полосы между сносками и Гемарой.
- Проверка по Sefaria + PDF shas.org: Бехорот 4а/4б/5а — 78 из 78 (было 69), 45а–48б — 235 из 237, Эрувин 44/44, Зевахим 50/50, Сукка 51/51, Бава Кама 65/65 (с учётом выравнивания), Шаббат 83/87, Хулин 115/121, Брахот 3б/20а 53/54; покрытие слов зонами 96–100 %.
- В браузере 4б не смотрел (панель была скрыта).

## 03.11.2026 — переход на другой лист по комментарию спрашивает подтверждение

- Клик (касание) по комментарию, напечатанному на этом листе, но относящемуся к реплике другого листа, больше не уводит с листа сразу: рядом с местом клика появляется карточка в стиле сайта (светлая, с зелёной/голубой верхней линией, как `.studyWaiting`): «ТОСАФОТ · К ЛИСТУ 46Б», диббур на иврите, пояснение «Этот комментарий напечатан здесь, но объясняет реплику на другом листе.», кнопки «Перейти к 46б» (открывает лист и выбирает реплику) и «Остаться». Закрывается кнопкой «Остаться», клавишей Esc и кликом по другому месту листа.
- Проверка в тестовом браузере (Бехорот 46а, комментарий «ואיידי…» к 46б): клик показал карточку без перехода; «Остаться» и Esc закрыли; «Перейти к 46б» открыл 46б с репликой 4.

## 03.11.2026 — широкие строки больше не склеивают колонки (Бехорот 45а, Тосафот)

- Причина: колонки собирались по перекрытию с уже растянутым краем. Первая строка листа 45а на всю ширину (131–516) растягивала колонку, и к ней присоединялись узкие строки обеих колонок. Порядок чтения перемешивал Раши и Тосафот, и короткий блок Тосафот (92 слова) выравнивался с чужими комментариями: при наведении на его строки «горели» разные реплики, диббур второго Тосафот не находился.
- `splitColumns` (`wideShare = .55`): строки шире 55 % ширины листа собираются в свои колонки отдельно от узких. Проверено: блок Тосафот на 45а теперь целиком принадлежит двум своим комментариям (4:1 — 53 слова, 11:1 — 32), оба диббура находятся.
- Статистика (Sefaria + PDF shas.org): Бехорот 45а–48б 236/237, 4а/4б/5а 78/78, Хулин 119/121, Эрувин 44/44, Зевахим 50/50, Шаббат 87/87, Сукка 51/51, Бава Кама 65/65, Брахот 53/54. Положение окна при открытии листа не менялось.
- Проверено на 45а: до этого 86 из 92 слов левого блока Тосафот получали метки Раши.

## 03.11.2026 — карточка перехода на другой лист: текст о продолжении

- Карточка (клик по комментарию другого листа) больше не показывает диббур; текст по центру: «Этот комментарий является продолжением, начало находится на предыдущем / следующем листе.» для соседних листов и «…на листе 78б.» для остальных (`app/pdfJump.ts`, `beginningPlace`). Кнопки «Перейти к …» и «Остаться» одной ширины (`flex: 1 1 0`) и с центрированным текстом.
- Проверено в тестовом браузере на Бехорот 46а: для 45б — «на предыдущем листе», для 46б — «на следующем листе»; кнопки по 111 px.

## 03.11.2026 — наведение работает и между словами и строками комментария

- Раньше отзывались только прямоугольники слов (±1 px), поэтому в промежутке между словами или строками подсветка гасла и мигала. `commentAreas` (`app/pdfCommentary.ts`) делает для каждого комментария и каждой его строки область от первого до последнего слова и от половины межстрочного пространства сверху до половины снизу (шаг строк — медиана по листу): строки одной колонки соприкасаются, область между словами внутри комментария. Слова одного комментария на одной строке дальше 30 pt друг от друга — отдельные области.
- Проверка в тестовом браузере (Бехорот 47б, движение курсора по вертикали с шагом 0,7 px): внутри колонок комментариев без комментария остаётся 0–3 % положений; вне колонок — как положено, пусто.

## 03.11.2026 — мобильная адаптация (только ширина ≤ 640 px)

- Шапка: строка 1 — логотип «דף» и кнопка ☰; всё остальное (имя, «Пользователи», «Выйти»/«Войти», «Словарь», «Карта перевода», «О ПРОЕКТЕ», новая ссылка «PDF листа для печати») — в выпадающем меню (`#mainMenu`, класс `open`; закрывается по выбору пункта и Esc; окно «О проекте» держит меню открытым до закрытия). Строка 2 — ← [трактат] [лист] →; масштаб и PDF в строке убраны (на телефоне лист занимает всю ширину). Шапка прячется при прокрутке вниз и возвращается при прокрутке вверх (`topbarHidden`).
- Лист: без внутренней прокрутки и фиксированной высоты, ширина 100 % (масштаб = ширина контейнера / 644, `fitZoom`), естественная высота, все свайпы двигают страницу. Кнопка «⛶ Читать» (плавающая на листе) открывает полноэкранный режим (`.readerOverlay`): свободное перемещение, масштаб −/+ (70–260 %, по умолчанию 130 %), «✕» закрывает; при открытии лист центрируется по зоне Гемары на активной реплике.
- Всё новое скрыто на ширине > 640 px; `HomeClient.tsx` — состояния `isMobile`, `menuOpen`, `reader`, `headerHidden`; `globals.css` — блок в конце файла. Правил ≤ 800/750/600 px прежние, они на ширине ≤ 640 перекрываются новым блоком.
- Проверка (Playwright, Chromium, iPhone 13, внешние файлы не менялись): шапка 154 → 52 px; окно листа 377 px с внутренней прокруткой → естественная высота без прокрутки; свайп по листу двигает страницу (352 px; на боевой версии двигалась только внутренняя прокрутка); меню, Esc, окно «О проекте», шапка при прокрутке, режим чтения (панорама, масштаб, закрытие) работают; нет горизонтальной прокрутки на 320/360/375/414/640 px; на 641 px прежняя вёрстка; десктоп 1280×800 до и после совпадает пиксель в пиксель.

## 03.11.2026 — мобильная версия: вход наверху, лист двигается только в рамке

- Шапка (≤ 640 px): до входа — значок «войти» и ☰; после входа — почта (обрезается многоточием), значок «выйти» и ☰. «Войти», «Выйти» и имя из меню убраны. В меню остались «Пользователи» (админ), «Словарь», «PDF листа для печати», «Карта перевода» (редактор), «О ПРОЕКТЕ».
- Концепция листа изменена: рамка фиксированной высоты (`clamp(300px, 56vh, 560px)`), внутри лист двигается одним пальцем и увеличивается щипком (`app/PanZoom.tsx`: CSS-transform, `touch-action: none` только в рамке); сама рамка и остальная страница не меняют размеров, страница прокручивается свайпом вне рамки. Кнопка «⛶ Читать», режим чтения и проценты масштаба удалены. Лист рисуется в масштабе 1,6, при открытии вписан по ширине, затем рамка сдвигается к активной реплике (`onFocus` в `PdfDafViewer`). Подсказка и карточка перехода рисуются в обратном масштабе (`--sheet-scale`), чтобы оставаться читаемыми.
- `PdfDafViewer`: координаты клика/наведения пересчитываются с учётом масштаба рамки (`zoneAt`), наведение мышью для касаний отключено; по касанию комментарий выбирает свою реплику, как и по клику.
- При правке попало под удар и было восстановлено центрирование при открытии листа на десктопе (его случайно удалил мой скрипт замены): десктоп 1280×800 до и после совпадает пиксель в пиксель.
- Проверка (Playwright, iPhone 13): шапка 52 px (вошедший: почта + значки в одной строке без переполнения); рамка 368×370; начальный масштаб 0,357 (весь лист по ширине), щипок → 0,975, перетаскивание сдвигает лист, страница не двигается (scrollY 0), свайп вне рамки прокручивает страницу на 301 px при неизменной рамке; касание комментария другой реплики выбирает её; нет горизонтальной прокрутки на 320–640 px; 641 px — прежняя вёрстка.

## 03.11.2026 — выбор реплики между стрелками, значок печати над листом (телефон)

- Подпись «Реплика Sefaria» убрана; выпадающий список реплик (`.replyPicker`) стоит между кнопками «Предыдущая / Следующая реплика» (компьютер и телефон; на телефоне в стрелках остаются только номера реплик).
- На телефоне значок печати PDF (`.sheetPrint`) — в правом верхнем углу рамки с листом; пункт «PDF листа для печати» из меню убран.

## 03.11.2026 — подписи и размер рамки

- Убраны подсказка «В рамке лист двигается…» (телефон) и строка «Лист: Shas.org / HebrewBooks · текст и связи: Sefaria» (телефон и компьютер). В подвале (`app/layout.tsx`) между «© 2026 Pitronot Group» и «Версия …» добавлено «Использованы материалы Sefaria» со ссылкой на https://www.sefaria.org (новая вкладка). Упоминание Shas.org / HebrewBooks (источник изображения листа) на сайте больше не выводится.
- Рамка листа на телефоне выше: `clamp(340px, 70vh, 680px)` (было 56 vh); под ней остаётся ~90 px экрана iPhone 13 для свайпа страницы. Проверено: свайп под рамкой прокручивает страницу на 298 px, свайп по рамке — нет.
