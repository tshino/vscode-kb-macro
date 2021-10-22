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
    const makeGuardedCommandSync = function(func) {
        return function(textEditor, edit, args) {
            if (locked) {
                return;
            }
            locked = true;
            try {
                func(textEditor, edit, args);
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

    const startRecording = makeGuardedCommandSync(function() {
        if (!recording) {
            sequence.length = 0;
            recording = true;
            notifyNewState(RecordingStateReason.Start);
        }
    });
    const cancelRecording = makeGuardedCommandSync(function() {
        if (recording) {
            sequence.length = 0;
            recording = false;
            notifyNewState(RecordingStateReason.Cancel);
        }
    });
    const finishRecording = makeGuardedCommandSync(function() {
        if (recording) {
            recording = false;
            notifyNewState(RecordingStateReason.Finish);
        }
    });

    const push = function(spec) {
        if (recording) {
            sequence.push(spec);
        }
    };

    const startEffectObserver = function(spec) {
        const TIMEOUT = 300;
        const effect = spec.effect || [];
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

    const invokeCommand = async function(spec) {
        const func = internalCommands[spec.command];
        if (func !== undefined) {
            const textEditor = vscode.window.activeTextEditor;
            await func(textEditor, null, spec.args);
        } else {
            await vscode.commands.executeCommand(
                spec.command,
                spec.args
            );
        }
    };

    const invokeCommandSync = async function(spec, context) {
        let ok = true;
        const promise = startEffectObserver(spec).catch(() => {});
        try {
            await invokeCommand(spec);
        } catch(error) {
            ok = false;
            console.error(error);
            console.info('kb-macro: Error in ' + context + ': ' + JSON.stringify(spec));
        }
        await promise;
        return ok;
    };

    const playback = makeGuardedCommand(async function() {
        if (!recording) {
            for (let i = 0; i < sequence.length; i++) {
                const spec = sequence[i];
                if (spec.failed) {
                    continue;
                }
                const ok = await invokeCommandSync(spec, 'playback');
                if (!ok) {
                    break;
                }
            }
        }
    });

    const makeCommandSpec = function(args) {
        const spec = {
            command: args.command
        };
        if ('args' in args) {
            spec.args = args.args;
        }
        if ('effect' in args) {
            spec.effect = args.effect;
        }
        return spec;
    };

    const wrap = makeGuardedCommand(async function(_textEditor, _edit, args) {
        if (recording) {
            if (!args || !args.command) {
                return;
            }
            const spec = makeCommandSpec(args);
            push(spec);
            if (onBeginWrappedCommandCallback) {
                onBeginWrappedCommandCallback();
            }
            const ok = await invokeCommandSync(spec, 'wrap');
            if (!ok) {
                spec.failed = true;
            }
            if (onEndWrappedCommandCallback) {
                onEndWrappedCommandCallback();
            }
        }
    });

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
