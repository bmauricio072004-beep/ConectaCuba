'use strict';
// Builds a local, standalone review artifact. Never writes fixtures into dist/.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const svg='data:image/svg+xml;base64,'+Buffer.from(read('icon.svg')).toString('base64');
let html=read('app/index.html');
html=html.replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/g,'');
html=html.replace(/<link\b[^>]*>/g,tag=>{
 const css=tag.match(/href="\/([^"?]+\.css)/);
 if(css)return '<style>'+read(css[1])+'</style>';
 return tag.includes('rel="icon"')?'<link rel="icon" href="'+svg+'">':'';
});
html=html.replaceAll('src="/icon.svg"','src="'+svg+'"');
html=html.replace('<title>ConectaCuba · Empleos y mi cuenta</title>','<title>ConectaCuba v17 · Prueba navegable</title>');
html=html.replace('<meta name="theme-color"',`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><meta name="theme-color"`);
const toolbar=`<section id="preview-tools" aria-label="Controles de prueba"><div><strong>ConectaCuba v17 · Prueba</strong><small>Datos ficticios. Sin envíos reales. No introduzcas datos personales.</small></div><div><label for="preview-role">Ver como </label><select id="preview-role"><option value="person">Persona</option><option value="business">Negocio</option></select><button type="button" id="preview-reset">Reiniciar prueba</button></div></section><style>#preview-tools{background:#103b53;color:#fff;padding:10px 16px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font:12px/1.4 system-ui}#preview-tools small{display:block;color:#d3e4df;font-size:11px}#preview-tools select,#preview-tools button{font:12px system-ui;padding:7px;border:1px solid #819c9c;border-radius:5px;background:#f8f6f1;color:#20333a;margin-left:5px}#install-app,[data-action="install-app"]{display:none!important}</style>`;
html=html.replace('<body class="app-body">','<body class="app-body">'+toolbar);
const prelude=`(() => {
 const key='conectacuba-v17-preview-shared-v1';
 let memory=null,storage=null;
 try {storage=window.sessionStorage;storage.setItem(key+'-probe','1');storage.removeItem(key+'-probe');}catch{}
 window.CC_PREVIEW_STORE={read(){try{return JSON.parse(storage?storage.getItem(key):memory);}catch{return null;}},write(value){const text=JSON.stringify(value);if(storage){try{storage.setItem(key,text);return;}catch{storage=null;}}memory=text;}};
 const params=new URLSearchParams(location.search);const role=params.get('role')==='business'?'business':'person';
 document.getElementById('preview-role').value=role;
 function openRole(){const url=new URL(location.href);url.search='?role='+document.getElementById('preview-role').value+'&catalog=1';url.hash=document.getElementById('preview-role').value==='business'?'cuenta/jobs':'empleos';location.href=url.href;}
 document.getElementById('preview-role').onchange=openRole;
 document.getElementById('preview-reset').onclick=()=>{if(confirm('¿Reiniciar las ofertas, el CV y las postulaciones de esta prueba?')){if(storage)storage.removeItem(key);memory=null;openRole();}};
 window.fetch=async()=>{throw new Error('Esta prueba no realiza conexiones de red.');};
 function stopPreviewAction(event,message){event.preventDefault();event.stopImmediatePropagation();alert(message);}
 document.addEventListener('click',event=>{
   const target=event.target.closest('button,a,input');if(!target)return;
   if(target.id==='account-signout'||target.dataset.action==='signout'||target.dataset.action==='relogin')return stopPreviewAction(event,'Esta prueba mantiene un perfil ficticio abierto. Usa el selector Persona / Negocio de la barra superior para cambiar de perfil o Reiniciar prueba para empezar de nuevo.');
   if(['forgot','join','person','business','login'].includes(target.dataset.open)||target.dataset.action==='resend')return stopPreviewAction(event,'El registro, el acceso y las contraseñas reales no están disponibles en esta prueba. No se envían correos. Usa Persona / Negocio en la barra superior.');
   if(target.id==='business-image'||target.closest('form[data-form="logo"]'))return stopPreviewAction(event,'La subida de imágenes está desactivada en esta prueba. No se enviará ningún archivo.');
   const link=event.target.closest('a');if(link&&link.getAttribute('href')&&!link.getAttribute('href').startsWith('#'))return stopPreviewAction(event,'Este enlace externo está desactivado en la prueba.');
 },true);
 document.addEventListener('submit',event=>{
   const form=event.target;
   if(['login','person','business','forgot','reset','logo'].includes(form.dataset.form))stopPreviewAction(event,'Esta acción real no está disponible en la prueba: no se crean cuentas, no se cambian contraseñas, no se envían correos ni se suben archivos.');
 },true);
 if(!storage)document.querySelector('#preview-tools small').textContent+=' Este navegador reiniciará los datos al cambiar de rol.';
})();`;
let fixture=read('scripts/fixtures/hiring-backend.js');
fixture=fixture.replace("const params=new URLSearchParams(location.search),person=params.get('role')==='person'", "const params=new URLSearchParams(location.search||'?role=person&catalog=1'),person=params.get('role')!=='business'");
let auth=read('auth.js').replace(/    if\('serviceWorker' in navigator\)navigator\.serviceWorker\.register\('\/sw\.js'\)\.then\(reg=>reg\.update\(\)\)\.catch\(\(\)=>\{\}\);/, '    // Service worker intentionally disabled in the standalone preview.');
auth=auth.replaceAll('src="/icon.svg"','src="'+svg+'"');
// Inline modules after the original body so the DOM exists; preserve module order.
const scripts=[prelude,fixture,read('hiring.js'),read('opportunities.js'),auth].map(s=>'<script>'+s.replace(/<\/script/gi,'<\\/script')+'</script>').join('\n');
html=html.replace('</body>',scripts+'</body>');
const out=path.join(root,'preview');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'ConectaCuba-v17-prueba.html'),html);
console.log('Vista autónoma: preview/ConectaCuba-v17-prueba.html');
