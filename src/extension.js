'use strict';
const vscode = require('vscode');
const { KeyboardMacro } = require('./keyboard_macro.js');
const { TypingDetector } = require('./typing_detector.js');
const internalCommands = require('./internal_commands.js');

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

    keyboardMacro.registerInternalCommand('internal:performType', internalCommands.performType);

    const modeIndicator = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 110);
    modeIndicator.text = "REC";
    context.subscriptions.push(modeIndicator);

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
                modeIndicator.show();
                vscode.window.setStatusBarMessage('Recording started!', 3000);
            } else {
                modeIndicator.hide();
                if (reason === keyboardMacro.RecordingStateReason.Cancel) {
                    vscode.window.setStatusBarMessage('Recording canceled!', 3000);
                } else {
                    vscode.window.setStatusBarMessage('Recording finished!', 3000);
                }
            }
        }
    );
    addEventListener(
        keyboardMacro.onBeginWrappedCommand,
        function() {
            typingDetector.suspend();
        }
    );
    addEventListener(
        keyboardMacro.onEndWrappedCommand,
        function() {
            typingDetector.resume(vscode.window.activeTextEditor);
        }
    );
    addEventListener(
        vscode.workspace.onDidChangeTextDocument,
        function(event) {
            keyboardMacro.processDocumentChangeEvent(event);
            typingDetector.processDocumentChangeEvent(event);
        }
    );
    addEventListener(
        vscode.window.onDidChangeTextEditorSelection,
        function(event) {
            keyboardMacro.processSelectionChangeEvent(event);
            typingDetector.processSelectionChangeEvent(event);
        }
    );
    addEventListener(
        typingDetector.onDetectTyping,
        function(type, args) {
            if (type === typingDetector.TypingType.Direct) {
                keyboardMacro.push({
                    command: 'internal:performType',
                    args: args
                });
            } else if (type === typingDetector.TypingType.Default) {
                keyboardMacro.push({
                    command: 'default:type',
                    args: args
                });
            }
        }
    );
    addEventListener(
        typingDetector.onDetectCursorMotion,
        keyboardMacro.push
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
    keyboardMacro
};
