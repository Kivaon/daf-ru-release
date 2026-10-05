import {parseModelResponse, suggestClosingBrackets} from './parseModelResponse.ts';

/** Recovery is syntactic only; callers still validate refs and article completeness. */
export function readModelResponse(text:string){
 try{return {value:parseModelResponse(text),suffix:''};}catch{
  const repair=suggestClosingBrackets(text);
  if(repair)return {value:JSON.parse(repair.text) as unknown,suffix:repair.suffix};
  throw new Error(diagnoseResponse(text));
 }
}

/** Deterministic JSON grammar walk, independent of Safari/V8 error wording. */
export function diagnoseResponse(text:string):string{
 let i=0;
 const scopes:{ref?:string}[]=[];
 const whitespace=()=>{while(i<text.length&&/\s/.test(text[i]))i++;};
 const fail=(message:string,path:string,position=i):never=>{
  const before=text.slice(0,position),line=before.split('\n').length,column=position-(before.lastIndexOf('\n')+1)+1;
  const ref=[...scopes].reverse().find(s=>s.ref)?.ref;
  const fragment=text.slice(Math.max(0,position-35),position)+'▸'+text.slice(position,position+35);
  throw new Error(`${message}${path?` Поле: ${path}.`:''}${ref?` Ref: ${ref}.`:''} Строка ${line}, столбец ${column}. Рядом: ${fragment.replace(/\s+/g,' ')}`);
 };
 const string=(path:string):string=>{
  const start=i++;while(i<text.length){
   const ch=text[i++];
   if(ch==='"'){try{return JSON.parse(text.slice(start,i));}catch{return fail('Некорректная запись строки.',path,start);}}
   if(ch.charCodeAt(0)<32)fail('Неэкранированный перенос строки или управляющий символ внутри текста. Используйте \\n для переноса.',path,i-1);
   if(ch==='\\'){
    if(i>=text.length)fail('Ответ оборван после обратной косой черты внутри строки. Запросите полный ответ.',path);
    const escape=text[i++];
    if(escape==='u'){for(let n=0;n<4;n++){if(!/[0-9a-fA-F]/.test(text[i]||'!'))fail('После \\u нужны четыре шестнадцатеричные цифры.',path);i++;}}
    else if(!'"\\/bfnrt'.includes(escape))fail('Недопустимая escape-последовательность после обратной косой черты.',path,i-1);
   }
  }
  return fail('Не закрыта строка: возможно, ответ оборван внутри текста. Запросите полный ответ; текст автоматически не дописывается.',path);
 };
 const value=(path:string,depth:number):unknown=>{
  if(depth>100)fail('Слишком глубокая вложенность JSON.',path);
  whitespace();const ch=text[i];
  if(ch==='"')return string(path);
  if(ch==='{'||ch==='['){
   const object=ch==='{',close=object?'}':']';i++;whitespace();
   const scope:{ref?:string}={};scopes.push(scope);let index=0;
   if(text[i]===close){i++;scopes.pop();return;}
   while(true){
    whitespace();if(i>=text.length)fail(`Ответ оборван: ожидается ${object?'поле в кавычках':'элемент массива'} или закрывающая скобка ${close}.`,path);
    if(text[i]==='}'||text[i]===']')fail(`Лишняя или несовпадающая скобка «${text[i]}»; ожидается ${object?'поле':'значение'}.`,path);
    let key='';
    if(object){if(text[i]!=='"')fail('Название поля должно быть в двойных кавычках.',path);key=string(path);whitespace();if(text[i]!==':')fail('После названия поля ожидается двоеточие «:».',path?`${path}.${key}`:key);i++;}
    const child=object?(path?`${path}.${key}`:key):`${path}[${index}]`;
    const result=value(child,depth+1);if(object&&key==='ref'&&typeof result==='string')scope.ref=result;
    whitespace();if(text[i]===close){i++;scopes.pop();return;}
    if(text[i]==='}'||text[i]===']')fail(`Несовпадающая скобка «${text[i]}»: ожидается «${close}».`,path);
    if(i>=text.length)fail(`Не закрыт ${object?'объект':'массив'}: ожидается «${close}».`,path);
    if(text[i]!==',')fail('Ожидается запятая между полями или элементами. Возможно, внутри текста есть неэкранированные кавычки.',child);
    i++;whitespace();if(text[i]===close)fail('Лишняя запятая перед закрывающей скобкой.',path);index++;
   }
  }
  if(i>=text.length)fail('Ответ оборван: отсутствует значение поля.',path);
  if(ch==='}'||ch===']')fail('Значение отсутствует перед закрывающей скобкой.',path);
  const token=text.slice(i).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/)?.[0];
  if(token){i+=token.length;return;}
  fail('Некорректное значение. Текст должен быть в двойных кавычках; проверьте место ошибки.',path);
 };
 try{
  whitespace();if(!text.trim())return 'Ответ пуст. Вставьте JSON-ответ AI.';
  if(text.trimStart().startsWith('```'))return 'Ответ обёрнут в Markdown. Скопируйте только JSON между строками с ```.';
  value('',0);whitespace();if(i<text.length)fail('После JSON есть лишний текст или закрывающая скобка.','');
 }catch(error){return error instanceof Error?error.message:'Не удалось разобрать JSON.';}
 return 'Не удалось разобрать JSON. Проверьте кавычки и структуру ответа.';
}
