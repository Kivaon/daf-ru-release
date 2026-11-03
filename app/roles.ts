import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "./chatgpt-auth";
import { queueUserMail } from "../db/userMail";

export type UserRole = "guest"|"reader"|"editor"|"admin";

const adminEmail = () => String((env as unknown as Record<string,unknown>).DAFRU_ADMIN_EMAIL || "").trim().toLowerCase();

export async function registerAndGetRole(user:ChatGPTUser|null):Promise<UserRole>{
  if(!user)return "guest";
  const now=new Date().toISOString(), isAdmin=Boolean(adminEmail() && user.email.toLowerCase()===adminEmail());
  const existing=await env.DB.prepare("SELECT role FROM users WHERE user_id = ?").bind(user.userId).first<{role:string}>();
  const role:Exclude<UserRole,"guest">=isAdmin?"admin":existing?.role==="editor"||existing?.role==="admin"?existing.role:"reader";
  await env.DB.prepare("INSERT INTO users (user_id,email,name,role,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,name=excluded.name,role=?,updated_at=excluded.updated_at").bind(user.userId,user.email,user.displayName,role,now,now,role).run();
  if(!existing&&role!=="admin"){try{await queueUserMail(env.DB,"welcome",{userId:user.userId,email:user.email,name:user.displayName}).run();}catch{console.error("Welcome mail not queued");}}
  return role;
}

export const canEdit = (role:UserRole) => role==="editor"||role==="admin";
