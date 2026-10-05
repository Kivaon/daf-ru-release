import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { registerAndGetRole } from "../roles";
import AdminClient from "./AdminClient";

export const dynamic="force-dynamic";
export default async function AdminPage(){
  const user=await getChatGPTUser();
  if(!user)redirect("/signin-with-chatgpt?return_to=%2Fadmin");
  if(await registerAndGetRole(user)!=="admin")redirect("/");
  return <><p style={{padding:"1rem 2rem"}}><a href="/notifications">Почтовые уведомления</a></p><AdminClient/></>;
}
