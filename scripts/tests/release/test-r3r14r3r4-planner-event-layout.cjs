#!/usr/bin/env node
'use strict';
// Pure-source gate: runs on fresh FULL ZIP before node_modules / backup / overlay.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const planner = read('src/app/(tabs)/planner.tsx');
const tests = [
  ['create CTA belongs exclusively to Events list', () => {
    const cal = planner.split('const CalendarPanel =')[1].split('type EventsPanelProps')[0];
    const events = planner.split('const EventsPanel =')[1].split('export default function PlannerScreen')[0];
    assert(!cal.includes('testID="planner-create-event"'));
    assert(events.includes('ListHeaderComponent={('));
    assert(events.includes('testID="planner-create-event"'));
    assert.equal((planner.match(/testID="planner-create-event"/g) || []).length, 1);
  }],
  ['calendar keeps its month grid and selected-day event list', () => {
    assert(planner.includes('<CalendarMonthGrid'));
    assert(planner.includes('data={selectedEvents}'));
    assert(planner.includes('onSelectDay={selectDay}'));
    assert(planner.includes('onMoveMonth={moveMonth}'));
  }],
  ['upcoming and past are separate sections with distinct empty cards', () => {
    assert(planner.includes('key: "upcoming"'));
    assert(planner.includes('key: "past"'));
    assert(planner.includes('kind={section.key}'));
    assert(planner.includes('section.data.length === 0'));
    assert(planner.includes('renderSectionFooter={renderSectionFooter}'));
    assert(planner.includes('"planner-upcoming-empty"'));
    assert(planner.includes('"planner-past-empty"'));
  }],
  ['no empty-state flash during initial loading', () => {
    assert(planner.includes('return loadingList ? null'));
    assert(planner.includes('loadingList && sections.every'));
    assert(planner.includes('Bloom đang xếp lịch'));
  }],
  ['create button remains usable from empty upcoming card', () => {
    assert(planner.includes('testID="planner-upcoming-empty-create"'));
    assert(planner.includes('accessibilityRole="button"'));
    assert(planner.includes('onPress={onCreate}'));
    assert(planner.includes('onCreate={openComposer}'));
  }],
  ['no action on past empty card and no new backend dependency', () => {
    const part = planner.split('const PlannerEventEmptyCard')[1].split('type EventsPanelProps')[0];
    const past = part.split(') : (')[1];
    assert(past.includes('styles.eventEmptyPastNote'));
    assert(!past.includes('onPress={onCreate}'));
    assert(!planner.includes('plannerEmptyRemoteQuery'));
  }],
  ['new event flow remains in Events tab', () => {
    const publish = planner.split('const publishEvent =')[1].split('const listSections =')[0];
    assert(publish.includes('calendarService.createEvent'));
    assert(!publish.includes('changeMode("calendar")'));
    assert(publish.includes('setComposerVisible(false)'));
    assert(planner.includes('const initialDate = new Date();'));
  }],
  ['moderation and published list remain intact', () => {
    assert(planner.includes('onModerate: openModeration'));
    assert.equal(planner.split('<PlannerShell {...shellProps} />').length - 1, 2);
    assert(planner.includes('onOpenEvent={openEvent}'));
    assert(planner.includes('onLoadMoreUpcoming={loadMoreUpcoming}'));
    assert(planner.includes('onLoadMorePast={loadMorePast}'));
  }],
];
for (const [label, fn] of tests) { fn(); console.log('PASS', label); }
console.log(`R3R14R3R4 PLANNER: ${tests.length}/${tests.length} PASS`);
