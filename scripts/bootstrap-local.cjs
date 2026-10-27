'use strict';
// Prepare local assets without creating or replacing backend credentials.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),config=path.join(root,'auth-config.js');
try{
  fs.writeFileSync(config,"// Local public configuration for an authorized development backend.\nwindow.CC_SUPABASE = {url:'',key:''};\n",{flag:'wx'});
  console.log('Created empty local auth-config.js; no backend connected.');
}catch(error){if(error.code!=='EEXIST')throw error;console.log('Existing auth-config.js preserved.');}
execFileSync(process.execPath,[path.join(root,'scripts/prepare-dist.cjs')],{cwd:root,stdio:'inherit'});
