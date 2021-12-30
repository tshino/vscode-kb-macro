'use strict';
const vscode = require('vscode');
const { AwaitController } = require('./await_controller.js');
const { KeyboardMacro } = require('./keyboard_macro.js');
const { TypingDetector } = require('./typing_detector.js');
const { HelperContext } = require('./helper_context.js');
const internalCommands = require('./internal_commands.js');

const awaitController = AwaitController();
const keyboardMacro = KeyboardMacro({ awaitController });
const typingDetector = TypingDetector();
const helperContext = HelperContext();

function activate(context) {
    const CommandPrefix = 'kb-macro.';
    const ContextPrefix = 'kb-macro.';

    const registerCommand = function(name, func) {
        const commandName = CommandPrefix + name;
        context.subscriptions.push(
            vscode.commands.registerCommand(commandName, func)
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
    registerCommand('abortPlayback', keyboardMacro.abortPlayback);
    registerCommand('wrap', keyboardMacro.wrap);

    keyboardMacro.registerInternalCommand('internal:performType', internalCommands.performType);
    keyboardMacro.registerInternalCommand('internal:performCursorMotion', internalCommands.performCursorMotion);

    const modeIndicator = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 110);
    modeIndicator.text = "REC";
    context.subscriptions.push(modeIndicator);

    addEventListener(
        keyboardMacro.onChangeRecordingState,
        function({ recording, reason }) {
            if (recording) {
                typingDetector.start();
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
        helperContext.onChangeContext,
        function({ name, value }) {
            const contextName = ContextPrefix + name;
            vscode.commands.executeCommand('setContext', contextName, value);
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
            typingDetector.resume();
        }
    );
    addEventListener(
        vscode.workspace.onDidChangeTextDocument,
        function(event) {
            awaitController.processDocumentChangeEvent(event);
            typingDetector.processDocumentChangeEvent(event);
        }
    );
    addEventListener(
        vscode.window.onDidChangeTextEditorSelection,
        function(event) {
            awaitController.processSelectionChangeEvent(event);
            typingDetector.processSelectionChangeEvent(event);
            helperContext.processSelectionChangeEvent(event);
        }
    );
    addEventListener(
        vscode.window.onDidChangeActiveTextEditor,
        function(event) {
            helperContext.processActiveTextEditorChangeEvent(event);
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
        function(type, args) {
            if (type === typingDetector.CursorMotionType.Direct) {
                keyboardMacro.push({
                    command: 'internal:performCursorMotion',
                    args: args
                });
            }
        }
    );

    helperContext.reset(vscode.window.activeTextEditor);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
    awaitController,
    keyboardMacro
};
