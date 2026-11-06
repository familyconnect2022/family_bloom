#!/usr/bin/env node
'use strict';
/**
 * Tao danh muc de doc va tra cuu, khong sua ma nguon runtime.
 * Ket qua chi la CHI MUC TEN/VI TRI, khong phai tai lieu phan tich moi ham.
 * Node thuần; khong can npm install, Firebase hay internet.
 */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'document/guides/maintenance-h25r2r7r2r3r4');
fs.mkdirSync(out,{recursive:true});
const excludes=new Set(['node_modules','dist','build','.git','.expo','android','ios','.gradle','coverage']);
function files(folder){
 let arr=[];if(!fs.existsSync(folder))return arr;
 function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(excludes.has(item.name))continue;
  const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else if(item.isFile())arr.push(p);
 }}walk(folder);return arr;
}
const relative=p=>path.relative(root,p).replace(/\\/g,'/');
const groups=[['Ứng dụng React Native','src'],['Server Render','server/src'],['Native Android module','modules/family-bloom-overlay/android/src/main']];
const api=[];const stats={};
const patterns=[/\bexport\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*[<(]/g,/\bexport\s+(?:declare\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*[=:]/g,/\bexport\s+(?:default\s+)?class\s+([A-Za-z_$][\w$]*)/g];
for(const [group,dir] of groups){const items=files(path.join(root,dir)).filter(p=>/\.(?:tsx?|jsx?|kt)$/.test(p));stats[group]=items.length;
 for(const p of items){const src=fs.readFileSync(p,'utf8');if(p.endsWith('.kt')){
   const match=/\b(?:fun|class)\s+([A-Za-z_][\w]*)\s*[<(]/g;for(const m of src.matchAll(match))api.push({group,file:relative(p),line:1+src.slice(0,m.index).split('\n').length-1,name:m[1],kind:'Kotlin fun/class'});
 }else for(const pattern of patterns)for(const m of src.matchAll(pattern))api.push({group,file:relative(p),line:src.slice(0,m.index).split('\n').length,name:m[1],kind:'export'});
 }}
const meaning=f=> f.startsWith('src/app/')?'Màn hình / route': f.startsWith('src/features/study')?'Hỏi đáp / công thức Super Bloom': f.startsWith('src/services/bootstrap')?'Khởi động và cache': f.startsWith('src/services/familyGraph')?'Phả hệ': f.startsWith('src/services/games/nativeChess')?'Cờ vua độc lập': f.startsWith('src/services/games/nativeXiangqi')?'Cờ tướng độc lập': f.startsWith('src/services/calendar')?'Lịch gia đình': f.startsWith('src/services/firebase')?'Ánh xạ đường dẫn Firebase':f.startsWith('src/components')?'Thành phần UI':f.startsWith('server/src/chess')?'Server Cờ vua':f.startsWith('server/src/xiangqi')?'Server Cờ tướng': f.startsWith('server/src/games')?'Khóa phiên / lời mời': f.includes('overlay')?'Native Surface': 'Xem triển khai trong file';
api.sort((a,b)=>a.group.localeCompare(b.group)||a.file.localeCompare(b.file)||a.line-b.line);
let md=`# Danh mục API/hàm để tra cứu\n\nSinh tự động bằng \`node scripts/maintenance/generate-vietnamese-code-map.cjs\`.\n\n**Lưu ý quan trọng:** đây là bảng *tên và vị trí định nghĩa* do công cụ quét tĩnh tìm được, không phải khẳng định mọi hàm hay suy diễn hành vi cụ thể. Đối với các hàm nội bộ, callbacks và dynamic exports, mở file tương ứng để xem. Muốn hiểu luồng chạy, hãy bắt đầu bằng \`01-KIEN-TRUC.md\` và \`03-LUONG-HAM-QUAN-TRONG.md\`.\n\nSố file nguồn đã quét: ${Object.values(stats).reduce((a,b)=>a+b,0)}. Số khai báo được lập chỉ mục: ${api.length}.\n\n| Phân hệ | File : dòng | Hàm / API | Gợi ý khu vực |\n|---|---|---|---|\n`;
for(const a of api)md+=`| ${a.group} | \`${a.file}:${a.line}\` | \`${a.name}\` | ${meaning(a.file)} |\n`;
fs.writeFileSync(path.join(out,'05-DANH-MUC-HAM-TU-DONG.md'),md);
const names=files(path.join(root,'scripts')).filter(f=>/\.(?:bat|cjs|js|ps1)$/.test(f)).map(relative).sort();
let smd=`# Bản đồ script/BAT (tra cứu)\n\nSinh tự động, giữ nguyên đường dẫn đã được các BAT và npm scripts tham chiếu. **Không tùy ý di chuyển script lịch sử** vì có thể phá đường dẫn và bài kiểm thử.\n\nSố script: ${names.length}.\n\n| Đường dẫn | Vai trò / cách dùng |\n|---|---|\n`;
function kind(f){return f.startsWith('scripts/android/build/')?'Biên dịch/phát hành Android':f.startsWith('scripts/android/maintenance/')?'Cập nhật/giữ nguồn sạch':f.startsWith('scripts/android/eas/')?'EAS Build/OTA':f.startsWith('scripts/android/dev/')?'Lập trình, debug':f.startsWith('scripts/android/verify/')?'Kiểm tra APK/native':f.startsWith('scripts/firebase/')?'Triển khai Firebase (xác nhận trước khi chạy)':f.startsWith('scripts/setup/')?'Cài đặt và kiểm tra phụ thuộc':f.startsWith('scripts/maintenance/')?'Bảo trì, sinh tài liệu':f.startsWith('scripts/music/')?'Công cụ catalog âm nhạc':f.startsWith('scripts/test-')?'Kiểm thử hồi quy; không phải lệnh cho người dùng':f.startsWith('scripts/windows/')?'Công cụ web Windows':'Công cụ hỗ trợ / lịch sử';}
for(const f of names)smd+=`| \`${f}\` | ${kind(f)} |\n`;
fs.writeFileSync(path.join(out,'04-DANH-MUC-SCRIPTS-TU-DONG.md'),smd);
const rts=files(path.join(root,'src/app')).filter(f=>/\.(?:tsx?|jsx?)$/.test(f)).map(relative);
let routes='# Danh sách route được kiểm kê\n\nTên route được liệt kê theo đường dẫn file Expo Router. Các nhóm trong ngoặc đơn là *route group*, không hiển thị trên URL. Trang .web có bản web riêng.\n\n';
for(const f of rts)routes+=`- \`${f}\`\n`;
fs.writeFileSync(path.join(out,'06-DANH-MUC-ROUTE.md'),routes);
console.log('[DANH MUC] Sinh',api.length,'API khai bao,',names.length,'script,',rts.length,'route.');
