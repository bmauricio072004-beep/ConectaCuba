'use strict';
const fs=require('fs');
fs.mkdirSync('dist/app',{recursive:true});
const hiringScript=/<script defer src="\/hiring\.js\?v=[^"]+">/;
let app=fs.readFileSync('app/index.html','utf8');
if(!hiringScript.test(app))throw new Error('The local backend must be loaded before hiring.js. Check the app script order.');
app=app.replace(hiringScript,tag=>'<script defer src="/app/_qa_hiring_backend.js?v=local"></script>'+tag);
app=app.replace('<title>ConectaCuba · Empleos y mi cuenta</title>','<title>ConectaCuba · Prueba local de contratación</title>');
const stamp=Date.now();app=app.replace(/\?v=([^"]+)/g,(_match,version)=>'?v='+version+'-qa-'+stamp);
fs.writeFileSync('dist/app/_qa_hiring.html',app);
fs.copyFileSync('scripts/fixtures/hiring-backend.js','dist/app/_qa_hiring_backend.js');
const widths=[320,360,390,768].map(w=>'<button type="button" onclick="document.querySelector(&quot;iframe&quot;).style.width=&quot;'+w+'px&quot;">'+w+' px</button>').join('');
const scenarios=[['Negocio',''],['Persona','?role=person'],['Invitado','?role=person&guest=1&catalog=1'],['Nombres largos','?role=person&long=1&catalog=1'],['Sin datos','?role=person&empty=1'],['Administración','?role=person&admin=1&reviews=1#cuenta/review-admin']].map(([label,query])=>'<button type="button" onclick="document.querySelector(&quot;iframe&quot;).src=&quot;/app/_qa_hiring.html'+query.replaceAll('&','&amp;')+'&quot;">'+label+'</button>').join('');
const wrapper='<!doctype html><html lang="es"><meta charset="utf-8"><title>Comprobación móvil de contratación</title><style>body{margin:16px;background:#e3e5dc;font:14px system-ui}button{margin:4px;padding:9px;border:1px solid #b4c9c8;border-radius:8px;background:#f8f6f1}iframe{display:block;margin-top:12px;height:820px;width:360px;border:1px solid #b4c9c8;border-radius:12px;background:#f0ede6}</style><div>'+widths+'</div><div>'+scenarios+'</div><iframe id="mobile" title="ConectaCuba en móvil" src="/app/_qa_hiring.html"></iframe></html>';
fs.writeFileSync('dist/_qa_hiring_mobile.html',wrapper);
const overview='<!doctype html><html lang="es"><meta charset="utf-8"><title>ConectaCuba · Vista de prueba</title><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#e3e5dc;font:14px -apple-system,BlinkMacSystemFont,system-ui;color:#304a70}header{display:flex;justify-content:space-between;align-items:center;max-width:1120px;margin:0 auto 14px;gap:20px;height:35px}header strong{font-size:18px}header span{font-size:12px;color:#6b82a3}.phones{max-width:1120px;margin:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}iframe{width:100%;height:820px;border:0;border-radius:24px;box-shadow:0 8px 25px #24427212;background:#e8edf5}</style><header><strong>ConectaCuba</strong><span>Vista de prueba · Datos ficticios</span></header><div class="phones"><iframe id="feed" title="Empleos" src="/app/_qa_hiring.html?role=person&amp;catalog=1&amp;reviews=1"></iframe><iframe id="offer" title="Oferta" src="/app/_qa_hiring.html?role=person&amp;reviews=1#oferta/22222222-2222-4222-8222-222222222221"></iframe><iframe id="account" title="Cuenta" src="/app/_qa_hiring.html?role=person#cuenta/menu"></iframe></div></html>';
fs.writeFileSync('dist/_qa_overview.html',overview);
console.log('Local-only hiring fixtures generated. Remove all dist/**/_qa* files before publication.');

