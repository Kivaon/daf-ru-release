export type CommentLike = { ref: string; dibur: string };

export const glyphs: Record<string, string> = {
  "‡":"א", "·":"ב", "‚":"ג", "„":"ד", "‰":"ה", "Â":"ו", "Ê":"ז", "Á":"ח", "Ë":"ט", "È":"י",
  "Î":"כ", "Í":"ך", "Ï":"ל", "Ó":"מ", "Ì":"ם", "\u0005":"נ", "\b":"נ", "\u0010":"נ", "\u0011":"נ", "\u0012":"נ", "\u0014":"נ", "\u0017":"נ", "Ô":"ן", "Ò":"ס", "Ú":"ע", "Ù":"פ",
  "Û":"ף", "ˆ":"צ", "ı":"ץ", "˜":"ק", "¯":"ר", "˘":"ש", "˙":"ת",
};
export const decodeWord = (raw: string) => /[א-ת]/.test(raw)?raw:Array.from(raw).map((char) => glyphs[char] ?? (char.charCodeAt(0)>=0xe0&&char.charCodeAt(0)<=0xfa?String.fromCharCode(0x5d0+char.charCodeAt(0)-0xe0):char==='\u0004'?'נ':char)).reverse().join("").replace("'", "׳");
export const normalizeHebrew = (text: string) => text.normalize("NFD").replace(/[\u0591-\u05C7]/g, "").replace(/[^\u05D0-\u05EA]/g, "");

export function editionWords(text: string) {
  return text.split(/\s+/).flatMap((word) => {
    const normalized = normalizeHebrew(word);
    if (normalized === "נכרי" || normalized === "גוי") return ["עובד", "כוכבים"];
    if (normalized === "הגוי") return ["העובד", "כוכבים"];
    return normalized ? [normalized] : [];
  });
}

function wordDistance(first: string, second: string) {
  const width = second.length + 1;
  const distances = new Uint16Array((first.length + 1) * width);
  for (let index = 0; index <= first.length; index++) distances[index * width] = index;
  for (let index = 0; index <= second.length; index++) distances[index] = index;
  for (let row = 1; row <= first.length; row++) for (let column = 1; column <= second.length; column++) {
    distances[row * width + column] = Math.min(
      distances[(row - 1) * width + column] + 1,
      distances[row * width + column - 1] + 1,
      distances[(row - 1) * width + column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1),
    );
  }
  return distances[first.length * width + second.length];
}

// The Vilna PDF and Sefaria occasionally differ by a mater lectionis or one
// damaged glyph. Such a spelling difference must not become a semantic border.
export function sameEditionWord(first: string, second: string) {
  if (first === second) return true;
  const longest = Math.max(first.length, second.length);
  return longest >= 4 && wordDistance(first, second) <= (longest >= 8 ? 2 : 1);
}


// Rashi and Tosafot are printed in narrow columns beside the Gemara. Reading the
// page row by row interleaves the columns, which breaks a dibur that continues on
// the next line, so words are read column by column, each column top to bottom
// and each line right to left. A column is a chain of line fragments separated
// from their neighbours on the same line by more than `gap`.
export function columnOrder<T extends { left: number; width: number; top: number; height: number }>(words: T[], tolerance: number, gap: number): T[] {
  const baseline = (word: T) => word.top + word.height;
  const rows: T[][] = [];
  let anchor = -Infinity;
  for (const word of [...words].sort((a, b) => baseline(a) - baseline(b))) {
    if (!rows.length || baseline(word) - anchor > tolerance) { rows.push([]); anchor = baseline(word); }
    rows.at(-1)!.push(word);
  }
  type Fragment = { words: T[]; left: number; right: number };
  type Column = { left: number; right: number; fragments: Fragment[] };
  const columns: Column[] = [];
  for (const row of rows) {
    row.sort((a, b) => b.left - a.left);
    const fragments: Fragment[] = [];
    let current: T[] = [row[0]];
    for (const word of row.slice(1)) {
      const previous = current.at(-1)!;
      if (previous.left - (word.left + word.width) > gap) { fragments.push({ words: current, left: 0, right: 0 }); current = [word]; } else current.push(word);
    }
    fragments.push({ words: current, left: 0, right: 0 });
    for (const fragment of fragments) {
      fragment.left = Math.min(...fragment.words.map((word) => word.left));
      fragment.right = Math.max(...fragment.words.map((word) => word.left + word.width));
      let best: Column | undefined, bestShare = .5;
      for (const column of columns) {
        const share = (Math.min(column.right, fragment.right) - Math.max(column.left, fragment.left)) / Math.min(column.right - column.left, fragment.right - fragment.left);
        if (share > bestShare) { best = column; bestShare = share; }
      }
      if (!best) { best = { left: fragment.left, right: fragment.right, fragments: [] }; columns.push(best); }
      best.fragments.push(fragment);
      best.left = Math.min(best.left, fragment.left); best.right = Math.max(best.right, fragment.right);
    }
  }
  return columns.sort((a, b) => b.right - a.right).flatMap((column) => column.fragments.flatMap((fragment) => fragment.words));
}

// Small print loses or splits letters: the nun of a word may come out as a space
// ("סנדל" as "ס דל") or vanish. A source word therefore also matches two or three
// consecutive PDF tokens joined together, and nun is ignored when comparing.
const withoutNun = (word: string) => word.replace(/[נן]/g, "");
const sameLoosely = (source: string, printed: string) => sameEditionWord(source, printed) || (printed.length > 0 && withoutNun(source).length >= 2 && sameEditionWord(withoutNun(source), withoutNun(printed)));

export function findDiburim<T extends { word: string }>(pdfWords: T[], comments: CommentLike[]) {
  if (!comments.length || !pdfWords.length) return {} as Record<string, T[]>;
  const blocks: Record<string, T[]> = {};
  const target = pdfWords.map((word) => normalizeHebrew(word.word));
  // Last token index of the printed word that spells `sourceWord`, starting at `from`.
  const spell = (sourceWord: string, from: number) => {
    let joined = "";
    for (let end = from; end < Math.min(target.length, from + 3); end++) {
      joined += target[end];
      if (joined.length > sourceWord.length + 2) break;
      if (sameLoosely(sourceWord, joined)) return end;
    }
    return -1;
  };
  comments.forEach((comment) => {
    const words = editionWords(comment.dibur).filter((word) => !["גמ", "מתני"].includes(word));
    if (!words.length) return;
    let best: { first: number; last: number; count: number } | undefined;
    // The printed dibur may begin a word or two later than Sefaria's, which quotes
    // the Gemara from its start, so a search may also begin at the second or third word.
    for (const skipped of words.length >= 5 ? [0, 1, 2] : words.length >= 4 ? [0, 1] : [0]) {
      const source = words.slice(skipped);
      for (let start = 0; start < target.length; start++) {
        let last = spell(source[0], start);
        if (last < 0) continue;
        let count = 1;
        for (let sourceIndex = 1; sourceIndex < source.length; sourceIndex++) {
          let found = -1;
          for (let candidate = last + 1; candidate < Math.min(target.length, last + 5) && found < 0; candidate++) found = spell(source[sourceIndex], candidate);
          if (found < 0) break;
          last = found; count++;
        }
        if (count / words.length < .58 || (skipped && count < 2)) continue;
        if (!best || count > best.count || (count === best.count && last - start < best.last - best.first)) best = { first: start, last, count };
      }
    }
    if (best) blocks[comment.ref] = pdfWords.slice(best.first, best.last + 1);
  });
  return blocks;
}
