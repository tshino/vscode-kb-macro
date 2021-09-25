'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { KeyboardMacro } = require('../../src/keyboard_macro.js');

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
    const record = async function(commands) {
        KeyboardMacro.startRecording();
        for (let i = 0; i < commands.length; i++) {
            await KeyboardMacro.wrap(textEditor, edit, commands[i]);
        }
        KeyboardMacro.finishRecording();
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for Cursor Recording and Playback.');
        textEditor = await TestUtil.setupTextEditor({ content: '' });
    });

    describe('cursorDown', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                '    fghij\n' +
                '    klmno pqrstu vwxyz'
            ));
        });
        it('should move cursor down by one line', async () => {
            setSelections([[0, 3]]);
            await record([ Cmd.CursorDown ]);
            assert.deepStrictEqual(getSelections(), [[1, 3]]);

            setSelections([[1, 6]]);
            await KeyboardMacro.playback();
            assert.deepStrictEqual(getSelections(), [[2, 6]]);
        });
        it('should be ok if cursor is at the end of the document', async () => {
            setSelections([[2, 22]]);
            await record([ Cmd.CursorDown ]);
            assert.deepStrictEqual(getSelections(), [[2, 22]]);

            setSelections([[2, 22]]);
            await KeyboardMacro.playback();
            assert.deepStrictEqual(getSelections(), [[2, 22]]);
        });
    });
    describe('cursorLeft', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                '    fghij\n' +
                '    klmno pqrstu vwxyz'
            ));
        });
        it('should move cursor by one character to the left', async () => {
            setSelections([[0, 3]]);
            await record([ Cmd.CursorLeft ]);
            assert.deepStrictEqual(getSelections(), [[0, 2]]);

            setSelections([[2, 10]]);
            await KeyboardMacro.playback();
            assert.deepStrictEqual(getSelections(), [[2, 9]]);
        });
        it('should be ok if cursor is at the beginning of the document', async () => {
            setSelections([[0, 0]]);
            await record([ Cmd.CursorLeft ]);
            assert.deepStrictEqual(getSelections(), [[0, 0]]);

            setSelections([[0, 0]]);
            await KeyboardMacro.playback();
            assert.deepStrictEqual(getSelections(), [[0, 0]]);
        });
    });
    describe('cursorRight', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                '    fghij\n' +
                '    klmno pqrstu vwxyz'
            ));
        });
        it('should move cursor by one character to the right', async () => {
            setSelections([[0, 3]]);
            await record([ Cmd.CursorRight ]);
            assert.deepStrictEqual(getSelections(), [[0, 4]]);

            setSelections([[2, 10]]);
            await KeyboardMacro.playback();
            assert.deepStrictEqual(getSelections(), [[2, 11]]);
        });
        it('should be ok if cursor is at the end of the document', async () => {
            setSelections([[2, 22]]);
            await record([ Cmd.CursorRight ]);
            assert.deepStrictEqual(getSelections(), [[2, 22]]);

            setSelections([[2, 22]]);
            await KeyboardMacro.playback();
            assert.deepStrictEqual(getSelections(), [[2, 22]]);
        });
    });
    describe('cursorUp', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n' +
                '    fghij\n' +
                '    klmno pqrstu vwxyz'
            ));
        });
        it('should move cursor up by one line', async () => {
            setSelections([[1, 3]]);
            await record([ Cmd.CursorUp ]);
            assert.deepStrictEqual(getSelections(), [[0, 3]]);

            setSelections([[2, 8]]);
            await KeyboardMacro.playback();
            assert.deepStrictEqual(getSelections(), [[1, 8]]);
        });
        it('should be ok if cursor is at the beginning of the document', async () => {
            setSelections([[0, 0]]);
            await record([ Cmd.CursorUp ]);
            assert.deepStrictEqual(getSelections(), [[0, 0]]);

            setSelections([[0, 0]]);
            await KeyboardMacro.playback();
            assert.deepStrictEqual(getSelections(), [[0, 0]]);
        });
    });
});
