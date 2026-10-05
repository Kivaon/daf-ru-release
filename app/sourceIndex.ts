import data from './data/source-index.json';
export const sourceIndex=data as {fetchedAt:string;tractates:Record<string,{version?:string;error?:string;url:string;pages:Record<string,string[]>}>};
