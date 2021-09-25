'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { KeyboardMacro } = require('../../src/keyboard_macro.js');

describe('KeybaordMacro', () => {
    let textEditor;

    before(async () => {
        vscode.window.showInformationMessage('Started test for KeyboardMacro.');
        textEditor = await TestUtil.setupTextEditor({
            content: '',
            language: 'plaintext'
        });
    });

    describe('setOnChangeRecordingState', () => {
        beforeEach(async () => {
            KeyboardMacro.cancelRecording();
        });
        it('should set callback function', async () => {
            const logs = [];

            KeyboardMacro.setOnChangeRecordingState(() => {
                logs.push('invoked');
            });
            KeyboardMacro.startRecording();
            KeyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, ['invoked', 'invoked']);
        });
    });
    describe('startRecording', () => {
        beforeEach(async () => {
            KeyboardMacro.setOnChangeRecordingState(null);
            KeyboardMacro.cancelRecording();
        });
        it('should activate recording state', async () => {
            KeyboardMacro.startRecording();

            assert.strictEqual(KeyboardMacro.isRecording(), true);
        });
        it('should invoke callback function', async () => {
            const logs = [];
            KeyboardMacro.setOnChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            KeyboardMacro.startRecording();

            assert.deepStrictEqual(logs, [
                { recording: true, reason: KeyboardMacro.RecordingStateReason.Start }
            ]);
        });
        it('should ignore multiple calls', async () => {
            const logs = [];
            KeyboardMacro.setOnChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            KeyboardMacro.startRecording(); // 1
            KeyboardMacro.startRecording(); // 2

            assert.strictEqual(KeyboardMacro.isRecording(), true);
            assert.deepStrictEqual(logs, [
                { recording: true, reason: KeyboardMacro.RecordingStateReason.Start }
            ]);
        });
    });
    describe('cancelRecording', () => {
        beforeEach(async () => {
            KeyboardMacro.setOnChangeRecordingState(null);
            KeyboardMacro.cancelRecording();
        });
        it('should deactivate recording state', async () => {
            KeyboardMacro.startRecording();
            KeyboardMacro.cancelRecording();

            assert.strictEqual(KeyboardMacro.isRecording(), false);
        });
        it('should invoke callback function', async () => {
            const logs = [];
            KeyboardMacro.startRecording();
            KeyboardMacro.setOnChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            KeyboardMacro.cancelRecording();

            assert.deepStrictEqual(logs, [
                { recording: false, reason: KeyboardMacro.RecordingStateReason.Cancel }
            ]);
        });
        it('should ignore multiple calls', async () => {
            const logs = [];
            KeyboardMacro.startRecording();
            KeyboardMacro.setOnChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            KeyboardMacro.cancelRecording(); // 1
            KeyboardMacro.cancelRecording(); // 2

            assert.strictEqual(KeyboardMacro.isRecording(), false);
            assert.deepStrictEqual(logs, [
                { recording: false, reason: KeyboardMacro.RecordingStateReason.Cancel }
            ]);
        });
        // TODO: add tests of discarding sequence
    });
    // TODO: add tests for finishRecording
    // TODO: add tests for playback
    // TODO: add tests for wrap
});
