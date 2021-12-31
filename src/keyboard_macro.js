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
    let onChangePlaybackStateCallback = null;
    let onBeginWrappedCommandCallback = null;
    let onEndWrappedCommandCallback = null;
    let recording = false;
    let locked = false;
    let playing = false;
    let shouldAbortPlayback = false;
    const sequence = CommandSequence();
    const internalCommands = new Map();

    const makeGuardedCommand = function(body, teardown) {
        return async function(args) {
            if (locked) {
                return;
            }
            locked = true;
            try {
                await body(args);
            } catch (error) {
                console.error(error);
                console.info('kb-macro: Exception in guarded command');
            }
            if (teardown) {
                teardown();
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
    const changeRecordingState = function(newState, reason) {
        recording = newState;
        if (onChangeRecordingStateCallback) {
            onChangeRecordingStateCallback({ recording, reason });
        }
    };
    const onChangePlaybackState = function(callback) {
        onChangePlaybackStateCallback = callback;
    };
    const changePlaybackState = function(newState) {
        playing = newState;
        if (onChangePlaybackStateCallback) {
            onChangePlaybackStateCallback({ playing });
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
            changeRecordingState(true, RecordingStateReason.Start);
        }
    });
    const cancelRecording = makeGuardedCommandSync(function() {
        if (recording) {
            sequence.clear();
            changeRecordingState(false, RecordingStateReason.Cancel);
        }
    });
    const finishRecording = makeGuardedCommandSync(function() {
        if (recording) {
            sequence.optimize();
            changeRecordingState(false, RecordingStateReason.Finish);
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
            changePlaybackState(true);
            shouldAbortPlayback = false;
            args = (args && typeof(args) === 'object') ? args : {};
            const repeat = typeof(args.repeat) === 'number' ? args.repeat : 1;
            const commands = sequence.get();
            let ok = true;
            for (let k = 0; k < repeat && ok && !shouldAbortPlayback; k++) {
                for (const spec of commands) {
                    ok = await invokeCommandSync(spec, 'playback');
                    if (!ok || shouldAbortPlayback) {
                        break;
                    }
                }
            }
        }
    }, function teardown() {
        changePlaybackState(false);
        shouldAbortPlayback = false;
    });

    const abortPlayback = async function() {
        if (playing) {
            shouldAbortPlayback = true;
        }
    };

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
        onChangePlaybackState,
        onBeginWrappedCommand,
        onEndWrappedCommand,
        registerInternalCommand,
        startRecording,
        cancelRecording,
        finishRecording,
        push,
        playback,
        abortPlayback,
        wrap,

        // testing purpose only
        isRecording: () => { return recording; },
        isPlaying: () => { return playing; },
        getCurrentSequence: () => { return sequence.get(); }
    };
};

module.exports = { KeyboardMacro };
