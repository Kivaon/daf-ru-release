"use client";

import { useEffect, useRef, useState } from "react";
import { CommentaryLink } from "./bekhorot2aCommentary";

export type DafSegment = { id: string; kind: string; text: string };

type TextRect = { left: number; top: number; width: number; height: number };
type WordRect = TextRect & { word: string; line: number };
type LocatedBlock = { lines: TextRect[]; words: WordRect[] };
type PdfJsApi = { GlobalWorkerOptions: { workerSrc: string }; getDocument: (source: { data: Uint8Array }) => { promise: Promise<unknown> } };

function loadPdfJs() {
  const host = window as typeof window & { pdfjsLib?: PdfJsApi };
  if (host.pdfjsLib) return Promise.resolve(host.pdfjsLib);
  return new Promise<PdfJsApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pdfjs="true"]');
    const script = existing ?? document.createElement("script");
    const ready = () => host.pdfjsLib ? resolve(host.pdfjsLib) : reject(new Error("PDF.js не запустился"));
    script.addEventListener("load", ready, { once: true });
    script.addEventListener("error", () => reject(new Error("Не удалось загрузить PDF.js")), { once: true });
    if (!existing) { script.src = "/pdf.min.js?v=3"; script.dataset.pdfjs = "true"; document.head.appendChild(script); }
  });
}

const glyphs: Record<string, string> = {
  "‡":"א", "·":"ב", "‚":"ג", "„":"ד", "‰":"ה", "Â":"ו", "Ê":"ז", "Á":"ח", "Ë":"ט", "È":"י",
  "Î":"כ", "Í":"ך", "Ï":"ל", "Ó":"מ", "Ì":"ם", "\u0005":"נ", "\b":"נ", "\u0010":"נ", "\u0011":"נ", "\u0012":"נ", "\u0014":"נ", "Ô":"ן", "Ò":"ס", "Ú":"ע", "Ù":"פ",
  "Û":"ף", "ˆ":"צ", "ı":"ץ", "˜":"ק", "¯":"ר", "˘":"ש", "˙":"ת",
};
const decodeWord = (raw: string) => /[א-ת]/.test(raw)?raw:Array.from(raw).map((char) => glyphs[char] ?? (char.charCodeAt(0)>=0xe0&&char.charCodeAt(0)<=0xfa?String.fromCharCode(0x5d0+char.charCodeAt(0)-0xe0):char==='\u0004'?'נ':char)).reverse().join("").replace("'", "׳");
const normalizeHebrew = (text: string) => text.normalize("NFD").replace(/[\u0591-\u05C7]/g, "").replace(/[^\u05D0-\u05EA]/g, "");

function editionWords(text: string) {
  return text.split(/\s+/).flatMap((word) => {
    const normalized = normalizeHebrew(word);
    if (normalized === "נכרי" || normalized === "גוי") return ["עובד", "כוכבים"];
    if (normalized === "הגוי") return ["העובד", "כוכבים"];
    return normalized ? [normalized] : [];
  });
}

function wordDistance(first: string, second: string) {
  const width = second.length + 1;
  const distances = new Uint16Array((first.length + 1) * width);
  for (let index = 0; index <= first.length; index++) distances[index * width] = index;
  for (let index = 0; index <= second.length; index++) distances[index] = index;
  for (let row = 1; row <= first.length; row++) for (let column = 1; column <= second.length; column++) {
    distances[row * width + column] = Math.min(
      distances[(row - 1) * width + column] + 1,
      distances[row * width + column - 1] + 1,
      distances[(row - 1) * width + column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1),
    );
  }
  return distances[first.length * width + second.length];
}

// The Vilna PDF and Sefaria occasionally differ by a mater lectionis or one
// damaged glyph. Such a spelling difference must not become a semantic border.
function sameEditionWord(first: string, second: string) {
  if (first === second) return true;
  const longest = Math.max(first.length, second.length);
  return longest >= 4 && wordDistance(first, second) <= (longest >= 8 ? 2 : 1);
}

function lineRects(words: WordRect[]) {
  const rectangles: TextRect[] = [];
  Array.from(new Set(words.map((word) => word.line))).forEach((line) => {
    const row = words.filter((word) => word.line === line).sort((a, b) => a.left - b.left);
    let group: WordRect[] = [];
    const flush = () => {
      if (!group.length) return;
      const left = Math.min(...group.map((word) => word.left));
      const right = Math.max(...group.map((word) => word.left + word.width));
      const top = Math.min(...group.map((word) => word.top));
      const bottom = Math.max(...group.map((word) => word.top + word.height));
      const fullHeight = bottom - top;
      rectangles.push({ left, top: top + fullHeight * .48, width: right - left, height: fullHeight * .46 });
      group = [];
    };
    row.forEach((word) => {
      const previous = group.at(-1);
      if (previous && word.left - (previous.left + previous.width) > Math.max(word.height * 1.8, 18)) flush();
      group.push(word);
    });
    flush();
  });
  return rectangles;
}

function alignSefariaToPdf(pdfWords: WordRect[], segments: DafSegment[]) {
  const sourceChars: Array<{ char: string; segment: number }> = [];
  segments.forEach((segment, segmentIndex) => {
    editionWords(segment.text).forEach((word) => Array.from(word).forEach((char) => sourceChars.push({ char, segment: segmentIndex })));
  });
  const pdfChars: Array<{ char: string; word: number }> = [];
  pdfWords.forEach((word, wordIndex) => Array.from(normalizeHebrew(word.word)).forEach((char) => pdfChars.push({ char, word: wordIndex })));
  const m = sourceChars.length, n = pdfChars.length, width = n + 1;
  const costs = new Uint16Array((m + 1) * width);
  const path = new Uint8Array((m + 1) * width);
  for (let i = 1; i <= m; i++) { costs[i * width] = i; path[i * width] = 1; }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const index = i * width + j;
    const diagonal = costs[(i - 1) * width + j - 1] + (sourceChars[i - 1].char === pdfChars[j - 1].char ? 0 : 2);
    const deletion = costs[(i - 1) * width + j] + 1;
    const insertion = costs[index - 1] + 1;
    if (diagonal <= deletion && diagonal <= insertion) { costs[index] = diagonal; path[index] = 0; }
    else if (deletion <= insertion) { costs[index] = deletion; path[index] = 1; }
    else { costs[index] = insertion; path[index] = 2; }
  }
  let end = 0;
  for (let j = 1; j <= n; j++) if (costs[m * width + j] < costs[m * width + end]) end = j;
  const matchedWords = segments.map(() => new Set<number>());
  const exact = segments.map(() => 0);
  const totals = segments.map(() => 0);
  sourceChars.forEach(({ segment }) => totals[segment]++);
  let i = m, j = end;
  while (i > 0) {
    const direction = path[i * width + j];
    if (direction === 0 && j > 0) {
      const source = sourceChars[i - 1], pdf = pdfChars[j - 1];
      matchedWords[source.segment].add(pdf.word);
      if (source.char === pdf.char) exact[source.segment]++;
      i--; j--;
    } else if (direction === 1 || j === 0) i--;
    else j--;
  }
  const validationIndexes = totals.map((_, index) => index).filter((index) => totals[index] > 0);
  const validationExact = validationIndexes.map((index) => exact[index]);
  const validationTotals = validationIndexes.map((index) => totals[index]);
  const exactCharacters = validationExact.reduce((sum, value) => sum + value, 0);
  const totalCharacters = validationTotals.reduce((sum, value) => sum + value, 0);
  const overallRatio = exactCharacters / totalCharacters;
  // The page-wide score is only a wrong-page guard. Edition spelling and PDF
  // glyph damage can lower it even when individual replies align reliably.
  // Each interior reply is validated separately below at the stricter 70%.
  if (overallRatio < .45) {
    throw new Error(`Сверка текста Гемары: совпало только ${Math.round(overallRatio * 100)}% (${exactCharacters} из ${totalCharacters} букв). Вероятно, PDF не соответствует выбранному листу`);
  }
  const blocks: Record<string, LocatedBlock> = {};
  const warnings: string[] = [];
  let previousEnd = -1;
  segments.forEach((segment, segmentIndex) => {
    let matched = [...matchedWords[segmentIndex]].sort((a, b) => a - b);
    // Sefaria often expands abbreviations printed on the Vilna page (for
    // example רבי versus ר׳). Page-wide validation already protects against
    // a wrong PDF; a local abbreviation must not disable a genuine reply.
    const requiredRatio = .15;
    const segmentRatio = exact[segmentIndex] / totals[segmentIndex];
    if (!matched.length || segmentRatio < requiredRatio) {
      warnings.push(`${segment.id}: подтверждено ${Math.round(segmentRatio * 100)}% текста, поэтому интерактивность отключена только для этой реплики`);
      return;
    }
    if (matched[0] <= previousEnd) matched = matched.filter((wordIndex) => wordIndex > previousEnd);
    if (!matched.length) { warnings.push(`${segment.id}: граница проходит внутри того же печатного слова, отдельная область не создана`); return; }
    const first = matched[0], last = matched.at(-1)!;
    previousEnd = last;
    const words = pdfWords.slice(first, last + 1);
    const lines = lineRects(words);
    blocks[segment.id] = { words, lines };
  });
  return { blocks, warnings };
}

function alignDiburimToPdf(pdfWords: WordRect[], comments: CommentaryLink[]) {
  if (!comments.length || !pdfWords.length) return {} as Record<string, LocatedBlock>;
  const blocks: Record<string, LocatedBlock> = {};
  const target=pdfWords.map((word)=>normalizeHebrew(word.word));
  comments.forEach((comment) => {
    const source=editionWords(comment.dibur).filter((word)=>!["גמ","מתני"].includes(word));
    if(!source.length)return;
    let best:number[]=[];
    for(let start=0;start<target.length;start++){
      if(!sameEditionWord(source[0],target[start]))continue;
      const matched=[start]; let cursor=start+1;
      for(let sourceIndex=1;sourceIndex<source.length;sourceIndex++){
        let found=-1;
        for(let candidate=cursor;candidate<Math.min(target.length,cursor+4);candidate++)if(sameEditionWord(source[sourceIndex],target[candidate])){found=candidate;break;}
        if(found<0)break;
        matched.push(found);cursor=found+1;
      }
      if(matched.length>best.length || (matched.length===best.length && matched.at(-1)!-matched[0]<best.at(-1)!-best[0]))best=matched;
    }
    if(!best.length || best.length/source.length<.58)return;
    const words=pdfWords.slice(best[0],best.at(-1)!+1);
    blocks[comment.ref]={words,lines:lineRects(words)};
  });
  return blocks;
}

// Display words such as מתני׳ / גמ׳ and a Mishnah's oversized opening word can
// use another font in the Vilna PDF. Add only nearby, text-confirmed candidates
// after the main continuous alignment has established the semantic block.
function addOpeningWords(blocks:Record<string,LocatedBlock>, candidates:WordRect[], segments:DafSegment[], zoom:number) {
  const result={...blocks};
  segments.forEach((segment) => {
    const block=result[segment.id];
    if(!block?.words.length) return;
    const openings=editionWords(segment.text).slice(0,2);
    const current=block.words.slice(0,4).map((word)=>normalizeHebrew(word.word));
    const additions:WordRect[]=[];
    let retainedWords=block.words;
    openings.forEach((opening) => {
      if(current.includes(opening)) return;
      let best:WordRect|undefined, bestDistance=Infinity;
      candidates.forEach((candidate) => {
        if(opening!==normalizeHebrew(candidate.word)) return;
        const distance=Math.min(...block.words.slice(0,5).map((word)=>Math.hypot(candidate.left-word.left,candidate.top-word.top)));
        if(distance<bestDistance){best=candidate;bestDistance=distance;}
      });
      if(best&&bestDistance<150*zoom)additions.push(best);
    });
    // On Vilna pages the first word of a Mishnah is sometimes a decorative,
    // oversized heading whose PDF glyph encoding cannot be decoded as Hebrew.
    // Its geometry is nevertheless reliable: it is the nearest large word
    // immediately above the first regular line in the central Gemara column.
    if(segment.kind==="Мишна"){
      const regularHeight=block.words.slice(0,8).reduce((sum,word)=>sum+word.height,0)/Math.min(8,block.words.length);
      const blockTop=Math.min(...block.words.slice(0,8).map((word)=>word.top));
      const oversized=candidates
        .filter((candidate)=>candidate.height>regularHeight*1.35&&candidate.top<blockTop&&blockTop-candidate.top<145*zoom)
        .sort((first,second)=>(blockTop-(first.top+first.height))-(blockTop-(second.top+second.height)))[0];
      if(oversized){
        additions.unshift(oversized);
        retainedWords=block.words.filter((word)=>word.top>=oversized.top+oversized.height*.9);
      }
    }
    if(additions.length){const words=[...additions,...retainedWords].filter((word,index,array)=>array.findIndex((other)=>other.left===word.left&&other.top===word.top&&other.word===word.word)===index);result[segment.id]={words,lines:lineRects(words)};}
  });
  return result;
}

function locateDiburInGemara(words: WordRect[], dibur: string) {
  const source = editionWords(dibur).filter((word) => !["גמ", "מתני"].includes(word));
  const target = words.map((word) => normalizeHebrew(word.word));
  let cursor = 0;
  const matchedIndexes: number[] = [];
  source.forEach((sourceWord) => {
    for (let index = cursor; index < target.length; index++) {
      if (target[index] === sourceWord || target[index].endsWith(sourceWord) || sourceWord.endsWith(target[index])) {
        matchedIndexes.push(index); cursor = index + 1; break;
      }
    }
  });
  if (!matchedIndexes.length || matchedIndexes.length / source.length < .5) return null;
  const locatedWords = words.slice(matchedIndexes[0], matchedIndexes.at(-1)! + 1);
  const lines = lineRects(locatedWords);
  return { words: locatedWords, lines };
}

export function PdfDafViewer({ zoom, selectedBlock, landingEdge = "start", onSelect, onBlockLocated, pdfUrl = "/bekhorot-2a.pdf", label = "Бехорот 2а", segments = [], commentary = [] }: {
  zoom: number; selectedBlock: string; onSelect: (blockId: string, word: string) => void; onBlockLocated: (blockId?: string) => void;
  landingEdge?: "start"|"end";
  pdfUrl?: string; label?: string; segments?: DafSegment[]; commentary?: CommentaryLink[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [size, setSize] = useState({ width: 644, height: 993 });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [alignmentWarning, setAlignmentWarning] = useState("");
  const [blocks, setBlocks] = useState<Record<string, LocatedBlock>>({});
  const [commentaryBlocks, setCommentaryBlocks] = useState<Record<string, LocatedBlock>>({});
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [pinnedComment, setPinnedComment] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function renderPdf() {
      try {
        setStatus("loading"); setErrorMessage(""); setAlignmentWarning("");
        const [pdfjsApi, response] = await Promise.all([loadPdfJs(), fetch(pdfUrl, { cache: "force-cache", credentials: "same-origin" })]);
        if (!response.ok) throw new Error(`PDF request failed: ${response.status}`);
        pdfjsApi.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js?v=3";
        const pdf = await pdfjsApi.getDocument({ data: new Uint8Array(await response.arrayBuffer()) }).promise as {
          getPage: (pageNumber: number) => Promise<{
            getViewport: (options: { scale: number }) => { width: number; height: number; transform: number[] };
            getTextContent: () => Promise<{ items: Array<Record<string, unknown>>; styles: Record<string, { fontFamily?: string }> }>;
            render: (options: Record<string, unknown>) => { promise: Promise<void>; cancel: () => void };
          }>;
        };
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: zoom });
        let textLayerError = "";
        const textContent = await page.getTextContent().catch(() => {textLayerError = "Не удалось прочитать текстовый слой PDF. Используйте выбор реплики Sefaria."; return {items:[] as Array<Record<string,unknown>>,styles:{}};});
        const items = textContent.items.filter((item): item is typeof item & { str: string; transform: number[]; width: number; height: number; fontName: string } => "str" in item && "fontName" in item);
        const [a, b, c, d, e, f] = viewport.transform;
        const toViewport = (x: number, y: number) => ({ x: a * x + c * y + e, y: b * x + d * y + f });
        const isOnPage = (item: typeof items[number]) => {
          const first = toViewport(item.transform[4], item.transform[5]);
          const second = toViewport(item.transform[4] + item.width, item.transform[5] + item.height);
          const top = Math.min(first.y, second.y), bottom = Math.max(first.y, second.y);
          return bottom > 0 && top < viewport.height;
        };
        const makeWords = (filter: (item: typeof items[number]) => boolean) => items
          .filter(filter)
          .flatMap((item) => {
            const p1 = toViewport(item.transform[4], item.transform[5]);
            const p2 = toViewport(item.transform[4] + item.width, item.transform[5] + item.height);
            const left = Math.min(p1.x, p2.x), top = Math.min(p1.y, p2.y), width = Math.abs(p2.x - p1.x), height = Math.abs(p2.y - p1.y);
            return Array.from(item.str.matchAll(/\S+/g)).map((match) => ({
              left: left + width * ((match.index ?? 0) / item.str.length), top,
              width: Math.max(2, width * (match[0].length / item.str.length)), height,
              word: decodeWord(match[0]), line: Math.round(item.transform[5] / 5),
            }));
          })
          .filter((word) => normalizeHebrew(word.word))
          .sort((first, second) => second.line - first.line || second.left - first.left);
        // The Vilna Gemara column is not rectangular: it widens and narrows around
        // Rashi and Tosafot. Identify its typeface first, then retain its real geometry.
        const gemaraFontScores = new Map<string, number>();
        items.forEach((item) => {
          if (!isOnPage(item) || item.height < 11.5) return;
          const hebrewLength = normalizeHebrew(decodeWord(item.str)).length;
          if (hebrewLength) gemaraFontScores.set(item.fontName, (gemaraFontScores.get(item.fontName) ?? 0) + hebrewLength);
        });
        const gemaraFont = [...gemaraFontScores].sort((first, second) => second[1] - first[1])[0]?.[0];

        const gemaraHeights = items
          .filter((item) => item.fontName === gemaraFont && isOnPage(item))
          .map((item) => item.height)
          .sort((first, second) => first - second);
        let gemaraHeight = gemaraHeights[Math.floor(gemaraHeights.length / 2)]||13.7;
        // Rank actual size groups against Sefaria, not the longest printed commentary.
        if(segments.length){const source=new Set(segments.flatMap(s=>editionWords(s.text)).filter(w=>w.length>=3));let best=-1;
         for(const height of new Set(items.filter(isOnPage).filter(i=>i.height>=10).map(i=>Math.round(i.height*10)/10))){
          const words=makeWords(i=>isOnPage(i)&&Math.abs(i.height-height)<.3).map(w=>normalizeHebrew(w.word));const matched=new Set(words.filter(w=>source.has(w)));const score=matched.size/(source.size||1)*matched.size/Math.max(words.length,1);
          if(score>best){best=score;gemaraHeight=height;}
         }
        }
        // A Vilna line can cross several embedded PDF font subsets when the
        // Gemara column widens or narrows around Rashi/Tosafot. Those subsets
        // have different fontName values but the same printed letter height.
        // Following only the most frequent font loses precisely the words at
        // such bends, so collect the complete printed Gemara size instead.
        const pdfWords = makeWords((item) => isOnPage(item) && Math.abs(item.height - gemaraHeight) <= .8);
        const openingCandidates = makeWords((item) => item.transform[4] > 55 && item.transform[4] < 550 && isOnPage(item) && item.height >= 10.5);
        const rashiWords = makeWords((item) => isOnPage(item));
        const tosafotWords = makeWords((item) => isOnPage(item));
        let locatedBlocks: Record<string, LocatedBlock> = {}, locatedCommentary: Record<string, LocatedBlock> = {}, mappingError = "", mappingNotice = "";
        try {
          const alignment = segments.length?alignSefariaToPdf(pdfWords, segments):{blocks:{},warnings:[]};
          locatedBlocks = addOpeningWords(alignment.blocks, openingCandidates, segments, zoom);
          mappingNotice = alignment.warnings.join(" · ");
          locatedCommentary = {
            ...alignDiburimToPdf(rashiWords, commentary.filter((comment) => comment.commentator === "Rashi")),
            ...alignDiburimToPdf(tosafotWords, commentary.filter((comment) => comment.commentator === "Tosafot")),
          };
        } catch (reason) {
          mappingError = reason instanceof Error ? reason.message : String(reason);
        }
        if (cancelled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
        setSize({ width: viewport.width, height: viewport.height }); setBlocks(locatedBlocks); setCommentaryBlocks(locatedCommentary);
        renderTaskRef.current?.cancel();
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas unavailable");
        const task = page.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
        renderTaskRef.current = task; await task.promise;
        if (!cancelled) { setStatus("ready"); setAlignmentWarning(textLayerError || mappingError || mappingNotice); if (!mappingError) { const available=Object.keys(locatedBlocks); onBlockLocated(locatedBlocks[selectedBlock] ? selectedBlock : (landingEdge==="end" ? available.at(-1) : available[0])); } }
      } catch (error) {
        if (!cancelled && (error as { name?: string }).name !== "RenderingCancelledException") {
          console.error("PDF rendering failed", error); setErrorMessage(error instanceof Error ? error.message : String(error)); setStatus("error");
        }
      }
    }
    renderPdf();
    return () => { cancelled = true; renderTaskRef.current?.cancel(); };
  }, [zoom, onBlockLocated, pdfUrl, segments, commentary, landingEdge]);

  const selected = blocks[selectedBlock];
  const preview = hoveredBlock && hoveredBlock !== selectedBlock ? blocks[hoveredBlock] : null;
  const linkedComments = commentary.filter((comment) => comment.base === selectedBlock);
  const activeComment = hoveredComment ?? pinnedComment;
  const activeCommentary = linkedComments.find((comment) => comment.ref === activeComment);
  const gemaraCue = activeCommentary && selected ? locateDiburInGemara(selected.words, activeCommentary.dibur) : null;
  const tractateLabel=label.replace(/\s+\d+[аб]$/,"");
  return <div className="pdfStage" style={{ width: size.width, height: size.height }}>
    <canvas ref={canvasRef} aria-label={`Оригинальный PDF, ${label}`} />
    {status === "loading" && <div className="pdfStatus">Загружаем оригинальный PDF…</div>}
    {status === "error" && <div className="pdfStatus error">Не удалось открыть PDF.<small>{errorMessage}</small><a href={pdfUrl}>Открыть оригинал</a></div>}
    {status === "ready" && alignmentWarning && <div className="alignmentWarning">{tractateLabel} · {Object.keys(blocks).length ? "Лист размечен частично: " : "Лист открыт, интерактивная разметка отключена: "}{alignmentWarning}</div>}
    {status === "ready" && <div className="pdfInteraction" aria-label="Интерактивный слой оригинального листа" data-active-comment={activeComment ?? ""} data-gemara-cue={gemaraCue ? "yes" : "no"}>
      {selected?.lines.map((rect, index) => <span key={`selected-${index}`} className="textHighlight selectedHighlight" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />)}
      {preview?.lines.map((rect, index) => <span key={`preview-${index}`} className="textHighlight hoverHighlight" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />)}
      {linkedComments.flatMap((comment) => (commentaryBlocks[comment.ref]?.lines ?? []).map((rect, index) => <span key={`${comment.ref}-${index}`} className={`textHighlight commentaryHighlight ${comment.commentator === "Rashi" ? "rashiPdfHighlight" : "tosafotPdfHighlight"}`} style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />))}
      {gemaraCue?.lines.map((rect, index) => <span key={`gemara-cue-${index}`} className="textHighlight gemaraCueHighlight" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />)}
      {linkedComments.flatMap((comment) => (commentaryBlocks[comment.ref]?.words ?? []).map((rect, index) => <button key={`comment-hit-${comment.ref}-${index}`} className="commentaryHit" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} onPointerEnter={() => setHoveredComment(comment.ref)} onPointerLeave={() => setHoveredComment(null)} onFocus={() => setHoveredComment(comment.ref)} onBlur={() => setHoveredComment(null)} onClick={() => setPinnedComment((current) => current === comment.ref ? null : comment.ref)} aria-label={`${comment.commentator === "Rashi" ? "Раши" : "Тосафот"}: ${comment.dibur}; показать место в Гемаре`} />))}
      {Object.entries(blocks).flatMap(([blockId, block]) => block.words.map((rect, index) => <button key={`${blockId}-${index}`} className="wordHit" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} onPointerEnter={() => setHoveredBlock(blockId)} onPointerLeave={() => setHoveredBlock(null)} onFocus={() => setHoveredBlock(blockId)} onBlur={() => setHoveredBlock(null)} onClick={() => blockId !== selectedBlock && onSelect(blockId, rect.word)} aria-label={`Слово ${rect.word}; реплика ${label} ${blockId}`} />))}
    </div>}
  </div>;
}
