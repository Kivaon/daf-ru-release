# Сбор снимка текста Sefaria

Sefaria закрывает скрипты проверкой Cloudflare, поэтому тексты собираются страницей в браузере и отправляются на локальный сервер.

1. `mkdir -p raw && node --experimental-strip-types -e 'import("../../app/talmudCatalog.ts").then(m=>require("fs").writeFileSync("catalog.json",JSON.stringify(m.TRACTATES.map(t=>({n:t.sefaria,d:t.lastDaf,s:t.lastSide})))))'`
2. `python3 collector.py` (порт 8765, сырые ответы в `raw/`).
3. Открыть в браузере `http://localhost:8765/?shard=0&of=4`, ещё три вкладки с `shard=1..3` (идёт параллельно, вкладки должны быть на переднем плане). Страница пропускает уже собранное.
4. `node --experimental-strip-types scripts/build-text-snapshot.ts raw public/text`

Shekalim (в Sefaria нет Бавли с таким названием) пропускается: на нём сбор выдаёт ошибки, это ожидаемо.
