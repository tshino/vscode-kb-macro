'use strict';
const vscode = require('vscode');
const { CommandSequence } = require('./command_sequence.js');
const { EndOfFileDetector } = require('./end_of_file_detector.js');
const reentrantGuard = require('./reentrant_guard.js');
const util = require('./util.js');

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
    const MaxHistoryLength = 256;

    let onChangeRecordingStateCallback = null;
    let onChangeActiveStateCallback = null;
    let onChangePlaybackStateCallback = null;
    let onBeginWrappedCommandCallback = null;
    let onEndWrappedCommandCallback = null;
    let showInputBox = vscode.window.showInputBox; // replaceable for testing
    let showMessage = vscode.window.showInformationMessage; // replaceable for testing
    let active = false; // === (backgroundRecording || recording)
    let backgroundRecording = false;
    let recording = false;
    let playing = false;
    let shouldAbortPlayback = false;
    const sequence = CommandSequence();
    const history = CommandSequence({ maxLength: MaxHistoryLength });
    const internalCommands = new Map();

    let printError = defaultPrintError;
    function defaultPrintError(error) {
        console.error(error);
    };
    const setPrintError = function(printErrorImpl) {
        const old = printError;
        printError = printErrorImpl;
        return old;
    };

    const onChangeRecordingState = function(callback) {
        onChangeRecordingStateCallback = callback;
    };
    const onChangeActiveState = function(callback) {
        onChangeActiveStateCallback = callback;
    };
    const updateActiveState = function() {
        const newState = backgroundRecording || recording;
        if (active !== newState) {
            active = newState;
            if (onChangeActiveStateCallback) {
                onChangeActiveStateCallback({ active });
            }
        }
    };
    const changeBackgroundRecordingState = function(newState) {
        backgroundRecording = newState;
        updateActiveState();
    };
    const changeRecordingState = function(newState, reason) {
        recording = newState;
        if (onChangeRecordingStateCallback) {
            onChangeRecordingStateCallback({ recording, reason });
        }
        updateActiveState();
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
    const setShowMessage = function(showMessageImpl) {
        const old = showMessage;
        showMessage = showMessageImpl;
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
    const startBackgroundRecording = async function() {
        await reentrantGuard.callExclusively(function() {
            if (!backgroundRecording) {
                history.clear();
                changeBackgroundRecordingState(true);
            }
        });
    };
    const stopBackgroundRecording = async function() {
        await reentrantGuard.callExclusively(function() {
            changeBackgroundRecordingState(false);
        });
    };
    const getRecentBackgroundRecords = function() {
        const sequence = history.get();
        return JSON.parse(JSON.stringify(sequence));
    };
    const areEqualRecords = function(record1, record2) {
        const spec1 = util.makeCommandSpec(record1);
        const spec2 = util.makeCommandSpec(record2);
        if (!spec1 || !spec2) {
            return null;
        }
        return util.areEqualCommandSpec(spec1, spec2);
    };

    const push = function(spec) {
        if (spec.record === 'side-effect') {
            // side-effect mode
            return;
        }
        if (backgroundRecording) {
            history.push(spec);
        }
        if (recording) {
            sequence.push(spec);
        }
    };

    const copyMacroAsKeybinding = reentrantGuard.makeGuardedCommand(async function() {
        const commands = sequence.get();
        if (commands.length === 0) {
            showMessage('There\'s no recorded macro.');
            return;
        }
        const macro =
        '{\n' +
        '    "key": "",\n' +
        '    "command": "kb-macro.playback",\n' +
        '    "args": {\n' +
        '        "sequence": [\n' +
        commands.map(
            spec => `            ${JSON.stringify(spec, null, 1).replace(/\n\s*/g, ' ')}`
        ).join(',\n') + (commands.length === 0 ? '' : '\n') +
        '        ]\n' +
        '    }\n' +
        '}';
        await vscode.env.clipboard.writeText(macro);
        showMessage(
            'Copied the recorded macro to the clipboard!',
            'Open Keyboard Shortcuts (JSON)'
        ).then(response => {
            if (response === 'Open Keyboard Shortcuts (JSON)') {
                vscode.commands.executeCommand('workbench.action.openGlobalKeybindingsFile');
            }
        }, () => {});
    });

    const invokeCommand = async function(spec) {
        const func = internalCommands[spec.command];
        if (func !== undefined) {
            await func(spec.args);
        } else {
            // Passing an unnecessary second argument even if it's `undefined` can cause
            // unexpected behavior of the target command.
            // https://github.com/tshino/vscode-kb-macro/issues/142
            if (spec.args === undefined) {
                await vscode.commands.executeCommand(
                    spec.command
                );
            } else {
                await vscode.commands.executeCommand(
                    spec.command,
                    spec.args
                );
            }
        }
    };

    const invokeCommandSync = async function(spec, context) {
        let ok = true;
        const promise = awaitController.waitFor(spec['await'] || '').catch(() => {});
        try {
            await invokeCommand(spec);
        } catch(error) {
            ok = false;
            printError(`'kb-macro: ${error.message} - Error in ${context}: ${JSON.stringify(spec)}`);
        } finally {
            await promise;
        }
        return ok;
    };

    const validatePlaybackArgs = function(args) {
        args = (args && typeof(args) === 'object') ? args : {};
        const validArgs = {};
        if ('repeat' in args && typeof(args.repeat) === 'number') {
            validArgs.repeat = args.repeat;
        }
        if ('sequence' in args) {
            if (!Array.isArray(args.sequence)) {
                showMessage('Invalid \'sequence\' argument: ' + JSON.stringify(args.sequence));
                validArgs.sequence = [];
            } else {
                const sequence = args.sequence.map(spec => util.makeCommandSpec(spec));
                if (sequence.includes(null)) {
                    showMessage('Invalid \'sequence\' argument: ' + JSON.stringify(args.sequence));
                    validArgs.sequence = [];
                } else {
                    validArgs.sequence = sequence;
                }
            }
        }
        return validArgs;
    };

    const playbackImpl = async function(args, { tillEndOfFile = false } = {}) {
        args = validatePlaybackArgs(args);
        const repeat = 'repeat' in args ? args.repeat : 1;
        const commands = 'sequence' in args ? args.sequence : sequence.get();
        const wrapMode = active ? 'command' : null;
        if (recording) {
            if (!('sequence' in args)) {
                return;
            }
        }
        try {
            if (wrapMode && onBeginWrappedCommandCallback) {
                onBeginWrappedCommandCallback(wrapMode);
            }
            changePlaybackState(true, PlaybackStateReason.Start);
            shouldAbortPlayback = false;
            let endOfFileDetector;
            if (tillEndOfFile) {
                endOfFileDetector = EndOfFileDetector(vscode.window.activeTextEditor);
            }
            let ok = true;
            for (let k = 0; k < repeat || tillEndOfFile; k++) {
                for (const spec of commands) {
                    ok = await invokeCommandSync(spec, 'playback');
                    if (!ok || shouldAbortPlayback) {
                        break;
                    }
                    if (wrapMode) {
                        push(spec);
                    }
                }
                if (!ok || shouldAbortPlayback) {
                    break;
                }
                if (tillEndOfFile) {
                    if (endOfFileDetector.reachedEndOfFile()) {
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
            if (wrapMode && onEndWrappedCommandCallback) {
                onEndWrappedCommandCallback(wrapMode);
            }
        }
    };
    const playback = reentrantGuard.makeGuardedCommand(args => playbackImpl(args));

    const abortPlayback = async function() {
        if (playing) {
            shouldAbortPlayback = true;
        }
    };

    const repeatPlayback = reentrantGuard.makeGuardedCommand(async function() {
        if (recording) {
            return;
        }
        const input = await showInputBox({
            prompt: 'Input the number of times to repeat the macro',
            validateInput: util.validatePositiveIntegerInput
        });
        if (input) {
            const args = {
                repeat: Number(input)
            };
            await playbackImpl(args);
        }
    });

    const repeatPlaybackTillEndOfFile = reentrantGuard.makeGuardedCommand(async function() {
        const args = {};
        const option = { tillEndOfFile: true };
        await playbackImpl(args, option);
    });

    // WrapQueueSize
    // independently adjustable value.
    // min value is 1.
    // greater value reduces input rejection. 2 or 3 is enough.
    // greater value leads to too many queued and delayed command execution.
    // See: https://github.com/tshino/vscode-kb-macro/pull/32
    const WrapQueueSize = 2;
    const wrapSync = reentrantGuard.makeQueueableCommand(async function(args) {
        if (active) {
            const spec = util.makeCommandSpec(args);
            if (!spec) {
                return;
            }
            if (spec.command === 'kb-macro.wrap') {
                return;
            }
            if (spec.command === 'kb-macro.playback') {
                await playbackImpl(spec.args);
                return;
            }
            const wrapMode = spec.record || 'command';
            if (onBeginWrappedCommandCallback) {
                onBeginWrappedCommandCallback(wrapMode);
            }
            try {
                const ok = await invokeCommandSync(spec, 'wrap');
                if (ok) {
                    push(spec);
                }
            } finally {
                if (onEndWrappedCommandCallback) {
                    onEndWrappedCommandCallback(wrapMode);
                }
            }
        }
    }, { queueSize: WrapQueueSize });

    const wrap = function(args) {
        // Discard the returned Promise.
        // See https://github.com/tshino/vscode-kb-macro/issues/63
        wrapSync(args);
    };

    return {
        RecordingStateReason,
        PlaybackStateReason,
        setPrintError,
        onChangeRecordingState,
        onChangeActiveState,
        onChangePlaybackState,
        onBeginWrappedCommand,
        onEndWrappedCommand,
        registerInternalCommand,
        startRecording,
        cancelRecording,
        finishRecording,
        startBackgroundRecording,
        stopBackgroundRecording,
        getRecentBackgroundRecords,
        areEqualRecords,
        push,
        copyMacroAsKeybinding,
        validatePlaybackArgs,
        playback,
        abortPlayback,
        repeatPlayback,
        repeatPlaybackTillEndOfFile,
        wrapSync,
        wrap,

        // testing purpose only
        isRecording: () => { return recording; },
        isBackgroundRecordingOngoing: () => { return backgroundRecording; },
        isPlaying: () => { return playing; },
        getCurrentSequence: () => { return sequence.get(); },
        discardHistory: () => { history.clear(); },
        setShowInputBox,
        setShowMessage,
        WrapQueueSize
    };
};

module.exports = { KeyboardMacro };
