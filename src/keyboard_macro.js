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
    const documentChanged = [];
    const selectionChanged = [];
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
        const TIMEOUT = 300;
        const effect = info.effect || [];
        return new Promise((resolve, reject) => {
            let count = 0;
            const doneOne = function() {
                count -= 1;
                if (count == 0) {
                    resolve();
                }
            };
            for (let i = 0; i < effect.length; i++) {
                const e = effect[i];
                if (e === 'edit') {
                    count += 1;
                    documentChanged.push(doneOne);
                } else if (e === 'move') {
                    count += 1;
                    selectionChanged.push(doneOne);
                }
            }
            if (count === 0) {
                resolve();
            } else {
                setTimeout(() => {
                    if (0 < count) {
                        count = 0;
                        reject();
                    }
                }, TIMEOUT);
            }
        });
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

    const invokeCommandSync = async function(info, context) {
        let ok = true;
        const promise = startEffectObserver(info).catch(() => {});
        try {
            await invokeCommand(info);
        } catch(error) {
            ok = false;
            console.error(error);
            console.info('kb-macro: Error in ' + context + ': ' + JSON.stringify(info));
        }
        await promise;
        return ok;
    };

    const playback = makeGuardedCommand(async function() {
        if (!recording) {
            for (let i = 0; i < sequence.length; i++) {
                const info = sequence[i];
                if (info.failed) {
                    continue;
                }
                const ok = await invokeCommandSync(info, 'playback');
                if (!ok) {
                    break;
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
            const ok = await invokeCommandSync(info, 'wrap');
            if (!ok) {
                info.failed = true;
            }
            if (onEndWrappedCommandCallback) {
                onEndWrappedCommandCallback();
            }
        }
    };

    const processDocumentChangeEvent = function() {
        const notifiers = Array.from(documentChanged);
        documentChanged.length = 0;
        for (let i = 0; i < notifiers.length; i++) {
            notifiers[i]();
        }
    };
    const processSelectionChangeEvent = function() {
        const notifiers = Array.from(selectionChanged);
        selectionChanged.length = 0;
        for (let i = 0; i < notifiers.length; i++) {
            notifiers[i]();
        }
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
