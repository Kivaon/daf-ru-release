import {commentaryLabel} from './printedSources';
export default function PrintedLocation({tractate,sourceRef}:{tractate:string;sourceRef:string}){
 return <span className="printedLocation">{commentaryLabel(tractate,sourceRef)}</span>;
}
