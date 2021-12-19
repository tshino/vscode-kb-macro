'use strict';
const vscode = require('vscode');
const { CommandSequence } = require('./command_sequence.js');

const KeyboardMacro = function({ awaitController }) {
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
    const sequence = CommandSequence();
    const internalCommands = new Map();

    const makeGuardedCommand = function(func) {
        return async function(args) {
            if (locked) {
                return;
            }
            locked = true;
            try {
                await func(args);
            } catch (error) {
                console.error(error);
                console.info('kb-macro: Exception in guarded command');
            }
            locked = false;
        };
    };
    const makeGuardedCommandSync = function(func) {
        return function(args) {
            if (locked) {
                return;
            }
            locked = true;
            try {
                func(args);
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
            sequence.clear();
            recording = true;
            notifyNewState(RecordingStateReason.Start);
        }
    });
    const cancelRecording = makeGuardedCommandSync(function() {
        if (recording) {
            sequence.clear();
            recording = false;
            notifyNewState(RecordingStateReason.Cancel);
        }
    });
    const finishRecording = makeGuardedCommandSync(function() {
        if (recording) {
            sequence.optimize();
            recording = false;
            notifyNewState(RecordingStateReason.Finish);
        }
    });

    const push = function(spec) {
        if (recording) {
            sequence.push(spec);
        }
    };

    const invokeCommand = async function(spec) {
        const func = internalCommands[spec.command];
        if (func !== undefined) {
            await func(spec.args);
        } else {
            await vscode.commands.executeCommand(
                spec.command,
                spec.args
            );
        }
    };

    const invokeCommandSync = async function(spec, context) {
        let ok = true;
        const promise = awaitController.waitFor(spec['await'] || '').catch(() => {});
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

    const playback = makeGuardedCommand(async function(args) {
        if (!recording) {
            args = (args && typeof(args) === 'object') ? args : {};
            const repeat = typeof(args.repeat) === 'number' ? args.repeat : 1;
            const commands = sequence.get();
            for (let k = 0; k < repeat; k++) {
                for (const spec of commands) {
                    const ok = await invokeCommandSync(spec, 'playback');
                    if (!ok) {
                        break;
                    }
                }
            }
        }
    });

    const makeCommandSpec = function(args) {
        if (!args || !args.command) {
            return null;
        }
        const spec = {
            command: args.command
        };
        if ('args' in args) {
            spec.args = args.args;
        }
        if ('await' in args) {
            spec['await'] = args['await'];
        }
        return spec;
    };

    const wrap = makeGuardedCommand(async function(args) {
        if (recording) {
            const spec = makeCommandSpec(args);
            if (!spec) {
                return;
            }
            if (onBeginWrappedCommandCallback) {
                onBeginWrappedCommandCallback();
            }
            const ok = await invokeCommandSync(spec, 'wrap');
            if (ok) {
                push(spec);
            }
            if (onEndWrappedCommandCallback) {
                onEndWrappedCommandCallback();
            }
        }
    });

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

        // testing purpose only
        isRecording: () => { return recording; },
        getCurrentSequence: () => { return sequence.get(); }
    };
};

module.exports = { KeyboardMacro };
