"use client";
import { useEffect, useRef, useState } from 'react';
import { batchPrompt, entryReady, filled, importDraft, mergeDraft, missingFields, readiness } from './batchModel';
import type { Batch, Draft, Entry } from './batchModel';
import { readModelResponse } from './responseDiagnostics';
type Props={tractate:string;page:string;label:string;ready:boolean;autoOpen?:boolean;onSaved:()=>void};
const entryLabel=(e:Entry)=>entryReady(e)?'Готово':e.skipped?'Пропущено':e.started?'Черновик':readiness(e.saved).gemara?'Дополнить комментарии':'Подготовить';
export default function BatchEditor({tractate,page,label,ready,autoOpen=false,onSaved}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 const [batch,setBatch]=useState<Batch|null>(null),[draft,setDraft]=useState<Draft|null>(null),[raw,setRaw]=useState('');
 const [recovery,setRecovery]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[importError,setImportError]=useState(''),[dirty,setDirty]=useState(false),[promptOpen,setPromptOpen]=useState(false);
 const pending=useRef(false),editVersion=useRef(0),mounted=useRef(true),bodyOverflow=useRef('');
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(dialog.current?.open)document.body.style.overflow=bodyOverflow.current;};},[]);
 const entry=batch?.entries[batch.index];
 const form=useRef<HTMLFieldSetElement>(null),sources=useRef<HTMLElement>(null);
 useEffect(()=>{form.current?.scrollTo(0,0);sources.current?.scrollTo(0,0);},[batch?.index]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const adopt=(value:Batch)=>{setBatch(value);const e=value.entries[value.index];setDraft(structuredClone(e.draft));setRaw(e.rawInput||'');setDirty(false);setImportError('');setRecovery('');setPromptOpen(false);if(e.rawInput){try{const parsed=readModelResponse(e.rawInput);const imported=mergeDraft(e.saved,importDraft(e.unit,parsed.value,e.draft));if(parsed.suffix||parsed.recoveredText){setDraft(imported);setRaw(parsed.recoveredText||e.rawInput+parsed.suffix);setDirty(true);setRecovery(parsed.recoveredText?"Оформление JSON восстановлено. Проверьте материал.":`Закрывающие скобки восстановлены: ${parsed.suffix}. Проверьте полноту материала.`);}}catch(reason){setImportError(reason instanceof Error?reason.message:'Ответ требует исправления');}}};
 const call=async(payload:Record<string,unknown>)=>{const response=await fetch('/api/batches',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tractate,page,...payload})});const data=await response.json() as {batch:Batch;error?:string};if(!response.ok)throw new Error(data.error||'Не удалось сохранить. Повторите попытку.');return data.batch;};
 const load=async()=>{if(pending.current)return;pending.current=true;setBusy(true);setError('');try{const value=await call({action:'start'});if(mounted.current){adopt(value);setNotice('Очередь готова. Выберите статью или продолжайте с текущей.');}}catch(reason){setError(String(reason instanceof Error?reason.message:reason));}finally{pending.current=false;if(mounted.current)setBusy(false);}};
 const open=()=>{bodyOverflow.current=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();void load();};
 const openedAutomatically=useRef(false);
 useEffect(()=>{if(autoOpen&&ready&&!openedAutomatically.current){openedAutomatically.current=true;open();}},[autoOpen,ready]);
 const mutate=async(action:string,nextIndex?:number,quiet=false):Promise<boolean>=>{
  if(!batch||!draft||pending.current)return false;pending.current=true;setBusy(true);setError('');const version=editVersion.current;
  try{const value=await call({action,index:batch.index,revision:batch.revision,draft,rawInput:raw,nextIndex});if(!mounted.current)return true;
   if(version===editVersion.current)adopt(value);else setBatch(value);
   setNotice(action==='publish'?'Статья сохранена. Открыт следующий незавершённый пункт.':action==='skip'?'Статья пропущена; к ней можно вернуться.':'Черновик сохранён в вашем аккаунте.');
   if(action==='publish')onSaved();return true;
  }catch(reason){setError(reason instanceof Error?reason.message:'Не удалось сохранить. Ваш текст остаётся в редакторе.');return false;}
  finally{pending.current=false;if(mounted.current)setBusy(false);if(!quiet)setPromptOpen(false);}
 };
 // Save a paused edit, never publish it. A revision conflict stops autosave until resolved.
 useEffect(()=>{if(!dirty||busy||error||!batch)return;const timer=setTimeout(()=>void mutate('draft',undefined,true),1800);return()=>clearTimeout(timer);},[draft,raw,dirty,busy,error,batch]);
 const close=async()=>{if(pending.current)return;if(dirty&&!(await mutate('draft')))return;dialog.current?.close();document.body.style.overflow=bodyOverflow.current;};
 const edit=(change:(d:Draft)=>void)=>{if(!draft)return;const next=structuredClone(draft);change(next);editVersion.current++;setDraft(next);setDirty(true);};
 const paste=(value:string)=>{setRaw(value);editVersion.current++;setDirty(true);setImportError('');setRecovery('');if(!value.trim())return;try{if(!entry||!draft)return;const response=readModelResponse(value);if(response.suffix||response.recoveredText){setRaw(response.recoveredText||value+response.suffix);setRecovery(response.recoveredText?"Оформление JSON восстановлено. Проверьте материал.":`Закрывающие скобки восстановлены: ${response.suffix}. Проверьте полноту материала.`);}const parsed=importDraft(entry.unit,response.value,draft);setDraft(mergeDraft(entry.saved,parsed));setNotice('Ответ разобран. Проверьте перевод и объяснения перед сохранением.');}catch(reason){setImportError(reason instanceof Error?reason.message:'Не удалось разобрать ответ');}};
 const copy=async()=>{if(!entry||!draft)return;const prompt=batchPrompt(tractate,{...entry,draft});try{await navigator.clipboard.writeText(prompt);setNotice('Задание скопировано. Вставьте его в свой AI.');}catch{setPromptOpen(true);setNotice('Скопируйте задание из поля ниже.');}};
 const done=batch?.entries.filter(entryReady).length||0,skipped=batch?.entries.filter(e=>!entryReady(e)&&e.skipped).length||0;
 const partial=batch?.entries.filter(e=>!entryReady(e)&&readiness(e.saved).gemara).length||0;
 const draftReady=draft?readiness(draft):null;
 const complete=!!batch&&batch.entries.length>0&&done===batch.entries.length;
 const locked=(value:string|undefined)=>filled(value);
 return <>
  <button className="batchLaunch" disabled={!ready} onClick={open}>Подготовить весь лист</button>
  <dialog ref={dialog} className="batchDialog" aria-labelledby="batch-title" onCancel={e=>{e.preventDefault();void close();}} onClose={()=>{document.body.style.overflow=bodyOverflow.current;}}>
   <header className="batchHeader"><div><small>{label} · ЛИЧНАЯ ОЧЕРЕДЬ РЕДАКТОРА</small><h2 id="batch-title">Подготовка листа</h2>{batch&&<p>{done} из {batch.entries.length} готовы · {partial} требуют дополнения комментариев · {skipped} пропущено</p>}</div><button aria-label="Сохранить черновик и закрыть пакет" disabled={busy} onClick={()=>void close()}>×</button></header>
   {batch&&<progress aria-label="Готовность листа" value={done} max={batch.entries.length}/>}
   <div className="batchMessages" aria-live="polite">{busy&&<p role="status">{batch?'Сохраняем…':'Получаем оригиналы, комментарии и сохранённые статьи…'}</p>}{error&&<div role="alert"><p>{error}</p><p>Введённый текст остаётся на экране. Перед загрузкой очереди сохраните его копию.</p><button disabled={busy} onClick={()=>{if(!dirty||window.confirm('Загрузить очередь с сервера? Несохранённые изменения на экране будут заменены. Скопируйте их перед продолжением.'))void load();}}>Загрузить свежую очередь</button></div>}{notice&&!busy&&<p>{notice}</p>}{complete&&<p className="batchComplete">Все статьи листа готовы, включая комментарии обеих сторон составных реплик.</p>}</div>
   {batch&&entry&&draft&&<div className="batchLayout">
    <nav className="batchQueue" aria-label="Очередь статей">{batch.entries.map((e,i)=><button key={e.unit.id} aria-current={batch.index===i?'step':undefined} disabled={busy} onClick={()=>void mutate('select',i)}><b>{i+1}. {e.unit.parts.map(p=>p.ref).join(' + ')}</b><span data-status={entryLabel(e)}>{entryLabel(e)}</span></button>)}</nav>
    <section ref={sources} className="batchSources" aria-label="Оригиналы текущей статьи"><h3>Оригинал · {entry.unit.parts.map(p=>p.ref).join(' + ')}</h3>{entry.unit.boundary&&<p className="batchHint">Составная реплика. Переводим целиком с комментариями обеих сторон. Проверьте границы перед подготовкой.</p>}{entry.unit.parts.map(p=><div key={p.ref}><h4>{p.ref} {p.ref.split(':')[0]===page?'· текущий лист':'· соседний лист'}</h4><p lang="he" dir="rtl" className="hebrew">{p.original}</p>{(['rashi','tosafot'] as const).map(key=><section key={key}><h4>{key==='rashi'?'Раши':'Тосафот'} · {p[key].length}</h4>{p[key].length?p[key].map(c=><div key={c.ref}><small>{c.ref}</small><p lang="he" dir="rtl" className="hebrew">{c.original}</p></div>):<p className="batchHint">В источнике комментариев нет.</p>}</section>)}</div>)}</section>
    <fieldset ref={form} className="batchForm" aria-label="Редактор пакета" disabled={busy}><h3>Статья {batch.index+1} из {batch.entries.length}</h3><div className="batchReadiness">Гемара {draftReady?.gemara?'✓':'○'} · Раши {draftReady?.rashi?'✓':'○'} · Тосафот {draftReady?.tosafot?'✓':'○'}<small>Готовность полей; публикация — после проверки.</small></div>
     <p className="batchHint">Заполненные поля общей базы защищены. Здесь дополняем недостающее; исправить готовое можно в обычном редакторе статьи.</p>
     <button className="batchCopy" disabled={busy||!!draftReady?.complete} onClick={()=>void copy()}>1. Скопировать задание для AI</button>
     <button className="batchTextButton" onClick={()=>setPromptOpen(v=>!v)}>{promptOpen?'Скрыть задание':'Показать задание'}</button>
     {promptOpen&&<label>Задание для копирования<textarea readOnly value={batchPrompt(tractate,{...entry,draft})}/></label>}
     <label>2. Вставьте ответ AI<textarea className="batchImport" value={raw} onChange={e=>paste(e.target.value)} placeholder="JSON разбирается автоматически после вставки"/></label>
     {importError&&<p className="batchImportError" role="alert">{importError}. Ответ сохранится как черновик; исправьте его перед публикацией.</p>}
     {recovery&&<p className="batchHint" role="status">{recovery}</p>}
     <label>Заголовок<input readOnly={locked(entry.saved.title)} value={draft.title} onChange={e=>edit(d=>{d.title=e.target.value;})}/></label>
     {draft.parts.map((p,i)=><label key={p.ref}>Перевод {p.ref}<textarea readOnly={locked(entry.saved.parts.find(x=>x.ref===p.ref)?.translation)} value={p.translation} onChange={e=>edit(d=>{d.parts[i].translation=e.target.value;})}/></label>)}
     <label>Общее объяснение Гемары<textarea readOnly={locked(entry.saved.explanation)} value={draft.explanation} onChange={e=>edit(d=>{d.explanation=e.target.value;})}/></label>
     {draft.pages.map((p,pi)=><section key={p.ref}><h4>Комментарии · {p.ref}</h4>{(['rashi','tosafot'] as const).map(key=>p[key].map((c,ci)=><fieldset key={`${key}-${c.ref}`}><legend>{key==='rashi'?'Раши':'Тосафот'} · {c.ref}</legend>{(['translation','explanation'] as const).map(field=><label key={field}>{field==='translation'?'Перевод':'Объяснение'}<textarea readOnly={locked(entry.saved.pages.find(x=>x.ref===p.ref)?.[key].find(x=>x.ref===c.ref)?.[field])} value={c[field]} onChange={e=>edit(d=>{d.pages[pi][key][ci][field]=e.target.value;})}/></label>)}</fieldset>))}</section>)}
     {!draftReady?.complete&&<details open><summary>Осталось заполнить: {missingFields(draft).length}</summary><ul>{missingFields(draft).map(m=><li key={m}>{m}</li>)}</ul></details>}
    </fieldset>
   </div>}
   {batch&&<footer className="batchActions"><span>{dirty?'Есть несохранённые изменения': 'Черновик сохранён в аккаунте'}<small>Черновики не видны читателям.</small></span><button disabled={busy} onClick={()=>void mutate('skip')}>Пропустить</button><button disabled={busy||!dirty} onClick={()=>void mutate('draft')}>Сохранить черновик</button><button className="primary" disabled={busy||!draftReady?.complete||!!importError||complete} onClick={()=>void mutate('publish')}>Сохранить и дальше</button></footer>}
  </dialog>
 </>;
}
