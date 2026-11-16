/**
 * Сопоставление слов огласованного Талмуда Dicta (public/vocal/words/<Трактат>.json) с живым текстом реплик Sefaria
 * прямо в приложении. Это те же правила, что в scripts/build-vocalized.py:
 *   eq   слово совпало, берётся огласованная форма Dicta
 *   var  небольшое отличие написания, берётся слово Dicta
 *   ab   сокращение Sefaria (אע"פ, קמ"ל, ר'), берутся развёрнутые слова Dicta
 *   sub  короткая замена другого слова или слов (≤3 подряд), берутся слова Dicta
 *   sef  слово есть только у Sefaria (метки «גמ׳/מתני׳»), показывается как есть
 *   dic  слово есть только у Dicta, вставляется после предыдущего слова
 *   cite ссылка на источник в скобках у Sefaria, показывается как есть
 * Сторона получает use="plain" (показывается без огласовок), если доля eq+var+ab+sub среди слов Гемары ниже порога.
 */
import { letters, signature, type VocalSide, type VocalType, type VocalWord } from "./vocalized.ts";

export type WordsFile = {
  v: 1;
  tractate: string;
  dicta: { commit: string; variant: string; license: string; credit: string };
  /** Стороны листа по порядку: «2a», «2b», «3a»… */
  order: string[];
  sides: Record<string, string[]>;
};
export type AlignSegment = { id: string; text: string };

export const MARGIN = 30;
export const THRESHOLD = 0.98;
const ABBR_MARKS = "'\"׳״";
const MARKERS = new Set(["גמ", "מתני", "משנה"]);

export function isWordsFile(value: unknown): value is WordsFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<WordsFile>;
  return file.v === 1 && typeof file.tractate === "string" && Array.isArray(file.order) && !!file.sides && typeof file.sides === "object"
    && file.order.every((key) => typeof key === "string" && Array.isArray(file.sides![key]) && file.sides![key].every((word) => typeof word === "string"));
}

const hasAbbr = (raw: string) => [...ABBR_MARKS].some((mark) => raw.includes(mark));
const stripMarks = (text: string) => text.replace(/^['"׳״]+/, "");

function splitPunct(raw: string): [string, string] {
  return [raw.match(/^[^א-ת]*/)![0], raw.match(/[^א-ת]*$/)![0]];
}

/** Слово Dicta со знаками препинания, стоявшими вокруг слова в тексте Sefaria. */
function shown(raw: string, word: string, strip = false): string {
  const [lead, trail] = splitPunct(raw);
  return `${lead}${word}${strip ? stripMarks(trail) : trail}`;
}

function lcsLength(a: string, b: string): number {
  const row = new Uint16Array(b.length + 1);
  for (let i = 0; i < a.length; i++) {
    let previous = 0;
    for (let j = 0; j < b.length; j++) {
      const saved = row[j + 1];
      row[j + 1] = a[i] === b[j] ? previous + 1 : Math.max(row[j + 1], row[j]);
      previous = saved;
    }
  }
  return row[b.length];
}

/** Похожи ли два написания (отличие в окончании, пропущенная буква). */
function similar(a: string, b: string): boolean {
  const total = a.length + b.length;
  return total > 0 && (2 * lcsLength(a, b)) / total >= 0.7;
}

/** Сколько слов Dicta разворачивают сокращение: первые буквы слов равны буквам сокращения. */
function expandAbbreviation(token: string, words: string[], start: number): number {
  if (token.length === 1 && start < words.length && letters(words[start]).startsWith(token)) return 1;
  for (let count = 2; count <= 4; count++) {
    const group = words.slice(start, start + count);
    if (group.length === count && group.map((word) => letters(word).slice(0, 1)).join("") === token) return count;
  }
  return 0;
}

type Op = { tag: "equal" | "delete" | "insert" | "replace"; i1: number; i2: number; j1: number; j2: number };

/** Операции сопоставления двух последовательностей слов (по наибольшей общей подпоследовательности). */
export function diffOps(a: string[], b: string[]): Op[] {
  const n = a.length, m = b.length, w = m + 1;
  const table = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    table[i * w + j] = a[i] === b[j] ? table[(i + 1) * w + j + 1] + 1 : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
  }
  const ops: Op[] = [];
  let i = 0, j = 0, gapI = -1, gapJ = -1;
  const closeGap = () => {
    if (gapI < 0) return;
    const di = i - gapI, dj = j - gapJ;
    if (di > 0 && dj > 0) ops.push({ tag: "replace", i1: gapI, i2: i, j1: gapJ, j2: j });
    else if (di > 0) ops.push({ tag: "delete", i1: gapI, i2: i, j1: gapJ, j2: j });
    else if (dj > 0) ops.push({ tag: "insert", i1: gapI, i2: i, j1: gapJ, j2: j });
    gapI = gapJ = -1;
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      closeGap();
      const last = ops[ops.length - 1];
      if (last && last.tag === "equal" && last.i2 === i && last.j2 === j) { last.i2 = i + 1; last.j2 = j + 1; }
      else ops.push({ tag: "equal", i1: i, i2: i + 1, j1: j, j2: j + 1 });
      i++; j++;
      continue;
    }
    if (gapI < 0) { gapI = i; gapJ = j; }
    if (j >= m || (i < n && table[(i + 1) * w + j] >= table[i * w + j + 1])) i++;
    else j++;
  }
  closeGap();
  return ops;
}

type Counts = Record<"eq" | "var" | "ab" | "sub" | "sef" | "dic" | "cite", number>;

/** Сопоставление одной стороны листа; margins — слова соседних сторон Dicta (на случай, если граница стороны сдвинута). */
export function alignSide(segments: AlignSegment[], dicta: string[], before: string[], after: string[]): { segments: VocalSide["segments"]; counts: Counts; markers: number; words: number; match: number } {
  const tokens: { seg: number; raw: string; letters: string }[] = [];
  segments.forEach((segment, index) => { for (const raw of segment.text.split(/\s+/).filter(Boolean)) tokens.push({ seg: index, raw, letters: letters(raw) }); });
  const real = tokens.map((token, index) => (token.letters ? index : -1)).filter((index) => index >= 0);
  const sNorm = real.map((index) => tokens[index].letters);
  const dAll = [...before, ...dicta, ...after];
  const dNorm = dAll.map((word) => letters(word));
  const cutA = before.length, cutB = before.length + dicta.length;
  const inside = (j: number) => j >= cutA && j < cutB;
  const kind = new Map<number, [VocalType, string | null]>();
  const inserts = new Map<number, string[]>();
  const attachInsert = (afterReal: number, word: string, j: number) => {
    if (!inside(j)) return;
    const key = afterReal >= 0 ? real[afterReal] : -1;
    inserts.set(key, [...(inserts.get(key) ?? []), word]);
  };

  for (const { tag, i1, i2, j1, j2 } of diffOps(sNorm, dNorm)) {
    if (tag === "equal") {
      for (let k = 0; k < i2 - i1; k++) kind.set(real[i1 + k], ["eq", shown(tokens[real[i1 + k]].raw, dAll[j1 + k])]);
    } else if (tag === "delete") {
      for (let k = i1; k < i2; k++) kind.set(real[k], ["sef", null]);
    } else if (tag === "insert") {
      for (let k = j1; k < j2; k++) attachInsert(i1 - 1, dAll[k], k);
    } else if (i2 - i1 === j2 - j1) {
      const n = i2 - i1;
      for (let k = 0; k < n; k++) {
        const index = real[i1 + k], raw = tokens[index].raw, a = sNorm[i1 + k], b = dNorm[j1 + k], word = dAll[j1 + k];
        if (hasAbbr(raw) && b.startsWith(a)) kind.set(index, ["ab", shown(raw, word, true)]);
        else if (similar(a, b)) kind.set(index, ["var", shown(raw, word)]);
        else if (n <= 3) kind.set(index, ["sub", shown(raw, word, true)]);
        else { kind.set(index, ["sef", null]); attachInsert(i1 + k, word, j1 + k); }
      }
    } else {
      let j = j1;
      const rest: number[] = [];
      for (let k = i1; k < i2; k++) {
        const raw = tokens[real[k]].raw;
        const count = hasAbbr(raw) ? expandAbbreviation(sNorm[k], dAll, j) : 0;
        if (count && j + count <= j2) { kind.set(real[k], ["ab", shown(raw, dAll.slice(j, j + count).join(" "), true)]); j += count; }
        else rest.push(k);
      }
      const restD: number[] = [];
      for (let x = j; x < j2; x++) restD.push(x);
      if (rest.length && restD.length && rest.length <= 3 && restD.length <= 3) {
        const [lead] = splitPunct(tokens[real[rest[0]]].raw);
        const trail = stripMarks(splitPunct(tokens[real[rest[rest.length - 1]]].raw)[1]);
        kind.set(real[rest[0]], ["sub", `${lead}${restD.map((x) => dAll[x]).join(" ")}${trail}`]);
        for (const k of rest.slice(1)) kind.set(real[k], ["sub", ""]);
      } else {
        for (const k of rest) kind.set(real[k], ["sef", null]);
        for (const x of restD) attachInsert(i2 - 1, dAll[x], x);
      }
    }
  }

  // метки «גמ׳/מתני׳» в начале реплики остаются как у Sefaria, без огласовок
  const firstOfSegment = new Map<number, number>();
  tokens.forEach((token, index) => { if (!firstOfSegment.has(token.seg)) firstOfSegment.set(token.seg, index); });
  for (const index of firstOfSegment.values()) if (MARKERS.has(tokens[index].letters)) kind.set(index, ["sef", null]);

  const out: VocalWord[][] = segments.map(() => []);
  const counts: Counts = { eq: 0, var: 0, ab: 0, sub: 0, sef: 0, dic: 0, cite: 0 };
  let inParen = false;
  const emitInserts = (index: number, seg: number) => {
    for (const word of inserts.get(index) ?? []) { out[seg].push([word, word, "dic"]); counts.dic++; }
  };
  emitInserts(-1, 0);
  tokens.forEach((token, index) => {
    if (token.raw.startsWith("(")) inParen = true;
    const [type, display] = kind.get(index) ?? (["sef", null] as [VocalType, string | null]);
    if (!token.letters) out[token.seg].push([token.raw, null, "sef"]);
    else if (display === null) {
      if (inParen) { out[token.seg].push([token.raw, null, "cite"]); counts.cite++; }
      else { out[token.seg].push([token.raw, null, "sef"]); counts.sef++; }
    } else { out[token.seg].push([token.raw, display, type]); counts[type as keyof Counts]++; }
    if (token.raw.endsWith(")")) inParen = false;
    emitInserts(index, token.seg);
  });

  const markers = out.reduce((sum, seg) => sum + seg.filter(([raw, shownWord, type]) => type === "sef" && shownWord === null && MARKERS.has(letters(raw))).length, 0);
  const total = counts.eq + counts.var + counts.ab + counts.sub + counts.sef;
  const words = total - markers;
  const matched = counts.eq + counts.var + counts.ab + counts.sub;
  const result: VocalSide["segments"] = {};
  segments.forEach((segment, index) => { const { sig, n } = signature(segment.text); result[segment.id] = { sig, n, w: out[index] }; });
  return { segments: result, counts, markers, words, match: words ? matched / words : 0 };
}

/** Огласованная сторона по файлу слов трактата и живому тексту реплик стороны; null, если Dicta не знает такой стороны. */
export function alignFromFile(file: WordsFile, side: string, segments: AlignSegment[]): VocalSide | null {
  const position = file.order.indexOf(side);
  if (position < 0 || !segments.length) return null;
  // уже сопоставленная сторона (то же издание данных и тот же текст) берётся из памяти: страница считает свою и соседние стороны,
  // а при листании каждая из них становится то текущей, то соседней
  const key = `${file.tractate}|${file.dicta.commit}|${side}|${segments.map((segment) => `${segment.id}:${signature(segment.text).sig}`).join(",")}`;
  const cached = aligned.get(key);
  if (cached) return cached;
  const before = position > 0 ? file.sides[file.order[position - 1]].slice(-MARGIN) : [];
  const after = position + 1 < file.order.length ? file.sides[file.order[position + 1]].slice(0, MARGIN) : [];
  const result = alignSide(segments, file.sides[side], before, after);
  const side_: VocalSide = {
    v: 1, tractate: file.tractate, side, dicta: file.dicta, sefaria: { version: "Wikisource Talmud Bavli", license: "CC-BY-SA" },
    stats: { ...result.counts, markers: result.markers, words: result.words, match: Math.round(result.match * 10000) / 10000 },
    use: result.match >= THRESHOLD ? "vocalized" : "plain",
    segments: result.segments,
  };
  aligned.set(key, side_);
  if (aligned.size > CACHE_LIMIT) aligned.delete(aligned.keys().next().value as string);
  return side_;
}

const CACHE_LIMIT = 60;
const aligned = new Map<string, VocalSide>();

const wordsRequests = new Map<string, Promise<WordsFile | null>>();
/** Файл слов трактата; запрос выполняется один раз за открытую страницу, неудача даёт null (тогда прежний текст). */
export function loadWordsFile(tractate: string, fetcher: typeof fetch = fetch): Promise<WordsFile | null> {
  let request = wordsRequests.get(tractate);
  if (!request) {
    request = fetcher(`/vocal/words/${encodeURIComponent(tractate)}.json`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((data) => (isWordsFile(data) ? data : null));
    wordsRequests.set(tractate, request);
  }
  return request;
}
