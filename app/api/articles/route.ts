import {queueMail} from '../../../db/mailJobs';
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { canEdit, registerAndGetRole } from "../../roles";

type Comment = { ref:string; translation:string; explanation:string };
type Part = { ref:string; translation:string };
type PageArticle = { ref:string; rashi:Comment[]; tosafot:Comment[] };
const text = (value:unknown, max=20000) => typeof value === "string" ? value.trim().slice(0,max) : "";
const comments = (value:unknown):Comment[] => Array.isArray(value) ? value.slice(0,50).flatMap((raw) => {
  if (!raw || typeof raw !== "object") return [];
  const item=raw as Record<string,unknown>, ref=text(item.ref,300);
  return ref ? [{ref,translation:text(item.translation),explanation:text(item.explanation)}] : [];
}) : [];
const parts = (value:unknown):Part[] => Array.isArray(value) ? value.slice(0,4).flatMap((raw) => {
  if (!raw || typeof raw !== "object") return [];
  const item=raw as Record<string,unknown>, ref=text(item.ref,300), translation=text(item.translation);
  return ref && translation ? [{ref,translation}] : [];
}) : [];

export async function GET(request:Request) {
  const url=new URL(request.url), tractate=text(url.searchParams.get("tractate"),100), ref=text(url.searchParams.get("ref"),100);
  if(!tractate||!ref) return Response.json({error:"Не указана реплика"},{status:400});
  const row=await env.DB.prepare("SELECT ref, title, translation, explanation, unit_ref, parts_json, rashi_json, tosafot_json, provider, created_at, updated_at FROM articles WHERE tractate = ? AND ref = ?").bind(tractate,ref).first<Record<string,string>>();
  if(!row) return Response.json({article:null});
  const pages=row.unit_ref?(await env.DB.prepare("SELECT ref, rashi_json, tosafot_json FROM articles WHERE tractate = ? AND unit_ref = ? ORDER BY ref").bind(tractate,row.unit_ref).all<Record<string,string>>()).results.map((item)=>({ref:item.ref,rashi:JSON.parse(item.rashi_json||"[]"),tosafot:JSON.parse(item.tosafot_json||"[]")})):undefined;
  return Response.json({article:{ref:row.ref,title:row.title,translation:row.translation,explanation:row.explanation,unitRef:row.unit_ref||undefined,parts:JSON.parse(row.parts_json||"[]"),pages,rashi:JSON.parse(row.rashi_json||"[]"),tosafot:JSON.parse(row.tosafot_json||"[]"),provider:row.provider,createdAt:row.created_at,updatedAt:row.updated_at}});
}

export async function POST(request:Request) {
  const user=await getChatGPTUser(); if(!user) return Response.json({error:"Требуется вход"},{status:401});
  const role=await registerAndGetRole(user);if(!canEdit(role))return Response.json({error:"Создавать статьи может только редактор"},{status:403});
  const body=await request.json() as Record<string,unknown>;
  const tractate=text(body.tractate,100), ref=text(body.ref,100), title=text(body.title,300), translation=text(body.translation), explanation=text(body.explanation), provider=text(body.provider,40)||"AI";
  const now=new Date().toISOString(), articleParts=parts(body.parts), unitRef=text(body.unitRef,500);
  if(!tractate||!ref||!title||(!translation&&!articleParts.length)||!explanation) return Response.json({error:"Заполните заголовок, перевод и объяснение"},{status:400});
  const rawPages=Array.isArray(body.pages)?body.pages:[];
  const pages:PageArticle[]=rawPages.flatMap((raw) => {
    if(!raw||typeof raw!=="object")return [];
    const item=raw as Record<string,unknown>, pageRef=text(item.ref,300);
    return pageRef?[{ref:pageRef,rashi:comments(item.rashi),tosafot:comments(item.tosafot)}]:[];
  });
  if(unitRef && (articleParts.length<2 || pages.length<2)) return Response.json({error:"Для составной реплики нужны обе части перевода и обе страницы комментариев"},{status:400});
  const targets=unitRef?pages:[{ref,rashi:comments(body.rashi),tosafot:comments(body.tosafot)}];
  const fullTranslation=articleParts.length?articleParts.map((part)=>part.translation).join(" "):translation;
  const statement=`INSERT INTO articles (tractate, ref, title, translation, explanation, unit_ref, parts_json, rashi_json, tosafot_json, provider, author_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(tractate, ref) DO UPDATE SET title=excluded.title, translation=excluded.translation, explanation=excluded.explanation, unit_ref=excluded.unit_ref, parts_json=excluded.parts_json, rashi_json=excluded.rashi_json, tosafot_json=excluded.tosafot_json, provider=excluded.provider, author_user_id=excluded.author_user_id, updated_at=excluded.updated_at`;
  await env.DB.batch([queueMail(env.DB,tractate,targets.map(t=>t.ref)),...targets.map((target)=>env.DB.prepare(statement).bind(tractate,target.ref,title,fullTranslation,explanation,unitRef||null,JSON.stringify(articleParts),JSON.stringify(target.rashi),JSON.stringify(target.tosafot),provider,user.userId,now,now))]);
  const current=targets.find((target)=>target.ref===ref)||targets[0];
  return Response.json({ok:true,article:{ref:current.ref,title,translation:fullTranslation,explanation,unitRef:unitRef||undefined,parts:articleParts,rashi:current.rashi,tosafot:current.tosafot,provider,createdAt:now,updatedAt:now},savedRefs:targets.map((target)=>target.ref)});
}
