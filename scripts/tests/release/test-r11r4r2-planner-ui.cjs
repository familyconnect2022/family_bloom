#!/usr/bin/env node
'use strict';
// Native-only structural gate: verify placement without changing scroll/animation.
const fs=require('node:fs');const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const source=fs.readFileSync(path.join(root,'src/app/(tabs)/planner.tsx'),'utf8');
const shell=source.split('const PlannerShell =')[1].split('type PlannerEventRowProps')[0];
assert(shell, 'PlannerShell exists');
const tabs=shell.indexOf('style={__a3_styles.segment}');
const moderation=shell.indexOf('{canModerate && (');
assert(tabs>=0&&moderation>tabs,'Lịch / Sự kiện must precede Kiểm duyệt sự kiện');
assert(shell.includes('onPress={onModerate}'),'Moderation action preserved');
assert(shell.includes('{hiddenCount}'),'Live hidden counter preserved');
assert(shell.includes('segmentIndicatorStyle'),'Animated segment indicator retained');
assert(shell.includes('onPreviewMode("calendar")')&&shell.includes('onPreviewMode("list")'),'Swipe/preview hooks retained');
assert.equal(source.split('<PlannerShell {...shellProps} />').length-1,2,'Both panels share the reordered header');
assert(source.includes('const CalendarPanel =')&&source.includes('const EventsPanel ='),'Both virtualized panels kept');
assert(source.includes('onModerate: openModeration'),'Moderation callback retained');
console.log('[ANDROID R11R4R2 PLANNER UI PASS] Correct order; two panels, moderation rights and animation retained.');
