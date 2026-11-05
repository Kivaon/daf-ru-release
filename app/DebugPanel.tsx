"use client";
import { useEffect, useState } from "react";

type Dbg = { errors: string[]; t0: number };
type Probe = { name: string; result: string };

function features(): string[] {
  const w = window as unknown as Record<string, unknown>;
  const checks: [string, boolean][] = [
    ["Array.at", typeof [].at === "function"],
    ["structuredClone", typeof w.structuredClone === "function"],
    ["Object.hasOwn", typeof Object.hasOwn === "function"],
    ["Promise.allSettled", typeof Promise.allSettled === "function"],
    ["Promise.withResolvers", typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers === "function"],
    ["ResizeObserver", typeof w.ResizeObserver === "function"],
    ["IntersectionObserver", typeof w.IntersectionObserver === "function"],
    ["AbortController", typeof w.AbortController === "function"],
    ["fetch", typeof w.fetch === "function"],
    ["matchMedia", typeof w.matchMedia === "function"],
    ["Intl.Segmenter", typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function"],
    ["String.replaceAll", typeof "".replaceAll === "function"],
    ["Array.flat", typeof [].flat === "function"],
    ["BigInt", typeof w.BigInt === "function"],
    ["Worker", typeof w.Worker === "function"],
    ["OffscreenCanvas", typeof w.OffscreenCanvas === "function"],
    ["CSS dvh", typeof CSS !== "undefined" && CSS.supports("height", "1dvh")],
    ["CSS :has()", typeof CSS !== "undefined" && CSS.supports("selector(:has(*))")],
    ["CSS inset", typeof CSS !== "undefined" && CSS.supports("inset", "0")],
  ];
  return checks.map(([n, ok]) => `${ok ? "ok " : "НЕТ"} ${n}`);
}

async function probe(name: string, url: string, bytes = false): Promise<Probe> {
  const t = performance.now();
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), 20000);
  try {
    const response = await fetch(url, { signal: control.signal });
    const body = bytes ? (await response.arrayBuffer()).byteLength + " байт" : (await response.text()).length + " симв.";
    return { name, result: `${response.status} ${body}, ${Math.round(performance.now() - t)} мс` };
  } catch (error) {
    return { name, result: `ОШИБКА ${(error as Error).name}: ${(error as Error).message} (${Math.round(performance.now() - t)} мс)` };
  } finally {
    clearTimeout(timer);
  }
}

export default function DebugPanel() {
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (new URLSearchParams(location.search).get("debug") !== "1") return;
    setOn(true);
    let alive = true;
    const build = async () => {
      const dbg = (window as unknown as { __dbg?: Dbg }).__dbg;
      const nav = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; saveData?: boolean } };
      const head = [
        `Время: ${new Date().toISOString()}`,
        `Адрес: ${location.origin}${location.pathname}${location.search}`,
        `UA: ${navigator.userAgent}`,
        `Язык: ${navigator.language}; онлайн: ${navigator.onLine}; куки: ${navigator.cookieEnabled}`,
        `Экран: ${screen.width}x${screen.height}, окно ${innerWidth}x${innerHeight}, DPR ${devicePixelRatio}, касаний ${navigator.maxTouchPoints}`,
        `Сеть: ${nav.connection ? `${nav.connection.effectiveType ?? "?"}, ${nav.connection.downlink ?? "?"} Мбит/с, экономия ${nav.connection.saveData ?? "?"}` : "нет данных"}`,
        `Память: ${(navigator as unknown as { deviceMemory?: number }).deviceMemory ?? "?"} ГБ, ядер ${navigator.hardwareConcurrency ?? "?"}`,
      ];
      const nowProbes = await Promise.all([
        probe("Sefaria, текст иврита", "https://www.sefaria.org/api/texts/Bekhorot.2a?context=0&commentary=0"),
        probe("Sefaria, связи", "https://www.sefaria.org/api/links/Bekhorot.2a?with_text=0"),
        probe("PDF листа", "/api/daf-pdf?masechta=bechoros&daf=2&amud=a", true),
        probe("Статьи (API сайта)", "/api/articles?tractate=Bekhorot&ref=Bekhorot.2a"),
      ]);
      if (!alive) return;
      const nodes = {
        "Раздел листа": !!document.querySelector(".dafViewport"),
        "Страница PDF (canvas)": document.querySelectorAll(".dafViewport canvas").length,
        "Сообщение о загрузке": (document.body.innerText.match(/Загружаем[^\n]*/) || ["нет"])[0],
      };
      const perf = performance.getEntriesByType("resource")
        .filter((e) => e.duration > 3000 || (e as PerformanceResourceTiming).responseStatus >= 400)
        .map((e) => `${Math.round(e.duration)} мс ${(e as PerformanceResourceTiming).responseStatus ?? ""} ${e.name.slice(0, 90)}`);
      setText([
        "== Устройство ==", ...head,
        "", "== Возможности браузера ==", ...features(),
        "", "== Запросы (проверка сейчас) ==", ...nowProbes.map((p) => `${p.name}: ${p.result}`),
        "", "== Страница ==", ...Object.entries(nodes).map(([k, v]) => `${k}: ${v}`),
        "", "== Медленные или неудачные загрузки ==", ...(perf.length ? perf : ["нет"]),
        "", "== Ошибки с момента открытия ==", ...(dbg?.errors.length ? dbg.errors : [dbg ? "нет" : "сбор ошибок не запущен"]),
      ].join("\n"));
    };
    build();
    const timer = setInterval(build, 15000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  if (!on) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied("Скопировано"); }
    catch { setCopied("Выделите текст и скопируйте вручную"); }
    setTimeout(() => setCopied(""), 3000);
  };
  return (
    <div className="debugPanel" role="region" aria-label="Диагностика">
      <div className="debugBar">
        <strong>Диагностика</strong>
        <button type="button" onClick={copy}>Копировать</button>
        <button type="button" onClick={() => setOpen(!open)}>{open ? "Свернуть" : "Развернуть"}</button>
        {copied && <span>{copied}</span>}
      </div>
      {open && <textarea readOnly value={text || "Проверяем…"} onFocus={(e) => e.currentTarget.select()} />}
    </div>
  );
}
