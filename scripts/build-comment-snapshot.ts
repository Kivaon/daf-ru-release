/**
 * Собирает public/comments/<Трактат>/<сторона>.json из ответов links Sefaria, сохранённых сборщиком (scripts/snapshot-collector).
 *   node --experimental-strip-types scripts/build-comment-snapshot.ts <папка rawlinks> [public/comments] [public/text]
 * Сторона пропускается (приложение возьмёт links у Sefaria), если по её записям прежний разбор (sourceComments) выдаёт ошибку.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isCommentSnapshot, linksFromCommentSnapshot, SNAPSHOT_VERSION, type CommentRecord } from "../app/sefariaSnapshot.ts";
import { sourceComments } from "../app/sefariaLinks.ts";

const rawDir = process.argv[2], outDir = process.argv[3] || "public/comments", textDir = process.argv[4] || "public/text";
if (!rawDir) { console.error("укажите папку с сырыми данными"); process.exit(1); }
let written = 0, skipped: string[] = [], records = 0;
for (const name of readdirSync(rawDir).filter((item) => item.endsWith(".json")).sort()) {
  const raw = JSON.parse(readFileSync(join(rawDir, name), "utf8")) as { tractate: string; side: string; recs: Array<{ c: string; r: string; a: string; h: string }> };
  const snapshot = { v: SNAPSHOT_VERSION, recs: raw.recs.map((rec): CommentRecord => ({ c: rec.c === "Rashi" ? "R" : "T", r: String(rec.r || ""), a: String(rec.a || ""), h: typeof rec.h === "string" ? rec.h : JSON.stringify(rec.h ?? "") })) };
  if (!isCommentSnapshot(snapshot)) { skipped.push(`${name}: формат`); continue; }
  const dir = join(outDir, raw.tractate.replace(/ /g, "_"));
  const textFile = join(textDir, raw.tractate.replace(/ /g, "_"), `${raw.side}.json`);
  const ids = existsSync(textFile) ? (JSON.parse(readFileSync(textFile, "utf8")) as { segs: string[] }).segs.map((_, index) => `${raw.side}:${index + 1}`) : [];
  try { sourceComments(linksFromCommentSnapshot(snapshot), raw.tractate, ids); } catch (reason) { skipped.push(`${name}: ${(reason as Error).message}`); continue; }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${raw.side}.json`), JSON.stringify(snapshot));
  written++; records += snapshot.recs.length;
}
console.log(`сторон: ${written}, записей: ${records}, пропущено: ${skipped.length}`);
for (const item of skipped.slice(0, 20)) console.log("  " + item);
