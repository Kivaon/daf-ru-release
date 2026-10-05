import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {canEdit,registerAndGetRole} from '../../roles';
import {TRACTATES} from '../../talmudCatalog';
import {pagesFor} from '../../translationMapModel';
import {sourceIndex} from '../../sourceIndex';
import {mapProgress,cacheMapSources} from '../../../db/translationMapStore';
async function authorize(){const user=await getChatGPTUser();if(!user)return Response.json({error:'Требуется вход'},{status:401});if(!canEdit(await registerAndGetRole(user)))return Response.json({error:'Карта доступна редакторам'},{status:403});}
export async function GET(request:Request){const denied=await authorize();if(denied)return denied;try{
 const name=new URL(request.url).searchParams.get('tractate'),t=TRACTATES.find(t=>t.sefaria===name);if(!t)return Response.json({error:'Неизвестный трактат'},{status:400});
 return Response.json(await mapProgress(env.DB,t.sefaria,sourceIndex.tractates[t.sefaria]?.pages||{},pagesFor(t)),{headers:{'cache-control':'no-store'}});
}catch(error){console.error('Translation map',error);return Response.json({error:'Не удалось прочитать статистику. Повторите загрузку.'},{status:503});}}
export async function POST(request:Request){const denied=await authorize();if(denied)return denied;try{
 const body=await request.json() as {tractate:string;page:string};const refs=sourceIndex.tractates[body.tractate]?.pages[body.page];if(!refs)return Response.json({error:'Для страницы нет проверенного индекса источника'},{status:400});
 await cacheMapSources(env.DB,body.tractate,body.page,refs);return Response.json({ok:true});
}catch(error){return Response.json({error:error instanceof Error?error.message:'Не удалось проверить комментарии'},{status:503});}}
