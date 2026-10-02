const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const lab = read('src/app/performance-data-test.tsx');
assert(lab.includes('item?.moment?.id ?? `timeline-row-${index}`'), 'Timeline stress keyExtractor must tolerate non-row tokens');
assert(lab.includes('item?.moment ? <TimelineStressRow'), 'Timeline stress render must guard malformed/non-row tokens');
assert(lab.includes('datasetBuild.durationMs'), 'Synthetic generation timing must be collected without emitting during render');
assert(lab.includes('useEffect(() => {') && lab.includes('Stress synthetic generate'), 'Performance metrics must be published after render');
assert(lab.includes('initial_render_ready'), 'Stress trace must finish on measurable initial readiness, not screen dwell time');
assert(lab.includes('Stress jump to end → frame'), 'Long-list jump should have its own frame metric');
assert(lab.includes('visibleRows = viewableItems.filter'), 'Section headers must not be counted as visible data rows');

const synthetic = read('src/services/performance/syntheticAppData.ts');
assert(synthetic.includes('data:image/jpeg;base64,'), 'Stress media should be visibly rendered local thumbnails');
assert(synthetic.includes('syntheticMediaUriFor'), 'Stress screens need deterministic visible media variants');

const momentCard = read('src/components/moments/MomentCard.tsx');
assert(momentCard.includes('(media.thumbnailUrl || cloudinaryVideoThumbnail(media.secureUrl))'), 'Explicit video thumbnail should render directly when available');

console.log('Phase 10 Performance Lab hotfix contracts PASS');
