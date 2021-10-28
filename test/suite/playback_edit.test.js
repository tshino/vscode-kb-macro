'use strict';
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro, awaitController } = require('../../src/extension.js');

describe('Recording and Playback: Edit', () => {
    let textEditor;
    let edit = null; // dummy
    const Cmd = CommandsToTest;

    const setSelections = async function(array) {
        const newSelections = TestUtil.arrayToSelections(array);
        if (!util.isEqualSelections(textEditor.selections, newSelections)) {
            const promise = awaitController.waitFor('selection');
            textEditor.selections = newSelections;
            await promise;
        }
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
                await setSelections([[0, 3]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abde');
                assert.deepStrictEqual(getSelections(), [[0, 2]]);

                await setSelections([[1, 6]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, '    fhij');
                assert.deepStrictEqual(getSelections(), [[1, 5]]);
            });
            it('should connect current line and the previous line', async () => {
                await setSelections([[1, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde    fghij');
                assert.deepStrictEqual(getSelections(), [[0, 5]]);

                await setSelections([[1, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde    fghij    klmno pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[0, 14]]);
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await setSelections([[0, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);

                await setSelections([[0, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
            });
        });
        describe('deleteRight', () => {
            const seq = [ Cmd.DeleteRight ];
            it('should delete one character to the right', async () => {
                await setSelections([[0, 3]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abce');
                assert.deepStrictEqual(getSelections(), [[0, 3]]);

                await setSelections([[1, 6]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, '    fgij');
                assert.deepStrictEqual(getSelections(), [[1, 6]]);
            });
            it('should connect current line and the next line', async () => {
                await setSelections([[0, 5]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde    fghij');
                assert.deepStrictEqual(getSelections(), [[0, 5]]);

                await setSelections([[0, 14]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde    fghij    klmno pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[0, 14]]);
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await setSelections([[2, 22]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(2).text, '    klmno pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 22]]);

                await setSelections([[2, 22]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(2).text, '    klmno pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 22]]);
            });
        });
        describe('deleteWordLeft', () => {
            const seq = [ Cmd.DeleteWordLeft ];
            it('should delete one word to the left', async () => {
                await setSelections([[2, 10]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(2).text, '    pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 4]]);
            });
            it('should connect current line and the previous line', async () => {
                await setSelections([[1, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde    fghij');
                assert.deepStrictEqual(getSelections(), [[0, 5]]);
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await setSelections([[0, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
            });
        });
        describe('deleteWordRight', () => {
            const seq = [ Cmd.DeleteWordRight ];
            it('should delete one word to the right', async () => {
                await setSelections([[2, 10]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(2).text, '    klmno  vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 10]]);
            });
            it('should connect current line and the next line and remove indent', async () => {
                await setSelections([[0, 5]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefghij');
                assert.deepStrictEqual(getSelections(), [[0, 5]]);
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await setSelections([[2, 22]]);
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
                await setSelections([[20, 8]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(20).text, '    klmno');
                assert.deepStrictEqual(getSelections(), [[20, 4]]);
            });
            it('should eliminate indent one level on multiple lines', async () => {
                await setSelections([[19, 4, 21, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(19).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(20).text, '    klmno');
                assert.strictEqual(textEditor.document.lineAt(21).text, '    klmno');
                assert.deepStrictEqual(getSelections(), [[19, 0, 21, 4]]);
            });
            it('should do nothing if no indent', async () => {
                await setSelections([[0, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
            });
        });
        describe('outdentLines', () => {
            const seq = [ Cmd.OutdentLines ];
            it('should eliminate indent one level', async () => {
                await setSelections([[20, 8]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(20).text, '    klmno');
                assert.deepStrictEqual(getSelections(), [[20, 4]]);
            });
            it('should eliminate indent one level on multiple lines', async () => {
                await setSelections([[19, 4, 21, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(19).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(20).text, '    klmno');
                assert.strictEqual(textEditor.document.lineAt(21).text, '    klmno');
                assert.deepStrictEqual(getSelections(), [[19, 0, 21, 4]]);
            });
            it('should do nothing if no indent', async () => {
                await setSelections([[0, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
            });
        });
        describe('indentLines', () => {
            const seq = [ Cmd.IndentLines ];
            it('should insert indent one level', async () => {
                await setSelections([[10, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(10).text, '        fghij');
                assert.deepStrictEqual(getSelections(), [[10, 8]]);
            });
            it('should insert indent one level on multiple lines', async () => {
                await setSelections([[9, 3, 11, 2]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(9).text, '    abcde');
                assert.strictEqual(textEditor.document.lineAt(10).text, '        fghij');
                assert.strictEqual(textEditor.document.lineAt(11).text, '        fghij');
                assert.deepStrictEqual(getSelections(), [[9, 7, 11, 2]]);
            });
        });
    });
    describe('commentLine', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                'function hello(name) {\n' +
                '    console.log("Hello, " + name);\n' +
                '}\n' +
                '// hello("world");\n' +
                '// hello("vscode");\n' +
                'hello("Code");'
            ), { languageId: 'javascript' } );
        });
        describe('commentLine', () => {
            const seq = [ Cmd.CommentLine ];
            it('should add line comment', async () => {
                await setSelections([[5, 5]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(5).text, '// hello("Code");');
                assert.deepStrictEqual(getSelections(), [[5, 8]]);

                await setSelections([[1, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, '    // console.log("Hello, " + name);');
                assert.deepStrictEqual(getSelections(), [[1, 0]]);
            });
            it('should remove line comment', async () => {
                await setSelections([[3, 5]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(3).text, 'hello("world");');
                assert.deepStrictEqual(getSelections(), [[3, 2]]);

                await setSelections([[4, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'hello("vscode");');
                assert.deepStrictEqual(getSelections(), [[4, 0]]);
            });
            it('should add and remove line comment', async () => {
                const seq = [ Cmd.CommentLine, Cmd.CommentLine ];
                await setSelections([[5, 5]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(5).text, 'hello("Code");');
                assert.deepStrictEqual(getSelections(), [[5, 5]]);

                await setSelections([[1, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, '    console.log("Hello, " + name);');
                assert.deepStrictEqual(getSelections(), [[1, 0]]);
            });
            it('should add/remove line comments on multiple lines', async () => {
                await setSelections([[0, 0, 3, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, '// function hello(name) {');
                assert.strictEqual(textEditor.document.lineAt(1).text, '//     console.log("Hello, " + name);');
                assert.strictEqual(textEditor.document.lineAt(2).text, '// }');
                assert.deepStrictEqual(getSelections(), [[0, 3, 3, 0]]);

                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'function hello(name) {');
                assert.strictEqual(textEditor.document.lineAt(1).text, '    console.log("Hello, " + name);');
                assert.strictEqual(textEditor.document.lineAt(2).text, '}');
                assert.deepStrictEqual(getSelections(), [[0, 0, 3, 0]]);
            });
        });
        describe('addCommentLine', () => {
            const seq = [ Cmd.AddCommentLine ];
            it('should add line comment', async () => {
                await setSelections([[5, 5]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(5).text, '// hello("Code");');
                assert.deepStrictEqual(getSelections(), [[5, 8]]);

                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(5).text, '// // hello("Code");');
                assert.deepStrictEqual(getSelections(), [[5, 11]]);
            });
            it('should add line comments on multiple lines', async () => {
                await setSelections([[0, 0, 3, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, '// function hello(name) {');
                assert.strictEqual(textEditor.document.lineAt(1).text, '//     console.log("Hello, " + name);');
                assert.strictEqual(textEditor.document.lineAt(2).text, '// }');
                assert.deepStrictEqual(getSelections(), [[0, 3, 3, 0]]);

                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, '// // function hello(name) {');
                assert.strictEqual(textEditor.document.lineAt(1).text, '// //     console.log("Hello, " + name);');
                assert.strictEqual(textEditor.document.lineAt(2).text, '// // }');
                assert.deepStrictEqual(getSelections(), [[0, 6, 3, 0]]);
            });
        });
        describe('removeCommentLine', () => {
            const seq = [ Cmd.RemoveCommentLine ];
            it('should remove line comment', async () => {
                await setSelections([[3, 5]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(3).text, 'hello("world");');
                assert.deepStrictEqual(getSelections(), [[3, 2]]);

                await setSelections([[4, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'hello("vscode");');
                assert.deepStrictEqual(getSelections(), [[4, 0]]);
            });
            it('should remove line comments on multiple lines', async () => {
                await setSelections([[3, 0, 5, 0]]);
                await record(seq);
                assert.strictEqual(textEditor.document.lineAt(3).text, 'hello("world");');
                assert.strictEqual(textEditor.document.lineAt(4).text, 'hello("vscode");');
                assert.deepStrictEqual(getSelections(), [[3, 0, 5, 0]]);

                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(3).text, 'hello("world");');
                assert.strictEqual(textEditor.document.lineAt(4).text, 'hello("vscode");');
                assert.deepStrictEqual(getSelections(), [[3, 0, 5, 0]]);
            });
        });
    });
    describe('clipboardXXX', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                'fghij\n' +
                'klmno\n' +
                'pqrstu\n' +
                'vwxyz\n'
            ));
        });
        describe('clipboardCopyAction', () => {
            it('should copy one line', async () => {
                const seq = [ Cmd.ClipboardCopy ];
                await setSelections([[1, 3]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.deepStrictEqual(getSelections(), [[1, 3]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'fghij\n');

                await setSelections([[2, 4]]);
                await keyboardMacro.playback();
                assert.deepStrictEqual(getSelections(), [[2, 4]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'klmno\n');
            });
            it('should copy selected range', async () => {
                const seq = [ Cmd.ClipboardCopy ];
                await setSelections([[0, 3, 1, 2]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.deepStrictEqual(getSelections(), [[0, 3, 1, 2]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'de\nfg');

                await setSelections([[1, 2, 3, 4]]);
                await keyboardMacro.playback();
                assert.deepStrictEqual(getSelections(), [[1, 2, 3, 4]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'hij\nklmno\npqrs');
            });
        });
        describe('clipboardCutAction', () => {
            it('should cut one line', async () => {
                const seq = [ Cmd.ClipboardCut ];
                await setSelections([[0, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'fghij');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'abcde\n');

                await setSelections([[2, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(2).text, 'vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 0]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'pqrstu\n');
            });
            it('should cut multiple lines', async () => {
                const seq = [ Cmd.ClipboardCut, Cmd.ClipboardCut ];
                await setSelections([[1, 0]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(1).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'vwxyz');
                assert.deepStrictEqual(getSelections(), [[1, 0]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'klmno\n');

                await setSelections([[0, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'vwxyz');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'pqrstu\n');
            });
            it('should cut selected range', async () => {
                const seq = [ Cmd.ClipboardCut ];
                await setSelections([[0, 3, 1, 2]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abchij');
                assert.deepStrictEqual(getSelections(), [[0, 3]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'de\nfg');

                await setSelections([[1, 2, 3, 4]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, 'klz');
                assert.deepStrictEqual(getSelections(), [[1, 2]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'mno\npqrstu\nvwxy');
            });
        });
        describe('clipboardPasteAction', () => {
            it('should insert one line', async () => {
                const seq = [ Cmd.ClipboardPaste ];
                await setSelections([[0, 0]]);
                await vscode.env.clipboard.writeText('ABCDE\n');
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'ABCDE');
                assert.strictEqual(textEditor.document.lineAt(1).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[1, 0]]);

                await setSelections([[2, 0]]);
                await vscode.env.clipboard.writeText('FGHIJ\n');
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(2).text, 'FGHIJ');
                assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
                assert.deepStrictEqual(getSelections(), [[3, 0]]);
            });
            it('should insert one line multiple times', async () => {
                const seq = [ Cmd.ClipboardPaste, Cmd.ClipboardPaste ];
                await setSelections([[1, 0]]);
                await vscode.env.clipboard.writeText('ABCDE\n');
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(1).text, 'ABCDE');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'ABCDE');
                assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
                assert.deepStrictEqual(getSelections(), [[3, 0]]);

                await setSelections([[0, 0]]);
                await vscode.env.clipboard.writeText('FGHIJ\n');
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'FGHIJ');
                assert.strictEqual(textEditor.document.lineAt(1).text, 'FGHIJ');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[2, 0]]);
            });
            it('should replace selected range', async () => {
                const seq = [ Cmd.ClipboardPaste ];
                await setSelections([[0, 3, 1, 2]]);
                await vscode.env.clipboard.writeText('ABCDE');
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcABCDEhij');
                assert.deepStrictEqual(getSelections(), [[0, 8]]);

                await setSelections([[1, 2, 3, 4]]);
                await vscode.env.clipboard.writeText('FGHIJ');
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, 'klFGHIJz');
                assert.deepStrictEqual(getSelections(), [[1, 7]]);
            });
        });
    });
    describe('copyLinesXXX', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                'fghij\n' +
                'klmno\n' +
                'pqrstu\n' +
                'vwxyz\n'
            ));
        });
        describe('copyLinesDownAction', () => {
            it('should duplicate one line', async () => {
                const seq = [ Cmd.CopyLinesDown ];
                await setSelections([[1, 3]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(1).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'fghij');
                assert.deepStrictEqual(getSelections(), [[2, 3]]);

                await setSelections([[4, 4]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(5).text, 'pqrstu');
                assert.deepStrictEqual(getSelections(), [[5, 4]]);
            });
            it('should duplicate selected lines', async () => {
                const seq = [ Cmd.CopyLinesDown ];
                await setSelections([[1, 3, 2, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(1).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'klmno');
                assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(4).text, 'klmno');
                assert.deepStrictEqual(getSelections(), [[3, 3, 4, 4]]);

                await setSelections([[4, 3, 5, 2]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'klmno');
                assert.strictEqual(textEditor.document.lineAt(5).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(6).text, 'klmno');
                assert.strictEqual(textEditor.document.lineAt(7).text, 'pqrstu');
                assert.deepStrictEqual(getSelections(), [[6, 3, 7, 2]]);
            });
        });
        describe('copyLinesUpAction', () => {
            it('should duplicate one line', async () => {
                const seq = [ Cmd.CopyLinesUp ];
                await setSelections([[1, 3]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(1).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'fghij');
                assert.deepStrictEqual(getSelections(), [[1, 3]]);

                await setSelections([[4, 4]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(5).text, 'pqrstu');
                assert.deepStrictEqual(getSelections(), [[4, 4]]);
            });
            it('should duplicate selected lines', async () => {
                const seq = [ Cmd.CopyLinesUp ];
                await setSelections([[1, 3, 2, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(1).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'klmno');
                assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(4).text, 'klmno');
                assert.deepStrictEqual(getSelections(), [[1, 3, 2, 4]]);

                await setSelections([[4, 3, 5, 2]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'klmno');
                assert.strictEqual(textEditor.document.lineAt(5).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(6).text, 'klmno');
                assert.strictEqual(textEditor.document.lineAt(7).text, 'pqrstu');
                assert.deepStrictEqual(getSelections(), [[4, 3, 5, 2]]);
            });
        });
    });
    describe('moveLinesXXX', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                'fghij\n' +
                'klmno\n' +
                'pqrstu\n' +
                'vwxyz\n'
            ));
        });
        describe('moveLinesDownAction', () => {
            it('should move one line down', async () => {
                const seq = [ Cmd.MoveLinesDown ];
                await setSelections([[1, 3]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(1).text, 'klmno');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'fghij');
                assert.deepStrictEqual(getSelections(), [[2, 3]]);

                await setSelections([[3, 4]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(3).text, 'vwxyz');
                assert.strictEqual(textEditor.document.lineAt(4).text, 'pqrstu');
                assert.deepStrictEqual(getSelections(), [[4, 4]]);
            });
            it('should move selected lines down', async () => {
                const seq = [ Cmd.MoveLinesDown ];
                await setSelections([[1, 3, 2, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(1).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(3).text, 'klmno');
                assert.deepStrictEqual(getSelections(), [[2, 3, 3, 4]]);

                await setSelections([[3, 3, 4, 2]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(3).text, '');
                assert.strictEqual(textEditor.document.lineAt(4).text, 'klmno');
                assert.strictEqual(textEditor.document.lineAt(5).text, 'vwxyz');
                assert.deepStrictEqual(getSelections(), [[4, 3, 5, 2]]);
            });
        });
        describe('moveLinesUpAction', () => {
            it('should move one line up', async () => {
                const seq = [ Cmd.MoveLinesUp ];
                await setSelections([[1, 3]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(1).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 3]]);

                await setSelections([[3, 4]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(2).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(3).text, 'klmno');
                assert.deepStrictEqual(getSelections(), [[2, 4]]);
            });
            it('should move selected lines down', async () => {
                const seq = [ Cmd.MoveLinesUp ];
                await setSelections([[1, 3, 2, 4]]);
                await record(seq);
                assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), seq);
                assert.strictEqual(textEditor.document.lineAt(0).text, 'fghij');
                assert.strictEqual(textEditor.document.lineAt(1).text, 'klmno');
                assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 3, 1, 4]]);

                await setSelections([[3, 3, 4, 2]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(2).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(3).text, 'vwxyz');
                assert.strictEqual(textEditor.document.lineAt(4).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[2, 3, 3, 2]]);
            });
        });
    });
});
