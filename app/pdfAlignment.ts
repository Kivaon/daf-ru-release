import { editionWords, normalizeHebrew, sameEditionWord } from "./pdfCommentary.ts";

export type AlignedComment = { ref: string; commentator: string; text: string };
export type Assignment = { ref: string; pos: number; aligned: boolean };

const strip = (word: string) => word.replace(/[נן]/g, "");
const skeleton = (word: string) => strip(word).replace(/[יו]/g, "");
// cheap test first: words whose letters differ much cannot be spelled alike
const alike = (first: string, second: string) => {
  if (Math.abs(first.length - second.length) > 2) return false;
  const counts = new Map<string, number>();
  for (const letter of first) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  let shared = 0;
  for (const letter of second) { const left = counts.get(letter) ?? 0; if (left > 0) { shared++; counts.set(letter, left - 1); } }
  return shared >= Math.max(first.length, second.length) - 2;
};
const score = (printed: string, source: string) => {
  if (printed === source) return 2;
  if (printed.length < 2 || source.length < 2) return -1.2;
  if (alike(printed, source) && sameEditionWord(printed, source)) return 1.2;
  if (printed.length >= 2 && source.length >= 2 && (strip(printed) === strip(source) || skeleton(printed) === skeleton(source))) return 1;
  return -1.2;
};

// Best local alignment of the printed words of one column with a run of source
// words: the printed words that correspond to a source word, by index.
export function alignLocally(printed: string[], source: string[]) {
  const n = printed.length, m = source.length, width = m + 1;
  const cells = new Float32Array((n + 1) * width);
  const steps = new Uint8Array((n + 1) * width);
  let best = 0, bestRow = 0, bestColumn = 0;
  for (let row = 1; row <= n; row++) for (let column = 1; column <= m; column++) {
    const diagonal = cells[(row - 1) * width + column - 1] + score(printed[row - 1], source[column - 1]);
    const up = cells[(row - 1) * width + column] - 1, left = cells[row * width + column - 1] - 1;
    let value = 0, step = 0;
    if (diagonal > value) { value = diagonal; step = 1; }
    if (up > value) { value = up; step = 2; }
    if (left > value) { value = left; step = 3; }
    cells[row * width + column] = value; steps[row * width + column] = step;
    if (value > best) { best = value; bestRow = row; bestColumn = column; }
  }
  const matches = new Map<number, number>();
  let row = bestRow, column = bestColumn;
  while (row > 0 && column > 0 && cells[row * width + column] > 0) {
    const step = steps[row * width + column];
    if (step === 1) { if (score(printed[row - 1], source[column - 1]) > 0) matches.set(row - 1, column - 1); row--; column--; }
    else if (step === 2) row--;
    else if (step === 3) column--;
    else break;
  }
  return { score: best, matches };
}

// Which commentator every printed word belongs to, and which comment, by aligning
// the words of each column with the whole text of Rashi and of Tosafot (the
// neighbouring sheets' ends included, in sheet order) instead of with their
// diburim. A column is aligned repeatedly: the best stretch is taken, its words
// are set aside, and what remains is aligned again, so a column in which Rashi
// passes into Tosafot is split where they meet. Words between two aligned words
// of a comment belong to it as well; words aligned with nothing belong to none.
export function alignColumns<T extends { word: string }>(columns: T[][], comments: AlignedComment[]) {
  const labelOf = new Map<T, string>();
  const assigned = new Map<T, Assignment>();
  const sources = new Map<string, Array<{ word: string; index: number; pos: number }>>();
  for (const commentator of new Set(comments.map((comment) => comment.commentator))) {
    const flat: Array<{ word: string; index: number; pos: number }> = [];
    comments.forEach((comment, index) => { if (comment.commentator === commentator) editionWords(comment.text).forEach((word, pos) => flat.push({ word, index, pos })); });
    if (flat.length) sources.set(commentator, flat);
  }
  const MIN_MATCHES = 8, MAX_ROUNDS = 8;
  for (const column of columns) {
    if (column.length < 12) continue;
    const printed = column.map((word) => normalizeHebrew(word.word));
    const taken = column.map(() => false);
    let remaining = column.length;
    for (let round = 0; round < MAX_ROUNDS && remaining >= MIN_MATCHES; round++) {
      const visible = printed.map((word, i) => (taken[i] ? "" : word));
      let best: { commentator: string; result: ReturnType<typeof alignLocally> } | undefined;
      for (const [commentator, flat] of sources) {
        const result = alignLocally(visible, flat.map((entry) => entry.word));
        if (!best || result.score > best.result.score) best = { commentator, result };
      }
      if (!best || best.result.matches.size < MIN_MATCHES) break;
      const flat = sources.get(best.commentator)!;
      const indexes = [...best.result.matches.keys()].sort((a, b) => a - b);
      let current: Assignment | undefined;
      for (let i = indexes[0]; i <= indexes.at(-1)!; i++) {
        if (taken[i]) continue;
        const source = best.result.matches.has(i) ? flat[best.result.matches.get(i)!] : undefined;
        if (source) current = { ref: comments[source.index].ref, pos: source.pos, aligned: true };
        if (current) assigned.set(column[i], source ? current : { ref: current.ref, pos: current.pos, aligned: false });
        labelOf.set(column[i], best.commentator);
        taken[i] = true; remaining--;
      }
    }
  }
  return { labelOf: (word: T) => labelOf.get(word), assigned };
}
