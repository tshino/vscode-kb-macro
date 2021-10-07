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
    const testDetection = function({ init, inputs, expectedLogs }) {
        const logs = [];
        const cursorMotionDetector = CursorMotionDetector();
        cursorMotionDetector.onDetectCursorMotion(info => {
            logs.push(info);
        });
        const textEditor = {
            selections: init
        };
        cursorMotionDetector.start(textEditor);
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            if ('predicted' in input) {
                cursorMotionDetector.setExpectedSelections(input.predicted);
            } else if ('changed' in input) {
                const event = {
                    textEditor: textEditor,
                    selections: input.changed
                };
                cursorMotionDetector.processSelectionChangeEvent(event);
            }
        }
        cursorMotionDetector.stop();

        assert.deepStrictEqual(logs, expectedLogs);
    };
    describe('implicit motion with prediction', () => {
        it('should detect the difference between the actual position and predicted one (move to left)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 6, 3, 6) ] }
                ],
                expectedLogs: [ MoveLeft(1) ]
            });
        });
        it('should detect implicit motion with prediction (move to right)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 8, 3, 8) ] }
                ],
                expectedLogs: [ MoveRight(1) ]
            });
        });
    });
    describe('implicit motion without prediction', () => {
        it('should detect the unexpected motion of cursor (move to left)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 6, 3, 6) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 5, 3, 5) ] }
                ],
                expectedLogs: [ MoveLeft(1) ]
            });
        });
        it('should detect the unexpected motion of cursor (move to right)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 6, 3, 6) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 7, 3, 7) ] }
                ],
                expectedLogs: [ MoveRight(1) ]
            });
        });
    });
    // TODO: add more tests for CursorMotionDetector
});
