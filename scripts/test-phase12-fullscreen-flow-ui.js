const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const expect = (condition, label) => checks.push({ label, ok: !!condition });

const planner = read('src/app/(tabs)/planner.tsx');
const moments = read('src/app/(tabs)/moments.tsx');
const profile = read('src/app/profile.tsx');
const personSheet = read('src/components/familyGraph/FamilyGraphPersonSheet.tsx');
const switcher = read('src/components/family/FamilySwitcherModal.tsx');
const proposals = read('src/app/family-graph-proposals.tsx');
const picker = read('src/components/familyGraph/FamilyPersonMultiPicker.tsx');
const momentCard = read('src/components/moments/MomentCard.tsx');
const layout = read('src/app/_layout.tsx');
const fullScreen = read('src/components/ui/BloomFullScreenFlow.tsx');
const hero = read('src/components/ui/BloomHeroHeader.tsx');
const graphAdmin = read('src/app/family-graph-admin.tsx');
const memberships = read('src/app/family-memberships.tsx');
const joinRequests = read('src/app/family-join-requests.tsx');
const notificationPreferences = read('src/app/notification-preferences.tsx');
const familySelect = read('src/app/family-select.tsx');
const createProfile = read('src/app/create-profile.tsx');

expect(fullScreen.includes('presentationStyle="fullScreen"'), 'Reusable full-screen flow uses native full-screen presentation');
expect(fullScreen.includes('statusBarTranslucent') && fullScreen.includes('edges={["left", "right", "bottom"]}'), 'Full-screen flow lets the hero own the top/status-bar surface');
expect(hero.includes('accessibilityLabel="Quay lại"'), 'Purpose-aware hero exposes a clear Back action');
expect(hero.includes('EventIllustration') && hero.includes('MomentIllustration') && hero.includes('TreeIllustration'), 'Header artwork changes by page purpose instead of reusing one generic image');
expect(hero.includes('calendarCard') && hero.includes('photoCard') && hero.includes('treeTrunk'), 'Event, Moment and Family Tree each keep their own visual motif');
expect(planner.includes('title="Gieo một ngày đáng nhớ"') && planner.includes('variant="event"'), 'Event create flow uses the purpose-aware event hero');
expect(planner.includes('requestCloseComposer'), 'Event create flow protects unsaved work on Back');
expect(moments.includes('title="Chia sẻ một điều đáng nhớ"') && moments.includes('variant="moment"'), 'Moment create flow uses the purpose-aware memory hero');
expect(moments.includes('title="Giữ câu chuyện đúng như bạn muốn"'), 'Moment edit flow has a warm full-screen header');
expect(moments.includes('requestCloseComposer') && moments.includes('requestCloseEditPost'), 'Moment create/edit flows protect unsaved work');
expect(profile.includes('title="Để Bloom hiểu bạn hơn"'), 'Profile edit uses the full-screen authoring pattern');
expect(personSheet.includes('title={`Câu chuyện của ${person.shortName || person.displayName}`}'), 'Person detail uses a clear warm full-screen header');
expect(personSheet.includes('title={editingTimelineEntry ? "Chỉnh một dấu mốc" : "Thêm một dấu mốc"}'), 'Timeline create/edit uses the full-screen authoring pattern');
expect(switcher.includes('title="Bạn muốn ghé nhà nào?"'), 'Family switcher no longer behaves like a draggable bottom sheet');
expect(proposals.includes('title="Đề xuất một thay đổi"') && proposals.includes('eyebrow="DUYỆT ĐỀ XUẤT"'), 'Graph proposal create/review flows use purpose-aware full-screen headers');
expect(picker.includes('title="Chọn những người cùng câu chuyện"'), 'Person multi-picker uses the same full-screen visual language');
expect(momentCard.includes('title="Viết lại theo cách bạn muốn nhớ"'), 'Moment fallback editor uses the full-screen authoring pattern');
expect(graphAdmin.includes('eyebrow={editing ? "CHỈNH NGƯỜI TRONG PHẢ HỆ"') && graphAdmin.includes('title={pickerSide'), 'Graph add/edit person and relationship workflows are full-screen, purpose-aware pages');
expect(!graphAdmin.includes('<Modal'), 'Graph admin no longer keeps substantive add/edit/relationship work in draggable sheets');
expect(memberships.includes('<BloomHeroHeader') && memberships.includes('title: "Gieo một tổ ấm mới"'), 'Family membership/manage/join/create route uses a warm edge-to-edge hero');
expect(joinRequests.includes('<BloomHeroHeader') && joinRequests.includes('title="Chào đúng người vào nhà"'), 'Join-request review route uses a purpose-aware edge-to-edge hero');
expect(notificationPreferences.includes('<BloomHeroHeader') && notificationPreferences.includes('title="Nhắc vừa đủ để luôn nhớ nhau"'), 'Notification preference route uses a warm purpose-aware hero');
expect(familySelect.includes('<BloomHeroHeader') && familySelect.includes('title="Bạn muốn trở về nhà nào?"'), 'Family selection route uses the family hero instead of a white header block');
expect(createProfile.includes('<BloomHeroHeader') && createProfile.includes('title="Để cả nhà nhận ra bạn ngay từ lần đầu"'), 'Create-profile route uses the same edge-to-edge Bloom header system');
expect(!layout.includes('presentation: "modal", animation: BLOOM_MOTION.modal.animation'), 'Router no longer forces page-like core screens into modal presentation');

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} | ${item.label}`);
if (failed.length) {
  console.error(`\nPhase 12 full-screen UI contract failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPhase 12 full-screen UI contract PASS: ${checks.length}/${checks.length}`);
