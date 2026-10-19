# DAF-RU: запасной путь — перенос с Sites на Cloudflare

Статус: **только план и разведка** (18.10.2026). Ничего не создано в Cloudflare, прод (Sites v81) и боевая БД не менялись. Причина: штатная публикация Sites заблокирована политикой `write_stdin` (см. outputs/DAF-RU-publication-blocker.md в каталоге Codex).

## Что выяснено

1. **GitHub-копия `work/daf-ru` (Kivaon/daf-ru) устарела** и разошлась с `daf-ru-release`: нет `includeSourceComments.ts`, `PrintedLocation.tsx`, `commentary-starts.json`, части тестов; различаются BatchEditor, HomeClient, PrintedCommentary и др. Источником истины является `daf-ru-release`.
2. **`origin` у `daf-ru-release`** — `github.com/Kivaon/daf-ru-release`; удалённый `main` = `608d95b` (v80). Коммиты `c407bca` (v81) и `e6dc18d` (индекс начал) туда **не отправлены**.
3. **Привязки к Sites:**
   - `vite.config.ts`: плагин `@openai/sites-vite-plugin` (`sites()`), `.openai/hosting.json` (project_id, `d1: "DB"`, `r2: null`).
   - **Вход пользователей**: `app/chatgpt-auth.ts` читает заголовки `oai-authenticated-user-id/-email/-full-name`, которые подставляет только платформа Sites; пути `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`. Вне Sites заголовков не будет — **нужна своя аутентификация**. Это главный объём работы.
   - Роли (`app/roles.ts`, `app/api/users`, `app/admin`): reader/editor/admin; начальный админ — переменная `DAFRU_ADMIN_EMAIL`.
4. **Не привязано к Sites:** воркер (`worker/index.ts`) — обычный Cloudflare Worker; БД — D1 (binding `DB`) через Drizzle, миграции `drizzle/0000…0005`; изображения — binding `IMAGES`, статика — `ASSETS`.
5. **Таблицы:** `articles`, `users`, `editor_batches`, `translation_map_sources`, `mail_jobs`. Переводы (`articles`) — самые ценные данные.
6. **Имена переменных/секретов (значения не читались):** `DAFRU_ADMIN_EMAIL`, `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`.
7. Локальный `.openai/local-db.json` содержит заглушку `database_id` (нули) — боевого id в репозитории нет.

## План

1. **Не откладывая:** отправить `e6dc18d` в `Kivaon/daf-ru-release` (бэкап; требует подтверждения пользователя). `Kivaon/daf-ru` не использовать.
2. **Выгрузка БД из Sites** — задача для ChatGPT/Codex (у него доступ к Sites), см. ниже. Без неё переезд невозможен, потому что в Cloudflare окажется пустая база.
3. **Аутентификация:** выбрать вариант — Cloudflare Access (проще всего: заголовок `Cf-Access-Authenticated-User-Email`, вход по почте), либо Google/GitHub OAuth в приложении. Адаптер: заменить `getChatGPTUser()` так, чтобы возвращал тот же тип `ChatGPTUser`; остальной код (роли) не трогать.
4. Убрать `sites()` из `vite.config.ts` для Cloudflare-сборки (отдельный конфиг, чтобы не сломать Sites), добавить `wrangler.jsonc` с реальным `database_id`.
5. Создать D1, применить миграции, загрузить выгрузку, задать секреты через `wrangler secret put`.
6. Проверить на `*.workers.dev`: чтение, редактор, роли, почта (Mailjet), печать, PDF.
7. Переключить пользователей. Откат: старый адрес Sites v81 остаётся работать.

## Риски

- Потеря или рассинхрон данных при выгрузке/загрузке БД; пока идёт тест, правки на Sites и Cloudflare расходятся. Нужна «заморозка» правок в момент финальной выгрузки.
- Идентификаторы пользователей (`oai-authenticated-user-id`) в таблице `users` не совпадут с новой системой входа; сопоставлять по email.
- Адрес меняется (`*.chatgpt.site` → `*.workers.dev` или свой домен).

## Задача для ChatGPT/Codex: выгрузка БД (шаг 2)

Только чтение. Не публиковать, не менять данные, не печатать секреты.

1. Через штатные средства Sites найти способ получить **снимок боевой D1** проекта `appgprj_6ab23ab53a348191af22a74097e2b628` (SQL-дамп или JSON по таблицам `articles`, `users`, `editor_batches`, `translation_map_sources`, `mail_jobs`). Если штатного экспорта нет — написать об этом прямо и предложить способ через API самого сайта (например, админский маршрут чтения), не обходя ограничения.
2. Сохранить выгрузку **вне репозитория** (например, `Codex/2026-10-12/10-12-daf-ru/outputs/db-snapshot-ГГГГММДД/`), в git не добавлять — там переводы и e-mail пользователей.
3. Отчитаться: число строк по каждой таблице, размер, хэш файлов, дата и время снимка, как проверено, что выгрузка полна.
4. Если шаг упирается в тот же отказ подтверждения — остановиться и сообщить, не повторяя.

## Проверка бесплатного тарифа (19.10.2026)
По официальным страницам Cloudflare (Workers limits, D1 limits): Workers Free — 100 000 запросов/день, **10 мс CPU на запрос**, 50 подзапросов, лимита сжатого размера нет (64 МиБ несжатого); D1 Free — 500 МБ на базу, 5 ГБ на аккаунт. Размеры проекта: воркер ~1,8 МБ, статика ~7,4 МБ, данные приложения 752 КБ. По размеру проходит с большим запасом. **Неподтверждённое:** укладывается ли SSR в 10 мс CPU (проверять на workers.dev), суточные лимиты строк D1 и квота Images binding (на странице лимитов D1 не указаны).
Выгрузка БД: bulk-экспорта в API нет (`GET /api/articles` отдаёт одну статью по ref без входа), то есть нужен экспорт через Sites (Codex) или новый админский маршрут чтения.

## Подготовка выполнена (19.10.2026, Claude Code) — в коде, без обращений к Cloudflare
- `app/cfAccess.ts` — проверка JWT Cloudflare Access (RS256, issuer, audience, срок, ключи из `/cdn-cgi/access/certs` с кэшем на час). Тесты: `tests/cf-access.test.ts`.
- `app/chatgpt-auth.ts`: `getChatGPTUser()` сначала читает заголовки Sites, а если их нет — JWT Access (заголовок `Cf-Access-Jwt-Assertion` или cookie `CF_Authorization`). Без `CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD` поведение на Sites не меняется. `userId` при входе через Access = `cf:<email>`.
- Маршруты `/signin-with-chatgpt` (возврат на `return_to` после входа Access) и `/signout-with-chatgpt` (→ `/cdn-cgi/access/logout`). На Sites их по-прежнему обслуживает платформа.
- `wrangler.cloudflare.jsonc` + `npm run build:cloudflare` (`DAFRU_TARGET=cloudflare` в `vite.config.ts`). Обычный `npm run build` для Sites не изменился (проверено по `dist/server/wrangler.json`). Файл намеренно не называется `wrangler.jsonc`.
- `scripts/remap-user-ids.sql` — после загрузки выгрузки заменяет идентификаторы Sites на `cf:<email>` в `users`, `editor_batches`, `articles.author_user_id`.
- Проверки: 77 тестов, typecheck, обе сборки.

## Что осталось сделать с аккаунтом Cloudflare (в таком порядке)
1. `npx wrangler login`; `npx wrangler d1 create daf-ru` → `database_id` вписать в `wrangler.cloudflare.jsonc`.
2. `npx wrangler d1 migrations apply daf-ru --remote --config wrangler.cloudflare.jsonc` (схема).
3. Получить выгрузку БД из Sites (задача Codex), загрузить в D1, выполнить `scripts/remap-user-ids.sql`.
4. Zero Trust → Access: создать приложение для хоста сайта, **защитить только путь `/signin-with-chatgpt`** (чтобы чтение оставалось публичным), политика — разрешённые почты; взять AUD и team domain → `vars` в конфиге; `DAFRU_ADMIN_EMAIL` — ваша почта.
5. `npx wrangler secret put MAILJET_API_KEY` и `MAILJET_SECRET_KEY`.
6. `npm run build:cloudflare` и `npx wrangler deploy --config dist/server/wrangler.json`; проверить на `daf-ru.<аккаунт>.workers.dev`: чтение, вход, редактор, роли, почта, печать, PDF и время CPU (лимит Free — 10 мс).
7. После проверки — переключение пользователей; Sites v81 остаётся как откат.
Перед публикацией в Sites всегда пересобирать `npm run build` (а не `build:cloudflare`): `dist/` общий.
