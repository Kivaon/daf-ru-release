// Raw script (string) run before the app starts: collects errors when the address has ?debug=1
export const debugBootScript = `(function(){try{
if(!/[?&]debug=1(&|$)/.test(location.search))return;
var d=window.__dbg={errors:[],t0:Date.now()};
function add(k,m){d.errors.push(((Date.now()-d.t0)/1000).toFixed(1)+'s '+k+': '+String(m).slice(0,400));}
window.addEventListener('error',function(e){if(e.target&&e.target!==window&&(e.target.src||e.target.href)){add('resource',(e.target.src||e.target.href));}else{add('error',(e.message||'')+' @'+String(e.filename||'').split('/').pop()+':'+e.lineno+':'+e.colno);}},true);
window.addEventListener('unhandledrejection',function(e){var r=e.reason;add('promise',r&&r.stack?r.stack.split('\\n').slice(0,3).join(' | '):r);});
var ce=console.error;console.error=function(){try{add('console.error',[].slice.call(arguments).map(String).join(' '));}catch(x){}return ce.apply(console,arguments);};
}catch(x){}})();`;
