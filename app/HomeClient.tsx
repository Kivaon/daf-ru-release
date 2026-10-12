"use client";

import {sourceComments} from "./sefariaLinks";
import PrintedCommentary from "./PrintedCommentary";
import PrintedLocation from "./PrintedLocation";
import {includeSourceComments} from "./includeSourceComments";
import { readModelResponse } from "./responseDiagnostics";
import { emptyDraft, importDraft, mergeDraft, missingFields } from "./batchModel";
import type { Unit } from "./batchModel";
import { articleForSelection, readArticleResponse } from "./articleSelection";
import BatchEditor from "./BatchEditor";
import {editorLocation} from "./translationMapModel";
import AboutProject from "./AboutProject";
import PrintPage from "./PrintPage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PdfDafViewer, DafSegment } from "./PdfDafViewer";
import { CommentaryLink } from "./bekhorot2aCommentary";
import { TRACTATES, tractateBySefaria } from "./talmudCatalog";

const EMPTY_SEGMENTS:DafSegment[]=[];
const EMPTY_COMMENTS:CommentaryLink[]=[];
const POSITION_KEY = "daf-ru-last-page";
const clean = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
const dibur = (value: string) => {
  const bold = value.match(/<b[^>]*>([\s\S]*?)<\/b>/i)?.[1];
  const source = clean(bold || value);
  return (source.split(/\s[-–—]\s/)[0] || source).replace(/:$/, "").trim();
};
const serviceMatch = (value:string) => value.match(/^\s*((?:מתני|גמ)[׳']?)\s*/);
const boldService = (value:string) => { const match=serviceMatch(value); return match ? <><strong>{match[1]}</strong>{" "}{value.slice(match[0].length)}</> : value; };
const boldDibur = (text:string, opening:string) => { const at=text.indexOf(opening); return at>=0 ? <>{text.slice(0,at)}<strong>{opening}</strong>{text.slice(at+opening.length)}</> : text; };
const boldTranslationService = (value:string) => { const match=value.match(/^\s*(Гемара|Мишна)([.:])?\s*/i); return match ? <><strong>{match[1]}{match[2]||"."}</strong>{" "}{value.slice(match[0].length)}</> : value; };
const boldTranslatedDibur = (value:string) => { const quoted=value.match(/^\s*[«"](.+?)[»"]\s*([—–\-:]?)\s*/); if(quoted)return <><strong>{quoted[1]}</strong>{quoted[2]?` ${quoted[2]} `:" "}{value.slice(quoted[0].length)}</>; const opening=value.match(/^\s*(.+?)\s+([—–-])\s+/); return opening ? <><strong>{opening[1]}</strong>{` ${opening[2]} `}{value.slice(opening[0].length)}</> : value; };

type GeneratedComment = { ref:string; translation:string; explanation:string };
type GeneratedPart = { ref:string; translation:string };
type GeneratedPage = { ref:string; rashi:GeneratedComment[]; tosafot:GeneratedComment[] };
type GeneratedArticle = {
  tractate:string;
  ref:string;
  title:string;
  translation:string;
  explanation:string;
  rashi:GeneratedComment[];
  tosafot:GeneratedComment[];
  generatedAt:string;
  provider?:string;
  updatedAt?:string;
  unitRef?:string;
  parts?:GeneratedPart[];
  pages?:GeneratedPage[];
};

type PageBundle = { pageKey:string; segments:DafSegment[]; comments:CommentaryLink[]; davidsonHe:string[]; davidsonEn:string[] };
type BoundaryState = { previous?:PageBundle; next?:PageBundle; joinsPrevious:boolean; joinsNext:boolean };
const pageBefore = (daf:number, side:"a"|"b") => side === "b" ? `${daf}a` : daf > 2 ? `${daf-1}b` : null;
const pageAfter = (daf:number, side:"a"|"b", lastDaf:number, lastSide:"a"|"b") => {
  if(side === "a") return daf === lastDaf && lastSide === "a" ? null : `${daf}b`;
  return daf < lastDaf ? `${daf+1}a` : null;
};
const sentenceEnds = (value:string) => /[.!?׃։][\s"'׳״’”)]*$/.test(clean(value));
const beginsLowercase = (value:string) => /^[^A-Za-z]*[a-z]/.test(clean(value));
const boundaryContinues = (left:PageBundle, right:PageBundle) => {
  const leftHe=left.davidsonHe.at(-1)||"", rightHe=right.davidsonHe[0]||"";
  const leftEn=left.davidsonEn.at(-1)||"", rightEn=right.davidsonEn[0]||"";
  return Boolean(leftHe && rightHe && leftEn && rightEn && !sentenceEnds(leftHe) && !sentenceEnds(leftEn) && beginsLowercase(rightEn));
};

type SiteTool = {
  name:string;
  description:string;
  inputSchema:Record<string, unknown>;
  annotations?:Record<string, boolean>;
  execute:(input:Record<string, unknown>) => unknown | Promise<unknown>;
};

type ModelContext = { registerTool:(tool:SiteTool, options?:{signal?:AbortSignal})=>Promise<void> };
type UserRole = "guest"|"reader"|"editor"|"admin";

export default function HomeClient({user,signInHref,signOutHref}:{user:{name:string;email:string;role:UserRole}|null;signInHref:string;signOutHref:string}) {
  const [tractateTitle, setTractateTitle] = useState("Bekhorot");
  const [daf, setDaf] = useState(2);
  const [side, setSide] = useState<"a" | "b">("a");
  const [restored, setRestored] = useState(false);
  const [prepareTarget,setPrepareTarget]=useState('');
  const [segments, setSegments] = useState<DafSegment[]>([]);
  const [comments, setComments] = useState<CommentaryLink[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("2a:3");
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [blockLocated, setBlockLocated] = useState(false);
  const [zoom, setZoom] = useState(1.5);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [picked, setPicked] = useState<{ text:string; x:number; y:number } | null>(null);
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [articleLoad, setArticleLoad] = useState<{tractate:string;ref:string;status:"ready"|"error"}|null>(null);
  const [articleRetry, setArticleRetry] = useState(0);
  const [siteToolsAvailable, setSiteToolsAvailable] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [draft, setDraft] = useState<GeneratedArticle | null>(null);
  const [editorMessage, setEditorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [landingEdge, setLandingEdge] = useState<"start"|"end">("start");
  const [boundaries, setBoundaries] = useState<BoundaryState>({joinsPrevious:false,joinsNext:false});
  const canEditArticles=user?.role==="editor"||user?.role==="admin";

  const tractate = useMemo(() => tractateBySefaria(tractateTitle), [tractateTitle]);
  const pageKey = `${daf}${side}`;
  const label = `${tractate.ru} ${daf}${side === "a" ? "а" : "б"}`;
  const pdfUrl = `/api/daf-pdf?masechta=${tractate.shas}&daf=${daf}&amud=${side}`;
  const isFirst = daf === 2 && side === "a";
  const isLast = daf === tractate.lastDaf && side === tractate.lastSide;

  useEffect(() => {
    try {
      const target=editorLocation(window.location.search);
      if(target){setTractateTitle(target.tractate);setDaf(target.daf);setSide(target.side);setSelectedBlock(`${target.page}:1`);if(target.prepare)setPrepareTarget(`${target.tractate}|${target.page}`);}
      const saved = target?null:JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
      if (saved && TRACTATES.some((item) => item.sefaria === saved.tractate)) {
        const item = tractateBySefaria(saved.tractate);
        if (Number.isInteger(saved.daf) && saved.daf >= 2 && saved.daf <= item.lastDaf && (saved.side === "a" || saved.side === "b")) {
          setTractateTitle(saved.tractate); setDaf(saved.daf); setSide(saved.daf === item.lastDaf && item.lastSide === "a" ? "a" : saved.side);
        }
      }
      setWords(JSON.parse(localStorage.getItem("havruta-dictionary") || "[]"));
    } catch { /* ignore invalid local state */ }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem(POSITION_KEY, JSON.stringify({ tractate:tractateTitle, daf, side, savedAt:new Date().toISOString() }));
  }, [restored, tractateTitle, daf, side]);

  useEffect(() => {
    if (!restored) return;
    const controller = new AbortController();
    (async () => {
      setStatus("loading"); setError(""); setSegments([]); setSelectedBlock(""); setBlockLocated(false); setComments([]); setSelectedWord(null); setBoundaries({joinsPrevious:false,joinsNext:false});
      try {
        const loadBundle = async (key:string, includeLinks=true):Promise<PageBundle> => {
          const ref = `${tractate.sefaria}.${key}`;
          const [textResponse,davidsonResponse,linksResponse]=await Promise.all([
            fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}/he/Wikisource_Talmud_Bavli?context=0&commentary=0`,{signal:controller.signal}),
            fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0`,{signal:controller.signal}),
            includeLinks?fetch(`https://www.sefaria.org/api/links/${encodeURIComponent(ref)}?with_text=1`,{signal:controller.signal}):Promise.resolve(null),
          ]);
          if(!textResponse.ok)throw new Error("Sefaria не вернула текст листа");
          const data=await textResponse.json() as {he?:string[];error?:string};
          if(data.error||!Array.isArray(data.he)||!data.he.every(v=>typeof v==="string"))throw new Error("Sefaria не вернула полный текст листа");
          const davidson=davidsonResponse.ok?await davidsonResponse.json() as {he?:string[];text?:string[]}:{he:[],text:[]};
          const pageSegments=(data.he||[]).map((text,index)=>({id:`${key}:${index+1}`,kind:/^(מתני|מַתְנִי)/.test(clean(text))?"Мишна":"Гемара",text:clean(text)})).filter((item)=>item.text);
          let pageComments:CommentaryLink[]=[];
          if(includeLinks){if(!linksResponse?.ok)throw new Error("Не удалось получить комментарии Sefaria. Повторите загрузку.");pageComments=sourceComments(await linksResponse.json(),tractate.sefaria,pageSegments.map(p=>p.id));}
          return{pageKey:key,segments:pageSegments,comments:pageComments,davidsonHe:davidson.he||[],davidsonEn:davidson.text||[]};
        };
        const previousKey=pageBefore(daf,side),nextKey=pageAfter(daf,side,tractate.lastDaf,tractate.lastSide);
        const [current,previous,next]=await Promise.all([loadBundle(pageKey),previousKey?loadBundle(previousKey).catch(()=>undefined):Promise.resolve(undefined),nextKey?loadBundle(nextKey).catch(()=>undefined):Promise.resolve(undefined)]);
        const nextSegments=current.segments,nextComments=current.comments;

        if (controller.signal.aborted) return;
        setSegments(nextSegments); setComments(nextComments);
        setBoundaries({previous,next,joinsPrevious:Boolean(previous&&boundaryContinues(previous,current)),joinsNext:Boolean(next&&boundaryContinues(current,next))});
        const preferred = landingEdge === "end" ? nextSegments.at(-1)?.id : nextSegments[0]?.id;
        const requested=new URLSearchParams(window.location.search).get("ref");
        setSelectedBlock(nextSegments.some(s=>s.id===requested)?requested!:preferred||"");
        setStatus("ready");
      } catch (reason) {
        if (!controller.signal.aborted) { setStatus("error"); setError(reason instanceof Error ? reason.message : String(reason)); }
      }
    })();
    return () => controller.abort();
  }, [restored, tractate, pageKey, landingEdge]);

  const move = (direction:-1|1) => {
    if (direction < 0) { if (isFirst) return; setLandingEdge("end"); if (side === "b") setSide("a"); else { setDaf((value) => value - 1); setSide("b"); } }
    else { if (isLast) return; setLandingEdge("start"); if (side === "a") setSide("b"); else { setDaf((value) => value + 1); setSide("a"); } }
  };
  const selectWord = useCallback((blockId:string, word:string) => { setPicked(null); setSelectedBlock(blockId); setSelectedWord(word); }, []);
  const located = useCallback((locatedBlock?:string) => { setBlockLocated(true); }, []);
  const selected = useMemo(() => segments.find((item) => item.id === selectedBlock), [segments, selectedBlock]);
  const linked = useMemo(() => comments.filter((item) => item.base === selectedBlock), [comments, selectedBlock]);
  const rashi = useMemo(() => linked.filter((item) => item.commentator === "Rashi"), [linked]);
  const tosafot = useMemo(() => linked.filter((item) => item.commentator === "Tosafot"), [linked]);
  const unitSegments = useMemo(() => {
    if(!selected) return [];
    const first=segments[0]?.id===selected.id, last=segments.at(-1)?.id===selected.id;
    if(first && boundaries.joinsPrevious && boundaries.previous?.segments.length) return [boundaries.previous.segments.at(-1)!,selected];
    if(last && boundaries.joinsNext && boundaries.next?.segments.length) return [selected,boundaries.next.segments[0]];
    return [selected];
  },[selected,segments,boundaries]);
  const isSpanningUnit=unitSegments.length===2;
  const unitRef=isSpanningUnit?`${tractate.sefaria} ${unitSegments[0].id}-${unitSegments[1].id}`:undefined;
  const commentsForRef = useCallback((ref:string) => {
    const key=ref.split(":")[0];
    const source=key===pageKey?comments:key===boundaries.previous?.pageKey?boundaries.previous.comments:key===boundaries.next?.pageKey?boundaries.next.comments:[];
    const linkedToPart=source.filter((item)=>item.base===ref);
    return {rashi:linkedToPart.filter((item)=>item.commentator==="Rashi"),tosafot:linkedToPart.filter((item)=>item.commentator==="Tosafot")};
  },[pageKey,comments,boundaries]);
  const unitPages = useMemo(() => unitSegments.map((part)=>({ref:part.id,...commentsForRef(part.id)})),[unitSegments,commentsForRef]);
  const savedArticle = tractate.sefaria === "Bekhorot" && selectedBlock === "2a:3";
  const activeGeneratedArticle = articleForSelection(generatedArticle, tractate.sefaria, selectedBlock);
  const currentArticleLoad = articleForSelection(articleLoad, tractate.sefaria, selectedBlock);
  const pageOptions = Array.from({length:tractate.lastDaf-1},(_,i)=>i+2).flatMap((number) => ["a","b"].filter((amud) => !(number===tractate.lastDaf&&tractate.lastSide==="a"&&amud==="b")).map((amud) => `${number}${amud}`));
  const nearbyStart = Math.max(2, Math.min(daf <= 3 ? 2 : daf - 1, Math.max(2, tractate.lastDaf - 2)));
  const nearbyPages = [nearbyStart,nearbyStart+1,nearbyStart+2].filter((number)=>number<=tractate.lastDaf).flatMap((number)=>["a","b"].filter((amud)=>!(number===tractate.lastDaf&&tractate.lastSide==="a"&&amud==="b")).map((amud)=>`${number}${amud}`));
  const choosePage = (value:string) => { setLandingEdge("start"); setDaf(Number(value.slice(0,-1))); setSide(value.endsWith("b")?"b":"a"); };
  const openUnitPart = (ref:string) => { const key=ref.split(":")[0]; setLandingEdge(key===boundaries.previous?.pageKey?"end":"start");setDaf(Number(key.slice(0,-1)));setSide(key.endsWith("b")?"b":"a"); };
  const selectedIndex=segments.findIndex((item)=>item.id===selectedBlock);
  const previousReply=selectedIndex>0?segments[selectedIndex-1]?.id:boundaries.previous?.segments.at(-1)?.id;
  const nextReply=selectedIndex>=0&&selectedIndex<segments.length-1?segments[selectedIndex+1]?.id:boundaries.next?.segments[0]?.id;
  const openReply=(ref:string|undefined,direction:"previous"|"next")=>{if(!ref)return;const key=ref.split(":")[0];if(key===pageKey){setSelectedBlock(ref);setSelectedWord(null);return;}setLandingEdge(direction==="previous"?"end":"start");setDaf(Number(key.slice(0,-1)));setSide(key.endsWith("b")?"b":"a");};

  const captureSelection = () => { const selection=window.getSelection(), text=selection?.toString().trim() || ""; if(selection && !selection.isCollapsed && text && text.length<80 && /[\u0590-\u05FF]/.test(text)){ const rect=selection.rangeCount?selection.getRangeAt(0).getBoundingClientRect():null; setPicked({text,x:Math.min(window.innerWidth-170,rect?.left||40),y:(rect?.bottom||90)+8}); } else setPicked(null); };
  const saveWord = () => { if(!picked)return; const next=words.includes(picked.text)?words:[picked.text,...words]; setWords(next); localStorage.setItem("havruta-dictionary",JSON.stringify(next)); setPicked(null); };
  useEffect(() => {
    if(!selected || status!=="ready") return;
    const controller=new AbortController();
    const identity={tractate:tractate.sefaria,ref:selectedBlock};
    setGeneratedArticle(null);
    setArticleLoad(null);
    fetch(`/api/articles?tractate=${encodeURIComponent(identity.tractate)}&ref=${encodeURIComponent(identity.ref)}`,{signal:controller.signal})
      .then((response)=>readArticleResponse<GeneratedArticle>(response,identity.ref))
      .then((article)=>{
        if(controller.signal.aborted)return;
        setGeneratedArticle(article?{...article,...identity,generatedAt:article.updatedAt||article.generatedAt}:null);
        setArticleLoad({...identity,status:"ready"});
      })
      .catch(()=>{if(!controller.signal.aborted)setArticleLoad({...identity,status:"error"});});
    return ()=>controller.abort();
  },[selected,selectedBlock,tractate.sefaria,status,articleRetry]);

  const emptyComment = (item:CommentaryLink):GeneratedComment => ({ref:item.ref,translation:"",explanation:""});
  const promptForAI = () => {
    if(!selected)return "";
    const instruction="Ты готовишь учебную статью Daf-Ru на русском языке. Используй только переданные оригиналы, не изменяй и не дополняй их. Дай точный, близкий к тексту перевод и короткое ясное объяснение. Для каждого комментария верни отдельный перевод и объяснение. Ответь ТОЛЬКО JSON без markdown.";
    if(!isSpanningUnit)return `${instruction}\nСхема: {"title":"...","translation":"...","explanation":"...","rashi":[{"ref":"...","translation":"...","explanation":"..."}],"tosafot":[{"ref":"...","translation":"...","explanation":"..."}]}\n\nТрактат: ${tractate.ru}\nРеплика: ${selectedBlock}\nГемара: ${selected.text}\nРаши: ${JSON.stringify(rashi.map(x=>({ref:x.ref,original:x.text})))}\nТосафот: ${JSON.stringify(tosafot.map(x=>({ref:x.ref,original:x.text})))}`;
    const sourcePages=unitPages.map((entry)=>({ref:entry.ref,rashi:entry.rashi.map(x=>({ref:x.ref,original:x.text})),tosafot:entry.tosafot.map(x=>({ref:x.ref,original:x.text}))}));
    return `${instruction}\nЭто одна реплика, физически рассечённая границей двух листов. Переведи её как единое целое, но верни отдельный перевод каждой части. Объяснение общее. Комментарии привязаны к соответствующей части Гемары независимо от того, на каком печатном листе они расположены.\nСхема: {"title":"...","parts":[{"ref":"${unitSegments[0].id}","translation":"..."},{"ref":"${unitSegments[1].id}","translation":"..."}],"explanation":"...","pages":[{"ref":"${unitSegments[0].id}","rashi":[],"tosafot":[]},{"ref":"${unitSegments[1].id}","rashi":[],"tosafot":[]}]}\n\nТрактат: ${tractate.ru}\nСоставная реплика: ${unitRef}\nЧасти Гемары: ${JSON.stringify(unitSegments.map(x=>({ref:x.id,original:x.text})))}\nКомментарии по страницам: ${JSON.stringify(sourcePages)}`;
  };
  const openEditor = () => {
    if(!canEditArticles || currentArticleLoad?.status!=="ready")return;
    const fresh:GeneratedArticle={tractate:tractate.sefaria,ref:selectedBlock,title:"",translation:"",explanation:"",rashi:rashi.map(emptyComment),tosafot:tosafot.map(emptyComment),generatedAt:new Date().toISOString(),provider:"ChatGPT"};
    if(isSpanningUnit){fresh.unitRef=unitRef;fresh.parts=unitSegments.map((part)=>({ref:part.id,translation:""}));fresh.pages=unitPages.map((entry)=>({ref:entry.ref,rashi:entry.rashi.map(emptyComment),tosafot:entry.tosafot.map(emptyComment)}));}
    const previous=activeGeneratedArticle;
    setDraft(previous ? {...previous,rashi:includeSourceComments(previous.rashi,fresh.rashi),tosafot:includeSourceComments(previous.tosafot,fresh.tosafot),...(fresh.pages?{pages:fresh.pages.map(page=>{const old=previous.pages?.find(p=>p.ref===page.ref);return {...page,rashi:includeSourceComments(old?.rashi||[],page.rashi),tosafot:includeSourceComments(old?.tosafot||[],page.tosafot)};})}:{})} : fresh);setImportText("");setEditorMessage("");setEditorOpen(true);
  };
  const copyPrompt = async () => { try { await navigator.clipboard.writeText(promptForAI()); setCopied(true);setEditorMessage("");window.setTimeout(()=>setCopied(false),1800); } catch { setEditorMessage("Браузер не разрешил копирование. Выделите задание вручную."); } };
  const parseImport = (text=importText) => { if(!draft)return;try {
    const response=readModelResponse(text);
    if(response.recoveredText)setImportText(response.recoveredText);
    const unit:Unit={id:unitRef||selectedBlock,boundary:isSpanningUnit,parts:unitSegments.map(part=>{const comments=unitPages.find(p=>p.ref===part.id);return {ref:part.id,original:part.text,rashi:(comments?.rashi||[]).map(c=>({ref:c.ref,original:c.text})),tosafot:(comments?.tosafot||[]).map(c=>({ref:c.ref,original:c.text}))};})};
    const previous=mergeDraft(emptyDraft(unit),{title:draft.title,explanation:draft.explanation,parts:draft.parts||[{ref:draft.ref,translation:draft.translation}],pages:draft.pages||[{ref:draft.ref,rashi:draft.rashi,tosafot:draft.tosafot}]});
    const imported=importDraft(unit,response.value,previous),current=imported.pages.find(p=>p.ref===draft.ref)!;
    const keep=(next:GeneratedComment[],old:GeneratedComment[])=>[...next,...old.filter(c=>!next.some(n=>n.ref===c.ref))];
    const pages=imported.pages.map(p=>{const old=draft.pages?.find(x=>x.ref===p.ref);return {...p,rashi:keep(p.rashi,old?.rashi||[]),tosafot:keep(p.tosafot,old?.tosafot||[])};});
    setDraft({...draft,title:imported.title,explanation:imported.explanation,translation:imported.parts.map(p=>p.translation).join(' '),...(isSpanningUnit?{parts:imported.parts,pages}:{}),rashi:keep(current.rashi,draft.rashi),tosafot:keep(current.tosafot,draft.tosafot)});
    const missing=missingFields(imported);setEditorMessage((response.suffix?`Закрывающие скобки восстановлены: ${response.suffix}. `:'')+'Ответ разобран. Проверьте материал.'+(missing.length?` Не заполнено: ${missing.join('; ')}.`:''));
  } catch(reason) {setEditorMessage(reason instanceof Error?reason.message:'Не удалось разобрать ответ.');} };

  const saveArticle = async () => { if(!draft)return; setSaving(true);setEditorMessage(""); try { const response=await fetch("/api/articles",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...draft,tractate:draft.tractate,ref:draft.ref})}); const data=await response.json() as {error?:string;article:GeneratedArticle}; if(!response.ok)throw new Error(data.error||"Ошибка сохранения"); setGeneratedArticle({...data.article,tractate:draft.tractate,generatedAt:data.article.updatedAt||draft.generatedAt});setEditorOpen(false); } catch(reason){setEditorMessage(reason instanceof Error?reason.message:String(reason));} finally{setSaving(false);} };
  const openUsers=()=>{window.location.href="/admin";};
  useEffect(() => {
    if (!selected || status!=="ready" || !canEditArticles) return;
    const context = (document as Document & { modelContext?:ModelContext }).modelContext;
    if (typeof context?.registerTool !== "function") { setSiteToolsAvailable(false); return; }
    setSiteToolsAvailable(true);
    const controller = new AbortController();
    const register = async () => {
      await context.registerTool({
        name:"get_selected_talmud_fragment",
        description:"Получить выбранную сейчас реплику Талмуда и связанные с ней оригинальные комментарии Раши и Тосафот из проверенного корпуса Sefaria. Используйте перед созданием русской учебной статьи.",
        inputSchema:{type:"object",properties:{},additionalProperties:false},
        annotations:{readOnlyHint:true},
        execute:async () => ({
          task:"Создайте точный русский перевод и краткое учебное объяснение выбранной реплики. Затем обязательно вызовите show_generated_talmud_article, чтобы показать результат на странице. Не переписывайте и не исправляйте оригиналы: они будут показаны сайтом только из корпуса.",
          tractate:tractate.ru,
          sefariaTractate:tractate.sefaria,
          ref:selectedBlock,
          kind:selected.kind,
          original:selected.text,
          unitRef,
          parts:unitSegments.map((part)=>({ref:part.id,original:part.text})),
          pages:unitPages.map((page)=>({ref:page.ref,rashi:page.rashi.map((item)=>({ref:item.ref,original:item.text})),tosafot:page.tosafot.map((item)=>({ref:item.ref,original:item.text}))})),
          rashi:rashi.map((item)=>({ref:item.ref,original:item.text})),
          tosafot:tosafot.map((item)=>({ref:item.ref,original:item.text})),
          outputRules:{language:"ru",translation:"точный, близкий к оригиналу",explanation:"краткое и ясное",originals:"никогда не генерировать"},
        }),
      }, {signal:controller.signal});
      await context.registerTool({
        name:"show_generated_talmud_article",
        description:isSpanningUnit?`Показать в Daf-Ru единый разбор составной реплики ${unitRef}, разделив перевод строго на части ${unitSegments.map(x=>x.id).join(" и ")}.`:`Показать в Daf-Ru готовые русский перевод и объяснение только для текущей реплики ${selectedBlock}. Оригиналы не принимаются: страница сохраняет оригиналы Sefaria.`,
        inputSchema:isSpanningUnit?{
          type:"object",
          properties:{
            ref:{type:"string",const:selectedBlock},
            title:{type:"string"},
            parts:{type:"array",items:{type:"object",properties:{ref:{type:"string"},translation:{type:"string"}},required:["ref","translation"],additionalProperties:false}},
            explanation:{type:"string"},
            pages:{type:"array",items:{type:"object",properties:{ref:{type:"string"},rashi:{type:"array",items:{type:"object",properties:{ref:{type:"string"},translation:{type:"string"},explanation:{type:"string"}},required:["ref","translation","explanation"],additionalProperties:false}},tosafot:{type:"array",items:{type:"object",properties:{ref:{type:"string"},translation:{type:"string"},explanation:{type:"string"}},required:["ref","translation","explanation"],additionalProperties:false}}},required:["ref","rashi","tosafot"],additionalProperties:false}},
          },
          required:["ref","title","parts","explanation","pages"],additionalProperties:false,
        }:{
          type:"object",
          properties:{
            ref:{type:"string",const:selectedBlock,description:"Точный ref текущей реплики"},
            title:{type:"string",description:"Короткий русский заголовок"},
            translation:{type:"string",description:"Точный русский перевод реплики"},
            explanation:{type:"string",description:"Краткое ясное объяснение"},
            rashi:{type:"array",items:{type:"object",properties:{ref:{type:"string"},translation:{type:"string"},explanation:{type:"string"}},required:["ref","translation","explanation"],additionalProperties:false}},
            tosafot:{type:"array",items:{type:"object",properties:{ref:{type:"string"},translation:{type:"string"},explanation:{type:"string"}},required:["ref","translation","explanation"],additionalProperties:false}},
          },
          required:["ref","title","translation","explanation","rashi","tosafot"],
          additionalProperties:false,
        },
        annotations:{readOnlyHint:false,idempotentHint:true},
        execute:async (input) => {
          if (input.ref !== selectedBlock) throw new Error(`Ожидалась реплика ${selectedBlock}`);
          const toComments = (value:unknown, allowed:CommentaryLink[]) => Array.isArray(value) ? value.flatMap((entry) => {
            if (!entry || typeof entry !== "object") return [];
            const item = entry as Record<string, unknown>;
            const ref = String(item.ref || "");
            if (!allowed.some((comment)=>comment.ref===ref)) return [];
            return [{ref,translation:String(item.translation || ""),explanation:String(item.explanation || "")}];
          }) : [];
          if(isSpanningUnit){
            const receivedParts=Array.isArray(input.parts)?input.parts as GeneratedPart[]:[];
            const receivedPages=Array.isArray(input.pages)?input.pages as GeneratedPage[]:[];
            if(unitSegments.some((part)=>!receivedParts.some((item)=>item.ref===part.id)))throw new Error("AI должен вернуть отдельный перевод каждой части составной реплики");
            const currentPage=receivedPages.find((page)=>page.ref===selectedBlock);
            const article:GeneratedArticle={tractate:tractate.sefaria,ref:selectedBlock,title:String(input.title||"Разбор реплики"),translation:receivedParts.map(x=>x.translation).join(" "),explanation:String(input.explanation||""),unitRef,parts:receivedParts,pages:receivedPages,rashi:currentPage?.rashi||[],tosafot:currentPage?.tosafot||[],generatedAt:new Date().toISOString()};
            setGeneratedArticle(article);
            return {ok:true,shown:true,ref:selectedBlock,unitRef,message:"Составная статья показана. Перевод разделён по физической границе двух листов."};
          }
          const article:GeneratedArticle = {
            tractate:tractate.sefaria,
            ref:selectedBlock,
            title:String(input.title || "Разбор реплики"),
            translation:String(input.translation || ""),
            explanation:String(input.explanation || ""),
            rashi:toComments(input.rashi,rashi),
            tosafot:toComments(input.tosafot,tosafot),
            generatedAt:new Date().toISOString(),
          };
          setGeneratedArticle(article);
          return {ok:true,shown:true,ref:selectedBlock,message:"Статья показана справа в Daf-Ru. Оригиналы оставлены без изменений."};
        },
      }, {signal:controller.signal});
    };
    register().catch(() => setSiteToolsAvailable(false));
    return () => controller.abort();
  }, [blockLocated, selected, selectedBlock, tractate, rashi, tosafot, isSpanningUnit, unitRef, unitSegments, unitPages, canEditArticles]);

  return <main className={canEditArticles?"editorMode":"readerMode"}>
    <header className="topbar"><div className="brand"><span className="brandMark">דף</span><span>Daf-Ru</span></div><div className="account">{user?<><span title={user.email}>{user.name}</span>{user.role==="admin"&&<button className="iconButton" onClick={openUsers}>Пользователи</button>}<a className="accountLink" href={signOutHref} target="_top">Выйти</a></>:<a className="signInButton" href={signInHref} target="_top">Войти</a>}<button className="iconButton" onClick={()=>setDictionaryOpen(true)} aria-label="Открыть словарь">⌘ <span>Словарь</span>{words.length>0&&<b>{words.length}</b>}</button>{canEditArticles&&<a className="mapNavLink" href="/translation-map">Карта перевода</a>}<AboutProject /></div></header>
    <section className="workspace"><aside className="sourcePane dafPane" onPointerDown={()=>setPicked(null)}>
      <nav className="dafNavigation compactNavigation" aria-label="Навигация по Талмуду"><button disabled={isFirst} onClick={()=>move(-1)} aria-label="Предыдущая страница">←</button><label><select value={tractateTitle} aria-label="Трактат" onChange={(e)=>{setLandingEdge("start");setTractateTitle(e.target.value);setDaf(2);setSide("a");}}>{TRACTATES.map((item)=><option key={item.sefaria} value={item.sefaria}>{item.ru}</option>)}</select></label><label><select value={pageKey} aria-label="Страница" onChange={(e)=>choosePage(e.target.value)}>{pageOptions.map((value)=><option key={value} value={value}>{value.replace("a","а").replace("b","б")}</option>)}</select></label><button disabled={isLast} onClick={()=>move(1)} aria-label="Следующая страница">→</button><div className="zoomControls"><button onClick={()=>setZoom(v=>Math.max(.6,v-.15))} aria-label="Уменьшить">−</button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(v=>Math.min(1.8,v+.15))} aria-label="Увеличить">+</button></div><a className="originalPdfPrint" href={pdfUrl} target="_blank" rel="noopener noreferrer" aria-label="Открыть PDF оригинала страницы для печати" title="Печать оригинала страницы (PDF)"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H3v-8h18v8h-3M6 14h12v7H6z"/><path d="M17 11h1"/></svg><span>PDF</span></a></nav>
      <div className="dafViewport"><PdfDafViewer zoom={zoom} selectedBlock={selectedBlock} landingEdge={landingEdge} onSelect={selectWord} onBlockLocated={located} pdfUrl={pdfUrl} label={label} segments={status==="ready"?segments:EMPTY_SEGMENTS} commentary={status==="ready"?comments:EMPTY_COMMENTS}/></div>
      <div className="pageGuide compactGuide"><span>Лист: Shas.org / HebrewBooks · текст и связи: Sefaria</span></div>
    </aside><article className="studyPane" onMouseUp={captureSelection}>
      <div className="studyNavigation"><div><span>{tractate.ru}</span><b>{daf}{side==="a"?"а":"б"}</b>{canEditArticles&&<BatchEditor key={`batch-${tractate.sefaria}-${pageKey}`} tractate={tractate.sefaria} page={pageKey} label={label} autoOpen={prepareTarget===`${tractate.sefaria}|${pageKey}`} ready={status==="ready"&&segments.length>0} onSaved={()=>setArticleRetry(value=>value+1)}/>}<PrintPage key={`${tractate.sefaria}-${pageKey}`} tractate={tractate.sefaria} label={label} segments={segments} context={[...(boundaries.previous?.segments||[]),...segments,...(boundaries.next?.segments||[])]} comments={[...(boundaries.previous?.comments||[]),...comments,...(boundaries.next?.comments||[])]} ready={status==="ready"} /></div><nav aria-label="Соседние страницы">{nearbyPages.map((value)=><button key={value} className={value===pageKey?"active":""} disabled={value===pageKey} onClick={()=>choosePage(value)}>{value.replace("a","а").replace("b","б")}</button>)}</nav></div>
      <PrintedCommentary tractate={tractate.sefaria} page={pageKey}/>{status==="ready"&&segments.length>0&&<label className="replySelector">Реплика Sefaria <select aria-label="Реплика Sefaria" value={selectedBlock} onChange={e=>setSelectedBlock(e.target.value)}>{segments.map(s=><option key={s.id} value={s.id}>{s.id}</option>)}</select></label>}
      <nav className="replyNavigation" aria-label="Соседние реплики"><button disabled={!previousReply} onClick={()=>openReply(previousReply,"previous")}>← <span>Предыдущая реплика</span><b>{previousReply||""}</b></button><button disabled={!nextReply} onClick={()=>openReply(nextReply,"next")}><span>Следующая реплика</span><b>{nextReply||""}</b> →</button></nav>
      {status!=="ready"?<div className="studyWaiting"><span>{label}</span><h2>Получаем текст и комментарии Sefaria…</h2><p>{error||"PDF доступен независимо от загрузки текста. Геометрия не влияет на состав материалов."}</p></div>:!selected?<div className="analysisCard"><h2>На этой стороне нет реплик Гемары</h2><p>В выбранном источнике Sefaria текст Гемары отсутствует. Оригинальный PDF доступен слева; найденные продолжения комментариев показаны отдельно.</p></div>:<>
      {currentArticleLoad?.status==="error"?<div className="articleLoadNotice" role="alert">Не удалось загрузить сохранённый разбор. <button onClick={()=>setArticleRetry(value=>value+1)}>Повторить загрузку</button></div>:!currentArticleLoad&&<p role="status">Загружаем сохранённый разбор…</p>}
      <section className="analysisCard gemaraCard"><div className="cardTitle"><span>{savedArticle?"01":"•"}</span><div><h2>{activeGeneratedArticle?.title || (savedArticle?"Почему необходимы оба случая?":currentArticleLoad?.status==="ready"?"Разбор пока не сохранён":"Разбор")}</h2></div></div><div className={`spanningOriginal ${isSpanningUnit?"isSpanning":""}`}>{unitSegments.map((part)=><div key={part.id} className={`hebrew spanningPart ${part.id===selectedBlock?"active":"inactive"}`} lang="he" dir="rtl"><small>{part.id===selectedBlock?"НА ЭТОМ ЛИСТЕ":part.id.split(":")[0]===boundaries.previous?.pageKey?"ПРОШЛЫЙ ЛИСТ":"СЛЕДУЮЩИЙ ЛИСТ"}</small><span>{boldService(part.text)}</span>{part.id!==selectedBlock&&<button type="button" className="unitPartNavigation" lang="ru" dir="ltr" onClick={()=>openUnitPart(part.id)}>Перейти к листу {part.id.split(":")[0].replace("a","а").replace("b","б")}</button>}</div>)}</div>{activeGeneratedArticle?<><div className="rule"/><h3>Точный перевод</h3>{activeGeneratedArticle.parts?.length?<div className="spanningTranslation">{activeGeneratedArticle.parts.map((part)=><div key={part.ref} className={`translationPart ${part.ref===selectedBlock?"active":"inactive"}`}><small>{part.ref}</small><span>{boldTranslationService(part.translation)}</span>{part.ref!==selectedBlock&&<button type="button" className="unitPartNavigation" onClick={()=>openUnitPart(part.ref)}>Перейти к листу {part.ref.split(":")[0].replace("a","а").replace("b","б")}</button>}</div>)}</div>:<p>{boldTranslationService(activeGeneratedArticle.translation)}</p>}<div className="explanation"><span>Объяснение</span><p>{activeGeneratedArticle.explanation}</p></div></>:savedArticle?<><div className="rule"/><h3>Точный перевод</h3><p>Они необходимы. Ведь если бы учили только о покупающем, я бы сказал: это потому, что он приводит её к святости. Но продающий, который выводит её из святости, — можно было бы сказать: оштрафуем его. Поэтому сообщается нам, что это не так.</p></>:<div className="explanation"><span>Источник</span><p>Проверенный оригинал из Sefaria. Нажмите «Создать статью».</p></div>}</section>
      {rashi.length>0&&<><div className="commentaryHeading"><span>Раши к этой реплике</span><i>{rashi.length}</i></div>{rashi.map((item)=>{const article=activeGeneratedArticle?.rashi.find((entry)=>entry.ref===item.ref);return <section className="analysisCard sourceCommentCard rashiSourceCard" key={item.ref}><div className="commentMeta"><b>РАШИ</b><span>{item.ref}</span></div><PrintedLocation tractate={tractate.sefaria} masechta={tractate.shas} sourceRef={item.ref}/><div className="hebrew" lang="he" dir="rtl">{boldDibur(item.text,item.dibur)}</div>{article&&<><div className="rule"/><h3>Точный перевод</h3><p>{boldTranslatedDibur(article.translation)}</p><div className="explanation"><span>Объяснение</span><p>{article.explanation}</p></div></>}</section>})}</>}{tosafot.length>0&&<><div className="commentaryHeading tosafotHeading"><span>Тосафот к этой реплике</span><i>{tosafot.length}</i></div>{tosafot.map((item)=>{const article=activeGeneratedArticle?.tosafot.find((entry)=>entry.ref===item.ref);return <section className="analysisCard sourceCommentCard tosafotCard" key={item.ref}><div className="commentMeta"><b>ТОСАФОТ</b><span>{item.ref}</span></div><PrintedLocation tractate={tractate.sefaria} masechta={tractate.shas} sourceRef={item.ref}/><div className="hebrew" lang="he" dir="rtl">{boldDibur(item.text,item.dibur)}</div>{article&&<><div className="rule"/><h3>Точный перевод</h3><p>{boldTranslatedDibur(article.translation)}</p><div className="explanation"><span>Объяснение</span><p>{article.explanation}</p></div></>}</section>})}</>}{linked.length===0&&<div className="noCommentary">Sefaria не связывает с этой репликой комментарии Раши или Тосафот.</div>}<div className="articleFooter"><strong>{tractate.ru} {isSpanningUnit?unitSegments.map((part)=>part.id).join(" + "):selectedBlock}</strong>{savedArticle&&!activeGeneratedArticle&&<div className="sourceBadge"><b>DAF-RU</b><span>редакционная версия</span><time>22.09.2026</time></div>}{activeGeneratedArticle&&<div className="sourceBadge aiBadge"><b>AI</b><span>{activeGeneratedArticle.provider||"AI"}</span><time>{new Date(activeGeneratedArticle.generatedAt).toLocaleString("ru-RU",{dateStyle:"short",timeStyle:"short"})}</time></div>}{canEditArticles&&<button className="editArticleButton" disabled={currentArticleLoad?.status!=="ready"} onClick={openEditor}>{activeGeneratedArticle?"Редактировать":"Создать статью"}</button>}</div></>}
    </article></section>
    {picked&&<button className="saveSelection" style={{left:picked.x,top:picked.y}} onMouseDown={(e)=>e.preventDefault()} onClick={saveWord}>＋ В словарь</button>}
    {dictionaryOpen&&<div className="drawerBackdrop" onClick={()=>setDictionaryOpen(false)}><aside className="drawer" onClick={(e)=>e.stopPropagation()}><div className="drawerHead"><div><small>ЛИЧНАЯ КОЛЛЕКЦИЯ</small><h2>Словарь</h2></div><button onClick={()=>setDictionaryOpen(false)}>×</button></div>{words.length?<div className="wordList">{words.map((word)=><div className="word" key={word}><span dir="rtl">{word}</span><small>{label}</small><button onClick={()=>{const next=words.filter((item)=>item!==word);setWords(next);localStorage.setItem("havruta-dictionary",JSON.stringify(next));}}>Удалить</button></div>)}</div>:<div className="empty"><b>Пока пусто</b><p>Выделите выражение и сохраните его.</p></div>}</aside></div>}
    {editorOpen&&draft&&<div className="editorBackdrop"><section className="articleEditor"><div className="editorHead"><div><small>{tractate.ru} · {draft.unitRef||selectedBlock}</small><h2>{"Черновик статьи"}</h2></div><button onClick={()=>setEditorOpen(false)}>×</button></div><div className="editorSteps"><button className={copied?"copied":""} onClick={copyPrompt}>{copied?"✓ Задание скопировано":"1. Скопировать задание для AI"}</button><select value={draft.provider||"ChatGPT"} onChange={(e)=>setDraft({...draft,provider:e.target.value})}><option>ChatGPT</option><option>Claude</option><option>Gemini</option><option>Другой AI</option></select></div><label className="wideField"><span>2. Вставьте JSON-ответ AI</span><textarea value={importText} onChange={(e)=>setImportText(e.target.value)} placeholder={draft.parts?.length?'{"title":"…","parts":[…],"pages":[…]}':'{"title":"…","translation":"…"}'}/><button onClick={()=>parseImport()}>Разобрать ответ</button></label><div className="editorFields"><label><span>Заголовок</span><input value={draft.title} onChange={(e)=>setDraft({...draft,title:e.target.value})}/></label>{draft.parts?.length?draft.parts.map((part,index)=><label key={part.ref}><span>Точный перевод части {part.ref}</span><textarea value={part.translation} onChange={(e)=>setDraft({...draft,parts:draft.parts!.map((x,i)=>i===index?{...x,translation:e.target.value}:x)})}/></label>):<label><span>Точный перевод</span><textarea value={draft.translation} onChange={(e)=>setDraft({...draft,translation:e.target.value})}/></label>}<label><span>Краткое объяснение всей реплики</span><textarea value={draft.explanation} onChange={(e)=>setDraft({...draft,explanation:e.target.value})}/></label></div>{draft.pages?.length?draft.pages.map((page,pageIndex)=><div className="pageCommentEdits" key={page.ref}><h3>Комментарии на листе · {page.ref}</h3>{page.rashi.map((item,index)=><div className="commentEdit" key={item.ref}><b>Раши · {item.ref}</b><textarea placeholder="Перевод" value={item.translation} onChange={(e)=>setDraft({...draft,pages:draft.pages!.map((p,pi)=>pi===pageIndex?{...p,rashi:p.rashi.map((x,i)=>i===index?{...x,translation:e.target.value}:x)}:p)})}/><textarea placeholder="Объяснение" value={item.explanation} onChange={(e)=>setDraft({...draft,pages:draft.pages!.map((p,pi)=>pi===pageIndex?{...p,rashi:p.rashi.map((x,i)=>i===index?{...x,explanation:e.target.value}:x)}:p)})}/></div>)}{page.tosafot.map((item,index)=><div className="commentEdit" key={item.ref}><b>Тосафот · {item.ref}</b><textarea placeholder="Перевод" value={item.translation} onChange={(e)=>setDraft({...draft,pages:draft.pages!.map((p,pi)=>pi===pageIndex?{...p,tosafot:p.tosafot.map((x,i)=>i===index?{...x,translation:e.target.value}:x)}:p)})}/><textarea placeholder="Объяснение" value={item.explanation} onChange={(e)=>setDraft({...draft,pages:draft.pages!.map((p,pi)=>pi===pageIndex?{...p,tosafot:p.tosafot.map((x,i)=>i===index?{...x,explanation:e.target.value}:x)}:p)})}/></div>)}</div>):<>{draft.rashi.map((item,index)=><div className="commentEdit" key={item.ref}><b>Раши · {item.ref}</b><textarea placeholder="Перевод" value={item.translation} onChange={(e)=>setDraft({...draft,rashi:draft.rashi.map((x,i)=>i===index?{...x,translation:e.target.value}:x)})}/><textarea placeholder="Объяснение" value={item.explanation} onChange={(e)=>setDraft({...draft,rashi:draft.rashi.map((x,i)=>i===index?{...x,explanation:e.target.value}:x)})}/></div>)}{draft.tosafot.map((item,index)=><div className="commentEdit" key={item.ref}><b>Тосафот · {item.ref}</b><textarea placeholder="Перевод" value={item.translation} onChange={(e)=>setDraft({...draft,tosafot:draft.tosafot.map((x,i)=>i===index?{...x,translation:e.target.value}:x)})}/><textarea placeholder="Объяснение" value={item.explanation} onChange={(e)=>setDraft({...draft,tosafot:draft.tosafot.map((x,i)=>i===index?{...x,explanation:e.target.value}:x)})}/></div>)}</>}{editorMessage&&<p className="editorMessage">{editorMessage}</p>}<div className="editorActions"><button onClick={()=>setEditorOpen(false)}>Отмена</button><button className="primary" disabled={saving} onClick={saveArticle}>{saving?"Сохраняем…":"Сохранить статью"}</button></div></section></div>}
  </main>;
}
