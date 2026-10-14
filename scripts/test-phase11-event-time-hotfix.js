const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const must = (ok, message) => { if (!ok) { console.error(`FAIL: ${message}`); process.exit(1); } };

const planner = read('src/app/(tabs)/planner.tsx');
const picker = read('src/components/ui/BloomTimePicker.tsx');
const local = read('src/services/push/localNotificationService.ts');
const eventService = read('src/services/event/eventService.ts');

must(planner.includes('Hôm nay') && planner.includes('Ngày mai'), 'Planner quick date choices missing');
must(planner.includes('selectedDate={eventDate}'), 'Time picker does not receive selected event date');
must(planner.includes('date.getTime() <= Date.now()'), 'Planner exact past-time guard missing');
must(picker.includes('roundUpFiveMinutes') && picker.includes('Hôm nay · từ'), 'Today minimum-time UX missing');
must(!picker.includes('FlatList') && picker.includes('MINUTES = Array.from({ length: 12 }'), 'Time picker should avoid VirtualizedList and use 5-minute choices');
must(local.includes('add("start", occurrence)'), 'Exact event-time local reminder missing');
must(local.includes('stage: "tomorrow" | "today" | "soon" | "near" | "start"'), 'Start reminder stage missing');
must(eventService.includes('EVENT_TIME_IN_PAST'), 'Service-side past-time validation missing');

console.log('Phase 11.2A event-time/time-picker hotfix contracts PASS');
