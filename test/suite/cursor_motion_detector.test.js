'use strict';
const assert = require('assert');
const { CursorMotionDetector } = require('../../src/cursor_motion_detector.js');

describe('CursorMotionDetector', () => {
    describe('initial state', () => {
        it('should not be enabled to do detection', async () => {
            const cursorMotionDetector = CursorMotionDetector();
            assert.strictEqual(cursorMotionDetector.isEnabled(), false);
        });
        it('should have no prediction', async () => {
            const cursorMotionDetector = CursorMotionDetector();
            assert.strictEqual(cursorMotionDetector.getExpectedSelections(), null);
        });
    });
    // TODO: add more tests for CursorMotionDetector
});
