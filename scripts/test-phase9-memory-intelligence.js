const fs = require('fs');
function must(file, parts) { const s=fs.readFileSync(file,'utf8'); for(const p of parts){ if(!s.includes(p)) throw new Error(`${file}: missing ${p}`); } }
must('src/services/moments/momentsService.ts',['listOnThisDay','timelineAudience === "family"','startAt(end.toISOString())','endAt(start.toISOString())']);
must('src/hooks/useOnThisDayMemories.ts',['listOnThisDay','next.slice(0, 8)']);
must('src/app/(tabs)/index.tsx',['Ngày này năm xưa','useOnThisDayMemories','onThisDay.slice(0, 3)']);
must('src/components/familyGraph/FamilyGraphPersonSheet.tsx',['CÂU CHUYỆN CỦA','memoryProfileStats','setTab("timeline")','setTab("moments")']);
const family=fs.readFileSync('src/app/(tabs)/family.tsx','utf8');
if(!/timelineHero:[^\n]*backgroundColor: COLORS\.white/.test(family)) throw new Error('timeline hero is not white');
if(!/genealogyHero:[\s\S]*?backgroundColor: COLORS\.white,[\s\S]*?borderWidth: 1/.test(family)) throw new Error('genealogy hero is not white');
console.log('Phase 9.0 + 9.1 memory intelligence contracts PASS');
