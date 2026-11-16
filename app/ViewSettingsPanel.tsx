"use client";
import { useEffect, useRef, useState } from "react";
import { VIEW_PRESETS, applyPreset, presetOf, type ViewFlag, type ViewSettings } from "./viewSettings";

type Props = {
  view: ViewSettings;
  onChange: (view: ViewSettings) => void;
  /** Есть ли огласованный текст для этой стороны. Пока данные не подключены, переключатель недоступен. */
  niqqudAvailable: boolean;
};

const BLOCKS: { flag: ViewFlag; label: string }[] = [
  { flag: "original", label: "Оригинал" },
  { flag: "title", label: "Заголовок" },
  { flag: "translation", label: "Перевод" },
  { flag: "explanation", label: "Объяснение" },
  { flag: "rashi", label: "Раши" },
  { flag: "tosafot", label: "Тосафот" },
];

/** Кнопка «Вид» с выпадающей панелью настроек показа статьи. */
export default function ViewSettingsPanel({ view, onChange, niqqudAvailable }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("pointerdown", outside); window.removeEventListener("keydown", escape); };
  }, [open]);
  const set = (patch: Partial<ViewSettings>) => onChange({ ...view, ...patch });
  const active = presetOf(view);
  return <div className="viewSettings" ref={root}>
    <button type="button" className="viewSettingsButton" aria-expanded={open} aria-controls="viewSettingsPanel" onClick={() => setOpen((value) => !value)} title="Настройки показа статьи">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>
      <span>Вид</span>
    </button>
    {open && <div className="viewSettingsPanel" id="viewSettingsPanel" role="group" aria-label="Настройки показа">
      <fieldset>
        <legend>Режим</legend>
        <label><input type="radio" name="view-mode" checked={view.mode === "reply"} onChange={() => set({ mode: "reply" })} />По реплике</label>
        <label><input type="radio" name="view-mode" checked={view.mode === "page"} onChange={() => set({ mode: "page" })} />Весь лист</label>
        <p className="viewHint">{view.mode === "page" ? "Перевод листа сплошным текстом; выбранная реплика выделена, её заголовок, объяснение и комментарии — ниже." : "Одна статья выбранной реплики."}</p>
      </fieldset>
      <fieldset>
        <legend>Показывать</legend>
        {BLOCKS.map((block) => <label key={block.flag}><input type="checkbox" checked={view[block.flag]} onChange={(event) => set({ [block.flag]: event.target.checked })} />{block.label}</label>)}
        <label title={niqqudAvailable ? undefined : "Для этого листа нет огласованного текста"}><input type="checkbox" checked={view.niqqud} disabled={!niqqudAvailable || !view.original} onChange={(event) => set({ niqqud: event.target.checked })} />Огласовки{!niqqudAvailable && <small> (нет данных)</small>}</label>
      </fieldset>
      <fieldset>
        <legend>Готовые виды</legend>
        <div className="viewPresets">{VIEW_PRESETS.map((preset) => <button type="button" key={preset.id} className={active === preset.id ? "active" : ""} aria-pressed={active === preset.id} onClick={() => onChange(applyPreset(view, preset.id))}>{preset.label}</button>)}</div>
      </fieldset>
    </div>}
  </div>;
}
