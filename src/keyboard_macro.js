'use strict';
const vscode = require('vscode');

const KeyboardMacro = (function() {
    const RecordingStateReason = {
        Start: 0,
        Cancel: 1,
        Finish: 2
    };

    let onChangeRecordingState = null;
    let recording = false;
    const sequence = [];

    const setOnChangeRecordingState = function(callback) {
        onChangeRecordingState = callback;
    };
    const notifyNewState = function(reason) {
        if (onChangeRecordingState) {
            onChangeRecordingState({ recording, reason });
        }
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

    const invokeCommand = async function(info) {
        await vscode.commands.executeCommand(
            info.command,
            info.args
        );
    };

    const playback = async function() {
        if (!recording) {
            for (let i = 0; i < sequence.length; i++) {
                const info = sequence[i];
                if (info.failed) {
                    continue;
                }
                await invokeCommand(info);
            }
        }
    };

    const wrap = async function(_textEditor, _edit, args) {
        if (recording) {
            if (!args || !args.command) {
                return;
            }
            const info = {
                command: args.command,
                args: args.args || {}
            };
            try {
                sequence.push(info);
                await invokeCommand(info);
            } catch(error) {
                info.failed = true;
                console.error('kb-macro: error in wrap: args=', args);
            }
        }
    };

    return {
        RecordingStateReason,
        setOnChangeRecordingState,
        startRecording,
        cancelRecording,
        finishRecording,
        playback,
        wrap,

        // testing purpose only
        isRecording: () => { return recording; },
        getCurrentSequence: () => { return sequence; }
    };
})();

module.exports = { KeyboardMacro };
