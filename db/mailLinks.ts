// Derive links and test deduplication from the deployment serving the request.
// Completion job IDs stay unchanged so imported sent jobs are never replayed.
export function articleMailLink(origin:string,tractate:string,ref:string){
 const url=new URL('/',new URL(origin).origin);
 url.searchParams.set('tractate',tractate);
 url.searchParams.set('daf',ref.split(':')[0]);
 return url.href;
}

export function mailTestMessage(origin:string){
 const siteOrigin=new URL(origin).origin;
 return {
  id:`connection-test-origin-v1:${siteOrigin}`,
  subject:'DAF-RU — тест отправки',
  body:'Это тестовое письмо DAF-RU.\n\nОтправка через Mailjet подключена. Если вы видите это письмо, доставка в ваш почтовый ящик работает.\n\nНовые уведомления будут приходить при первой публикации полной статьи.\n'+new URL('/translation-map',siteOrigin).href,
 };
}
