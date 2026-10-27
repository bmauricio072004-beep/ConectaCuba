'use strict';
// Utilidad de empaquetado añadida a esta exportación; no cambia la aplicación.
const fs=require('node:fs'),path=require('node:path');
const assets=["index.html", "app/index.html", "auth.js", "auth-config.js", "hiring.js", "hiring.css", "opportunities.js", "ios.css", "app.css", "styles.css", "landing.css", "landing.js", "sw.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];
function cleanQA(dir){
  if(!fs.existsSync(dir))return;
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,item.name);
    if(item.name.startsWith('_qa'))fs.rmSync(file,{recursive:true,force:true});
    else if(item.isDirectory())cleanQA(file);
  }
}
cleanQA('dist');
for(const name of assets){
  const dest=path.join('dist',name);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(name,dest);
}
console.log('Activos copiados a dist; archivos temporales _qa eliminados.');
