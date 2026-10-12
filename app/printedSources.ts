import data from './data/printed-commentary.json' with {type:'json'};
export type PrintedRef={ref:string;base:string;kind:'rashi'|'tosafot'};
const EMPTY:PrintedRef[]=[];
// Verified physical occurrences, not replacements for Sefaria semantic refs.
export const printedRefs=(tractate:string,page:string):PrintedRef[]=>((data as unknown as Record<string,Record<string,PrintedRef[]>>)[tractate]?.[page]||EMPTY);

export const printedPages=(tractate:string,ref:string):string[]=>Object.entries((data as unknown as Record<string,Record<string,PrintedRef[]>>)[tractate]||{}).filter(([,refs])=>refs.some(item=>item.ref===ref)).map(([page])=>page);
