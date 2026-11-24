#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');const read=n=>fs.readFileSync(path.join(root,n),'utf8');
for(const game of ['chess','xiangqi']){const s=read('src/app/(home)/(games)/home-'+game+'.tsx');assert.match(s,/Có thể mời/);assert.doesNotMatch(s,/Lời mời Firebase|Chưa kết nối Firebase|từ Firebase|qua Firebase|Đồng hồ do máy chủ|bàn cờ Full|message:e\.message|message:e instanceof Error/);assert.match(s,/createFirebaseInvitation/);assert.match(s,/watchInvitationSlots/);}
const hub=read('src/app/(home)/(games)/home-games.tsx');assert.match(hub,/router.push\("\/home-chess"/);assert.match(hub,/router.push\("\/home-xiangqi"/);assert.doesNotMatch(hub,/Mini,|máy chủ/);
console.log('[PASS] Android game lobby public copy and native navigation');
