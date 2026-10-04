"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { assemblePrintArticles, createPrintDocument, PRINT_BLOCKS } from "./printDocument";
import type { PrintArticle, PrintComment, PrintSegment, PrintSettings, SavedPrintArticle } from "./printDocument";

type Props={tractate:string;label:string;segments:PrintSegment[];context:PrintSegment[];comments:PrintComment[];ready:boolean};
export default function PrintPage({tractate,label,segments,context,comments,ready}:Props) {
  const dialog=useRef<HTMLDialogElement>(null);
  const frame=useRef<HTMLIFrameElement>(null);
  const request=useRef<AbortController|null>(null);
  const bodyOverflow=useRef<string|null>(null);
  const [articles,setArticles]=useState<PrintArticle[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [frameReady,setFrameReady]=useState(false);
  const [settings,setSettings]=useState<PrintSettings>({blocks:{original:true,translation:true,explanation:true,rashi:true,tosafot:true},order:"articles",pair:true,stamps:true,fontSize:16});
  const hasBlocks=Object.values(settings.blocks).some(Boolean);
  const html=useMemo(()=>createPrintDocument(label,articles,settings),[label,articles,settings]);
  const restoreScroll=()=>{if(bodyOverflow.current!==null){document.body.style.overflow=bodyOverflow.current;bodyOverflow.current=null;}};
  useEffect(()=>()=>{request.current?.abort();restoreScroll();},[]);
  const load=async()=>{
    request.current?.abort();
    const controller=new AbortController();request.current=controller;
    setBusy(true);setError("");setArticles([]);setFrameReady(false);
    try {
      // Limit concurrent reads while collecting every article, not just the open one.
      const saved:(SavedPrintArticle|null)[]=new Array(segments.length).fill(null);
      let next=0;
      await Promise.all(Array.from({length:Math.min(4,segments.length)},async()=>{
        while(next<segments.length){
          const index=next++;
          const response=await fetch(`/api/articles?tractate=${encodeURIComponent(tractate)}&ref=${encodeURIComponent(segments[index].id)}`,{signal:controller.signal});
          if(!response.ok)throw new Error("Не удалось загрузить все статьи. Повторите попытку перед печатью.");
          const data=await response.json() as {article:SavedPrintArticle|null};
          if(!Object.prototype.hasOwnProperty.call(data,"article"))throw new Error("Получен неполный ответ при загрузке статей.");
          saved[index]=data.article;
          if(!saved[index]&&tractate==="Bekhorot"&&segments[index].id==="2a:3")saved[index]={ref:"2a:3",title:"Почему необходимы оба случая?",translation:"Они необходимы. Ведь если бы учили только о покупающем, я бы сказал: это потому, что он приводит её к святости. Но продающий, который выводит её из святости, — можно было бы сказать: оштрафуем его. Поэтому сообщается нам, что это не так.",explanation:"",rashi:[],tosafot:[]};
        }
      }));
      if(!controller.signal.aborted)setArticles(assemblePrintArticles(segments,context,comments,saved));
    }catch(reason){if(!controller.signal.aborted){setError(reason instanceof Error?reason.message:"Не удалось подготовить материалы.");controller.abort();}}
    finally{if(request.current===controller)setBusy(false);}
  };
  const open=()=>{dialog.current?.showModal();bodyOverflow.current=document.body.style.overflow;document.body.style.overflow="hidden";void load();};
  const close=()=>{request.current?.abort();restoreScroll();};
  const change=(update:Partial<PrintSettings>)=>{setFrameReady(false);setSettings(current=>({...current,...update}));};
  const print=()=>{try{const target=frame.current?.contentWindow;if(!target)throw new Error();target.focus();target.print();}catch{setError("Не удалось открыть печать. Скачайте HTML-файл и откройте его в браузере для печати или сохранения в PDF.");}};
  const download=()=>{
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});const url=URL.createObjectURL(blob);
    const link=document.createElement("a");link.href=url;link.download=`Daf-Ru-${label.replace(/[^\p{L}\p{N} ._-]/gu,"-")}.html`;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  const enabled=!busy&&!error&&articles.length>0&&hasBlocks;
  return <>
    <button type="button" className="printPageButton" disabled={!ready} onClick={open} title="Экспорт материалов: печать и файл" aria-label="Экспорт материалов: печать и файл"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 10H3v11h18V10h-2M12 15V3M8 7l4-4 4 4"/></svg></button>
    <dialog ref={dialog} className="printPageDialog" aria-labelledby="print-page-title" onClose={close}>
      <header className="printPageHeader"><div><small>{label}</small><h2 id="print-page-title">Печать и сохранение</h2></div><button type="button" autoFocus onClick={()=>dialog.current?.close()} aria-label="Закрыть настройки печати">×</button></header>
      <div className="printPageLayout">
        <aside className="printPageSettings">
          <fieldset><legend>Что включить</legend>{PRINT_BLOCKS.map(block=><label key={block.key}><input type="checkbox" checked={settings.blocks[block.key]} onChange={e=>change({blocks:{...settings.blocks,[block.key]:e.target.checked}})}/>{block.label}</label>)}<p className="printHint">Первые три пункта относятся к Гемаре. Раши и Тосафот включают оригиналы и доступные переводы и пояснения комментариев.</p></fieldset>
          <fieldset><legend>Порядок материалов</legend><label><input type="radio" name="print-order" checked={settings.order==="articles"} onChange={()=>change({order:"articles"})}/>По статьям</label><label><input type="radio" name="print-order" checked={settings.order==="blocks"} onChange={()=>change({order:"blocks"})}/>По блокам</label></fieldset>
          <label><input type="checkbox" checked={settings.pair} disabled={!settings.blocks.translation||!settings.blocks.explanation} onChange={e=>change({pair:e.target.checked})}/>Перевод и объяснение вместе</label><p className="printHint">После перевода каждой статьи следует её объяснение, в том числе при печати по блокам.</p>
          <label><input type="checkbox" checked={settings.stamps} onChange={e=>change({stamps:e.target.checked})}/>Показывать привязку к реплике</label><p className="printHint">По статьям — одна метка перед статьёй. По блокам — перед фрагментом; у связанного объяснения метка не повторяется.</p>
          <label className="printSize">Размер текста<select value={settings.fontSize} onChange={e=>change({fontSize:Number(e.target.value)})}><option value={14}>Компактный</option><option value={16}>Обычный</option><option value={18}>Крупный</option></select></label>
          <p className="printHint">Печатается весь выбранный лист. Непереведённые фрагменты сохраняют оригинал; недостающие поля отмечаются [отсутствует].</p>
        </aside>
        <section className="printPreview" aria-label="Предварительный просмотр">
          {busy?<p role="status">Собираем все статьи листа…</p>:error?<div role="alert"><p>{error}</p><button onClick={()=>void load()}>Повторить загрузку</button></div>:!hasBlocks?<p role="status">Выберите хотя бы один блок для печати.</p>:articles.length?<iframe ref={frame} title={`Предварительный просмотр — ${label}`} srcDoc={html} sandbox="allow-same-origin allow-modals" onLoad={()=>setFrameReady(true)}/>:<p>На этом листе нет материалов для печати.</p>}
        </section>
      </div>
      <footer className="printPageActions"><p>Для PDF нажмите «Печать / PDF» и выберите «Сохранить как PDF» в окне печати. HTML-файл открывается без интернета.</p><div><button disabled={!enabled} onClick={download}>Скачать HTML</button><button className="primary" disabled={!enabled||!frameReady} onClick={print}>Печать / PDF</button></div></footer>
    </dialog>
  </>;
}
