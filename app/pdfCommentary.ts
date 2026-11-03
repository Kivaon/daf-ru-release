export type CommentLike = { ref: string; dibur: string; text?: string };

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
// `fillers` are other printed marks (footnote markers and the like) that are not
// searched: a line is not split at a gap of up to seven times `gap` when one of
// them stands in it.
// Lines across most of the sheet's width (the commentary above and below the Gemara,
// across both columns) are gathered into columns of their own: joined to a narrow
// column they would stretch it over the neighbouring column, whose lines would then
// be read in between them.
export function splitColumns<T extends { left: number; width: number; top: number; height: number }>(words: T[], tolerance: number, gap: number, fillers: T[] = [], wideShare = .55): T[][] {
  const filler = new Set<T>(fillers);
  const baseline = (word: T) => word.top + word.height;
  const rows: T[][] = [];
  let anchor = -Infinity;
  for (const word of [...words, ...fillers].sort((a, b) => baseline(a) - baseline(b))) {
    if (!rows.length || baseline(word) - anchor > tolerance) { rows.push([]); anchor = baseline(word); }
    rows.at(-1)!.push(word);
  }
  type Fragment = { words: T[]; left: number; right: number };
  type Column = { left: number; right: number; fragments: Fragment[] };
  const fragments: Fragment[] = [];
  for (const row of rows) {
    row.sort((a, b) => b.left - a.left);
    let current: T[] = [];
    let bridged = false;
    const flush = () => { if (current.length) fragments.push({ words: current, left: Math.min(...current.map((word) => word.left)), right: Math.max(...current.map((word) => word.left + word.width)) }); };
    for (const word of row) {
      if (filler.has(word)) { bridged = true; continue; }
      const previous = current.at(-1);
      const span = previous ? previous.left - (word.left + word.width) : 0;
      const bridge = bridged && span <= gap * 7;
      if (previous && !bridge && span > gap) { flush(); current = [word]; } else current.push(word);
      bridged = false;
    }
    flush();
  }
  if (!fragments.length) return [];
  const sheetLeft = Math.min(...fragments.map((fragment) => fragment.left)), sheetRight = Math.max(...fragments.map((fragment) => fragment.right));
  const isWide = (fragment: Fragment) => fragment.right - fragment.left > wideShare * (sheetRight - sheetLeft);
  const columnsOf = (group: Fragment[]) => {
    const columns: Column[] = [];
    for (const fragment of group) {
      let best: Column | undefined, bestShare = .5;
      for (const column of columns) {
        const share = (Math.min(column.right, fragment.right) - Math.max(column.left, fragment.left)) / Math.min(column.right - column.left, fragment.right - fragment.left);
        if (share > bestShare) { best = column; bestShare = share; }
      }
      if (!best) { best = { left: fragment.left, right: fragment.right, fragments: [] }; columns.push(best); }
      best.fragments.push(fragment);
      best.left = Math.min(best.left, fragment.left); best.right = Math.max(best.right, fragment.right);
    }
    return columns;
  };
  const columns = [...columnsOf(fragments.filter((fragment) => !isWide(fragment))), ...columnsOf(fragments.filter(isWide))];
  return columns.sort((a, b) => b.right - a.right).map((column) => column.fragments.flatMap((fragment) => fragment.words));
}

export const columnOrder = <T extends { left: number; width: number; top: number; height: number }>(words: T[], tolerance: number, gap: number, fillers: T[] = []) => splitColumns(words, tolerance, gap, fillers).flat();

// Small print loses or splits letters: the nun of a word may come out as a space
// ("סנדל" as "ס דל") or vanish. A source word therefore also matches two or three
// consecutive PDF tokens joined together, and nun is ignored when comparing.
const withoutNun = (word: string) => word.replace(/[נן]/g, "");
// Print and Sefaria also differ in plene spelling (ליה / לה), so vowel letters are
// dropped as a last resort, provided at least two letters remain.
const skeleton = (word: string) => withoutNun(word).replace(/[יו]/g, "");
export const sameLoosely = (source: string, printed: string) => sameEditionWord(source, printed)
  || (printed.length > 0 && withoutNun(source).length >= 2 && sameEditionWord(withoutNun(source), withoutNun(printed)))
  || (skeleton(source).length >= 2 && skeleton(source) === skeleton(printed));

export type FoundDibur<T> = { words: T[]; opening: string[]; whole: boolean; share: number; size: number; context: number };

type Candidate = { first: number; last: number; score: number; matched: number; skipped: number };

// Position of a comment in Sefaria's order ("… 46a:2:3" is the third comment on
// the second reply), and the sheet it belongs to.
export const orderKey = (ref: string) => { const found = ref.match(/(\d+[ab]):(\d+):(\d+)$/); return found ? { page: found[1], rank: Number(found[2]) * 1000 + Number(found[3]) } : undefined; };

export function findDiburim<T extends { word: string; font?: string }>(pdfWords: T[], comments: CommentLike[]) {
  if (!comments.length || !pdfWords.length) return {} as Record<string, FoundDibur<T>>;
  const blocks: Record<string, FoundDibur<T>> = {};
  const target = pdfWords.map((word) => normalizeHebrew(word.word));
  const fontCounts = new Map<string | undefined, number>();
  pdfWords.forEach((word) => fontCounts.set(word.font, (fontCounts.get(word.font) ?? 0) + 1));
  const bodyFont = [...fontCounts].sort((a, b) => b[1] - a[1])[0]?.[0];
  // The printed word that spells `sourceWord` from token `from` on: where it ends
  // and how good the match is (1 for the same letters, less for a near spelling).
  const spell = (sourceWord: string, from: number) => {
    let joined = "";
    for (let end = from; end < Math.min(target.length, from + 3); end++) {
      joined += target[end];
      if (joined.length > sourceWord.length + 2) break;
      if (joined === sourceWord) return { end, score: 1 };
      if (sameLoosely(sourceWord, joined)) return { end, score: .7 };
    }
    return undefined;
  };
  const wordsOf = (comment: CommentLike) => editionWords(comment.dibur).filter((word) => !["גמ", "מתני"].includes(word));
  // Every place where a dibur can be read, best first. A word that is not found
  // costs its share of the score but does not end the search: the next word is
  // looked for from the same place.
  const candidatesOf = (comment: CommentLike) => {
    const words = wordsOf(comment);
    const found = new Map<number, Candidate>();
    for (const skipped of words.length >= 5 ? [0, 1, 2] : words.length >= 3 ? [0, 1] : [0]) {
      const source = words.slice(skipped);
      for (let start = 0; start < target.length; start++) {
        const opening = spell(source[0], start);
        if (!opening) continue;
        let last = opening.end, score = opening.score, matched = 1, missed = 0;
        for (let sourceIndex = 1; sourceIndex < source.length; sourceIndex++) {
          let hit: ReturnType<typeof spell>;
          for (let candidate = last + 1; candidate < Math.min(target.length, last + 5) && !hit; candidate++) hit = spell(source[sourceIndex], candidate);
          if (!hit) { if (++missed > Math.floor(source.length * .4)) break; continue; }
          last = hit.end; score += hit.score; matched++;
        }
        if (score / words.length < .58 || (skipped && matched < 2)) continue;
        const better = !found.get(start) || score > found.get(start)!.score;
        if (better) found.set(start, { first: start, last, score, matched, skipped });
      }
    }
    return [...found.values()].sort((a, b) => b.score - a.score || (a.last - a.first) - (b.last - b.first));
  };
  // The comment's own text follows its dibur in print. How many of its first
  // words stand right after a candidate place says whether this is the place.
  const printedEnd = (candidate: Candidate) => {
    let last = candidate.last;
    const font = pdfWords[last].font;
    if (font && font !== bodyFont) while (last + 1 < pdfWords.length && last - candidate.first < 24 && pdfWords[last + 1].font === font) last++;
    return last;
  };
  const contextOf = (comment: CommentLike, candidate: Candidate) => {
    if (!comment.text) return 0;
    const body = editionWords(comment.text).slice(editionWords(comment.dibur).length, editionWords(comment.dibur).length + 8);
    if (body.length < 3) return 0;
    let cursor = printedEnd(candidate) + 1, hits = 0;
    for (const word of body) {
      let hit: ReturnType<typeof spell>;
      for (let at = cursor; at < Math.min(target.length, cursor + 4) && !hit; at++) hit = spell(word, at);
      if (hit) { hits++; cursor = hit.end + 1; }
    }
    return hits / body.length;
  };
  const options = comments.map((comment) => {
    const words = wordsOf(comment);
    const candidates = words.length ? candidatesOf(comment) : [];
    const rated = candidates.map((candidate) => ({ candidate, total: candidate.score / words.length + contextOf(comment, candidate) }));
    rated.sort((a, b) => b.total - a.total || (a.candidate.last - a.candidate.first) - (b.candidate.last - b.candidate.first));
    return { comment, words, candidates: rated.map((entry) => entry.candidate), totals: rated.map((entry) => entry.total) };
  });
  const chosen = new Map<CommentLike, Candidate | undefined>(options.map((entry) => [entry.comment, entry.candidates[0]]));
  // Comments follow each other on the sheet in Sefaria's order. A dibur whose
  // place breaks that order is probably read in the wrong spot (it was chosen
  // among several), so it moves to an equally good place (by score and by the
  // text that follows it) between its neighbours, if there is one; it is never
  // dropped for this.
  const keys = options.map((entry) => orderKey(entry.comment.ref));
  if (keys.every((key) => key && key.page === keys[0]!.page) && options.length >= 4) {
    const sequence = options.map((entry, index) => ({ entry, rank: keys[index]!.rank })).sort((a, b) => a.rank - b.rank).filter(({ entry }) => chosen.get(entry.comment));
    const positions = sequence.map(({ entry }) => chosen.get(entry.comment)!.first);
    // longest increasing run of positions = the comments that agree with each other
    const length = positions.map(() => 1), from = positions.map(() => -1);
    positions.forEach((position, i) => { for (let j = 0; j < i; j++) if (positions[j] < position && length[j] + 1 > length[i]) { length[i] = length[j] + 1; from[i] = j; } });
    let tail = length.indexOf(Math.max(...length, 0));
    const agreeing = new Set<number>();
    while (tail >= 0) { agreeing.add(tail); tail = from[tail]; }
    sequence.forEach(({ entry }, index) => {
      if (agreeing.has(index)) return;
      let before = -1, after = Infinity;
      for (let i = index - 1; i >= 0; i--) if (agreeing.has(i)) { before = positions[i]; break; }
      for (let i = index + 1; i < sequence.length; i++) if (agreeing.has(i)) { after = positions[i]; break; }
      const current = chosen.get(entry.comment)!;
      const currentTotal = entry.totals[entry.candidates.indexOf(current)];
      const fitting = entry.candidates.find((candidate, rank) => candidate.first > before && candidate.last < after && entry.totals[rank] >= currentTotal - .1);
      if (fitting) chosen.set(entry.comment, fitting);
    });
  }
  options.forEach(({ comment, words }) => {
    const best = chosen.get(comment);
    if (!best) return;
    let last = best.last;
    // The printed dibur is set in its own (bold) font and ends where that font
    // ends, which may be later than where Sefaria's quotation ends.
    const font = pdfWords[last].font;
    if (font && font !== bodyFont) while (last + 1 < pdfWords.length && last - best.first < 24 && pdfWords[last + 1].font === font) last++;
    blocks[comment.ref] = { words: pdfWords.slice(best.first, last + 1), opening: words.slice(0, best.skipped).reverse(), whole: best.skipped === 0 && best.matched === words.length, share: best.score / words.length, size: words.length, context: contextOf(comment, best) };
  });
  return blocks;
}

type Placed = { word: string; left: number; width: number; top: number; height: number };

// The first words of a printed dibur are often set larger than the rest, in a
// font outside the commentary size band. When a dibur was found without them,
// take the matching words standing immediately to its right on the same line.
export function addOpeningWords<T extends Placed>(found: Record<string, FoundDibur<T>>, candidates: T[], zoom: number) {
  return Object.fromEntries(Object.entries(found).map(([ref, dibur]) => {
    let words = dibur.words;
    for (const opening of dibur.opening) {
      const first = words[0];
      const line = first.top + first.height;
      const next = candidates
        .filter((candidate) => !words.includes(candidate) && sameEditionWord(opening, normalizeHebrew(candidate.word))
          && Math.abs(candidate.top + candidate.height - line) <= 4 * zoom
          && candidate.left >= first.left + first.width - 2 * zoom && candidate.left - (first.left + first.width) <= 40 * zoom)
        .sort((a, b) => a.left - b.left)[0];
      if (!next) break;
      words = [next, ...words];
    }
    // The "מתני" / "גמ" that begins a reply is only a sign for the reader: it goes
    // with the dibur that follows it and takes that dibur's colour.
    const first = words[0], line = first.top + first.height;
    const marker = candidates
      .filter((candidate) => ["מתני", "גמ"].includes(normalizeHebrew(candidate.word)) && !words.includes(candidate)
        && Math.abs(candidate.top + candidate.height - line) <= 4 * zoom
        && candidate.left >= first.left + first.width - 2 * zoom && candidate.left - (first.left + first.width) <= 40 * zoom)
      .sort((a, b) => a.left - b.left)[0];
    if (marker) words = [marker, ...words];
    return [ref, words];
  })) as Record<string, T[]>;
}

type Commented = { commentator: string };

// Rashi and Tosafot are told apart by column: a column in which a comment of one
// of them is found with every word of its dibur belongs to that commentator
// (as long as no comment of the other is found whole in it). The search for
// each commentator then skips the other's columns, so a dibur that both begin
// with, or one that Sefaria quotes shorter than the print, cannot land there.
export function labelColumns<T extends { word: string; font?: string }>(columns: T[][], comments: Array<CommentLike & Commented>) {
  const flat = columns.flat();
  const columnOf = new Map<T, number>();
  columns.forEach((column, index) => column.forEach((word) => columnOf.set(word, index)));
  const votes = columns.map(() => new Map<string, number>());
  for (const commentator of new Set(comments.map((comment) => comment.commentator))) {
    Object.values(findDiburim(flat, comments.filter((comment) => comment.commentator === commentator)))
      .filter((dibur) => dibur.whole)
      .forEach((dibur) => { const tally = votes[columnOf.get(dibur.words[0])!]; tally.set(commentator, (tally.get(commentator) ?? 0) + 1); });
  }
  return votes.map((tally) => {
    const ranked = [...tally].sort((a, b) => b[1] - a[1]);
    const total = ranked.reduce((sum, entry) => sum + entry[1], 0);
    return ranked.length && ranked[0][1] / total >= .8 ? ranked[0][0] : undefined;
  });
}

export type Labels<T> = Array<string | undefined> | ((word: T) => string | undefined);

const labelFunction = <T,>(columns: T[][], labels: Labels<T>) => {
  if (typeof labels === "function") return labels;
  const columnOf = new Map<T, number>();
  columns.forEach((column, index) => column.forEach((word) => columnOf.set(word, index)));
  return (word: T) => labels[columnOf.get(word)!];
};

export function findCommentary<T extends { word: string; font?: string }>(columns: T[][], comments: Array<CommentLike & Commented>, labels: Labels<T>) {
  const labelOf = labelFunction(columns, labels);
  const flat = columns.flat();
  const result: Record<string, FoundDibur<T>> = {};
  for (const commentator of new Set(comments.map((comment) => comment.commentator))) {
    const own = comments.filter((comment) => comment.commentator === commentator);
    Object.assign(result, findDiburim(flat.filter((word) => !labelOf(word) || labelOf(word) === commentator), own));
    // A column can be labelled wrongly where the two commentaries meet, so what is
    // missing is also looked for in the other columns, but only as a whole dibur or
    // one that is followed by the comment's own text (a quotation is not).
    const missing = own.filter((comment) => !result[comment.ref]);
    if (missing.length) {
      const elsewhere = findDiburim(flat.filter((word) => labelOf(word) && labelOf(word) !== commentator), missing);
      Object.entries(elsewhere).filter(([, dibur]) => dibur.whole || dibur.context >= .5).forEach(([ref, dibur]) => { result[ref] = dibur; });
    }
  }
  return result;
}

// Comments of the neighbouring sheets can be printed on this one (the end of a
// commentary spills over). They are searched only among words that no comment of
// this sheet has taken, and only accepted when nearly the whole dibur is found,
// since a short dibur would otherwise match any chance repetition; the printed
// words must also be hardly more than the dibur's own.
export function findOverflow<T extends { word: string; font?: string }>(columns: T[][], labels: Labels<T>, taken: Record<string, FoundDibur<T>>, comments: Array<CommentLike & Commented>) {
  const used = new Set<T>(Object.values(taken).flatMap((dibur) => dibur.words));
  const found = findCommentary(columns.map((column) => column.filter((word) => !used.has(word))), comments.filter((comment) => !taken[comment.ref]), labels);
  return Object.fromEntries(Object.entries(found).filter(([, dibur]) => dibur.share >= .8 && dibur.size >= 3 && dibur.words.length <= dibur.size + 1));
}

type Zone = { ref: string; left: number; top: number; width: number; height: number };

// The place that answers to a comment is not its words but the lines they stand in: between two
// words and between two lines of the same comment the pointer is still inside the comment. Per
// comment and line one area is made, from its first to its last word and from half the space
// above the line to half the space below it (the lines of one column therefore touch).
export function commentAreas(zones: Zone[], tolerance: number, gap: number): Zone[] {
  if (!zones.length) return [];
  const baseline = (zone: Zone) => zone.top + zone.height;
  const lines = [...new Set(zones.map((zone) => Math.round(baseline(zone) / tolerance)))].sort((a, b) => a - b).map((key) => key * tolerance);
  const steps = lines.slice(1).map((line, index) => line - lines[index]).filter((step) => step > tolerance && step < tolerance * 6).sort((a, b) => a - b);
  const pitch = steps.length ? steps[Math.floor(steps.length / 2)] : tolerance * 3;
  const areas: Zone[] = [];
  const byRef = new Map<string, Zone[]>();
  zones.forEach((zone) => { (byRef.get(zone.ref) ?? byRef.set(zone.ref, []).get(zone.ref)!).push(zone); });
  byRef.forEach((own, ref) => {
    const rows: Zone[][] = [];
    for (const zone of [...own].sort((a, b) => baseline(a) - baseline(b))) {
      const row = rows.find((candidate) => Math.abs(baseline(candidate[0]) - baseline(zone)) <= tolerance);
      if (row) row.push(zone); else rows.push([zone]);
    }
    for (const row of rows) {
      row.sort((a, b) => a.left - b.left);
      let part: Zone[] = [row[0]];
      const close = () => {
        const left = Math.min(...part.map((zone) => zone.left)), right = Math.max(...part.map((zone) => zone.left + zone.width));
        const top = Math.min(...part.map((zone) => zone.top)), bottom = Math.max(...part.map(baseline));
        const extra = Math.max(0, (pitch - (bottom - top)) / 2);
        areas.push({ ref, left, width: right - left, top: top - extra, height: bottom - top + 2 * extra });
      };
      for (const zone of row.slice(1)) {
        if (zone.left - Math.max(...part.map((p) => p.left + p.width)) > gap) { close(); part = [zone]; } else part.push(zone);
      }
      close();
    }
  });
  return areas;
}
