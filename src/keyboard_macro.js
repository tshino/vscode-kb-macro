'use strict';
const vscode = require('vscode');

const KeyboardMacro = function() {
    const RecordingStateReason = {
        Start: 0,
        Cancel: 1,
        Finish: 2
    };

    let onChangeRecordingStateCallback = null;
    let onBeginWrappedCommandCallback = null;
    let onEndWrappedCommandCallback = null;
    let recording = false;
    let locked = false;
    let documentChanged = 0;
    let selectionChanged = 0;
    const sequence = [];
    const internalCommands = new Map();

    const makeGuardedCommand = function(func) {
        return async function(textEditor, edit, args) {
            if (locked) {
                return;
            }
            locked = true;
            try {
                await func(textEditor, edit, args);
            } catch (error) {
                console.error(error);
                console.info('kb-macro: Exception in guarded command');
            }
            locked = false;
        };
    };

    const onChangeRecordingState = function(callback) {
        onChangeRecordingStateCallback = callback;
    };
    const notifyNewState = function(reason) {
        if (onChangeRecordingStateCallback) {
            onChangeRecordingStateCallback({ recording, reason });
        }
    };
    const onBeginWrappedCommand = function(callback) {
        onBeginWrappedCommandCallback = callback;
    };
    const onEndWrappedCommand = function(callback) {
        onEndWrappedCommandCallback = callback;
    };

    const registerInternalCommand = function(name, func) {
        internalCommands[name] = func;
    };

    const startRecording = function() {
        if (!recording) {
            sequence.length = 0;
            recording = true;
            notifyNewState(RecordingStateReason.Start);
        }
    };
    const cancelRecording = function() {
        if (recording) {
            sequence.length = 0;
            recording = false;
            notifyNewState(RecordingStateReason.Cancel);
        }
    };
    const finishRecording = function() {
        if (recording) {
            recording = false;
            notifyNewState(RecordingStateReason.Finish);
        }
    };

    const push = function(info) {
        if (recording) {
            sequence.push(info);
        }
    };

    const startEffectObserver = function(info) {
        const effect = info.effect || [];
        const observerState = {};
        for (let i = 0; i < effect.length; i++) {
            const e = effect[i];
            if (e === 'edit') {
                observerState.edit = documentChanged + 1;
            } else if (e === 'move') {
                observerState.move = selectionChanged + 1;
            }
        }
        return observerState;
    };
    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const waitForEffects = async function(observerState) {
        if ('edit' in observerState) {
            for (let i = 0; i < 5 && documentChanged < observerState.edit; i++) {
                await sleep(50);
            }
        }
        if ('move' in observerState) {
            for (let i = 0; i < 5 && selectionChanged < observerState.move; i++) {
                await sleep(50);
            }
        }
    };

    const invokeCommand = async function(info) {
        const func = internalCommands[info.command];
        if (func !== undefined) {
            const textEditor = vscode.window.activeTextEditor;
            await func(textEditor, null, info.args);
        } else {
            await vscode.commands.executeCommand(
                info.command,
                info.args
            );
        }
    };

    const playback = makeGuardedCommand(async function() {
        if (!recording) {
            for (let i = 0; i < sequence.length; i++) {
                const info = sequence[i];
                if (info.failed) {
                    continue;
                }
                try {
                    const observerState = startEffectObserver(info);
                    await invokeCommand(info);
                    await waitForEffects(observerState);
                } catch(error) {
                    console.error(error);
                    console.info('kb-macro: Error in playback: args=', info);
                }
            }
        }
    });

    const wrap = async function(_textEditor, _edit, args) {
        if (recording) {
            if (!args || !args.command) {
                return;
            }
            const info = {
                command: args.command
            };
            if ('args' in args) {
                info.args = args.args;
            }
            if ('effect' in args) {
                info.effect = args.effect;
            }
            push(info);
            if (onBeginWrappedCommandCallback) {
                onBeginWrappedCommandCallback();
            }
            try {
                const observerState = startEffectObserver(info);
                await invokeCommand(info);
                await waitForEffects(observerState);
            } catch(error) {
                info.failed = true;
                console.error(error);
                console.info('kb-macro: Error in wrap: args=', args);
            }
            if (onEndWrappedCommandCallback) {
                onEndWrappedCommandCallback();
            }
        }
    };

    const processDocumentChangeEvent = function(_event) {
        documentChanged += 1;
    };
    const processSelectionChangeEvent = function(_event) {
        selectionChanged += 1;
    };

    return {
        RecordingStateReason,
        onChangeRecordingState,
        onBeginWrappedCommand,
        onEndWrappedCommand,
        registerInternalCommand,
        startRecording,
        cancelRecording,
        finishRecording,
        push,
        playback,
        wrap,
        processDocumentChangeEvent,
        processSelectionChangeEvent,

        // testing purpose only
        isRecording: () => { return recording; },
        getCurrentSequence: () => { return sequence; }
    };
};

module.exports = { KeyboardMacro };
