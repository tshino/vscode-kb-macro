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
    const sequence = [];
    const internalCommands = new Map();

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

    const playback = async function() {
        if (!recording) {
            for (let i = 0; i < sequence.length; i++) {
                const info = sequence[i];
                if (info.failed) {
                    continue;
                }
                try {
                    await invokeCommand(info);
                } catch(error) {
                    console.error(error);
                    console.info('kb-macro: Error in playback: args=', info);
                }
            }
        }
    };

    const wrap = async function(_textEditor, _edit, args) {
        if (recording) {
            if (!args || !args.command) {
                return;
            }
            const info = {
                command: args.command
            };
            if (args.args) {
                info.args = args.args;
            }
            push(info);
            if (onBeginWrappedCommandCallback) {
                onBeginWrappedCommandCallback();
            }
            try {
                await invokeCommand(info);
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
        getCurrentSequence: () => { return sequence; }
    };
};

module.exports = { KeyboardMacro };
