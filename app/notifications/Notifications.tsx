'use client';
import {useState} from 'react';
export default function Notifications(){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function test(){setBusy(true);try{const r=await fetch('/api/notifications',{method:'POST'}),data=await r.json() as {error?:string;message?:string};setMessage(data.error||data.message||'Ответ получен');}catch{setMessage('Не удалось связаться с сервером. Повторите попытку.');}finally{setBusy(false);}}
 return <main className="translationMap" style={{maxWidth:760,margin:'auto'}}><a href="/translation-map">← Карта перевода</a><h1>Почтовые уведомления</h1><p>Получатель: <strong>pitronot@proton.me</strong></p><p>Одно письмо при первой публикации полноценной статьи: перевод, объяснение и все предусмотренные источником комментарии. Составная реплика — одно письмо.</p><p>Черновики и повторные сохранения не создают писем. При ошибке отправки перевод сохраняется; повторная попытка выполняется при следующих посещениях сайта.</p><button onClick={test} disabled={busy}>{busy?'Проверяем отправку…':'Отправить тестовое письмо'}</button><p role="status">{message}</p></main>;
}
