'use strict';
const vscode = require('vscode');
const { KeyboardMacro } = require('./keyboard_macro.js');

function activate(context) {
    const CommandPrefix = 'kb-macro.';
    const ContextPrefix = 'kb-macro.';

    const registerCommand = function(name, func) {
        const commandName = CommandPrefix + name;
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand(commandName, func)
        );
    };

    registerCommand('startRecording', KeyboardMacro.startRecording);
    registerCommand('cancelRecording', KeyboardMacro.cancelRecording);
    registerCommand('finishRecording', KeyboardMacro.finishRecording);
    registerCommand('playback', KeyboardMacro.playback);
    registerCommand('wrap', KeyboardMacro.wrap);

    KeyboardMacro.setOnChangeRecordingState(function({ recording, reason }) {
        const contextName = ContextPrefix + 'recording';
        vscode.commands.executeCommand('setContext', contextName, recording);

        if (recording) {
            vscode.window.showInformationMessage('Recording started!');
        } else if (reason === KeyboardMacro.RecordingStateReason.Cancel) {
            vscode.window.showInformationMessage('Recording canceled!');
        } else {
            vscode.window.showInformationMessage('Recording finished!');
        }
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
