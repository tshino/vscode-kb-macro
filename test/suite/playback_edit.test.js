'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro } = require('../../src/extension.js');

describe('Edit Recording and Playback', () => {
    let textEditor;
    let edit = null; // dummy
    const Cmd = CommandsToTest;

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
        vscode.window.showInformationMessage('Started test for Edit Recording and Playback.');
        textEditor = await TestUtil.setupTextEditor({ content: '' });
    });

    describe('deleteXXX', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                '    fghij\n' +
                '    klmno pqrstu vwxyz'
            ));
        });
        describe('deleteLeft', () => {
            const seq = [ Cmd.DeleteLeft ];
            it('should delete one character to the left', async () => {
                setSelections([[0, 3]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abde');
                assert.deepStrictEqual(getSelections(), [[0, 2]]);
            });
            it('should connect the previous line', async () => {
                setSelections([[1, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde    fghij');
                assert.deepStrictEqual(getSelections(), [[0, 5]]);
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                setSelections([[0, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
            });
        });
        describe('deleteRight', () => {
            const seq = [ Cmd.DeleteRight ];
            it('should delete one character to the right', async () => {
                setSelections([[0, 3]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abce');
                assert.deepStrictEqual(getSelections(), [[0, 3]]);
            });
            it('should connect the next line', async () => {
                setSelections([[0, 5]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde    fghij');
                assert.deepStrictEqual(getSelections(), [[0, 5]]);
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                setSelections([[2, 22]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(2).text, '    klmno pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 22]]);
            });
        });
    });
});
