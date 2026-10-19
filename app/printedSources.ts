import data from './data/printed-commentary.json' with {type:'json'};
import starts from './data/commentary-starts.json' with {type:'json'};
import {TRACTATES} from './talmudCatalog.ts';
export type PrintedRef={ref:string;base:string;kind:'rashi'|'tosafot'};
export type CommentaryStart={page:string;kind:'rashi'|'tosafot';ordinal?:number;pagesSpanned:string[]};
const EMPTY:PrintedRef[]=[];
// Occurrences include incoming continuations; never use their order for numbering.
export const printedRefs=(tractate:string,page:string):PrintedRef[]=>((data as unknown as Record<string,Record<string,PrintedRef[]>>)[tractate]?.[page]||EMPTY);
export const printedPages=(tractate:string,ref:string):string[]=>Object.entries((data as unknown as Record<string,Record<string,PrintedRef[]>>)[tractate]||{}).filter(([,refs])=>refs.some(item=>item.ref===ref)).map(([page])=>page);
// A comment has one physical start, even when it spans pages or has multiple semantic refs.
export const commentaryStart=(tractate:string,ref:string):CommentaryStart|undefined=>(starts as Record<string,Record<string,CommentaryStart>>)[tractate]?.[ref];
export function commentaryLabel(tractate:string,ref:string):string {
 const match=ref.match(/^(?:Rashi|Tosafot) on (.+) (\d+[ab]):(\d+):(\d+)$/);
 if(!match)return ref;
 const name=TRACTATES.find(t=>t.sefaria===match[1])?.ru??match[1];
 const label=`на ${name} ${match[2]}:${match[3]}:${match[4]}`;
 const start=commentaryStart(tractate,ref);
 return label+(start&&start.page!==match[2]?` (см. на стр.${start.page})`:'');
}
