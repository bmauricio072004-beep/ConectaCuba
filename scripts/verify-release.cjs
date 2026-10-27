'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const assets=['index.html','app/index.html','auth.js','auth-config.js','hiring.js','hiring.css','opportunities.js','ios.css','app.css','styles.css','landing.css','landing.js','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
function inspect(dir){
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    assert(!item.name.startsWith('_qa'),'Local test fixtures must not be published: '+path.join(dir,item.name));
    if(item.isDirectory())inspect(path.join(dir,item.name));
  }
}
inspect('dist');
for(const file of assets)assert(fs.readFileSync(file).equals(fs.readFileSync(path.join('dist',file))),'Published asset differs from its source: '+file);
for(const file of ['index.html','app/index.html']){
  const html=fs.readFileSync(path.join('dist',file),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'Duplicate HTML IDs: '+file);
  for(const tag of html.matchAll(/<(?:script|link|img)\b[^>]*>/g)){
    const asset=tag[0].match(/(?:src|href)="(\/[^"]*)"/)?.[1];
    if(asset)assert(fs.statSync(path.join('dist',asset.split('?')[0])).isFile(),'Missing asset: '+asset);
  }
}
const app=fs.readFileSync('dist/app/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
const revision=app.match(/src="\/auth\.js\?v=(\d+)"/)?.[1];
assert(revision&&sw.includes("conectacuba-shell-v"+revision),'Service-worker and app revisions must agree');
assert(app.indexOf('/auth-config.js?')<app.indexOf('/hiring.js?')&&app.indexOf('/hiring.js?')<app.indexOf('/opportunities.js?')&&app.indexOf('/opportunities.js?')<app.indexOf('/auth.js?'),'The app scripts must load in dependency order');
assert(sw.includes('/opportunities.js?v='+revision)&&sw.includes('/ios.css?v='+revision)&&sw.includes('/hiring.js?v='+revision)&&sw.includes('/hiring.css?v='+revision),'Hiring assets must be available offline');
assert(JSON.parse(fs.readFileSync('manifest.webmanifest','utf8')).start_url.startsWith('/app/'));
console.log('PASS: source/build parity, no local fixtures, HTML assets/IDs, script order and app/offline revisions.');
