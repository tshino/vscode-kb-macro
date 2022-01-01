'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { AwaitController } = require('../../src/await_controller.js');
const { KeyboardMacro } = require('../../src/keyboard_macro.js');

describe('KeybaordMacro', () => {
    const awaitController = AwaitController();
    const keyboardMacro = KeyboardMacro({ awaitController });

    before(async () => {
        vscode.window.showInformationMessage('Started test for KeyboardMacro.');
    });

    describe('onChangeRecordingState', () => {
        beforeEach(async () => {
            keyboardMacro.cancelRecording();
        });
        it('should set callback function', async () => {
            const logs = [];
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push([ recording, reason ]);
            });

            keyboardMacro.startRecording();
            keyboardMacro.finishRecording();
            keyboardMacro.startRecording();
            keyboardMacro.cancelRecording();

            assert.deepStrictEqual(logs, [
                [ true, keyboardMacro.RecordingStateReason.Start ],
                [ false, keyboardMacro.RecordingStateReason.Finish ],
                [ true, keyboardMacro.RecordingStateReason.Start ],
                [ false, keyboardMacro.RecordingStateReason.Cancel ]
            ]);
        });
    });
    describe('onChangePlaybackState', () => {
        beforeEach(async () => {
            keyboardMacro.cancelRecording();
        });
        it('should set callback function', async () => {
            const logs = [];
            keyboardMacro.onChangePlaybackState((event) => {
                logs.push(event);
            });
            keyboardMacro.registerInternalCommand('internal:delay', async () => {
                await TestUtil.sleep(100);
            });

            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:delay' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback();
            const promise = keyboardMacro.playback();
            keyboardMacro.abortPlayback();
            await promise;

            assert.deepStrictEqual(logs, [
                { playing: true, reason: keyboardMacro.PlaybackStateReason.Start },
                { playing: false, reason: keyboardMacro.PlaybackStateReason.Finish },
                { playing: true, reason: keyboardMacro.PlaybackStateReason.Start },
                { playing: false, reason: keyboardMacro.PlaybackStateReason.Abort }
            ]);
        });
    });
    describe('onBeginWrappedCommand, onEndWrappedCommand', () => {
        const logs = [];
        beforeEach(async () => {
            keyboardMacro.cancelRecording();
            logs.length = 0;
            keyboardMacro.registerInternalCommand('internal:log', () => {
                logs.push('invoked');
            });
        });
        it('should set callback function', async () => {
            keyboardMacro.onBeginWrappedCommand(() => { logs.push('begin'); });
            keyboardMacro.onEndWrappedCommand(() => { logs.push('end'); });

            keyboardMacro.startRecording();
            await keyboardMacro.wrap({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ 'begin', 'invoked', 'end' ]);
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
        it('should discard pushed commands', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'example:command' });
            keyboardMacro.cancelRecording();

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
    });
    describe('finishRecording', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should deactivate recording state', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.finishRecording();

            assert.strictEqual(keyboardMacro.isRecording(), false);
        });
        it('should invoke callback function', async () => {
            const logs = [];
            keyboardMacro.startRecording();
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                { recording: false, reason: keyboardMacro.RecordingStateReason.Finish }
            ]);
        });
        it('should ignore multiple calls', async () => {
            const logs = [];
            keyboardMacro.startRecording();
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.finishRecording(); // 1
            keyboardMacro.finishRecording(); // 2

            assert.strictEqual(keyboardMacro.isRecording(), false);
            assert.deepStrictEqual(logs, [
                { recording: false, reason: keyboardMacro.RecordingStateReason.Finish }
            ]);
        });
        it('should record the pushed commands', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'example:command1' });
            keyboardMacro.push({ command: 'example:command2', args: { opt1: 'opt1' } });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'example:command1' },
                { command: 'example:command2', args: { opt1: 'opt1' } }
            ]);
        });
    });
    describe('push', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should add specified command to sequence', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'example:command1' });
            keyboardMacro.push({ command: 'example:command2', args: { opt1: 'opt1' } });

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'example:command1' },
                { command: 'example:command2', args: { opt1: 'opt1' } }
            ]);
        });
        it('should do nothing if not recording', async () => {
            keyboardMacro.push({ command: 'example:command1' });
            keyboardMacro.push({ command: 'example:command2', args: { opt1: 'opt1' } });

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
    });
    describe('playback', () => {
        const logs = [];
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
            logs.length = 0;
            keyboardMacro.registerInternalCommand('internal:log', async () => {
                logs.push('begin');
                await TestUtil.sleep(50);
                logs.push('end');
            });
        });
        it('should invoke recorded command', async () => {
            const logs = [];
            keyboardMacro.registerInternalCommand('internal:log', () => {
                logs.push('invoked');
            });
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback();
            assert.deepStrictEqual(logs, [ 'invoked' ]);
        });
        it('should invoke recorded commands sequentially', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback();
            assert.deepStrictEqual(logs, [
                'begin',
                'end',
                'begin',
                'end'
            ]);
        });
        it('should repeat 5 times (repeat argument)', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback({ repeat: 5 });
            assert.deepStrictEqual(logs, [
                'begin',
                'end',
                'begin',
                'end',
                'begin',
                'end',
                'begin',
                'end',
                'begin',
                'end'
            ]);
        });
        it('should abort playback if command execution failed', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'INVALID' });
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback();
            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
        });
        it('should abort playback with repeat argument if command execution failed', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'INVALID' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback({ repeat: 5 });
            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
        });
        it('should prevent reentry', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            const promise1 = keyboardMacro.playback();
            const promise2 = keyboardMacro.playback();
            await Promise.all([promise1, promise2]);
            assert.deepStrictEqual(logs, [
                'begin',
                'end'
            ]);
        });
        it('should prevent other commands to preempt (startRecording)', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            const promise1 = keyboardMacro.playback();
            keyboardMacro.startRecording(); // <--
            await promise1;

            assert.deepStrictEqual(logs, [
                'begin',
                'end'
            ]);
            assert.strictEqual(keyboardMacro.isRecording(), false);
        });
    });
    describe('isPlaying', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should be false if playback is not ongoing', async () => {
            assert.strictEqual(keyboardMacro.isPlaying(), false);
        });
        it('should be true while playback is ongoing', async () => {
            const logs = [];
            keyboardMacro.registerInternalCommand('internal:checkIsPlaying', () => {
                logs.push([ 'while playback', keyboardMacro.isPlaying() ]);
            });
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:checkIsPlaying' });
            keyboardMacro.finishRecording();

            logs.push([ 'before playback', keyboardMacro.isPlaying() ]);
            await keyboardMacro.playback();
            logs.push([ 'after playback', keyboardMacro.isPlaying() ]);

            assert.deepStrictEqual(logs, [
                [ 'before playback', false ],
                [ 'while playback', true ],
                [ 'after playback', false ]
            ]);
        });
    });
    describe('abortPlayback', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should abort playback', async () => {
            const logs = [];
            keyboardMacro.registerInternalCommand('internal:log', async () => {
                logs.push('begin');
                await TestUtil.sleep(50);
                logs.push('end');
            });
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();
            const promise = keyboardMacro.playback({ repeat: 3 });
            assert.strictEqual(keyboardMacro.isPlaying(), true);
            await TestUtil.sleep(100);
            keyboardMacro.abortPlayback();
            await promise;
            assert.strictEqual(keyboardMacro.isPlaying(), false);

            assert.strictEqual(logs.length < 2 * 3 * 3, true);
        });
    });
    describe('wrap', () => {
        const logs = [];
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
            logs.length = 0;
            keyboardMacro.registerInternalCommand('internal:log', async () => {
                logs.push('begin');
                await TestUtil.sleep(10);
                logs.push('end');
            });
        });
        it('should invoke and record specified command', async () => {
            keyboardMacro.startRecording();
            await keyboardMacro.wrap({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' },
            ]);
        });
        it('should not invoke specified command if not recording', async () => {
            await keyboardMacro.wrap({ command: 'internal:log' });

            assert.deepStrictEqual(logs, []);
        });
        it('should not crash even if the argument is invalid', async () => {
            keyboardMacro.startRecording();
            await keyboardMacro.wrap({ command: '' });
            await keyboardMacro.wrap({ command: 'INVALID' });
            await keyboardMacro.wrap({ });
            await keyboardMacro.wrap();
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, []);
            assert.strictEqual(keyboardMacro.isRecording(), false);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
        it('should invoke and record specified command synchronously', async () => {
            keyboardMacro.startRecording();
            await keyboardMacro.wrap({ command: 'internal:log' });
            await keyboardMacro.wrap({ command: 'internal:log', args: { test: '1' } });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ 'begin', 'end', 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' },
                { command: 'internal:log', args: { test: '1' } }
            ]);
        });
        it('should prevent reentry', async () => {
            keyboardMacro.startRecording();
            const promise1 = keyboardMacro.wrap({ command: 'internal:log' });
            const promise2 = keyboardMacro.wrap({ command: 'internal:log' });
            await Promise.all([promise1, promise2]);
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' }
            ]);
        });
        it('should prevent other commands to preempt (cancelRecording)', async () => {
            keyboardMacro.startRecording();
            const promise1 = keyboardMacro.wrap({ command: 'internal:log' });
            keyboardMacro.cancelRecording(); // <--
            await promise1;

            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' }
            ]);
            assert.strictEqual(keyboardMacro.isRecording(), true);
        });
        it('should prevent other commands to preempt (finishRecording)', async () => {
            keyboardMacro.startRecording();
            const promise1 = keyboardMacro.wrap({ command: 'internal:log' });
            keyboardMacro.finishRecording(); // <--
            await promise1;

            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' }
            ]);
            assert.strictEqual(keyboardMacro.isRecording(), true);
        });
    });
});
