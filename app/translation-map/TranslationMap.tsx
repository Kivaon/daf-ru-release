'use client';
import {useEffect,useMemo,useState} from 'react';
import {editorHref,sumProgress} from '../translationMapModel';
import type {PageProgress} from '../translationMapModel';
type Catalog={name:string;label:string;pages:{page:string;total:number|null}[];error?:string}[];
type Result={pages:PageProgress[];pendingPages:string[]};
const number=(n:number)=>n.toLocaleString('ru-RU');
const percent=(n:number,total:number)=>total?`${(n/total*100).toLocaleString('ru-RU',{maximumFractionDigits:1})}%`:'0%';
export default function TranslationMap({catalog,sourceDate}:{catalog:Catalog;sourceDate:string}){
 const [results,setResults]=useState<Record<string,Result>>({}),[errors,setErrors]=useState<Record<string,string>>({}),[busy,setBusy]=useState(true),[run,setRun]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setBusy(true);setErrors({});setResults({});let next=0;
  const read=async(name:string)=>{const r=await fetch(`/api/translation-map?tractate=${encodeURIComponent(name)}`,{signal:controller.signal,cache:'no-store'});const data=await r.json() as Result&{error?:string};if(!r.ok)throw new Error(data.error||'Ошибка загрузки');return data;};
  const worker=async()=>{while(next<catalog.length&&!controller.signal.aborted){const t=catalog[next++];try{
   let data=await read(t.name);if(controller.signal.aborted)return;setResults(prev=>({...prev,[t.name]:data}));
   for(const page of data.pendingPages){const r=await fetch('/api/translation-map',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tractate:t.name,page}),signal:controller.signal});if(!r.ok){const error=await r.json() as {error?:string};throw new Error(error.error||'Не удалось проверить источники');}}
   if(data.pendingPages.length){data=await read(t.name);if(!controller.signal.aborted)setResults(prev=>({...prev,[t.name]:data}));}
  }catch(error){if(!controller.signal.aborted)setErrors(prev=>({...prev,[t.name]:error instanceof Error?error.message:'Ошибка загрузки'}));}}};
  void Promise.all([worker(),worker(),worker()]).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();
 },[catalog,run]);
 useEffect(()=>{const refresh=()=>setRun(n=>n+1);window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);
 const rows=useMemo(()=>catalog.map(t=>({...t,progress:results[t.name]?.pages||t.pages.map(p=>({...p,ready:null,draft:null,missing:null,complete:false,pending:!t.error}))})),[catalog,results]);
 const totals=sumProgress(rows.flatMap(t=>t.progress));
 const unavailable=rows.filter(t=>t.error||errors[t.name]);
 const columns=catalog.reduce((longest,t)=>t.pages.length>longest.length?t.pages:longest,catalog[0].pages);
 const counts=(n:number,total:number,known:boolean)=>`${known?'': '≥ '}${number(n)} / ${number(total)}`;
 return <main className="translationMap">
  <header className="mapHeader"><div><a href="/">← К изучению</a><h1>Карта перевода</h1><p>Общая работа редакторов · Гемара, Раши и Тосафот</p></div><button onClick={()=>setRun(n=>n+1)} disabled={busy}>{busy?'Проверяем прогресс…':'Обновить статистику'}</button></header>
  <section className="mapTotals" aria-label="Общая статистика"><div><strong>{counts(totals.ready,totals.total,totals.known)}</strong><span>готовых статей{rows.some(t=>t.error)?' · объём доступных источников':''}</span></div><div><strong>{counts(totals.complete,totals.pages,totals.known)}</strong><span>полностью готовых дафов</span></div><div><strong>{totals.known?'':'≥ '}{number(totals.draft)}</strong><span>черновиков</span></div></section>
  <div className="mapLegend"><span><i className="mapGreen"/>Готово</span><span><i className="mapPink"/>Черновик / требует дополнения</span><span><i className="mapWhite"/>Нет статьи</span><small>Доли по исходным refs; составная реплика учитывается на каждой своей стороне.</small></div>
  {!totals.known&&<p className="mapWarning" role="status">{busy?'Статистика уточняется. Знак ≥ показывает только уже подтверждённое количество.':'Итоги неполные. Знак ≥ показывает подтверждённое количество; неизвестные данные не считаются нулём.'}</p>}
  {unavailable.length>0&&<div className="mapWarning" role="alert">{unavailable.map(t=><p key={t.name}><b>{t.label}:</b> {t.error||errors[t.name]}. {t.error?'Недостающий объём не включён в итог; переход на страницу доступен.':'Нажмите «Обновить статистику», чтобы повторить.'}</p>)}</div>}
  <div className="mapScroll" tabIndex={0} role="region" aria-label="Таблица прогресса перевода, прокручивается по горизонтали и вертикали">
   <table className="mapTable"><thead><tr><th scope="col" className="mapCorner">Трактат и прогресс</th>{columns.map(p=><th scope="col" key={p.page}>{p.page}</th>)}</tr></thead><tbody>
    {rows.map(t=>{const sum=sumProgress(t.progress);return <tr key={t.name}><th scope="row" className="mapRowTitle"><strong>{t.label}</strong><span>{`${counts(sum.ready,sum.total,sum.known)}${t.error?' + ?':''} статей${sum.known?` · ${percent(sum.ready,sum.total)}`:''}`}</span><span>{counts(sum.complete,sum.pages,sum.known)} дафов{sum.known?` · ${percent(sum.complete,sum.pages)}`:''}</span></th>
     {columns.map((column,index)=>{const p=t.progress[index];if(!p)return <td key={column.page} className="mapOutside" aria-label="За пределами трактата"/>;
      const known=p.ready!==null&&p.draft!==null&&p.total!==null,green=known&&p.total?p.ready!/p.total*100:0,pink=known&&p.total?p.draft!/p.total*100:0;
      const description=`${t.label} ${p.page}: ${known?`${p.ready} из ${p.total} готовы, ${p.draft} черновиков, ${p.missing} отсутствуют`:p.total===null?'источник недоступен':'готовность уточняется'}. Открыть подготовку страницы`;
      return <td key={p.page}><a className={`mapCell${known?'':' mapUnknown'}`} href={editorHref(t.name,p.page)} aria-label={description} title={description} style={known?{background:`linear-gradient(to right, #3b975b 0%, #3b975b ${green}%, #edacc0 ${green}%, #edacc0 ${green+pink}%, #fff ${green+pink}%, #fff 100%)`}:undefined}>{!known&&<span aria-hidden="true">{t.error||errors[t.name]?'!':'…'}</span>}</a></td>;
     })}</tr>;})}
   </tbody></table>
  </div>
  <p className="mapFootnote">Готовность означает заполненные переводы и объяснения всех предусмотренных частей и комментариев. Личные тексты черновиков здесь не раскрываются. Индекс исходных refs: {new Date(sourceDate).toLocaleDateString('ru-RU')}.</p>
 </main>;
}
