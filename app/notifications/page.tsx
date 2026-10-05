import {redirect} from 'next/navigation';
import {getChatGPTUser} from '../chatgpt-auth';
import {registerAndGetRole} from '../roles';
import Notifications from './Notifications';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();if(!user)redirect('/signin-with-chatgpt?return_to=%2Fnotifications');if(await registerAndGetRole(user)!=='admin')redirect('/');return <Notifications/>;}
