// Phase 8.2B scheduling was superseded by Phase 8.2C after real-device tab
// regression. Keep this entry point so old handoff commands do not break, but
// validate the current corrected contract instead of the rejected scheduler.
require('./test-phase82c-tab-regression.js');
