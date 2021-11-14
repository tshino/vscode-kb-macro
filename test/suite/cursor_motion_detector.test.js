'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { CursorMotionDetector } = require('../../src/cursor_motion_detector.js');

describe('CursorMotionDetector', () => {
    const MoveLeft = delta => [ 0, { characterDelta: -delta } ];
    const MoveRight = delta => [ 0, { characterDelta: delta } ];
    const MoveLeftSelect = (delta, select) => [ 0, { characterDelta: -delta, selectionLength: select } ];
    const MoveRightSelect = (delta, select) => [ 0, { characterDelta: delta, selectionLength: select } ];

    describe('initial state', () => {
        it('should not be enabled to do detection', async () => {
            const cursorMotionDetector = CursorMotionDetector();
            assert.strictEqual(cursorMotionDetector.isEnabled(), false);
        });
        it('should have no prediction', async () => {
            const cursorMotionDetector = CursorMotionDetector();
            assert.strictEqual(cursorMotionDetector.getPrediction({}), null);
            assert.strictEqual(cursorMotionDetector.getPrediction(null), null);
        });
    });
    describe('setPrediction', () => {
        it('should hold given selections associated with a text editor', () => {
            const cursorMotionDetector = CursorMotionDetector();
            const textEditor = { dummy: 'dummy' };
            const selections = [ new vscode.Selection(1, 2, 3, 4), new vscode.Selection(5, 6, 7, 8) ];
            cursorMotionDetector.setPrediction(textEditor, selections);
            assert.ok(cursorMotionDetector.getPrediction(textEditor));
            assert.strictEqual(cursorMotionDetector.getPrediction(textEditor).length, 2);
            assert.ok(cursorMotionDetector.getPrediction(textEditor)[0].isEqual(new vscode.Selection(1, 2, 3, 4)));
            assert.ok(cursorMotionDetector.getPrediction(textEditor)[1].isEqual(new vscode.Selection(5, 6, 7, 8)));
        });
        it('should report the holding selections only when queried for the associated text editor', () => {
            const cursorMotionDetector = CursorMotionDetector();
            const textEditor1 = { dummy: 'dummy' };
            const textEditor2 = { dummy: 'dummy' };
            const selections = [ new vscode.Selection(1, 2, 3, 4) ];
            cursorMotionDetector.setPrediction(textEditor1, selections);
            assert.strictEqual(cursorMotionDetector.getPrediction(textEditor2), null);
            assert.ok(cursorMotionDetector.getPrediction(textEditor1));
        });
    });
    const testDetection = function({ init, inputs, expectedLogs }) {
        const logs = [];
        const cursorMotionDetector = CursorMotionDetector();
        cursorMotionDetector.onDetectCursorMotion((type, args) => {
            logs.push([ type, args ]);
        });
        const textEditor = {
            selections: init
        };
        cursorMotionDetector.start(textEditor);
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            if ('predicted' in input) {
                cursorMotionDetector.setPrediction(textEditor, input.predicted);
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
        it('should ignore any vertical motion', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(4, 7, 4, 7) ] }
                ],
                expectedLogs: []
            });
        });
        it('should detect implicit motion (move to left and make selection)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 4, 3, 6) ] }
                ],
                expectedLogs: [ MoveLeftSelect(3, 2) ]
            });
        });
        it('should detect implicit motion (move to right and make selection)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 10, 3, 12) ] }
                ],
                expectedLogs: [ MoveRightSelect(3, 2) ]
            });
        });
        it('should detect implicit motion (cancel selection and move to right)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 4, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 6, 3, 6) ] }
                ],
                expectedLogs: [ MoveRight(2) ]
            });
        });
        it('should detect implicit motion of multi-cursor', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4), new vscode.Selection(4, 4, 4, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ] },
                    { changed: [ new vscode.Selection(3, 8, 3, 8), new vscode.Selection(4, 8, 4, 8) ] }
                ],
                expectedLogs: [ MoveRight(1) ]
            });
        });
        it('should ignore non-uniform changes on multi-cursor (1)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4), new vscode.Selection(4, 4, 4, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ] },
                    { changed: [ new vscode.Selection(3, 8, 3, 8), new vscode.Selection(4, 9, 4, 9) ] }
                ],
                expectedLogs: []
            });
        });
        it('should ignore non-uniform changes on multi-cursor (2)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4), new vscode.Selection(4, 4, 4, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ] },
                    { changed: [ new vscode.Selection(3, 8, 3, 8), new vscode.Selection(5, 8, 5, 8) ] }
                ],
                expectedLogs: []
            });
        });
        it('should ignore non-uniform changes on multi-cursor (3)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4), new vscode.Selection(4, 4, 4, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ] },
                    { changed: [ new vscode.Selection(3, 8, 3, 8) ] }
                ],
                expectedLogs: []
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
        it('should ignore any vertical motion', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 6, 3, 6) ],
                inputs: [
                    { changed: [ new vscode.Selection(4, 6, 4, 6) ] }
                ],
                expectedLogs: []
            });
        });
        it('should detect the unexpected motion of multi-cursor', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 6, 3, 6), new vscode.Selection(4, 6, 4, 6) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ] }
                ],
                expectedLogs: [ MoveRight(1) ]
            });
        });
    });
    describe('asynchronous predictions', () => {
        it('should handle predictions and asynchronous events of selections change correctly', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 5, 3, 5) ] },
                    { predicted: [ new vscode.Selection(3, 6, 3, 6) ] },
                    { changed: [ new vscode.Selection(3, 5, 3, 5) ] },
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 6, 3, 6) ] },
                    { changed: [ new vscode.Selection(3, 7, 3, 7) ] }
                ],
                expectedLogs: []
            });
        });
    });
    // TODO: add more tests for CursorMotionDetector
});
