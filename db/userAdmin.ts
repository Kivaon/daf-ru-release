export type DeleteUserResult={ok:true}|{ok:false;status:number;error:string};

// Admins and authors of published articles are never deleted; private drafts go with the user.
export async function deleteUser(db:D1Database,userId:string):Promise<DeleteUserResult>{
 const user=await db.prepare('SELECT role FROM users WHERE user_id = ?').bind(userId).first<{role:string}>();
 if(!user)return {ok:false,status:404,error:'Пользователь не найден'};
 if(user.role==='admin')return {ok:false,status:403,error:'Администратора удалить нельзя'};
 const authored=await db.prepare('SELECT COUNT(*) AS n FROM articles WHERE author_user_id = ?').bind(userId).first<{n:number}>();
 if(authored&&authored.n>0)return {ok:false,status:409,error:`У пользователя есть опубликованные статьи (${authored.n}), удалить его нельзя`};
 await db.batch([
  db.prepare('DELETE FROM editor_batches WHERE user_id = ?').bind(userId),
  db.prepare("DELETE FROM users WHERE user_id = ? AND role != 'admin'").bind(userId),
 ]);
 return {ok:true};
}
