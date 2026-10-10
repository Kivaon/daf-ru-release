import {parseModelResponse, suggestClosingBrackets, recoverResponseSyntax} from './parseModelResponse.ts';

/** Recovery is syntactic only; callers still validate refs and article completeness. */
export function readModelResponse(text:string){
 let recoveredText:string|undefined,value:unknown,suffix='';
 try {value=parseModelResponse(text,recovered=>{recoveredText=recovered;});}
 catch {
  let candidate=text;
  try {candidate=recoverResponseSyntax(text);} catch { /* diagnose original malformed quotes */ }
  const repair=suggestClosingBrackets(candidate);
  if(!repair)throw new Error(diagnoseResponse(candidate));
  value=JSON.parse(repair.text);suffix=repair.suffix;
  if(candidate!==text)recoveredText=repair.text;
 }
 // JSON.parse silently discards duplicate keys. Inspect the same accepted source
 // before schema import so no text is lost, including escaped equivalent keys.
 const diagnostic=diagnoseResponse(recoveredText ?? text+suffix,true);
 if(diagnostic)throw new Error(diagnostic);
 return {value,suffix,...(recoveredText?{recoveredText}:{})};
}

/** Deterministic JSON grammar walk, independent of Safari/V8 error wording. */
export function diagnoseResponse(text:string,validate=false):string{
 let i=0;
 const scopes:{ref?:string}[]=[];
 const whitespace=()=>{
  while(i<text.length){
   const char=text[i];
   if(/[ \t\r\n]/.test(char)){i++;continue;}
   const names:Record<string,string>={'\u00a0':'неразрывный пробел','\u202f':'узкий неразрывный пробел','\ufeff':'BOM','\u200b':'пробел нулевой ширины','\u200c':'невидимый разделитель','\u200d':'невидимый соединитель','\u200e':'маркер направления слева направо','\u200f':'маркер направления справа налево','\u2060':'невидимый соединитель слов'};
   if(names[char] || /[\u202a-\u202e\u2066-\u2069]/.test(char) || /\s/.test(char))fail(`Недопустимый символ вне текста: ${names[char]||'пробельный символ или маркер направления'} (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0')}). Удалите его между полями JSON.`, '');
   break;
  }
 };
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
   const scope:{ref?:string}={};scopes.push(scope);let index=0;const keys=new Set<string>();
   if(text[i]===close){i++;scopes.pop();return;}
   while(true){
    whitespace();if(i>=text.length)fail(`Ответ оборван: ожидается ${object?'поле в кавычках':'элемент массива'} или закрывающая скобка ${close}.`,path);
    if(text[i]==='}'||text[i]===']')fail(`Лишняя или несовпадающая скобка «${text[i]}»; ожидается ${object?'поле':'значение'}.`,path);
    let key='';
    if(object){if(text[i]!=='"')fail('Название поля должно быть в двойных кавычках.',path);const keyPosition=i;key=string(path);if(keys.has(key))fail(`Повторяется поле «${key}». Объедините или удалите повтор; значения автоматически не заменяются.`,path?`${path}.${key}`:key,keyPosition);keys.add(key);whitespace();if(text[i]!==':')fail('После названия поля ожидается двоеточие «:».',path?`${path}.${key}`:key);i++;}
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
 return validate?'':'Не удалось разобрать JSON. Проверьте кавычки и структуру ответа.';
}
