'use strict';
// Online review output, separate from production dist and the real backend.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
execFileSync(process.execPath,[path.join(root,'scripts/build-preview.cjs')],{cwd:root,stdio:'inherit'});
const out=path.join(root,'preview-site');
// Remove only this generated output, never source or production dist.
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(path.join(out,'app'),{recursive:true});
const assets=['index.html','styles.css','landing.css','landing.js','icon.svg','icon-192.png','icon-512.png'];
for(const name of assets)fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.copyFileSync(path.join(root,'preview/ConectaCuba-v17-prueba.html'),path.join(out,'app/index.html'));
// Do not install a service worker for this review environment.
const landingScript=fs.readFileSync(path.join(out,'landing.js'),'utf8').replace("    if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});",'    // Service worker disabled for online review.');
fs.writeFileSync(path.join(out,'landing.js'),landingScript);
fs.rmSync(path.join(out,'sw.js'),{force:true});
const rootPage=fs.readFileSync(path.join(out,'index.html'),'utf8').replace(/<link\b[^>]*rel="manifest"[^>]*>/g,'');
fs.writeFileSync(path.join(out,'index.html'),rootPage);
console.log('Online review ready in preview-site/. App entry: /app/?role=person&catalog=1#empleos');
