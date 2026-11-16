/**
 * Собирает public/text/<Трактат>/<сторона>.json из сырых ответов Sefaria, сохранённых сборщиком (scripts/snapshot-collector).
 *   node --experimental-strip-types scripts/build-text-snapshot.ts <папка raw> [public/text]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { snapshotFromTexts } from "../app/sefariaSnapshot.ts";

type Raw = { tractate: string; sides: string[]; wiki: string[][]; davHe: string[][]; davEn: string[][]; wikiTitle?: string; davTitle?: string };
const rawDir = process.argv[2], outDir = process.argv[3] || "public/text";
if (!rawDir) { console.error("укажите папку с сырыми данными"); process.exit(1); }
let files = 0, empty = 0;
const titles = new Set<string>();
for (const name of readdirSync(rawDir).filter((item) => item.endsWith(".json")).sort()) {
  const raw = JSON.parse(readFileSync(join(rawDir, name), "utf8")) as Raw;
  // кусок из одной стороны Sefaria отдаёт плоским списком реплик, а не списком сторон
  if (raw.sides.length === 1) for (const field of ["wiki", "davHe", "davEn"] as const) if (raw[field].length && typeof raw[field][0] === "string") raw[field] = [raw[field] as unknown as string[]];
  if (raw.wikiTitle) titles.add(raw.wikiTitle);
  const dir = join(outDir, raw.tractate.replace(/ /g, "_"));
  mkdirSync(dir, { recursive: true });
  if (raw.wiki.length !== raw.sides.length) throw new Error(`${name}: сторон ${raw.sides.length}, в ответе ${raw.wiki.length}`);
  raw.sides.forEach((key, index) => {
    const strings = (value: unknown) => (Array.isArray(value) ? value : []).map((part) => (typeof part === "string" ? part : ""));
    const snapshot = snapshotFromTexts(strings(raw.wiki[index]), strings(raw.davHe[index]), strings(raw.davEn[index]));
    if (!snapshot.segs.some(Boolean)) empty++;
    writeFileSync(join(dir, `${key}.json`), JSON.stringify(snapshot));
    files++;
  });
}
console.log(`сторон: ${files}, без текста: ${empty}, версии: ${[...titles].join("; ")}`);
