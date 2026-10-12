import {printedPages} from './printedSources';
export default function PrintedLocation({tractate,masechta,sourceRef}:{tractate:string;masechta:string;sourceRef:string}){
 const pages=printedPages(tractate,sourceRef);
 if(!pages.length)return null;
 return <p className="printedLocation">Напечатан на листе {pages.map((page,i)=><span key={page}>{i>0?' и ':''}<a href={`/api/daf-pdf?masechta=${encodeURIComponent(masechta)}&daf=${page.slice(0,-1)}&amud=${page.slice(-1)}`} target="_blank" rel="noreferrer">{page.replace('a','а').replace('b','б')} (PDF)</a></span>)}. Ссылка Sefaria указывает реплику, к которой относится комментарий.</p>;
}
