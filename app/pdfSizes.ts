import { editionWords, normalizeHebrew } from "./pdfCommentary.ts";

export const sizeOf = (height: number) => Math.round(height * 2) / 2;

// Rashi and Tosafot are not set in the same size on every sheet (11 pt on most,
// but Tosafot 9 pt on some, Rashi 12 pt on others), so the size is not assumed:
// a size is that of the commentary when nearly all of its words (not counting the
// Gemara's own typeface) are words that Rashi and Tosafot use. The Gemara quotes
// them a lot but stays under about 86 %, the notes under about 60 %; the commentary
// of the sheets examined reaches 93 % or more.
// The bold diburim are few words in a size a little different from the text around
// them (and in fonts of their own: some sheets have dozens of font subsets), so a
// small size within a point of a commentary size is taken as well.
export function commentarySizes(words: Array<{ word: string; height: number; font?: string }>, comments: Array<{ text: string }>, gemaraFont?: string, share = .9, least = 40) {
  const vocabulary = new Set(comments.flatMap((comment) => editionWords(comment.text)).filter((word) => word.length >= 3));
  const stats = new Map<number, { words: number; known: number }>();
  for (const { word, height, font } of words) {
    const letters = normalizeHebrew(word);
    if (letters.length < 3 || (gemaraFont !== undefined && font === gemaraFont)) continue;
    const entry = stats.get(sizeOf(height)) ?? { words: 0, known: 0 };
    entry.words++; if (vocabulary.has(letters)) entry.known++;
    stats.set(sizeOf(height), entry);
  }
  const core = [...stats].filter(([, entry]) => entry.words >= least && entry.known / entry.words >= share).map(([size]) => size);
  const near = [...stats].filter(([size, entry]) => entry.words >= 8 && entry.known / entry.words >= .85 && core.some((big) => Math.abs(big - size) <= 1)).map(([size]) => size);
  return new Set([...core, ...near]);
}
