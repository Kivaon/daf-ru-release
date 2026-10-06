import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {registerAndGetRole} from '../../roles';
import {sendMail} from '../../../db/mailJobs';
import type {MailConfig} from '../../../db/mailJobs';
async function allowed(){const user=await getChatGPTUser();return user&&(await registerAndGetRole(user))==='admin';}
export async function GET(){
 if(!await allowed())return Response.json({error:'Доступно администратору'},{status:403});
 const jobs=await env.DB.prepare('SELECT tractate,refs_json,status,attempts,error,created_at FROM mail_jobs ORDER BY created_at DESC LIMIT 20').all();
 return Response.json({jobs:jobs.results},{headers:{'cache-control':'no-store'}});
}
export async function POST(request:Request){
 if(!await allowed())return Response.json({error:'Доступно администратору'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Недопустимый запрос'},{status:403});
 try{
  // One fixed campaign: retrying this test cannot flood the recipient.
  await sendMail(env as unknown as MailConfig,'connection-test-gmail-v2','DAF-RU — тест отправки с Gmail','Это тестовое письмо DAF-RU.\n\nОтправка через Mailjet подключена. Если вы видите это письмо, доставка в ваш почтовый ящик работает.\n\nНовые уведомления будут приходить при первой публикации полной статьи.\nhttps://daf-ru.mffkk78khq.chatgpt.site/translation-map');
  return Response.json({message:'Mailjet принял тестовое письмо. Проверьте Входящие и Спам в Proton Mail. Повторный тест не создаёт копий письма.'});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Ошибка Mailjet'},{status:502});}
}
