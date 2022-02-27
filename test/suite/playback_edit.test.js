'use strict';
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro, awaitController } = require('../../src/extension.js');

describe('Recording and Playback: Edit', () => {
    let textEditor;
    const Cmd = CommandsToTest;

    const setSelections = async function(array) {
        await awaitController.waitFor('selection', 10).catch(() => {});
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
            await keyboardMacro.wrapSync(sequence[i]);
        }
        keyboardMacro.finishRecording();
    };
    const setupPrecond = async function(precond) {
        if ('s' in precond) {
            await setSelections(precond.s);
        }
        if ('c' in precond) {
            await vscode.env.clipboard.writeText(precond.c);
        }
    };
    const checkResult = async function(expected) {
        // check for text document
        if ('d' in expected) {
            for (let i = 0; i < expected.d.length; i++) {
                const line = expected.d[i][0];
                const text = expected.d[i][1];
                assert.strictEqual(textEditor.document.lineAt(line).text, text);
            }
        }
        // check for text selections
        if ('s' in expected) {
            assert.deepStrictEqual(getSelections(), expected.s);
        }
        // check for clipboard text
        if ('c' in expected) {
            assert.strictEqual(await TestUtil.readClipboard(), expected.c);
        }
    };
    const testRecording = async function(sequence, precond, expected) {
        await setupPrecond(precond);
        await record(sequence);
        assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), sequence);
        await checkResult(expected);
    };
    const testPlayback = async function(precond, expected) {
        await setupPrecond(precond);
        await keyboardMacro.playback();
        await checkResult(expected);
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
                await testPlayback({ s: [[1, 6]] }, { s: [[1, 5]], d: [[1, '    fhij']] });
            });
            it('should connect current line and the previous line', async () => {
                await testRecording(seq, { s: [[1, 0]] }, { s: [[0, 5]], d: [[0, 'abcde    fghij']]  });
                await testPlayback({ s: [[1, 0]] }, { s: [[0, 14]], d: [
                    [0, 'abcde    fghij    klmno pqrstu vwxyz']
                ]});
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]], d: [[0, 'abcde']]  });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]], d: [[0, 'abcde']] });
            });
        });
        describe('deleteRight', () => {
            const seq = [ Cmd.DeleteRight ];
            it('should delete one character to the right', async () => {
                await testRecording(seq, { s: [[0, 3]] }, { s: [[0, 3]], d: [[0, 'abce']]  });
                await testPlayback({ s: [[1, 6]] }, { s: [[1, 6]], d: [[1, '    fgij']] });
            });
            it('should connect current line and the next line', async () => {
                await testRecording(seq, { s: [[0, 5]] }, { s: [[0, 5]], d: [[0, 'abcde    fghij']]  });
                await testPlayback({ s: [[0, 14]] }, { s: [[0, 14]], d: [
                    [0, 'abcde    fghij    klmno pqrstu vwxyz']
                ] });
            });
            it('should do nothing if cursor is at the top of the document', async () => {
                await testRecording(seq, { s: [[2, 22]] }, { s: [[2, 22]], d: [[2, '    klmno pqrstu vwxyz']]  });
                await testPlayback({ s: [[2, 22]] }, { s: [[2, 22]], d: [
                    [2, '    klmno pqrstu vwxyz']
                ] });
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
            const promise = awaitController.waitFor('document', 500).catch(
                () => { console.log('Warning: timeout at resetDocument!'); }
            );
            await TestUtil.resetDocument(textEditor, (
                'function hello(name) {\n' +
                '    console.log("Hello, " + name);\n' +
                '}\n' +
                '// hello("world");\n' +
                '// hello("vscode");\n' +
                'hello("Code");'
            ), { languageId: 'javascript' } );
            await promise;
        });
        describe('commentLine', () => {
            const seq = [ Cmd.CommentLine ];
            it('should add line comment', async () => {
                await testRecording(seq, { s: [[5, 5]] }, { s: [[5, 8]], d: [[5, '// hello("Code");']]  });
                await testPlayback({ s: [[1, 0]] }, { s: [[1, 0]], d: [
                    [1, '    // console.log("Hello, " + name);']
                ] });
            });
            it('should remove line comment', async () => {
                await testRecording(seq, { s: [[3, 5]] }, { s: [[3, 2]], d: [[3, 'hello("world");']]  });
                await testPlayback({ s: [[4, 0]] }, { s: [[4, 0]], d: [[4, 'hello("vscode");']] });
            });
            it('should add and remove line comment', async () => {
                const seq = [ Cmd.CommentLine, Cmd.CommentLine ];
                await testRecording(seq, { s: [[5, 5]] }, { s: [[5, 5]], d: [[5, 'hello("Code");']]  });
                await testPlayback({ s: [[1, 0]] }, { s: [[1, 0]], d: [
                    [1, '    console.log("Hello, " + name);']
                ] });
            });
            it('should add/remove line comments on multiple lines', async () => {
                await testRecording(seq, { s: [[0, 0, 3, 0]] }, { s: [[0, 3, 3, 0]], d: [
                    [0, '// function hello(name) {' ],
                    [1, '//     console.log("Hello, " + name);' ],
                    [2, '// }' ]
                ]  });
                await testPlayback({}, { s: [[0, 0, 3, 0]], d: [
                    [0, 'function hello(name) {' ],
                    [1, '    console.log("Hello, " + name);' ],
                    [2, '}' ]
                ]  });
            });
        });
        describe('addCommentLine', () => {
            const seq = [ Cmd.AddCommentLine ];
            it('should add line comment', async () => {
                await testRecording(seq, { s: [[5, 5]] }, { s: [[5, 8]], d: [[5, '// hello("Code");']]  });
                await testPlayback({}, { s: [[5, 11]], d: [[5, '// // hello("Code");']] });
            });
            it('should add line comments on multiple lines', async () => {
                await testRecording(seq, { s: [[0, 0, 3, 0]] }, { s: [[0, 3, 3, 0]], d: [
                    [0, '// function hello(name) {' ],
                    [1, '//     console.log("Hello, " + name);' ],
                    [2, '// }' ]
                ]  });
                await testPlayback({}, { s: [[0, 6, 3, 0]], d: [
                    [0, '// // function hello(name) {'],
                    [1, '// //     console.log("Hello, " + name);'],
                    [2, '// // }']
                ] });
            });
        });
        describe('removeCommentLine', () => {
            const seq = [ Cmd.RemoveCommentLine ];
            it('should remove line comment', async () => {
                await testRecording(seq, { s: [[3, 5]] }, { s: [[3, 2]], d: [[3, 'hello("world");']]  });
                await testPlayback({ s: [[4, 0]] }, { s: [[4, 0]], d: [[4, 'hello("vscode");']] });
            });
            it('should remove line comments on multiple lines', async () => {
                await testRecording(seq, { s: [[3, 0, 5, 0]] }, { s: [[3, 0, 5, 0]], d: [
                    [3, 'hello("world");' ],
                    [4, 'hello("vscode");' ]
                ] });
                await testPlayback({}, { s: [[3, 0, 5, 0]], d: [
                    [3, 'hello("world");'],
                    [4, 'hello("vscode");']
                ] });
            });
        });
    });
    describe('clipboardXXX', () => {
        beforeEach(async () => {
            await awaitController.waitFor('document', 10).catch(() => {});
            const promise = awaitController.waitFor('document', 100).catch(
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
            textEditor.selections = [ new vscode.Selection(1, 0, 1, 0) ];
            await awaitController.waitFor('selection', 50).catch(() => {});
        });
        describe('clipboardCopyAction', () => {
            it('should copy one line', async () => {
                const seq = [ Cmd.ClipboardCopy ];
                await testRecording(seq, { s: [[1, 3]] }, { s: [[1, 3]], c: 'fghij\n' });
                await testPlayback({ s: [[2, 4]] }, { s: [[2, 4]], c: 'klmno\n' });
            });
            it('should copy selected range', async () => {
                const seq = [ Cmd.ClipboardCopy ];
                await testRecording(seq, { s: [[0, 3, 1, 2]] }, { s: [[0, 3, 1, 2]], c: 'de\nfg' });
                await testPlayback({ s: [[1, 2, 3, 4]] }, { s: [[1, 2, 3, 4]], c: 'hij\nklmno\npqrs' });
            });
        });
        describe('clipboardCutAction', () => {
            it('should cut one line (1)', async () => {
                const seq = [ Cmd.ClipboardCut_HOL ];
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]], d: [
                    [ 0, 'fghij' ]
                ], c: 'abcde\n' });
                await testPlayback({ s: [[2, 0]] }, { s: [[2, 0]], d: [
                    [2, 'vwxyz']
                ], c: 'pqrstu\n' });
            });
            it('should cut one line (2)', async () => {
                const seq = [ Cmd.ClipboardCut_NotHOL ];
                await testRecording(seq, { s: [[0, 3]] }, { s: [[0, 0]], d: [
                    [ 0, 'fghij' ]
                ], c: 'abcde\n' });
                await testPlayback({ s: [[2, 2]] }, { s: [[2, 0]], d: [
                    [2, 'vwxyz']
                ], c: 'pqrstu\n' });
            });
            it('should cut multiple lines', async () => {
                const seq = [ Cmd.ClipboardCut_HOL, Cmd.ClipboardCut_HOL ];
                await testRecording(seq, { s: [[1, 0]] }, { s: [[1, 0]], d: [
                    [ 1, 'pqrstu' ],
                    [ 2, 'vwxyz' ]
                ], c: 'klmno\n' });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]], d: [
                    [0, 'vwxyz']
                ], c: 'pqrstu\n' });
            });
            it('should cut selected range', async () => {
                const seq = [ Cmd.ClipboardCut_NotHOL ];
                await testRecording(seq, { s: [[0, 3, 1, 2]] }, { s: [[0, 3]], d: [
                    [ 0, 'abchij' ],
                ], c: 'de\nfg' });
                await testPlayback({ s: [[1, 2, 3, 4]] }, { s: [[1, 2]], d: [
                    [1, 'klz']
                ], c: 'mno\npqrstu\nvwxy' });
            });
        });
        describe('clipboardPasteAction', () => {
            it('should insert one line', async () => {
                const seq = [ Cmd.ClipboardPaste ];
                await testRecording(seq, { s: [[0, 0]], c: 'ABCDE\n' }, { s: [[1, 0]], d: [
                    [ 0, 'ABCDE' ],
                    [ 1, 'abcde' ],
                ] });
                await testPlayback({ s: [[2, 0]], c: 'FGHIJ\n' }, { s: [[3, 0]], d: [
                    [2, 'FGHIJ'],
                    [3, 'fghij']
                ]});
            });
            it('should insert one line multiple times', async () => {
                const seq = [ Cmd.ClipboardPaste, Cmd.ClipboardPaste ];
                await testRecording(seq, { s: [[1, 0]], c: 'ABCDE\n' }, { s: [[3, 0]], d: [
                    [ 1, 'ABCDE' ],
                    [ 2, 'ABCDE' ],
                    [ 3, 'fghij' ]
                ] });
                await testPlayback({ s: [[0, 0]], c: 'FGHIJ\n' }, { s: [[2, 0]], d: [
                    [0, 'FGHIJ'],
                    [1, 'FGHIJ'],
                    [2, 'abcde']
                ] });
            });
            it('should replace selected range', async () => {
                const seq = [ Cmd.ClipboardPaste ];
                await testRecording(seq, { s: [[0, 3, 1, 2]], c: 'ABCDE' }, { s: [[0, 8]], d: [
                    [ 0, 'abcABCDEhij' ]
                ] });
                await testPlayback({ s: [[1, 2, 3, 4]], c: 'FGHIJ' }, { s: [[1, 7]], d: [
                    [1, 'klFGHIJz']
                ] });
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
                await testPlayback({ s: [[4, 4]] }, { s: [[5, 4]], d: [
                    [4, 'pqrstu'],
                    [5, 'pqrstu']
                ] });
            });
            it('should duplicate selected lines', async () => {
                const seq = [ Cmd.CopyLinesDown ];
                await testRecording(seq, { s: [[1, 3, 2, 4]] }, { s: [[3, 3, 4, 4]], d: [
                    [1, 'fghij'],
                    [2, 'klmno'],
                    [3, 'fghij'],
                    [4, 'klmno']
                ] });
                await testPlayback({ s: [[4, 3, 5, 2]] }, { s: [[6, 3, 7, 2]], d: [
                    [4, 'klmno'],
                    [5, 'pqrstu'],
                    [6, 'klmno'],
                    [7, 'pqrstu']
                ] });
            });
        });
        describe('copyLinesUpAction', () => {
            it('should duplicate one line', async () => {
                const seq = [ Cmd.CopyLinesUp ];
                await testRecording(seq, { s: [[1, 3]] }, { s: [[1, 3]], d: [
                    [1, 'fghij'],
                    [2, 'fghij']
                ] });
                await testPlayback({ s: [[4, 4]] }, { s: [[4, 4]], d: [
                    [4, 'pqrstu'],
                    [5, 'pqrstu']
                ] });
            });
            it('should duplicate selected lines', async () => {
                const seq = [ Cmd.CopyLinesUp ];
                await testRecording(seq, { s: [[1, 3, 2, 4]] }, { s: [[1, 3, 2, 4]], d: [
                    [1, 'fghij'],
                    [2, 'klmno'],
                    [3, 'fghij'],
                    [4, 'klmno']
                ] });
                await testPlayback({ s: [[4, 3, 5, 2]] }, { s: [[4, 3, 5, 2]], d: [
                    [4, 'klmno'],
                    [5, 'pqrstu'],
                    [6, 'klmno'],
                    [7, 'pqrstu']
                ] });
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
                await testPlayback({ s: [[3, 4]] }, { s: [[4, 4]], d: [
                    [3, 'vwxyz'],
                    [4, 'pqrstu']
                ] });
            });
            it('should move selected lines down', async () => {
                const seq = [ Cmd.MoveLinesDown ];
                await testRecording(seq, { s: [[1, 3, 2, 4]] }, { s: [[2, 3, 3, 4]], d: [
                    [1, 'pqrstu'],
                    [2, 'fghij'],
                    [3, 'klmno']
                ] });
                await testPlayback({ s: [[3, 3, 4, 2]] }, { s: [[4, 3, 5, 2]], d: [
                    [3, ''],
                    [4, 'klmno'],
                    [5, 'vwxyz']
                ] });
            });
        });
        describe('moveLinesUpAction', () => {
            it('should move one line up', async () => {
                const seq = [ Cmd.MoveLinesUp ];
                await testRecording(seq, { s: [[1, 3]] }, { s: [[0, 3]], d: [
                    [0, 'fghij'],
                    [1, 'abcde']
                ] });
                await testPlayback({ s: [[3, 4]] }, { s: [[2, 4]], d: [
                    [2, 'pqrstu'],
                    [3, 'klmno']
                ] });
            });
            it('should move selected lines down', async () => {
                const seq = [ Cmd.MoveLinesUp ];
                await testRecording(seq, { s: [[1, 3, 2, 4]] }, { s: [[0, 3, 1, 4]], d: [
                    [0, 'fghij'],
                    [1, 'klmno'],
                    [2, 'abcde']
                ] });
                await testPlayback({ s: [[3, 3, 4, 2]] }, { s: [[2, 3, 3, 2]], d: [
                    [2, 'pqrstu'],
                    [3, 'vwxyz'],
                    [4, 'abcde']
                ] });
            });
        });
    });
});
