'use client';
import {useEffect,useState} from 'react';
import {commentaryLabel,printedRefs} from './printedSources';
import {sourceComments} from './sefariaLinks';
type Item={ref:string;base:string;text:string;translation?:string;explanation?:string};
export default function PrintedCommentary({tractate,page}:{tractate:string;page:string}){
 const [items,setItems]=useState<Item[]>([]),[error,setError]=useState('');const refs=printedRefs(tractate,page);
 useEffect(()=>{setItems([]);setError('');if(!refs.length)return;const controller=new AbortController();
 (async()=>{
 const comments=(await Promise.all([...new Set(refs.map(r=>r.base.split(':')[0]))].map(async p=>{const r=await fetch(`https://www.sefaria.org/api/links/${encodeURIComponent(tractate+'.'+p)}?with_text=1`,{signal:controller.signal});if(!r.ok)throw Error('Не удалось получить продолжения комментариев Sefaria');return sourceComments(await r.json(),tractate,refs.filter(x=>x.base.startsWith(p+':')).map(x=>x.base));}))).flat();
 const saved=new Map(await Promise.all([...new Set(refs.map(r=>r.base))].map(async base=>{const r=await fetch(`/api/articles?tractate=${encodeURIComponent(tractate)}&ref=${encodeURIComponent(base)}`,{signal:controller.signal});if(!r.ok){if(!controller.signal.aborted)setError('Оригиналы загружены, но сохранённые переводы недоступны. Повторите загрузку.');return [base,null] as const;}const data=await r.json() as {article:null|{rashi:Item[];tosafot:Item[]}};return [base,data.article] as const;})));
 const result=refs.map(ref=>{const original=comments.find(c=>c.ref===ref.ref&&c.base===ref.base);if(!original)throw Error('Sefaria не вернула комментарий '+ref.ref);const translation=saved.get(ref.base)?.[ref.kind]?.find(c=>c.ref===ref.ref);return {ref:ref.ref,base:ref.base,text:original.text,translation:translation?.translation,explanation:translation?.explanation};});if(!controller.signal.aborted)setItems(result);
 })().catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Не удалось загрузить комментарии');});return()=>controller.abort();
 },[tractate,page,refs]);
 if(!refs.length)return null;
 return <section className="analysisCard"><h2>Комментарии на печатной странице</h2><details open={page==='33b'}><summary>Показать комментарии ({refs.length})</summary><p>Полные тексты Sefaria и сохранённые переводы. Эти комментарии относятся к репликам других страниц; перевод хранится в исходной статье.</p>{error&&<p role="alert">{error}</p>}{!items.length&&!error?<p role="status">Получаем комментарии…</p>:items.map(item=><details key={item.ref}><summary>{commentaryLabel(tractate,item.ref)} · {item.translation&&item.explanation?'переведён':error?'перевод не проверен':'требует перевода'}</summary><p dir="rtl" lang="he" className="hebrew">{item.text}</p>{item.translation&&<p>{item.translation}</p>}{item.explanation&&<p>{item.explanation}</p>}<a href={`/?tractate=${encodeURIComponent(tractate)}&daf=${item.base.split(':')[0]}&ref=${item.base}`}>Открыть статью {item.base}</a></details>)}</details></section>;
}
