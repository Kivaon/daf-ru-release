import {redirect} from 'next/navigation';
import {getChatGPTUser} from '../chatgpt-auth';
import {canEdit,registerAndGetRole} from '../roles';
import {TRACTATES} from '../talmudCatalog';
import {pagesFor} from '../translationMapModel';
import {sourceIndex} from '../sourceIndex';
import TranslationMap from './TranslationMap';
export const dynamic='force-dynamic';
export default async function TranslationMapPage(){
 const user=await getChatGPTUser();if(!user)redirect('/signin-with-chatgpt?return_to=%2Ftranslation-map');if(!canEdit(await registerAndGetRole(user)))redirect('/');
 const catalog=TRACTATES.map(t=>({name:t.sefaria,label:t.ru,pages:pagesFor(t).map(page=>({page,total:sourceIndex.tractates[t.sefaria]?.pages[page]?.length??null})),error:sourceIndex.tractates[t.sefaria]?.error}));
 return <TranslationMap catalog={catalog} sourceDate={sourceIndex.fetchedAt}/>;
}
