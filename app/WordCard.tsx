"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LexHit } from "./lexicon";
import { senseAt } from "./lexicon";
import type { WordBox } from "./wordAtPoint";

export type WordCardData = {
  /** Слово как оно показано (с огласовками, если они были) или как прочитано с PDF. */
  word: string;
  box: WordBox;
  hit: LexHit;
  /** Огласованные формы слова из Dicta (если известны). */
  vocalForms: string[];
  tractate: string;
  ref?: string;
  /** Откуда клик: подпись в карточке. */
  source: "text" | "pdf";
};

type Props = {
  card: WordCardData;
  status: string;
  loading: boolean;
  saved: boolean;
  onSave: (word: string) => void;
  onClose: () => void;
};

/** Карточка слова: словарная статья по клику, рядом со словом (на телефоне — внизу). */
export default function WordCard({ card, status, loading, saved, onSave, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const margin = 10, width = node.offsetWidth, height = node.offsetHeight;
    const wide = window.innerWidth;
    let left = card.box.left + card.box.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, wide - width - margin));
    let top = card.box.top + card.box.height + 8;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, card.box.top - height - 8);
    setPlace({ left, top });
  }, [card, loading]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const outside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!root.current?.contains(target as Node)) onClose();
    };
    window.addEventListener("keydown", escape);
    // следующий тик: клик, который открыл карточку, её не закрывает
    const timer = window.setTimeout(() => window.addEventListener("pointerdown", outside), 0);
    return () => { window.removeEventListener("keydown", escape); window.clearTimeout(timer); window.removeEventListener("pointerdown", outside); };
  }, [onClose, card]);
  const { hit } = card;
  const shownVocal = card.vocalForms.filter((form) => form !== card.word);
  return <div ref={root} className="wordCard" role="dialog" aria-label={`Слово ${card.word}`} style={place ? { left: place.left, top: place.top } : { left: -9999, top: 0 }}>
    <div className="wordCardHead">
      <span className="wordCardWord" lang="he" dir="rtl">{card.word}</span>
      <button type="button" className="wordCardClose" onClick={onClose} aria-label="Закрыть">×</button>
    </div>
    {shownVocal.length > 0 && <p className="wordCardForms"><small>Огласовка (Dicta):</small> <span lang="he" dir="rtl">{shownVocal.join(" · ")}</span></p>}
    {loading ? <p className="wordCardEmpty">Загружаем словарь…</p>
      : hit.entries.length === 0 ? <p className="wordCardEmpty">В тестовом словаре этого слова пока нет.</p>
      : hit.entries.map((entry) => {
        const here = senseAt(entry, card.tractate, card.ref);
        return <section key={entry.id} className="wordEntry">
          <div className="wordEntryHead"><b lang="he" dir="rtl">{entry.lemma}</b>{entry.pos && <small>{entry.pos}</small>}{hit.via && <small>разбор: {hit.via}</small>}</div>
          {here && <p className="wordHere"><small>В этом месте:</small> {here}</p>}
          <ul>{entry.ru.map((meaning) => <li key={meaning}>{meaning}</li>)}</ul>
          {entry.note && <p className="wordNote">{entry.note}</p>}
        </section>;
      })}
    <div className="wordCardFoot">
      <button type="button" disabled={saved} onClick={() => onSave(card.word)}>{saved ? "В коллекции" : "＋ В мою коллекцию"}</button>
      <small>{status}</small>
    </div>
  </div>;
}
