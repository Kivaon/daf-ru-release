/** Сплошной перевод листа: статьи подряд, перевод выбранной реплики выделен. */
export type FlowArticle = {
  ref: string;
  translation?: string | null;
  parts?: { ref: string; translation: string }[] | null;
  unitRef?: string | null;
};
export type FlowSegment = { id: string; kind: string; text: string };
export type FlowItem = {
  ref: string;
  /** Порядковый номер реплики на листе (для метки в тексте). */
  number: number;
  kind: string;
  original: string;
  /** null — для реплики нет сохранённого перевода. */
  translation: string | null;
  selected: boolean;
};

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Перевод одной реплики. У составной статьи в строке лежит общий перевод через пробел,
 * поэтому для реплики берётся её собственная часть из parts, а не вся строка.
 */
export function translationFor(articles: readonly FlowArticle[], ref: string): string | null {
  const own = articles.find((article) => article.ref === ref);
  if (own) {
    if (own.parts?.length) return clean(own.parts.find((part) => part.ref === ref)?.translation) || null;
    return clean(own.translation) || null;
  }
  for (const article of articles) {
    const part = article.parts?.find((item) => item.ref === ref);
    if (part && clean(part.translation)) return clean(part.translation);
  }
  return null;
}

export function buildPageFlow(segments: readonly FlowSegment[], articles: readonly FlowArticle[], selectedRef: string): FlowItem[] {
  return segments.map((segment, index) => ({
    ref: segment.id,
    number: index + 1,
    kind: segment.kind,
    original: segment.text,
    translation: translationFor(articles, segment.id),
    selected: segment.id === selectedRef,
  }));
}

/** Сколько реплик листа уже переведено. */
export function flowProgress(items: readonly FlowItem[]): { done: number; total: number } {
  return { done: items.filter((item) => item.translation !== null).length, total: items.length };
}
