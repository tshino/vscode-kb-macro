'use strict';
const vscode = require('vscode');
const { KeyboardMacro } = require('./keyboard_macro.js');
const { TypingRecorder } = require('./typing_recorder.js');

const keyboardMacro = KeyboardMacro();
const typingRecorder = TypingRecorder();

function activate(context) {
    const CommandPrefix = 'kb-macro.';
    const ContextPrefix = 'kb-macro.';

    const registerCommand = function(name, func) {
        const commandName = CommandPrefix + name;
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand(commandName, func)
        );
    };
    const addEventListener = function(event, func) {
        const disposable = event(func);
        if (disposable) {
            context.subscriptions.push(disposable);
        }
    };

    registerCommand('startRecording', keyboardMacro.startRecording);
    registerCommand('cancelRecording', keyboardMacro.cancelRecording);
    registerCommand('finishRecording', keyboardMacro.finishRecording);
    registerCommand('playback', keyboardMacro.playback);
    registerCommand('wrap', keyboardMacro.wrap);

    addEventListener(
        keyboardMacro.onChangeRecordingState,
        function({ recording, reason }) {
            if (recording) {
                typingRecorder.start(vscode.window.activeTextEditor);
            } else {
                typingRecorder.stop();
            }

            const contextName = ContextPrefix + 'recording';
            vscode.commands.executeCommand('setContext', contextName, recording);

            if (recording) {
                vscode.window.showInformationMessage('Recording started!');
            } else if (reason === keyboardMacro.RecordingStateReason.Cancel) {
                vscode.window.showInformationMessage('Recording canceled!');
            } else {
                vscode.window.showInformationMessage('Recording finished!');
            }
        }
    );
    addEventListener(
        keyboardMacro.onBeginWrappedCommand,
        function() {
            typingRecorder.stop();
        }
    );
    addEventListener(
        keyboardMacro.onEndWrappedCommand,
        function() {
            typingRecorder.start(vscode.window.activeTextEditor);
        }
    );
    addEventListener(
        vscode.workspace.onDidChangeTextDocument,
        typingRecorder.processDocumentChangeEvent
    );
    addEventListener(
        typingRecorder.onDetectTyping,
        keyboardMacro.push
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
    keyboardMacro
};
