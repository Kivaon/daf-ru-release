/**
 * Словарь слов для подсказки по клику. Пока это тестовый набор (public/lexicon/test.json):
 * черновик на слова трёх тестовых листов, не проверенный редактором. Поиск по формам идёт по
 * буквам без огласовок; если точной формы нет, снимаются приставки.
 */
import { letters } from "./vocalized.ts";

export type LexSense = { at: string; ru: string };
export type LexEntry = {
  id: string;
  /** Основа слова (иврит/арамейский), как заголовок статьи. */
  lemma: string;
  pos?: string;
  /** Написания без огласовок, которые ведут к этой статье. */
  forms: string[];
  ru: string[];
  note?: string;
  /** Значение в конкретном месте: at = «Трактат ref», например «Berakhot 2a:5». */
  ctx?: LexSense[];
};
export type Lexicon = { v: 1; status: string; entries: LexEntry[] };
export type LexIndex = Map<string, LexEntry[]>;
export type LexHit = { letters: string; entries: LexEntry[]; via: string | null };

export function isLexicon(value: unknown): value is Lexicon {
  if (!value || typeof value !== "object") return false;
  const lexicon = value as Partial<Lexicon>;
  return lexicon.v === 1 && typeof lexicon.status === "string" && Array.isArray(lexicon.entries)
    && lexicon.entries.every((entry) => !!entry && typeof entry.id === "string" && typeof entry.lemma === "string"
      && Array.isArray(entry.forms) && entry.forms.every((form) => typeof form === "string")
      && Array.isArray(entry.ru) && entry.ru.every((text) => typeof text === "string"));
}

export function buildIndex(lexicon: Lexicon): LexIndex {
  const index: LexIndex = new Map();
  for (const entry of lexicon.entries) {
    for (const key of new Set([...entry.forms, entry.lemma].map(letters).filter(Boolean))) {
      const list = index.get(key) ?? [];
      if (!list.includes(entry)) list.push(entry);
      index.set(key, list);
    }
  }
  return index;
}

/** Одно- и двухбуквенные приставки, которые снимаются, если слова нет в таблице как есть. */
const PREFIXES = ["וב", "ול", "ומ", "וש", "וה", "וד", "וכ", "ד", "ו", "ה", "ב", "כ", "ל", "מ", "ש"];

export function lookupWord(index: LexIndex, word: string): LexHit {
  const key = letters(word);
  const exact = index.get(key);
  if (exact) return { letters: key, entries: exact, via: null };
  for (const prefix of PREFIXES) {
    if (key.length - prefix.length < 2 || !key.startsWith(prefix)) continue;
    const found = index.get(key.slice(prefix.length));
    if (found) return { letters: key, entries: found, via: `${prefix} + ${key.slice(prefix.length)}` };
  }
  return { letters: key, entries: [], via: null };
}

/** Значение статьи для конкретного места; ищется точное совпадение «Трактат ref». */
export function senseAt(entry: LexEntry, tractate: string, ref: string | undefined): string | null {
  if (!ref) return null;
  return entry.ctx?.find((item) => item.at === `${tractate} ${ref}`)?.ru ?? null;
}
