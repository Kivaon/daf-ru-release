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
