'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { keyboardMacro } = require('../../src/extension.js');

describe('Typing Recording and Playback', () => {
    let textEditor;

    const setSelections = function(array) {
        textEditor.selections = TestUtil.arrayToSelections(array);
    };
    const getSelections = function() {
        return TestUtil.selectionsToArray(textEditor.selections);
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for Typing Recording and Playback.');
        textEditor = await TestUtil.setupTextEditor({ content: '' });
    });

    describe('direct typing of characters', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should detect and reproduce direct typing of a character', async () => {
            setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(0).text, 'X');
            assert.deepStrictEqual(getSelections(), [[0, 1]]);

            setSelections([[10, 2]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abXcd');
            assert.deepStrictEqual(getSelections(), [[10, 3]]);
        });
        it('should detect and reproduce direct typing of multiple characters', async () => {
            setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'XYZ' });
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(0).text, 'XYZ');
            assert.deepStrictEqual(getSelections(), [[0, 3]]);

            setSelections([[10, 2]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abXYZcd');
            assert.deepStrictEqual(getSelections(), [[10, 5]]);
        });
        it('should detect and reproduce direct typing with multi-cursor', async () => {
            setSelections([[0, 0], [10, 4]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(0).text, 'X');
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abcdX');
            assert.deepStrictEqual(getSelections(), [[0, 1], [10, 5]]);

            setSelections([[14, 2], [24, 6]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(14).text, 'abXcd');
            assert.strictEqual(textEditor.document.lineAt(24).text, '    efXgh');
            assert.deepStrictEqual(getSelections(), [[14, 3], [24, 7]]);
        });
    });
});
