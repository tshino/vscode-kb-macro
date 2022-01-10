'use strict';
const vscode = require('vscode');
const { CommandSequence } = require('./command_sequence.js');
const reentrantGuard = require('./reentrant_guard.js');

const KeyboardMacro = function({ awaitController }) {
    const RecordingStateReason = {
        Start: 0,
        Cancel: 1,
        Finish: 2
    };
    const PlaybackStateReason = {
        Start: 0,
        Abort: 1,
        Finish: 2
    };

    let onChangeRecordingStateCallback = null;
    let onChangePlaybackStateCallback = null;
    let onBeginWrappedCommandCallback = null;
    let onEndWrappedCommandCallback = null;
    let showInputBox = vscode.window.showInputBox;
    let recording = false;
    let playing = false;
    let shouldAbortPlayback = false;
    const sequence = CommandSequence();
    const internalCommands = new Map();

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
    const changePlaybackState = function(newState, reason) {
        playing = newState;
        if (onChangePlaybackStateCallback) {
            onChangePlaybackStateCallback({ playing, reason });
        }
    };
    const onBeginWrappedCommand = function(callback) {
        onBeginWrappedCommandCallback = callback;
    };
    const onEndWrappedCommand = function(callback) {
        onEndWrappedCommandCallback = callback;
    };

    const setShowInputBox = function(showInputBoxImpl) {
        const old = showInputBox;
        showInputBox = showInputBoxImpl;
        return old;
    };

    const registerInternalCommand = function(name, func) {
        internalCommands[name] = func;
    };

    const startRecording = reentrantGuard.makeGuardedCommandSync(function() {
        if (!recording) {
            sequence.clear();
            changeRecordingState(true, RecordingStateReason.Start);
        }
    });
    const cancelRecording = reentrantGuard.makeGuardedCommandSync(function() {
        if (recording) {
            sequence.clear();
            changeRecordingState(false, RecordingStateReason.Cancel);
        }
    });
    const finishRecording = reentrantGuard.makeGuardedCommandSync(function() {
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
        } finally {
            await promise;
        }
        return ok;
    };

    const playbackImpl = async function(args) {
        if (recording) {
            return;
        }
        try {
            changePlaybackState(true, PlaybackStateReason.Start);
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
        } finally {
            const reason = shouldAbortPlayback ?
                PlaybackStateReason.Abort :
                PlaybackStateReason.Finish;
            changePlaybackState(false, reason);
            shouldAbortPlayback = false;
        }
    };
    const playback = reentrantGuard.makeGuardedCommand(playbackImpl);

    const abortPlayback = async function() {
        if (playing) {
            shouldAbortPlayback = true;
        }
    };

    const validatePositiveIntegerInput = function(value) {
        if (value !== '' && !/^[1-9]\d*$/.test(value)) {
            return 'Input a positive integer number';
        }
    };
    const repeatPlayback = reentrantGuard.makeGuardedCommand(async function() {
        if (recording) {
            return;
        }
        const input = await showInputBox({
            prompt: 'Input the number of times to repeat the macro',
            validateInput: validatePositiveIntegerInput
        });
        if (input) {
            await playbackImpl({
                repeat: Number(input)
            });
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

    const wrap = reentrantGuard.makeGuardedCommand(async function(args) {
        if (recording) {
            const spec = makeCommandSpec(args);
            if (!spec) {
                return;
            }
            if (onBeginWrappedCommandCallback) {
                onBeginWrappedCommandCallback();
            }
            try {
                const ok = await invokeCommandSync(spec, 'wrap');
                if (ok) {
                    push(spec);
                }
            } finally {
                if (onEndWrappedCommandCallback) {
                    onEndWrappedCommandCallback();
                }
            }
        }
    });

    return {
        RecordingStateReason,
        PlaybackStateReason,
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
        validatePositiveIntegerInput,
        repeatPlayback,
        wrap,

        // testing purpose only
        isRecording: () => { return recording; },
        isPlaying: () => { return playing; },
        getCurrentSequence: () => { return sequence.get(); },
        setShowInputBox // testing purpose only
    };
};

module.exports = { KeyboardMacro };
