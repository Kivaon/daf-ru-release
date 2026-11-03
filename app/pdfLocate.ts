import { alignColumns, type AlignedComment } from "./pdfAlignment.ts";
import { findCommentary, findOverflow, orderKey, type FoundDibur } from "./pdfCommentary.ts";

export type LocatableComment = AlignedComment & { dibur: string };

const sheetNumber = (page: string) => parseInt(page) * 2 + (page.endsWith("b") ? 1 : 0);
const BOLD_RUN_LIMIT = 24;
const SPILL_COMMENTS = 3;

// Finds, on one sheet, the dibur of every comment of that sheet and the words that
// belong to every comment (own or from a neighbouring sheet). Two independent
// readings are combined: the dibur searched by its words (and by the text that
// follows it) and the whole column aligned with the text of Rashi / Tosafot.
// A dibur found whole in print is trusted; where there is none, the start of the
// comment from the alignment is used if it is set in a face of its own (bold).
export function locateCommentary<T extends { word: string; font?: string }>(columns: T[][], own: LocatableComment[], neighbors: LocatableComment[]) {
  const unique = (list: LocatableComment[]) => list.filter((comment, index, all) => all.findIndex((other) => other.ref === comment.ref) === index);
  const ownComments = unique(own);
  const ownPage = ownComments.length ? sheetNumber(orderKey(ownComments[0].ref)?.page ?? "0a") : 0;
  // only the end of the previous sheet's commentary and the start of the next
  // one can be printed here, so only a few of their comments are read
  const spill = (list: LocatableComment[], side: "before" | "after") => {
    const sorted = unique(list).filter((comment) => { const key = orderKey(comment.ref); return key && (side === "before" ? sheetNumber(key.page) < ownPage : sheetNumber(key.page) > ownPage); })
      .sort((a, b) => orderKey(a.ref)!.rank - orderKey(b.ref)!.rank);
    return [...new Set(sorted.map((comment) => comment.commentator))].flatMap((commentator) => {
      const of = sorted.filter((comment) => comment.commentator === commentator);
      return side === "before" ? of.slice(-SPILL_COMMENTS) : of.slice(0, SPILL_COMMENTS);
    });
  };
  const neighborComments = [...spill(neighbors, "before"), ...spill(neighbors, "after")].filter((comment) => !ownComments.some((other) => other.ref === comment.ref));
  const sequence = [...ownComments, ...neighborComments].sort((a, b) => {
    const first = orderKey(a.ref), second = orderKey(b.ref);
    if (!first || !second) return 0;
    return sheetNumber(first.page) - sheetNumber(second.page) || first.rank - second.rank;
  });
  const { labelOf, assigned } = alignColumns(columns, sequence);
  const diburs: Record<string, FoundDibur<T>> = findCommentary(columns, ownComments, labelOf);

  const fonts = new Map<string | undefined, number>();
  columns.flat().forEach((word) => fonts.set(word.font, (fonts.get(word.font) ?? 0) + 1));
  const bodyFont = [...fonts].sort((a, b) => b[1] - a[1])[0]?.[0];

  const alignedWords = new Map<string, Array<{ word: T; pos: number; column: T[]; index: number }>>();
  columns.forEach((column) => column.forEach((word, index) => {
    const entry = assigned.get(word);
    if (entry?.aligned) (alignedWords.get(entry.ref) ?? alignedWords.set(entry.ref, []).get(entry.ref)!).push({ word, pos: entry.pos, column, index });
  }));

  // comments whose dibur was not found by words: take the start of the comment
  // from the alignment when it is set in a face of its own
  for (const comment of ownComments) {
    if (diburs[comment.ref]) continue;
    const start = (alignedWords.get(comment.ref) ?? []).filter((entry) => entry.pos <= 3).sort((a, b) => a.pos - b.pos || a.index - b.index)[0];
    if (!start || !start.word.font || start.word.font === bodyFont) continue;
    let last = start.index;
    while (last + 1 < start.column.length && last - start.index < BOLD_RUN_LIMIT && start.column[last + 1].font === start.word.font) last++;
    diburs[comment.ref] = { words: start.column.slice(start.index, last + 1), opening: [], whole: false, share: 0, size: 0, context: 0 };
  }

  // comments of the neighbouring sheets: by dibur where it is printed in full,
  // and every word that the alignment gives to such a comment
  const overflow = neighborComments.length ? findOverflow(columns, labelOf, diburs, neighborComments) : {};
  Object.assign(diburs, overflow);

  // which comment every word belongs to; a dibur's own words are its comment's
  const zones = new Map<T, string>();
  const enough = new Set<string>(ownComments.map((comment) => comment.ref));
  neighborComments.forEach((comment) => { if ((alignedWords.get(comment.ref)?.length ?? 0) >= 6 || overflow[comment.ref]) enough.add(comment.ref); });
  assigned.forEach((entry, word) => { if (enough.has(entry.ref)) zones.set(word, entry.ref); });
  Object.entries(diburs).forEach(([ref, dibur]) => dibur.words.forEach((word) => zones.set(word, ref)));
  return { diburs, zones, labelOf };
}
