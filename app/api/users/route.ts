import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { registerAndGetRole } from "../../roles";
import { queueUserMail } from "../../../db/userMail";

export async function GET(){
  const user=await getChatGPTUser(), role=await registerAndGetRole(user);
  if(role!=="admin")return Response.json({error:"Недостаточно прав"},{status:403});
  const rows=(await env.DB.prepare("SELECT user_id AS userId,email,name,role,created_at AS createdAt,updated_at AS updatedAt FROM users ORDER BY created_at DESC").all()).results;
  return Response.json({users:rows});
}

export async function PATCH(request:Request){
  const user=await getChatGPTUser(), role=await registerAndGetRole(user);
  if(role!=="admin")return Response.json({error:"Недостаточно прав"},{status:403});
  const body=await request.json() as {userId?:unknown;role?:unknown};
  const userId=typeof body.userId==="string"?body.userId:"", nextRole=body.role;
  if(!userId||(nextRole!=="reader"&&nextRole!=="editor"))return Response.json({error:"Некорректные данные"},{status:400});
  const target=await env.DB.prepare("SELECT email,name,role FROM users WHERE user_id = ?").bind(userId).first<{email:string;name:string;role:string}>(), now=new Date().toISOString();
  await env.DB.prepare("UPDATE users SET role = ?, updated_at = ? WHERE user_id = ? AND role != 'admin'").bind(nextRole,now,userId).run();
  if(nextRole==="editor"&&target?.role==="reader"){try{await queueUserMail(env.DB,"editor",{userId,email:target.email,name:target.name},now).run();}catch{console.error("Editor mail not queued");}}
  return Response.json({ok:true,userId,role:nextRole});
}
