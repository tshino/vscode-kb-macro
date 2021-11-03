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
        await awaitController.waitFor('selection', 1).catch(() => {});
        const newSelections = TestUtil.arrayToSelections(array);
        if (!util.isEqualSelections(textEditor.selections, newSelections)) {
            const timeout = 1000;
            const promise = awaitController.waitFor('selection', timeout).catch(
                () => { console.log('Warning: timeout in setSelections!'); }
            );
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
    const testRecording = async function(sequence, precond, expected) {
        await setSelections(precond.s);
        if ('c' in precond) {
            await vscode.env.clipboard.writeText(precond.c);
        }
        await record(sequence);
        assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), sequence);
        // check for text document
        if (expected.d) {
            for (let i = 0; i < expected.d.length; i++) {
                const line = expected.d[i][0];
                const text = expected.d[i][1];
                assert.strictEqual(textEditor.document.lineAt(line).text, text);
            }
        }
        // check for text selections
        if (expected.s) {
            assert.deepStrictEqual(getSelections(), expected.s);
        }
        // check for clipboard text
        if ('c' in expected) {
            assert.strictEqual(await TestUtil.readClipboard(), expected.c);
        }
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
                await testRecording(seq, { s: [[0, 3]] }, { s: [[0, 2]], d: [[0, 'abde']]  });

                await setSelections([[1, 6]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, '    fhij');
                assert.deepStrictEqual(getSelections(), [[1, 5]]);
            });
            it('should connect current line and the previous line', async () => {
                await testRecording(seq, { s: [[1, 0]] }, { s: [[0, 5]], d: [[0, 'abcde    fghij']]  });

                await setSelections([[1, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde    fghij    klmno pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[0, 14]]);
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]], d: [[0, 'abcde']]  });

                await setSelections([[0, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
            });
        });
        describe('deleteRight', () => {
            const seq = [ Cmd.DeleteRight ];
            it('should delete one character to the right', async () => {
                await testRecording(seq, { s: [[0, 3]] }, { s: [[0, 3]], d: [[0, 'abce']]  });

                await setSelections([[1, 6]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, '    fgij');
                assert.deepStrictEqual(getSelections(), [[1, 6]]);
            });
            it('should connect current line and the next line', async () => {
                await testRecording(seq, { s: [[0, 5]] }, { s: [[0, 5]], d: [[0, 'abcde    fghij']]  });

                await setSelections([[0, 14]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'abcde    fghij    klmno pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[0, 14]]);
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await testRecording(seq, { s: [[2, 22]] }, { s: [[2, 22]], d: [[2, '    klmno pqrstu vwxyz']]  });

                await setSelections([[2, 22]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(2).text, '    klmno pqrstu vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 22]]);
            });
        });
        describe('deleteWordLeft', () => {
            const seq = [ Cmd.DeleteWordLeft ];
            it('should delete one word to the left', async () => {
                await testRecording(seq, { s: [[2, 10]] }, { s: [[2, 4]], d: [[2, '    pqrstu vwxyz']]  });
            });
            it('should connect current line and the previous line', async () => {
                await testRecording(seq, { s: [[1, 0]] }, { s: [[0, 5]], d: [[0, 'abcde    fghij']]  });
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]], d: [[0, 'abcde']]  });
            });
        });
        describe('deleteWordRight', () => {
            const seq = [ Cmd.DeleteWordRight ];
            it('should delete one word to the right', async () => {
                await testRecording(seq, { s: [[2, 10]] }, { s: [[2, 10]], d: [[2, '    klmno  vwxyz']]  });
            });
            it('should connect current line and the next line and remove indent', async () => {
                await testRecording(seq, { s: [[0, 5]] }, { s: [[0, 5]], d: [[0, 'abcdefghij']]  });
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await testRecording(seq, { s: [[2, 22]] }, { s: [[2, 22]], d: [[2, '    klmno pqrstu vwxyz']]  });
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
                await testRecording(seq, { s: [[20, 8]] }, { s: [[20, 4]], d: [[20, '    klmno']]  });
            });
            it('should eliminate indent one level on multiple lines', async () => {
                await testRecording(seq, { s: [[19, 4, 21, 4]] }, { s: [[19, 0, 21, 4]], d: [
                    [ 19, 'fghij' ],
                    [ 20, '    klmno' ],
                    [ 21, '    klmno' ]
                ]  });
            });
            it('should do nothing if no indent', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]], d: [[0, 'abcde']]  });
            });
        });
        describe('outdentLines', () => {
            const seq = [ Cmd.OutdentLines ];
            it('should eliminate indent one level', async () => {
                await testRecording(seq, { s: [[20, 8]] }, { s: [[20, 4]], d: [[20, '    klmno']]  });
            });
            it('should eliminate indent one level on multiple lines', async () => {
                await testRecording(seq, { s: [[19, 4, 21, 4]] }, { s: [[19, 0, 21, 4]], d: [
                    [ 19, 'fghij' ],
                    [ 20, '    klmno' ],
                    [ 21, '    klmno' ]
                ]  });
            });
            it('should do nothing if no indent', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]], d: [[0, 'abcde']]  });
            });
        });
        describe('indentLines', () => {
            const seq = [ Cmd.IndentLines ];
            it('should insert indent one level', async () => {
                await testRecording(seq, { s: [[10, 4]] }, { s: [[10, 8]], d: [[10, '        fghij']]  });
            });
            it('should insert indent one level on multiple lines', async () => {
                await testRecording(seq, { s: [[9, 3, 11, 2]] }, { s: [[9, 7, 11, 2]], d: [
                    [ 9, '    abcde' ],
                    [ 10, '        fghij' ],
                    [ 11, '        fghij' ]
                ]  });
            });
        });
    });
    describe('commentLine', () => {
        beforeEach(async () => {
            console.log('before resetDocument');
            await TestUtil.resetDocument(textEditor, (
                'function hello(name) {\n' +
                '    console.log("Hello, " + name);\n' +
                '}\n' +
                '// hello("world");\n' +
                '// hello("vscode");\n' +
                'hello("Code");'
            ), { languageId: 'javascript' } );
            console.log('after resetDocument');
        });
        describe('commentLine', () => {
            const seq = [ Cmd.CommentLine ];
            it('should add line comment', async () => {
                await testRecording(seq, { s: [[5, 5]] }, { s: [[5, 8]], d: [[5, '// hello("Code");']]  });

                await setSelections([[1, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, '    // console.log("Hello, " + name);');
                assert.deepStrictEqual(getSelections(), [[1, 0]]);
            });
            it('should remove line comment', async () => {
                await testRecording(seq, { s: [[3, 5]] }, { s: [[3, 2]], d: [[3, 'hello("world");']]  });

                await setSelections([[4, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'hello("vscode");');
                assert.deepStrictEqual(getSelections(), [[4, 0]]);
            });
            it('should add and remove line comment', async () => {
                const seq = [ Cmd.CommentLine, Cmd.CommentLine ];
                await testRecording(seq, { s: [[5, 5]] }, { s: [[5, 5]], d: [[5, 'hello("Code");']]  });

                await setSelections([[1, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(1).text, '    console.log("Hello, " + name);');
                assert.deepStrictEqual(getSelections(), [[1, 0]]);
            });
            it('should add/remove line comments on multiple lines', async () => {
                await testRecording(seq, { s: [[0, 0, 3, 0]] }, { s: [[0, 3, 3, 0]], d: [
                    [0, '// function hello(name) {' ],
                    [1, '//     console.log("Hello, " + name);' ],
                    [2, '// }' ]
                ]  });

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
                await testRecording(seq, { s: [[5, 5]] }, { s: [[5, 8]], d: [[5, '// hello("Code");']]  });

                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(5).text, '// // hello("Code");');
                assert.deepStrictEqual(getSelections(), [[5, 11]]);
            });
            it('should add line comments on multiple lines', async () => {
                await testRecording(seq, { s: [[0, 0, 3, 0]] }, { s: [[0, 3, 3, 0]], d: [
                    [0, '// function hello(name) {' ],
                    [1, '//     console.log("Hello, " + name);' ],
                    [2, '// }' ]
                ]  });

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
                await testRecording(seq, { s: [[3, 5]] }, { s: [[3, 2]], d: [[3, 'hello("world");']]  });

                await setSelections([[4, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'hello("vscode");');
                assert.deepStrictEqual(getSelections(), [[4, 0]]);
            });
            it('should remove line comments on multiple lines', async () => {
                await testRecording(seq, { s: [[3, 0, 5, 0]] }, { s: [[3, 0, 5, 0]], d: [
                    [3, 'hello("world");' ],
                    [4, 'hello("vscode");' ]
                ] });

                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(3).text, 'hello("world");');
                assert.strictEqual(textEditor.document.lineAt(4).text, 'hello("vscode");');
                assert.deepStrictEqual(getSelections(), [[3, 0, 5, 0]]);
            });
        });
    });
    describe('clipboardXXX', () => {
        beforeEach(async () => {
            const promise = awaitController.waitFor('document', 500).catch(
                () => { console.log('Warning: timeout at resetDocument!'); }
            );
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                'fghij\n' +
                'klmno\n' +
                'pqrstu\n' +
                'vwxyz\n'
            ));
            await promise;
        });
        describe('clipboardCopyAction', () => {
            it('should copy one line', async () => {
                const seq = [ Cmd.ClipboardCopy ];
                await testRecording(seq, { s: [[1, 3]] }, { s: [[1, 3]], c: 'fghij\n' });

                await setSelections([[2, 4]]);
                await keyboardMacro.playback();
                assert.deepStrictEqual(getSelections(), [[2, 4]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'klmno\n');
            });
            it('should copy selected range', async () => {
                const seq = [ Cmd.ClipboardCopy ];
                await testRecording(seq, { s: [[0, 3, 1, 2]] }, { s: [[0, 3, 1, 2]], c: 'de\nfg' });

                await setSelections([[1, 2, 3, 4]]);
                await keyboardMacro.playback();
                assert.deepStrictEqual(getSelections(), [[1, 2, 3, 4]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'hij\nklmno\npqrs');
            });
        });
        describe('clipboardCutAction', () => {
            it('should cut one line', async () => {
                const seq = [ Cmd.ClipboardCut ];
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]], d: [
                    [ 0, 'fghij' ]
                ], c: 'abcde\n' });

                await setSelections([[2, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(2).text, 'vwxyz');
                assert.deepStrictEqual(getSelections(), [[2, 0]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'pqrstu\n');
            });
            it('should cut multiple lines', async () => {
                const seq = [ Cmd.ClipboardCut, Cmd.ClipboardCut ];
                await testRecording(seq, { s: [[1, 0]] }, { s: [[1, 0]], d: [
                    [ 1, 'pqrstu' ],
                    [ 2, 'vwxyz' ]
                ], c: 'klmno\n' });

                await setSelections([[0, 0]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(0).text, 'vwxyz');
                assert.deepStrictEqual(getSelections(), [[0, 0]]);
                assert.strictEqual(await TestUtil.readClipboard(), 'pqrstu\n');
            });
            it('should cut selected range', async () => {
                const seq = [ Cmd.ClipboardCut ];
                await testRecording(seq, { s: [[0, 3, 1, 2]] }, { s: [[0, 3]], d: [
                    [ 0, 'abchij' ],
                ], c: 'de\nfg' });

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
                await testRecording(seq, { s: [[0, 0]], c: 'ABCDE\n' }, { s: [[1, 0]], d: [
                    [ 0, 'ABCDE' ],
                    [ 1, 'abcde' ],
                ] });

                await setSelections([[2, 0]]);
                await vscode.env.clipboard.writeText('FGHIJ\n');
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(2).text, 'FGHIJ');
                assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
                assert.deepStrictEqual(getSelections(), [[3, 0]]);
            });
            it('should insert one line multiple times', async () => {
                const seq = [ Cmd.ClipboardPaste, Cmd.ClipboardPaste ];
                await testRecording(seq, { s: [[1, 0]], c: 'ABCDE\n' }, { s: [[3, 0]], d: [
                    [ 1, 'ABCDE' ],
                    [ 2, 'ABCDE' ],
                    [ 3, 'fghij' ]
                ] });

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
                await testRecording(seq, { s: [[0, 3, 1, 2]], c: 'ABCDE' }, { s: [[0, 8]], d: [
                    [ 0, 'abcABCDEhij' ]
                ] });

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
                await testRecording(seq, { s: [[1, 3]] }, { s: [[2, 3]], d: [
                    [1, 'fghij'],
                    [2, 'fghij']
                ] });

                await setSelections([[4, 4]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(5).text, 'pqrstu');
                assert.deepStrictEqual(getSelections(), [[5, 4]]);
            });
            it('should duplicate selected lines', async () => {
                const seq = [ Cmd.CopyLinesDown ];
                await testRecording(seq, { s: [[1, 3, 2, 4]] }, { s: [[3, 3, 4, 4]], d: [
                    [1, 'fghij'],
                    [2, 'klmno'],
                    [3, 'fghij'],
                    [4, 'klmno']
                ] });

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
                await testRecording(seq, { s: [[1, 3]] }, { s: [[1, 3]], d: [
                    [1, 'fghij'],
                    [2, 'fghij']
                ] });

                await setSelections([[4, 4]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(4).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(5).text, 'pqrstu');
                assert.deepStrictEqual(getSelections(), [[4, 4]]);
            });
            it('should duplicate selected lines', async () => {
                const seq = [ Cmd.CopyLinesUp ];
                await testRecording(seq, { s: [[1, 3, 2, 4]] }, { s: [[1, 3, 2, 4]], d: [
                    [1, 'fghij'],
                    [2, 'klmno'],
                    [3, 'fghij'],
                    [4, 'klmno']
                ] });

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
                await testRecording(seq, { s: [[1, 3]] }, { s: [[2, 3]], d: [
                    [1, 'klmno'],
                    [2, 'fghij']
                ] });

                await setSelections([[3, 4]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(3).text, 'vwxyz');
                assert.strictEqual(textEditor.document.lineAt(4).text, 'pqrstu');
                assert.deepStrictEqual(getSelections(), [[4, 4]]);
            });
            it('should move selected lines down', async () => {
                const seq = [ Cmd.MoveLinesDown ];
                await testRecording(seq, { s: [[1, 3, 2, 4]] }, { s: [[2, 3, 3, 4]], d: [
                    [1, 'pqrstu'],
                    [2, 'fghij'],
                    [3, 'klmno']
                ] });

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
                await testRecording(seq, { s: [[1, 3]] }, { s: [[0, 3]], d: [
                    [0, 'fghij'],
                    [1, 'abcde']
                ] });

                await setSelections([[3, 4]]);
                await keyboardMacro.playback();
                assert.strictEqual(textEditor.document.lineAt(2).text, 'pqrstu');
                assert.strictEqual(textEditor.document.lineAt(3).text, 'klmno');
                assert.deepStrictEqual(getSelections(), [[2, 4]]);
            });
            it('should move selected lines down', async () => {
                const seq = [ Cmd.MoveLinesUp ];
                await testRecording(seq, { s: [[1, 3, 2, 4]] }, { s: [[0, 3, 1, 4]], d: [
                    [0, 'fghij'],
                    [1, 'klmno'],
                    [2, 'abcde']
                ] });

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
