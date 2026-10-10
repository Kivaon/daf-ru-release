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
