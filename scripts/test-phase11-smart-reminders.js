const fs = require('fs');
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const read = (p) => fs.readFileSync(p, 'utf8');

const smart = read('src/services/activity/smartReminderService.ts');
const notifications = read('src/app/notifications.tsx');
const prefs = read('src/app/notification-preferences.tsx');
const home = read('src/app/(tabs)/index.tsx');
const eventService = read('src/services/event/eventService.ts');
const userTypes = read('src/types/user.ts');
const profile = read('src/services/profile/profileService.ts');

assert(userTypes.includes('SmartReminderPreferences'), 'Smart reminder preference type missing');
assert(userTypes.includes('birthdays: true') && userTypes.includes('memorials: true') && userTypes.includes('events: true'), 'Reminder defaults missing');
assert(eventService.includes('listReminderWindow'), 'Bounded reminder event window missing');
assert(!smart.includes('onSnapshot('), 'Smart reminder service must remain one-shot');
assert(smart.includes('EVENT_CACHE_TTL_MS'), 'Reminder event cache missing');
assert(smart.includes('event.eventType === "birthday"') && smart.includes('event.eventType === "memorial"'), 'Birthday/memorial reminder logic missing');
assert(smart.includes('msUntil <= 3 * 60 * 60 * 1000'), 'Near-time reminder window missing');
assert(smart.includes('items.length < 3'), 'Reminder grouping threshold missing');
assert(smart.includes('badgeEligible: false') && smart.includes('on-this-day'), 'On This Day must stay quiet/non-badge');
assert(smart.includes('smartReminderLastSeenAt'), 'Per-user reminder seen checkpoint missing');
assert(notifications.includes('smartReminderService.listForUser'), 'Activity Center must merge smart reminders');
assert(notifications.includes('smartReminderService.markAllSeen'), 'Activity Center must mark reminders seen');
assert(notifications.includes('/notification-preferences'), 'Reminder preference entry missing');
assert(home.includes('smartReminderService.unreadBadgeCount'), 'Home badge must include smart reminder count');
assert(prefs.includes('Nhắc thông minh') && prefs.includes('BloomSwitch'), 'Reminder preferences screen missing');
assert(profile.includes('updateSmartReminderPreferences'), 'Preference persistence missing');
console.log('Phase 11.1 Smart Reminder contracts PASS');
