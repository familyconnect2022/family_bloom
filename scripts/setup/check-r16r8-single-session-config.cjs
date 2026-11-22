#!/usr/bin/env node
'use strict';
// Android release must never silently ship with all-account sessions disabled.
// Safe to use alongside the signing BAT's strict production .env gate.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const env=Object.fromEntries((fs.existsSync(path.join(root,'.env'))?fs.readFileSync(path.join(root,'.env'),'utf8'):'').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).map(s=>{const p=s.indexOf('=');return p>0?[s.slice(0,p),s.slice(p+1)]:[s,''];}));
const read=k=>env[k]??process.env[k]??'';
if(read('EXPO_PUBLIC_SINGLE_SESSION_ENABLED')!=='1')throw Error('All-account sessions must be ON (EXPO_PUBLIC_SINGLE_SESSION_ENABLED=1) in the Android release .env.');
const raw=read('EXPO_PUBLIC_SINGLE_SESSION_API_URL');let url;
try{url=new URL(raw)}catch{throw Error('Production Session Gateway URL missing/invalid.');}
if(url.protocol!=='https:'||url.username||url.password||url.hash||!url.pathname.endsWith('/api/session')||url.hostname.includes('REPLACE_'))throw Error('Session Gateway must use real HTTPS /api/session Production URL.');
console.log('[ANDROID SINGLE SESSION PRODUCTION CONFIG PASS] All Firebase accounts enabled.');
