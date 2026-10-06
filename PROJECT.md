# DAF-RU

DAF-RU помогает русскоязычному ученику предварительно понять оригинал и ход сугии перед изучением с преподавателем или в хавруте. Он не заменяет это изучение.

## Существующий проект

- Рабочая папка: `/Users/kivaonmac/Documents/Codex/2026-09-22/referenced-chatgpt-conversation-this-is-an`.
- Сайт: https://daf-ru.mffkk78khq.chatgpt.site ; Sites project_id хранится в `.openai/hosting.json`. Не создавать новый сайт или репозиторий для новой сессии.
- Стек: React 19, TypeScript, Vinext/Vite, Cloudflare Workers, D1/SQLite; схема Drizzle.
- `app/HomeClient.tsx`: навигация, загрузка Sefaria, выбор реплик, составные фрагменты, редактор, инструменты modelContext.
- `app/PdfDafViewer.tsx`: PDF.js, выравнивание букв оригинала и слов PDF, области выбора и выделения.
- `app/talmudCatalog.ts`: трактаты и границы страниц.
- `app/api/daf-pdf/route.ts`: прокси PDF Shas.org. Текст Гемары и связи комментариев загружаются клиентом из Sefaria.
- `app/api/articles/route.ts`: чтение и сохранение статей. `db/schema.ts`, `drizzle/*.sql`: таблицы articles, users и editor_batches.
- `app/roles.ts`, `app/api/users`, `app/admin`: роли reader/editor/admin. Идентификация через Sites/ChatGPT; начальный администратор определяется DAFRU_ADMIN_EMAIL.
- `app/PrintPage.tsx`, `app/printDocument.ts`: сборка и печать материала, включая composite articles.
- `app/AboutProject.tsx`: согласованная концепция проекта.

## Данные и генерация

Уникальный ключ строки articles — `(tractate, ref)`. Короткий ref вроде `2a:3` не уникален между трактатами. Составная статья представлена несколькими строками с общими unit_ref, title, translation, explanation и parts_json; комментарии каждой части хранятся в своей строке. POST использует атомарный D1 batch/upsert. Это накопительное хранение, но предыдущая редакция при upsert не сохраняется.

Оригиналы и связи комментариев читаются из Sefaria при загрузке; для пакетной очереди снимок оригиналов и связей сохраняется в editor_batches; обычный просмотр загружает их заново. Исходники содержат пример Bekhorot 2a:3 и отдельные справочные файлы Bekhorot; это не полный дамп опубликованной БД.

Генерация работает через копирование задания в выбранную модель и импорт JSON или через доступный в браузере `document.modelContext`. Встроенного серверного вызова модели нет. Показанный моделью материал требует отдельного сохранения редактором.

## Проверенные ограничения

- Границы composite определяются эвристикой по окончанию и началу Davidson-текста соседних страниц; UI объединяет две части. Это не общая модель произвольных смысловых блоков.
- Выравнивание PDF имеет порог 45% на страницу и 15% на отдельную реплику; комментарий в коде о 70% устарел. Нельзя считать наличие выделения доказательством корректности смысловой границы.
- В обычном просмотре anchorRef диапазоны комментариев сводятся к первой найденной реплике; нужна проверка диапазонов и дубликатов.
- Старый API одиночных статей обрезает строки и массивы; нет строгой проверки refs, полноты комментариев, согласованности parts/pages, истории правок, статуса рецензирования или защиты от одновременной перезаписи.
- Production D1 не выгружалась и не редактировалась при аудите 2026-10-03. Наличие материалов в ней нельзя заключать из пустой локальной БД.

Постоянные продуктовые требования — SPEC.md. Состояние очередной сессии — HANDOFF.md.

## Реализованный пакетный редактор

`app/BatchEditor.tsx` — кнопка «Подготовить весь лист», очередь, оригиналы, импорт, автосохранение черновика и сохранение с переходом. `app/batchSources.ts` — серверная загрузка Sefaria и границы составных реплик; поддерживаются диапазоны anchorRef внутри стороны. `app/batchModel.ts` — общий валидатор, полнота полей, объединение с сохранённым материалом, задание для модели. `app/api/batches/route.ts` и `db/batchStore.ts` — доступ editor/admin, изоляция личных очередей, проверка версии и атомарная публикация всех частей. Миграция 0003 создаёт новую таблицу, не изменяя articles.

Снимок источников фиксируется при создании очереди. Повторное открытие обновляет сохранённые статьи, но не загружает заново снимок Sefaria. Границы по-прежнему эвристические; составные реплики помечены для проверки. Полнота относится только к комментариям, полученным от Sefaria. Общая история правок и рецензирование остаются следующим этапом.

## Карта перевода и источник знаменателя

- app/translation-map — экран и серверный контроль роли.
- app/translationMapModel.ts — чистые расчёты готовности, итогов и URL перехода.
- app/api/translation-map + db/translationMapStore.ts — агрегаты articles/editor_batches и кэш требований комментариев.
- app/data/source-index.json — снимок исходных refs; app/sourceIndex.ts — серверный доступ. scripts/refresh-source-index.py повторно получает полные диапазоны трактатов от Sefaria и фиксирует пробелы источника явно.
- Миграция 0004 создаёт translation_map_sources. Она хранит только refs ожидаемых комментариев, не тексты редакторов. Кэш заполняется для страниц с опубликованными статьями, чтобы отсутствие комментариев не выводилось из отсутствия перевода.

Известные лакуны исходной модели: Shekalim не разрешается Sefaria; Nazir 33b пуст в выбранном Wikisource. Остальные 129 сторон Назира имеют индекс. Карта показывает частичный итог, а не выдумывает знаменатель. Для обновления исходного корпуса повторно запустить scripts/refresh-source-index.py, проверить изменения и публиковать. При изменении refs комментариев отдельно инвалидировать соответствующий source-only кэш; существующие статьи не трогать.


## Mailjet notifications (2026-10-06)
- Confirmed sender: kivaon@gmail.com (DAF-RU); recipient: pitronot@proton.me. Server-only MAILJET_API_KEY / MAILJET_SECRET_KEY in Sites secrets; never copy to source or browser.
- Both single and batch publication atomically register a mail_jobs record before article writes. Initial article snapshot and canonical sorted refs deduplicate first completion, including composite units. Private drafts do not enqueue.
- Completion uses the translation-map source requirements (Gemara and all source Rashi/Tosafot). Previously complete articles are suppressed; future edits do not resend. No review status added.
- Worker waitUntil processes one due job per page/API visit. Errors do not undo article saves. Retries have backoff and run on later visits, not an unattended timer; if the site is idle, retries wait. Mailjet CustomCampaign + DeduplicateCampaign protect retries from duplicate delivery.
- Admin-only /notifications sends one deduplicated connection-test email; /api/notifications GET reports recent job states/errors without secrets. Provider acceptance does not prove inbox delivery.
- Verification: 52 tests passed, typecheck passed, local migration applied. Production build and Mailjet connection-test result recorded below after publication.
