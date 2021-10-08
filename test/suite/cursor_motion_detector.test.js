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
            assert.strictEqual(cursorMotionDetector.getPrediction(), null);
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
                cursorMotionDetector.setPrediction(input.predicted);
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
        it('should ignore any motion if selections are not empty (1)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 7, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 4, 3, 6) ] }
                ],
                expectedLogs: []
            });
        });
        it('should ignore any motion if selections are not empty (2)', async () => {
            testDetection({
                init: [ new vscode.Selection(3, 4, 3, 4) ],
                inputs: [
                    { predicted: [ new vscode.Selection(3, 4, 3, 7) ] },
                    { changed: [ new vscode.Selection(3, 6, 3, 6) ] }
                ],
                expectedLogs: []
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
