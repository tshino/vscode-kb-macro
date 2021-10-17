'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro } = require('../../src/extension.js');
const internalCommands = require('../../src/internal_commands.js');

describe('Recording and Playback: Asynchronous Commands', () => {
    let textEditor;
    let edit = null; // dummy
    const Cmd = CommandsToTest;
    const PerformType = text => ({
        command: 'kb-macro.performType',
        args: { text },
        effect: [ 'edit', 'move' ]
    });

    const setSelections = function(array) {
        textEditor.selections = TestUtil.arrayToSelections(array);
    };
    const getSelections = function() {
        return TestUtil.selectionsToArray(textEditor.selections);
    };
    const record = async function(sequence) {
        keyboardMacro.startRecording();
        for (let i = 0; i < sequence.length; i++) {
            await keyboardMacro.wrap(textEditor, edit, sequence[i]);
        }
        keyboardMacro.finishRecording();
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for Recording and Playback of Asynchronous Commands.');
        textEditor = await TestUtil.setupTextEditor({ content: '' });
    });

    // Here we register the internal command performType to vscode as an external command.
    // We use it in order to test synchronous execution of asynchronous command using 'effects' option.
    vscode.commands.registerTextEditorCommand('kb-macro.performType', internalCommands.performType);

    describe('performType', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                '    fghij\n' +
                '    klmno pqrstu vwxyz'
            ));
        });
        it('should insert a text', async () => {
            const seq = [ PerformType('12345') ];

            setSelections([[0, 5]]);
            await record(seq);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde12345');
            assert.deepStrictEqual(getSelections(), [[0, 10]]);

            setSelections([[1, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(1).text, '    12345fghij');
            assert.deepStrictEqual(getSelections(), [[1, 9]]);
        });
        it('should insert texts with cursor movement', async () => {
            const seq = [
                PerformType('111'),
                Cmd.CursorRight,
                PerformType('222'),
                Cmd.CursorDown,
                PerformType('333'),
                Cmd.CursorEnd,
                PerformType('444')
            ];

            setSelections([[0, 5]]);
            await record(seq);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde111');
            assert.strictEqual(textEditor.document.lineAt(1).text, '222    fghij');
            assert.strictEqual(textEditor.document.lineAt(2).text, '   333 klmno pqrstu vwxyz444');
            assert.deepStrictEqual(getSelections(), [[2, 28]]);

            setSelections([[0, 0]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(0).text, '111a222bcde111');
            assert.strictEqual(textEditor.document.lineAt(1).text, '222    333fghij444');
            assert.strictEqual(textEditor.document.lineAt(2).text, '   333 klmno pqrstu vwxyz444');
            assert.deepStrictEqual(getSelections(), [[1, 18]]);
        });
    });
});
