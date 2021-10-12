'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro } = require('../../src/extension.js');

describe('Cursor Recording and Playback', () => {
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
    const testRecording = async function(sequence, precond, expected) {
        setSelections(precond.s);
        await record(sequence);
        assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), sequence);
        if (expected.s) {
            assert.deepStrictEqual(getSelections(), expected.s);
        }
    };
    const testPlayback = async function(precond, expected) {
        setSelections(precond.s);
        await keyboardMacro.playback();
        if (expected.s) {
            assert.deepStrictEqual(getSelections(), expected.s);
        }
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for Cursor Recording and Playback.');
        textEditor = await TestUtil.setupTextEditor({ content: '' });
    });

    describe('cursorXXX', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                '    fghij\n' +
                '    klmno pqrstu vwxyz'
            ));
        });
        describe('cursorDown', () => {
            const seq = [ Cmd.CursorDown ];
            it('should move cursor down by one line', async () => {
                await testRecording(seq, { s: [[0, 3]] }, { s: [[1, 3]] });
                await testPlayback({ s: [[1, 6]] }, { s: [[2, 6]] });
            });
            it('should be ok if cursor is at the end of the document', async () => {
                await testRecording(seq, { s: [[2, 22]] }, { s: [[2, 22]] });
                await testPlayback({ s: [[2, 22]] }, { s: [[2, 22]] });
            });
        });
        describe('cursorDownSelect', () => {
            const seq = [ Cmd.CursorDownSelect ];
            it('should move cursor down by one line with selection', async () => {
                await testRecording(seq, { s: [[0, 3]] }, { s: [[0, 3, 1, 3]] });
                await testPlayback({ s: [[1, 6]] }, { s: [[1, 6, 2, 6]] });
            });
            it('should be ok if cursor is at the end of the document', async () => {
                await testRecording(seq, { s: [[2, 22]] }, { s: [[2, 22]] });
                await testPlayback({ s: [[2, 22]] }, { s: [[2, 22]] });
            });
        });
        describe('cursorLeft', () => {
            const seq = [ Cmd.CursorLeft ];
            it('should move cursor by one character to the left', async () => {
                await testRecording(seq, { s: [[0, 3]] }, { s: [[0, 2]] });
                await testPlayback({ s: [[2, 10]] }, { s: [[2, 9]] });
            });
            it('should be ok if cursor is at the beginning of the document', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]] });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]] });
            });
        });
        describe('cursorLeftSelect', () => {
            const seq = [ Cmd.CursorLeftSelect ];
            it('should move cursor by one character to the left with selection', async () => {
                await testRecording(seq, { s: [[0, 3]] }, { s: [[0, 3, 0, 2]] });
                await testPlayback({ s: [[2, 10]] }, { s: [[2, 10, 2, 9]] });
            });
            it('should be ok if cursor is at the beginning of the document', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]] });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]] });
            });
        });
        describe('cursorRight', () => {
            const seq = [ Cmd.CursorRight ];
            it('should move cursor by one character to the right', async () => {
                await testRecording(seq, { s: [[0, 3]] }, { s: [[0, 4]] });
                await testPlayback({ s: [[2, 10]] }, { s: [[2, 11]] });
            });
            it('should be ok if cursor is at the end of the document', async () => {
                await testRecording(seq, { s: [[2, 22]] }, { s: [[2, 22]] });
                await testPlayback({ s: [[2, 22]] }, { s: [[2, 22]] });
            });
        });
        describe('cursorRightSelect', () => {
            const seq = [ Cmd.CursorRightSelect ];
            it('should move cursor by one character to the right with selection', async () => {
                await testRecording(seq, { s: [[0, 3]] }, { s: [[0, 3, 0, 4]] });
                await testPlayback({ s: [[2, 10]] }, { s: [[2, 10, 2, 11]] });
            });
            it('should be ok if cursor is at the end of the document', async () => {
                await testRecording(seq, { s: [[2, 22]] }, { s: [[2, 22]] });
                await testPlayback({ s: [[2, 22]] }, { s: [[2, 22]] });
            });
        });
        describe('cursorUp', () => {
            const seq = [ Cmd.CursorUp ];
            it('should move cursor up by one line', async () => {
                await testRecording(seq, { s: [[1, 3]] }, { s: [[0, 3]] });
                await testPlayback({ s: [[2, 8]] }, { s: [[1, 8]] });
            });
            it('should be ok if cursor is at the beginning of the document', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]] });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]] });
            });
        });
        describe('cursorUpSelect', () => {
            const seq = [ Cmd.CursorUpSelect ];
            it('should move cursor up by one line with selection', async () => {
                await testRecording(seq, { s: [[1, 3]] }, { s: [[1, 3, 0, 3]] });
                await testPlayback({ s: [[2, 8]] }, { s: [[2, 8, 1, 8]] });
            });
            it('should be ok if cursor is at the beginning of the document', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]] });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]] });
            });
        });

        describe('cursorBottom', () => {
            const seq = [ Cmd.CursorBottom ];
            it('should move cursor to the end of document', async () => {
                await testRecording(seq, { s: [[1, 3]] }, { s: [[2, 22]] });
                await testPlayback({ s: [[0, 4]] }, { s: [[2, 22]] });
            });
            it('should be ok if cursor is at the end of the document', async () => {
                await testRecording(seq, { s: [[2, 22]] }, { s: [[2, 22]] });
                await testPlayback({ s: [[2, 22]] }, { s: [[2, 22]] });
            });
        });
        describe('cursorBottomSelect', () => {
            const seq = [ Cmd.CursorBottomSelect ];
            it('should move cursor to the end of document with selection', async () => {
                await testRecording(seq, { s: [[1, 3]] }, { s: [[1, 3, 2, 22]] });
                await testPlayback({ s: [[0, 4]] }, { s: [[0, 4, 2, 22]] });
            });
            it('should be ok if cursor is at the end of the document', async () => {
                await testRecording(seq, { s: [[2, 22]] }, { s: [[2, 22]] });
                await testPlayback({ s: [[2, 22]] }, { s: [[2, 22]] });
            });
        });
        describe('cursorTop', () => {
            const seq = [ Cmd.CursorTop ];
            it('should move cursor to the beginning of the document', async () => {
                await testRecording(seq, { s: [[1, 3]] }, { s: [[0, 0]] });
                await testPlayback({ s: [[2, 8]] }, { s: [[0, 0]] });
            });
            it('should be ok if cursor is at the beginning of the document', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]] });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]] });
            });
        });
        describe('cursorTopSelect', () => {
            const seq = [ Cmd.CursorTopSelect ];
            it('should move cursor to the beginning of the document with selection', async () => {
                await testRecording(seq, { s: [[1, 3]] }, { s: [[1, 3, 0, 0]] });
                await testPlayback({ s: [[2, 8]] }, { s: [[2, 8, 0, 0]] });
            });
            it('should be ok if cursor is at the beginning of the document', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]] });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]] });
            });
        });
        describe('cursorEnd', () => {
            const seq = [ Cmd.CursorEnd ];
            it('should move cursor to the end of a line', async () => {
                await testRecording(seq, { s: [[1, 3]] }, { s: [[1, 9]] });
                await testPlayback({ s: [[0, 4]] }, { s: [[0, 5]] });
            });
            it('should be ok if cursor is already at the end of a line', async () => {
                await testRecording(seq, { s: [[1, 9]] }, { s: [[1, 9]] });
                await testPlayback({ s: [[0, 5]] }, { s: [[0, 5]] });
            });
        });
        describe('cursorEndSelect', () => {
            const seq = [ Cmd.CursorEndSelect ];
            it('should move cursor to the end of a line with selection', async () => {
                await testRecording(seq, { s: [[1, 3]] }, { s: [[1, 3, 1, 9]] });
                await testPlayback({ s: [[0, 4]] }, { s: [[0, 4, 0, 5]] });
            });
            it('should be ok if cursor is already at the end of a line', async () => {
                await testRecording(seq, { s: [[1, 9]] }, { s: [[1, 9]] });
                await testPlayback({ s: [[0, 5]] }, { s: [[0, 5]] });
            });
        });
        describe('cursorHome', () => {
            const seq = [ Cmd.CursorHome ];
            it('should move cursor to the front of a line', async () => {
                await testRecording(seq, { s: [[1, 6]] }, { s: [[1, 4]] });
                await testPlayback({ s: [[0, 3]] }, { s: [[0, 0]] });
            });
            it('should be ok if cursor is already at the front of a line', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]] });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]] });
            });
        });
        describe('cursorHomeSelect', () => {
            const seq = [ Cmd.CursorHomeSelect ];
            it('should move cursor to the front of a line with selection', async () => {
                await testRecording(seq, { s: [[1, 6]] }, { s: [[1, 6, 1, 4]] });
                await testPlayback({ s: [[0, 3]] }, { s: [[0, 3, 0, 0]] });
            });
            it('should be ok if cursor is already at the front of a line', async () => {
                await testRecording(seq, { s: [[0, 0]] }, { s: [[0, 0]] });
                await testPlayback({ s: [[0, 0]] }, { s: [[0, 0]] });
            });
        });
    });

    describe('selection', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                '    fghij\n' +
                '    klmno pqrstu vwxyz'
            ));
        });
        describe('cancelSelection', () => {
            const seq = [ Cmd.CancelSelection ];
            it('should cancel selection', async () => {
                await testRecording(seq, { s: [[0, 0, 0, 3]] }, { s: [[0, 3]] });
                await testPlayback({ s: [[1, 6, 2, 3]] }, { s: [[2, 3]] });
            });
            it('should be ok if selection is already empty', async () => {
                await testRecording(seq, { s: [[1, 7]] }, { s: [[1, 7]] });
                await testPlayback({ s: [[2, 22]] }, { s: [[2, 22]] });
            });
        });
        describe('removeSecondaryCursors', () => {
            const seq = [ Cmd.RemoveSecondaryCursors ];
            it('should remove secondary cursors', async () => {
                await testRecording(seq, { s: [[0, 3], [1, 3], [2, 3]] }, { s: [[0, 3]] });
                await testPlayback({ s: [[1, 5], [0, 5]] }, { s: [[1, 5]] });
            });
            it('should be ok if cursor is already single', async () => {
                await testRecording(seq, { s: [[1, 7]] }, { s: [[1, 7]] });
                await testPlayback({ s: [[2, 22]] }, { s: [[2, 22]] });
            });
        });
    });
});
