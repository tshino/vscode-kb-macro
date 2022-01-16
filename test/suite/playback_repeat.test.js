'use strict';
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro, awaitController } = require('../../src/extension.js');

describe('Recording and Playback with Repeat', () => {
    let textEditor;
    const Cmd = CommandsToTest;
    const Type = text => ({ command: 'internal:performType', args: { text } });

    const setSelections = async function(array) {
        await awaitController.waitFor('selection', 1).catch(() => {});
        const newSelections = TestUtil.arrayToSelections(array);
        if (!util.isEqualSelections(textEditor.selections, newSelections)) {
            const timeout = 1000;
            textEditor.selections = newSelections;
            await awaitController.waitFor('selection', timeout).catch(
                () => { console.log('Warning: timeout in setSelections!'); }
            );
        }
    };
    const getSelections = function() {
        return TestUtil.selectionsToArray(textEditor.selections);
    };
    const record = async function(sequence) {
        keyboardMacro.startRecording();
        for (let i = 0; i < sequence.length; i++) {
            await keyboardMacro.wrap(sequence[i]);
        }
        keyboardMacro.finishRecording();
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for Recording and Playback with Repeat.');
        textEditor = await TestUtil.setupTextEditor({ content: '' });
    });

    describe('repeatPlaybackTillEndOfFile', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                'zero\n' +
                'one\n' +
                'two\n' +
                'three\n' +
                'four\n' +
                'five'
            ));
        });
        it('should join all lines with a comma', async () => {
            const seq = [ Cmd.CursorEnd, Type(', '), Cmd.DeleteRight ];
            await setSelections([[0, 0]]);
            await record(seq);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'zero, one');

            await keyboardMacro.repeatPlaybackTillEndOfFile();

            assert.strictEqual(textEditor.document.lineAt(0).text, 'zero, one, two, three, four, five');
            assert.deepStrictEqual(getSelections(), [[0, 29]]); // at 'f' of 'five'
        });
        it('should join every two lines with a space', async () => {
            const seq = [ Cmd.CursorEnd, Cmd.DeleteRight, Type(' '), Cmd.CursorEnd, Cmd.CursorRight ];
            await setSelections([[0, 0]]);
            await record(seq);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'zero one');

            await keyboardMacro.repeatPlaybackTillEndOfFile();

            assert.strictEqual(textEditor.document.lineAt(1).text, 'two three');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'four five');
            assert.deepStrictEqual(getSelections(), [[2, 9]]); // the end of the last line
        });
        it('should quote all lines except the last line', async () => {
            const seq = [ Type('"'), Cmd.CursorEnd, Type('"'), Cmd.CursorRight ];
            await setSelections([[0, 0]]);
            await record(seq);
            assert.strictEqual(textEditor.document.lineAt(0).text, '"zero"');

            await keyboardMacro.repeatPlaybackTillEndOfFile();

            // This may not be the expected result for the user,
            // but for now, it is considered the best for safety.
            assert.strictEqual(textEditor.document.lineAt(4).text, '"four"');
            assert.strictEqual(textEditor.document.lineAt(5).text, 'five');
            assert.deepStrictEqual(getSelections(), [[5, 0]]);
        });
        it('should insert a blank line below every line except the last line', async () => {
            const seq = [ Cmd.CursorDown, Cmd.Enter ];
            await setSelections([[0, 0]]);

            await record(seq);
            assert.strictEqual(textEditor.document.lineAt(1).text, '');

            await keyboardMacro.repeatPlaybackTillEndOfFile();

            assert.strictEqual(textEditor.document.lineAt(8).text, 'four');
            assert.strictEqual(textEditor.document.lineAt(9).text, '');
            assert.strictEqual(textEditor.document.lineAt(10).text, 'five');
            assert.strictEqual(textEditor.document.lineCount, 11);
            assert.deepStrictEqual(getSelections(), [[10, 0]]); // the beginning of the last line
        });
    });
});
