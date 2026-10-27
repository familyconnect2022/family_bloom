#!/usr/bin/env node
'use strict';
/** Sau khi AUTO UPDATE DA SAO LUU: xoa cac duong dan BAT/test da chuyen.
 *  Luon dua vao migration manifest, KHONG quet hoac xoa file khong ro nguon goc.
 *  File cu co the tim lai trong last-backup.txt/project-source/. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const dest=path.resolve(process.argv[2]||'');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/setup/script-migration-map.json'),'utf8'));
if(!process.argv[2]||dest===root||!fs.existsSync(path.join(dest,'package.json'))||
 JSON.parse(fs.readFileSync(path.join(dest,'package.json'),'utf8')).name!=='family-bloom'){
 console.error('[DUNG] Chi duoc don source project Family Bloom DA SAO LUU, khong duoc don thu muc FULL ZIP.');process.exit(2);
}
const items=[...Object.keys(manifest.movedFiles).map(n=>'scripts/'+n),...manifest.retiredRootBat,
  'scripts/android/build/Family_Bloom_Android_Test_App_CLEAN_RELEASE.bat',
  'scripts/android/build/Family_Bloom_Android_Build_APK_ONLY.bat',
  'scripts/setup/settup.bat'];
let removed=0,absent=0;
for(const rel of items){
 const full=path.join(dest,rel);
 if(!full.startsWith(dest+path.sep))throw new Error('Unsafe migration path: '+rel);
 if(!fs.existsSync(full)){absent++;continue;}
 const stat=fs.lstatSync(full);
 if(stat.isSymbolicLink()||!stat.isFile())throw new Error('Refusing unsafe path: '+rel);
 fs.unlinkSync(full);removed++;
}
console.log('[DON FILE CU] '+removed+' file duong dan cu da duoc don; '+absent+' khong ton tai. Ban backup van giu nguon truoc cap nhat.');
