# Сбор снимка текста Sefaria

Sefaria закрывает скрипты проверкой Cloudflare, поэтому тексты собираются страницей в браузере и отправляются на локальный сервер.

1. `mkdir -p raw && node --experimental-strip-types -e 'import("../../app/talmudCatalog.ts").then(m=>require("fs").writeFileSync("catalog.json",JSON.stringify(m.TRACTATES.map(t=>({n:t.sefaria,d:t.lastDaf,s:t.lastSide})))))'`
2. `python3 collector.py` (порт 8765, сырые ответы в `raw/`).
3. Открыть в браузере `http://localhost:8765/?shard=0&of=4`, ещё три вкладки с `shard=1..3` (идёт параллельно, вкладки должны быть на переднем плане). Страница пропускает уже собранное.
4. `node --experimental-strip-types scripts/build-text-snapshot.ts raw public/text`

Shekalim (в Sefaria нет Бавли с таким названием) пропускается: на нём сбор выдаёт ошибки, это ожидаемо.

## Комментарии Раши и Тосафот (public/comments)

Те же шаги, но сборщик `collector-links.py` (порт 8766, папка `rawlinks/`) и страница `http://localhost:8766/?shard=0&of=8&conc=4` (восемь вкладок с shard 0..7; около 40 минут на все стороны, 5 332 запроса links). Затем:
`node --experimental-strip-types scripts/build-comment-snapshot.ts rawlinks public/comments public/text`
Сторона пропускается, если по её записям разбор (sourceComments) выдаёт ошибку; тогда приложение берёт links у Sefaria.
