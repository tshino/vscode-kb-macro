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
            it('should connect current line and the previous line', async () => {
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
            it('should connect current line and the next line', async () => {
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
        describe('deleteWordLeft', () => {
            const seq = [ Cmd.DeleteWordLeft ];
            it('should delete one word to the left', async () => {
                setSelections([[2, 10]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(2).text, '    pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 4]]);
            });
            it('should connect current line and the previous line', async () => {
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
        describe('deleteWordRight', () => {
            const seq = [ Cmd.DeleteWordRight ];
            it('should delete one word to the right', async () => {
                setSelections([[2, 10]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(2).text, '    klmno  vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 10]]);
            });
            it('should connect current line and the next line and remove indent', async () => {
                setSelections([[0, 5]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefghij');
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
    describe('indent/outdent', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n'.repeat(10) +
                '    fghij\n'.repeat(10) +
                '        klmno\n'.repeat(10)
            ));
        });
        describe('outdent', () => {
            const seq = [ Cmd.Outdent ];
            it('should eliminate indent one level', async () => {
                setSelections([[20, 8]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(20).text, '    klmno');
                assert.deepStrictEqual(getSelections(), [[20, 4]]);
            });
            it('should eliminate indent one level on multiple lines', async () => {
                setSelections([[19, 4, 21, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(19).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(20).text, '    klmno');
                assert.strictEqual(textEditor.document.lineAt(21).text, '    klmno');
                assert.deepStrictEqual(getSelections(), [[19, 0, 21, 4]]);
            });
            it('should do nothing if no indent', async () => {
                setSelections([[0, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
            });
        });
        describe('outdentLines', () => {
            const seq = [ Cmd.OutdentLines ];
            it('should eliminate indent one level', async () => {
                setSelections([[20, 8]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(20).text, '    klmno');
                assert.deepStrictEqual(getSelections(), [[20, 4]]);
            });
            it('should eliminate indent one level on multiple lines', async () => {
                setSelections([[19, 4, 21, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(19).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(20).text, '    klmno');
                assert.strictEqual(textEditor.document.lineAt(21).text, '    klmno');
                assert.deepStrictEqual(getSelections(), [[19, 0, 21, 4]]);
            });
            it('should do nothing if no indent', async () => {
                setSelections([[0, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
            });
        });
        describe('indentLines', () => {
            const seq = [ Cmd.IndentLines ];
            it('should insert indent one level', async () => {
                setSelections([[10, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(10).text, '        fghij');
                assert.deepStrictEqual(getSelections(), [[10, 8]]);
            });
            it('should insert indent one level on multiple lines', async () => {
                setSelections([[9, 3, 11, 2]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(9).text, '    abcde');
                assert.strictEqual(textEditor.document.lineAt(10).text, '        fghij');
                assert.strictEqual(textEditor.document.lineAt(11).text, '        fghij');
                assert.deepStrictEqual(getSelections(), [[9, 7, 11, 2]]);
            });
        });
    });
});
