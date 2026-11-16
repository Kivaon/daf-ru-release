/**
 * Огласованный текст Гемары (Dicta, CC BY-SA) по сторонам листа. Файлы лежат в public/vocal/<Трактат>/<сторона>.json
 * и собираются скриптом scripts/build-vocalized.py. Приложение только читает их.
 *
 * Если данных нет, сторона помечена "plain", а буквы реплики из Sefaria не совпали с сохранёнными
 * (Sefaria обновила текст), показывается прежний текст без огласовок.
 */
export type VocalType = "eq" | "var" | "ab" | "sub" | "sef" | "dic" | "cite";
/** [слово Sefaria, показываемое слово или null, тип]. Пустая строка значит «слово заменено соседним». */
export type VocalWord = [string, string | null, VocalType];
export type VocalSegment = { sig: string; n: number; w: VocalWord[] };
export type VocalSide = {
  v: 1;
  tractate: string;
  side: string;
  dicta: { commit: string; variant: string; license: string; credit: string };
  sefaria: { version: string; license: string };
  stats: Record<string, number>;
  /** "vocalized" — показывать огласовки; "plain" — совпадение ниже порога, показывать прежний текст. */
  use: "vocalized" | "plain";
  segments: Record<string, VocalSegment>;
};

export const DICTA_URL = "https://dicta.org.il";

/** Только ивритские буквы, без огласовок и знаков: по ним сверяется реплика. */
export function letters(text: string): string {
  return text.replace(/[֑-ׇ]/g, "").replace(/[^א-ת]/g, "");
}

/** FNV-1a (32 бита) по кодовым точкам; тот же расчёт в scripts/build-vocalized.py. */
export function signature(text: string): { sig: string; n: number } {
  const only = letters(text);
  let hash = 0x811c9dc5;
  for (const ch of only) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return { sig: hash.toString(16).padStart(8, "0"), n: only.length };
}

export function isVocalSide(value: unknown): value is VocalSide {
  if (!value || typeof value !== "object") return false;
  const side = value as Partial<VocalSide>;
  if (side.v !== 1 || (side.use !== "vocalized" && side.use !== "plain")) return false;
  if (!side.segments || typeof side.segments !== "object") return false;
  return Object.values(side.segments).every((segment) =>
    !!segment && typeof segment.sig === "string" && typeof segment.n === "number" && Array.isArray(segment.w)
    && segment.w.every((word) => Array.isArray(word) && typeof word[0] === "string" && (word[1] === null || typeof word[1] === "string")));
}

/** Есть ли огласованный текст, который можно показывать на этой стороне. */
export function vocalAvailable(side: VocalSide | null | undefined): boolean {
  return !!side && side.use === "vocalized";
}

/**
 * Огласованный текст реплики или null (тогда показывается прежний). Слова собираются по записи:
 * слова Dicta там, где они есть, остальные (метки «גמ׳/מתני׳», ссылки в скобках) как у Sefaria.
 */
export function vocalizedSegment(side: VocalSide | null | undefined, ref: string, plain: string): string | null {
  if (!side || side.use !== "vocalized") return null;
  const segment = side.segments[ref];
  if (!segment) return null;
  const current = signature(plain);
  if (current.sig !== segment.sig || current.n !== segment.n) return null;
  return segment.w.map(([raw, shown]) => (shown === null ? raw : shown)).filter((word) => word !== "").join(" ");
}

/**
 * Огласованные формы слова (по его буквам) на стороне листа: сначала из указанной реплики, затем из остальных.
 * Нужны, когда слово прочитано с PDF и огласовок у него нет.
 */
export function vocalFormsFor(side: VocalSide | null | undefined, wordLetters: string, preferredRef?: string): string[] {
  if (!side || side.use !== "vocalized" || !wordLetters) return [];
  const forms: string[] = [];
  const refs = Object.keys(side.segments);
  const ordered = preferredRef && side.segments[preferredRef] ? [preferredRef, ...refs.filter((ref) => ref !== preferredRef)] : refs;
  for (const ref of ordered) {
    for (const [, shown, type] of side.segments[ref].w) {
      if (shown === null || shown === "" || (type !== "eq" && type !== "var")) continue;
      const pure = shown.replace(/[^֑-ׇא-ת]/g, "");
      if (letters(pure) === wordLetters && !forms.includes(pure)) forms.push(pure);
    }
  }
  return forms;
}
