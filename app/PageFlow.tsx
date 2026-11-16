"use client";
import { useEffect, useRef } from "react";
import { flowProgress, type FlowItem } from "./pageFlowModel";

type Props = {
  label: string;
  items: FlowItem[];
  /** false, пока данные листа ещё загружаются. */
  ready: boolean;
  error?: boolean;
  onSelect: (ref: string) => void;
};

/** Перевод всей стороны листа сплошным текстом; перевод выбранной реплики выделен. */
export default function PageFlow({ label, items, ready, error, onSelect }: Props) {
  const selected = useRef<HTMLSpanElement>(null);
  const selectedRef = items.find((item) => item.selected)?.ref;
  useEffect(() => { selected.current?.scrollIntoView?.({ block: "nearest" }); }, [selectedRef]);
  const progress = flowProgress(items);
  return <section className="pageFlow" aria-label={`Перевод листа ${label}`}>
    <div className="pageFlowHead"><span>{label}</span><b>Перевод листа</b>{ready && !error && progress.total > 0 && <i>{progress.done} из {progress.total} реплик</i>}</div>
    {error ? <p className="pageFlowNote" role="alert">Не удалось загрузить переводы листа.</p>
      : !ready ? <p className="pageFlowNote" role="status">Загружаем переводы листа…</p>
      : <p className="pageFlowText">{items.map((item) => {
        const pick = () => onSelect(item.ref);
        const key = (event: React.KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pick(); } };
        return <span key={item.ref} data-ref={item.ref} ref={item.selected ? selected : undefined} role="button" tabIndex={0} aria-pressed={item.selected} aria-label={`Реплика ${item.number}`} className={`flowItem${item.selected ? " selected" : ""}${item.translation === null ? " untranslated" : ""}`} onClick={pick} onKeyDown={key}>
          <sup>{item.number}</sup>
          {item.translation ?? <>
            <bdi lang="he" dir="rtl" className="flowOriginal">{item.original}</bdi> <small>нет перевода</small>
          </>}{" "}
        </span>;
      })}</p>}
  </section>;
}
