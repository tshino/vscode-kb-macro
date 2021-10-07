'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { CursorMotionDetector } = require('../../src/cursor_motion_detector.js');

describe('CursorMotionDetector', () => {
    const MoveLeft = delta => ({ command: 'cursorMove', args: { to: 'left', by: 'character', value: delta } });
    const MoveRight = delta => ({ command: 'cursorMove', args: { to: 'right', by: 'character', value: delta } });

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
    describe('implicit motion', () => {
        it('should detect the difference between the actual position and predicted one (move to left)', async () => {
            const logs = [];
            const cursorMotionDetector = CursorMotionDetector();
            cursorMotionDetector.onDetectCursorMotion(info => {
                logs.push(info);
            });
            const textEditor = {
                selections: [ new vscode.Selection(3, 4, 3, 4) ]
            };
            cursorMotionDetector.start(textEditor);
            const predicted = [ new vscode.Selection(3, 7, 3, 7) ];
            cursorMotionDetector.setExpectedSelections(predicted);
            const event = {
                textEditor: textEditor,
                selections: [ new vscode.Selection(3, 6, 3, 6) ]
            };
            cursorMotionDetector.processSelectionChangeEvent(event);
            cursorMotionDetector.stop();

            assert.deepStrictEqual(logs, [ MoveLeft(1) ]);
        });
        it('should detect implicit motion (move to right)', async () => {
            const logs = [];
            const cursorMotionDetector = CursorMotionDetector();
            cursorMotionDetector.onDetectCursorMotion(info => {
                logs.push(info);
            });
            const textEditor = {
                selections: [ new vscode.Selection(3, 4, 3, 4) ]
            };
            cursorMotionDetector.start(textEditor);
            const predicted = [ new vscode.Selection(3, 7, 3, 7) ];
            cursorMotionDetector.setExpectedSelections(predicted);
            const event = {
                textEditor: textEditor,
                selections: [ new vscode.Selection(3, 8, 3, 8) ]
            };
            cursorMotionDetector.processSelectionChangeEvent(event);
            cursorMotionDetector.stop();

            assert.deepStrictEqual(logs, [ MoveRight(1) ]);
        });
    });
    // TODO: add more tests for CursorMotionDetector
});
