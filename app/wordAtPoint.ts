/** Слово ивритского текста под точкой клика (без обёртывания слов в элементы). */
export type WordBox = { left: number; top: number; width: number; height: number };
export type WordPick = { word: string; box: WordBox };

/** Ивритские буквы, огласовки и знаки кантилляции; маакаф и пунктуация разделяют слова. */
const isLetterOrMark = (ch: string) => /[֑-ׇֽֿׁׂׅׄא-ת׳״]/.test(ch);
const isBase = (ch: string) => /[א-ת]/.test(ch);
/** Апостроф или кавычка внутри слова (сокращения: אע"פ, ר'), если с обеих сторон буквы. */
const isInnerQuote = (text: string, i: number) => {
  const mark = text[i];
  if (i === 0 || !isBase(text[i - 1])) return false;
  if (mark === '"') return i < text.length - 1 && isBase(text[i + 1]);
  return mark === "'" || mark === "’";
};

/** Границы слова вокруг позиции в строке; null, если там не слово. */
export function wordBounds(text: string, offset: number): { start: number; end: number } | null {
  let at = Math.min(Math.max(offset, 0), text.length);
  const inWord = (i: number) => i >= 0 && i < text.length && (isLetterOrMark(text[i]) || isInnerQuote(text, i));
  if (!inWord(at) && inWord(at - 1)) at -= 1;
  if (!inWord(at)) return null;
  let start = at, end = at + 1;
  while (inWord(start - 1)) start -= 1;
  while (inWord(end)) end += 1;
  return /[א-ת]/.test(text.slice(start, end)) ? { start, end } : null;
}

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/** Слово под точкой экрана или null: точка должна попадать в сам слово, а не рядом. */
export function wordAtPoint(x: number, y: number, doc: CaretDocument = document): WordPick | null {
  let node: Node | null = null, offset = 0;
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) { node = position.offsetNode; offset = position.offset; }
  else {
    const range = doc.caretRangeFromPoint?.(x, y);
    if (range) { node = range.startContainer; offset = range.startOffset; }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const bounds = wordBounds(node.textContent ?? "", offset);
  if (!bounds) return null;
  const range = doc.createRange();
  range.setStart(node, bounds.start);
  range.setEnd(node, bounds.end);
  const rect = range.getBoundingClientRect();
  if (x < rect.left - 2 || x > rect.right + 2 || y < rect.top - 2 || y > rect.bottom + 2) return null;
  return { word: (node.textContent ?? "").slice(bounds.start, bounds.end), box: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } };
}
