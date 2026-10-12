/** Preserve saved translations and append newly linked sources to the editor. */
export function includeSourceComments<T extends {ref:string}>(saved:T[],sources:T[]):T[]{
 return [...saved,...sources.filter(source=>!saved.some(item=>item.ref===source.ref))];
}
