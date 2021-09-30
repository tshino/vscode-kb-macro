'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { KeyboardMacro } = require('../../src/keyboard_macro.js');

describe('KeybaordMacro', () => {
    const keyboardMacro = KeyboardMacro();

    before(async () => {
        vscode.window.showInformationMessage('Started test for KeyboardMacro.');
    });

    describe('onChangeRecordingState', () => {
        beforeEach(async () => {
            keyboardMacro.cancelRecording();
        });
        it('should set callback function', async () => {
            const logs = [];

            keyboardMacro.onChangeRecordingState(() => {
                logs.push('invoked');
            });
            keyboardMacro.startRecording();
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, ['invoked', 'invoked']);
        });
    });
    describe('startRecording', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should activate recording state', async () => {
            keyboardMacro.startRecording();

            assert.strictEqual(keyboardMacro.isRecording(), true);
        });
        it('should invoke callback function', async () => {
            const logs = [];
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.startRecording();

            assert.deepStrictEqual(logs, [
                { recording: true, reason: keyboardMacro.RecordingStateReason.Start }
            ]);
        });
        it('should ignore multiple calls', async () => {
            const logs = [];
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.startRecording(); // 1
            keyboardMacro.startRecording(); // 2

            assert.strictEqual(keyboardMacro.isRecording(), true);
            assert.deepStrictEqual(logs, [
                { recording: true, reason: keyboardMacro.RecordingStateReason.Start }
            ]);
        });
    });
    describe('cancelRecording', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should deactivate recording state', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.cancelRecording();

            assert.strictEqual(keyboardMacro.isRecording(), false);
        });
        it('should invoke callback function', async () => {
            const logs = [];
            keyboardMacro.startRecording();
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.cancelRecording();

            assert.deepStrictEqual(logs, [
                { recording: false, reason: keyboardMacro.RecordingStateReason.Cancel }
            ]);
        });
        it('should ignore multiple calls', async () => {
            const logs = [];
            keyboardMacro.startRecording();
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.cancelRecording(); // 1
            keyboardMacro.cancelRecording(); // 2

            assert.strictEqual(keyboardMacro.isRecording(), false);
            assert.deepStrictEqual(logs, [
                { recording: false, reason: keyboardMacro.RecordingStateReason.Cancel }
            ]);
        });
        // TODO: add tests of discarding sequence
    });
    // TODO: add tests for finishRecording
    // TODO: add tests for push
    // TODO: add tests for playback
    // TODO: add tests for wrap
    // TODO: add tests for onBeginWrappedCommand
    // TODO: add tests for onEndWrappedCommand
});
