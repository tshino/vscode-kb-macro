'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { CursorMotionDetector } = require('../../src/cursor_motion_detector.js');

describe('CursorMotionDetector', () => {
    const CursorMotionType = CursorMotionDetector().CursorMotionType;

    const MoveLeft = delta => ({ characterDelta: -delta });
    const MoveRight = delta => ({ characterDelta: delta });
    const MoveLeftSelect = (delta, select) => ({ characterDelta: -delta, selectionLength: select });
    const MoveRightSelect = (delta, select) => ({ characterDelta: delta, selectionLength: select });
    const MoveUp = (up, delta) => ({ lineDelta: -up, characterDelta: delta });
    const MoveDown = (down, delta) => ({ lineDelta: down, characterDelta: delta });
    const MoveUpSelect = (up, delta, select) => ({ lineDelta: -up, characterDelta: delta, selectionLength: select });
    const MoveDownSelect = (down, delta, select) => ({ lineDelta: down, characterDelta: delta, selectionLength: select });
    const Split = (delta) => ({ characterDelta: delta });
    const Split2 = (delta, deltaV) => ({ characterDelta: delta, lineDelta: deltaV });
    const SplitSelect = (delta, select) => ({ characterDelta: delta, selectionLength: select });
    const GroupMotion = (size, ch, ln, sel) => {
        const motion = { groupSize: size, characterDelta: ch };
        if (ln) motion.lineDelta = ln;
        if (sel) motion.selectionLength = sel;
        return motion;
    };

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
    const testDetection = function({ init, lineLength = null, inputs, expectedLogs }) {
        const logs = [];
        const cursorMotionDetector = CursorMotionDetector();
        cursorMotionDetector.onDetectCursorMotion((type, args) => {
            logs.push([ type, args ]);
        });
        const textEditor = {
            selections: init
        };
        if (lineLength) {
            const lineLengthMap = new Map(lineLength);
            textEditor.document = {
                lineAt: function(line) {
                    const length = lineLengthMap.get(line) || 0;
                    return { text: 'x'.repeat(length) };
                }
            };
        }
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
                expectedLogs: [[ CursorMotionType.Trailing, MoveLeft(1) ]]
            });
        });
        it('should detect implicit motion with prediction (move to right)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 8, 3, 8) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveRight(1) ]]
            });
        });
        it('should detect implicit motion (move up)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                lineLength: [[2, 10]],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(2, 7, 2, 7) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveUp(1, -3) ]]
            });
        });
        it('should detect implicit motion (move down)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                lineLength: [[5, 10]],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(5, 5, 5, 5) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveDown(2, 5) ]]
            });
        });
        it('should detect implicit motion (move to left and make selection)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 4, 3, 6) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveLeftSelect(3, 2) ]]
            });
        });
        it('should detect implicit motion (move to right and make selection)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 10, 3, 12) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveRightSelect(3, 2) ]]
            });
        });
        it('should detect implicit motion (move up and make selection)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                lineLength: [[2, 10]],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(2, 7, 2, 9) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveUpSelect(1, -3, 2) ]]
            });
        });
        it('should detect implicit motion (move down and make selection)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                lineLength: [[5, 10]],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(5, 5, 5, 8) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveDownSelect(2, 5, 3) ]]
            });
        });
        it('should detect implicit motion (cancel selection and move to right)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 4, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 6, 3, 6) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveRight(2) ]]
            });
        });
        it('should detect implicit motion of multi-cursor', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4), new vscode.Selection(4, 4, 4, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ] },
                    { changed: [ new vscode.Selection(3, 8, 3, 8), new vscode.Selection(4, 8, 4, 8) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveRight(1) ]]
            });
        });

        it('should detect implicit motion (split into multi-cursor)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 10, 3, 10), new vscode.Selection(3, 12, 3, 12) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, Split([ 3, 5 ]) ]]
            });
        });
        it('should detect implicit motion (split multi to multi)', async () => {
            testDetection({
                init: [
                    new vscode.Selection(3, 7, 3, 7),
                    new vscode.Selection(6, 7, 6, 7)
                ],
                inputs: [
                    { predicted: [
                        new vscode.Selection(3, 7, 3, 7),
                        new vscode.Selection(6, 7, 6, 7)
                    ] },
                    { changed: [
                        new vscode.Selection(3, 10, 3, 10), new vscode.Selection(3, 12, 3, 12),
                        new vscode.Selection(6, 10, 6, 10), new vscode.Selection(6, 12, 6, 12)
                    ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, Split([ 3, 5 ]) ]]
            });
        });
        it('should detect implicit motion (split into multi-cursor on different lines) (1)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 10, 3, 10), new vscode.Selection(5, 2, 5, 2) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, Split2([ 3, 2 ], [0, 2]) ]]
            });
        });
        it('should detect implicit motion (split into multi-cursor on different lines) (2)', async () => {
            testDetection({
                init: [
                    new vscode.Selection(3, 7, 3, 7),
                    new vscode.Selection(6, 7, 6, 7)
                ],
                inputs: [
                    { predicted: [
                        new vscode.Selection(3, 7, 3, 7),
                        new vscode.Selection(6, 7, 6, 7)
                    ] },
                    { changed: [
                        new vscode.Selection(4, 2, 4, 2), new vscode.Selection(5, 7, 5, 7),
                        new vscode.Selection(7, 2, 7, 2), new vscode.Selection(8, 7, 8, 7),
                    ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, Split2([ 2, 7 ], [ 1, 2 ]) ]]
            });
        });
        it('should detect implicit motion (split into multi-cursor with selection)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 10, 3, 13), new vscode.Selection(3, 12, 3, 15) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, SplitSelect([ 3, 5 ], 3) ]]
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
                expectedLogs: [[ CursorMotionType.Trailing, MoveLeft(1) ]]
            });
        });
        it('should detect the unexpected motion of cursor (move to right)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 6, 3, 6) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 7, 3, 7) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveRight(1) ]]
            });
        });
        it('should detect the unexpected motion of multi-cursor', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 6, 3, 6), new vscode.Selection(4, 6, 4, 6) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, MoveRight(1) ]]
            });
        });

        it('should detect implicit motion (split into multi-cursor)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 10, 3, 10), new vscode.Selection(3, 12, 3, 12) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, Split([ 3, 5 ]) ]]
            });
        });
        it('should detect implicit motion (split multi to multi)', async () => {
            testDetection({
                init: [
                    new vscode.Selection(3, 7, 3, 7),
                    new vscode.Selection(6, 7, 6, 7)
                ],
                inputs: [
                    { changed: [
                        new vscode.Selection(3, 10, 3, 10), new vscode.Selection(3, 12, 3, 12),
                        new vscode.Selection(6, 10, 6, 10), new vscode.Selection(6, 12, 6, 12)
                    ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, Split([ 3, 5 ]) ]]
            });
        });
        it('should detect implicit motion (split into multi-cursor on different lines) (1)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 10, 3, 10), new vscode.Selection(5, 2, 5, 2) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, Split2([ 3, 2 ], [0, 2]) ]]
            });
        });
        it('should detect implicit motion (split into multi-cursor on different lines) (2)', async () => {
            testDetection({
                init: [
                    new vscode.Selection(3, 7, 3, 7),
                    new vscode.Selection(6, 7, 6, 7)
                ],
                inputs: [
                    { changed: [
                        new vscode.Selection(4, 2, 4, 2), new vscode.Selection(5, 7, 5, 7),
                        new vscode.Selection(7, 2, 7, 2), new vscode.Selection(8, 7, 8, 7),
                    ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, Split2([ 2, 7 ], [ 1, 2 ]) ]]
            });
        });
        it('should detect implicit motion (split into multi-cursor with selection)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 10, 3, 13), new vscode.Selection(3, 12, 3, 15) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, SplitSelect([ 3, 5 ], 3) ]]
            });
        });
        it('should ignore implicit motion with splitting to non-uniform selection length', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 10, 3, 13), new vscode.Selection(3, 12, 3, 16) ] }
                ],
                expectedLogs: []
            });
        });

        it('should detect grouped cursor motion (1)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 8, 3, 8), new vscode.Selection(4, 9, 4, 9) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, GroupMotion(2, [1, 9], [0, 1]) ]]
            });
        });
        it('should detect grouped cursor motion (2)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 8, 3, 8), new vscode.Selection(5, 8, 5, 8) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, GroupMotion(2, [1, 8], [0, 2]) ]]
            });
        });
        it('should detect grouped cursor motion (3)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ],
                inputs: [
                    { changed: [ new vscode.Selection(3, 8, 3, 8) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, GroupMotion(2, 1) ]]
            });
        });
        it('should detect grouped cursor motion (4)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(4, 7, 4, 7) ],
                inputs: [
                    { changed: [ new vscode.Selection(4, 3, 4, 3), new vscode.Selection(6, 3, 6, 3) ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, GroupMotion(2, [3, 3], [1, 3]) ]]
            });
        });
        it('should detect grouped cursor motion (5)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 7, 3, 7), new vscode.Selection(6, 7, 6, 7) ],
                inputs: [
                    { changed: [
                        new vscode.Selection(3, 10, 3, 10), new vscode.Selection(3, 12, 3, 12),
                        new vscode.Selection(6, 10, 6, 10), new vscode.Selection(6, 11, 6, 11)  // <= not match non-grouped pure split
                    ] }
                ],
                expectedLogs: [[ CursorMotionType.Trailing, GroupMotion(2, [3, 5, 10, 11], [0, 0, 3, 3]) ]]
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
        it('should handle events correctly even if some predictions are skipped', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 5, 3, 5) ] },
                    { predicted: [ new vscode.Selection(3, 6, 3, 6) ] },
                    { changed: [ new vscode.Selection(3, 6, 3, 6) ] },
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 7, 3, 7) ] }
                ],
                expectedLogs: []
            });
        });
    });
});
