"use client";
import { useEffect,useState } from "react";

type ManagedUser={userId:string;email:string;name:string;role:"reader"|"editor"|"admin";createdAt:string};
export default function AdminClient(){
  const [users,setUsers]=useState<ManagedUser[]>([]),[message,setMessage]=useState("Загружаем пользователей…");
  useEffect(()=>{fetch("/api/users").then(async response=>{const data=await response.json() as {error?:string;users:ManagedUser[]};if(!response.ok)throw new Error(data.error);setUsers(data.users);setMessage("");}).catch(reason=>setMessage(String(reason)));},[]);
  const change=async(userId:string,role:"reader"|"editor")=>{setMessage("Сохраняем право…");try{const response=await fetch("/api/users",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({userId,role})}),data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error);setUsers(items=>items.map(item=>item.userId===userId?{...item,role}:item));setMessage(role==="editor"?"Право редактора выдано.":"Право редактора отозвано.");}catch(reason){setMessage(reason instanceof Error?reason.message:String(reason));}};
  return <main className="adminPage"><header><a href="/">← Вернуться к листу</a><div><small>DAF-RU · ДОСТУП</small><h1>Пользователи</h1><p>Новый пользователь появляется здесь после первого входа.</p></div></header><section>{users.map(item=><article key={item.userId}><div><b>{item.name}</b><span>{item.email}</span><small>Первый вход: {new Date(item.createdAt).toLocaleDateString("ru-RU")}</small></div>{item.role==="admin"?<strong>Администратор</strong>:<button className={item.role==="editor"?"revoke":"grant"} onClick={()=>change(item.userId,item.role==="editor"?"reader":"editor")}>{item.role==="editor"?"Отозвать право":"Сделать редактором"}</button>}</article>)}{message&&<p className="adminMessage">{message}</p>}</section></main>;
}
