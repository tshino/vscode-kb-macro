'use strict';
const vscode = require('vscode');
const { KeyboardMacro } = require('./keyboard_macro.js');
const { TypingDetector } = require('./typing_detector.js');

const keyboardMacro = KeyboardMacro();
const typingDetector = TypingDetector();

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
                typingDetector.start(vscode.window.activeTextEditor);
            } else {
                typingDetector.stop();
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
            typingDetector.stop();
        }
    );
    addEventListener(
        keyboardMacro.onEndWrappedCommand,
        function() {
            typingDetector.start(vscode.window.activeTextEditor);
        }
    );
    addEventListener(
        vscode.workspace.onDidChangeTextDocument,
        typingDetector.processDocumentChangeEvent
    );
    addEventListener(
        typingDetector.onDetectTyping,
        keyboardMacro.push
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
    keyboardMacro
};
