'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro } = require('../../src/extension.js');

describe('Typing Recording and Playback', () => {
    let textEditor;
    const Cmd = CommandsToTest;

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

    describe('direct typing detection', () => {
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
        it('should detect and reproduce direct typing of multiple characters with one character per command', async () => {
            setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            await vscode.commands.executeCommand('type', { text: 'Y' });
            await vscode.commands.executeCommand('type', { text: 'Z' });
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(0).text, 'XYZ');
            assert.deepStrictEqual(getSelections(), [[0, 3]]);

            setSelections([[10, 2]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abXYZcd');
            assert.deepStrictEqual(getSelections(), [[10, 5]]);
        });
        /* TODO: this test should pass.
        it('should detect and reproduce direct typing of multiple characters with multiple characters in one command', async () => {
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
        */
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
        it('should detect and reproduce direct typing with a selection', async () => {
            setSelections([[10, 0, 10, 2]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'Xcd');
            assert.deepStrictEqual(getSelections(), [[10, 1]]);

            setSelections([[12, 2, 12, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(12).text, 'abX');
            assert.deepStrictEqual(getSelections(), [[12, 3]]);
        });
        it('should detect and reproduce direct typing with multiple selections', async () => {
            setSelections([[10, 0, 10, 2], [11, 0, 11, 2]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'Xcd');
            assert.strictEqual(textEditor.document.lineAt(11).text, 'Xcd');
            assert.deepStrictEqual(getSelections(), [[10, 1], [11, 1]]);

            setSelections([[12, 2, 12, 4], [13, 2, 13, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(12).text, 'abX');
            assert.strictEqual(textEditor.document.lineAt(13).text, 'abX');
            assert.deepStrictEqual(getSelections(), [[12, 3], [13, 3]]);
        });
    });

    describe('Enter', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should record and playback pressing Enter key', async () => {
            setSelections([[10, 2]]);
            keyboardMacro.startRecording();
            await keyboardMacro.wrap(textEditor, {}, Cmd.Enter);
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'ab');
            assert.strictEqual(textEditor.document.lineAt(11).text, 'cd');
            assert.deepStrictEqual(getSelections(), [[11, 0]]);

            setSelections([[14, 3]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(14).text, 'abc');
            assert.strictEqual(textEditor.document.lineAt(15).text, 'd');
            assert.deepStrictEqual(getSelections(), [[15, 0]]);
        });
        it('should record and playback inserting a line break that results auto-indent', async () => {
            setSelections([[20, 4]]);
            keyboardMacro.startRecording();
            await keyboardMacro.wrap(textEditor, {}, Cmd.Enter);
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(20).text, '    ');
            assert.strictEqual(textEditor.document.lineAt(21).text, '    efgh');
            assert.deepStrictEqual(getSelections(), [[21, 4]]);

            setSelections([[24, 6]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(24).text, '    ef');
            assert.strictEqual(textEditor.document.lineAt(25).text, '    gh');
            assert.deepStrictEqual(getSelections(), [[25, 4]]);
        });
    });

    describe('Tab', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should record and playback pressing Tab key', async () => {
            setSelections([[14, 0]]);
            keyboardMacro.startRecording();
            await keyboardMacro.wrap(textEditor, {}, Cmd.Tab);
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(14).text, '    abcd');
            assert.deepStrictEqual(getSelections(), [[14, 4]]);

            setSelections([[15, 2]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(15).text, 'ab  cd');
            assert.deepStrictEqual(getSelections(), [[15, 4]]);
        });
    });

    describe('complex senarios', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should record and playback: type => enter => type', async () => {
            setSelections([[12, 2]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'C' });
            await vscode.commands.executeCommand('type', { text: 'D' });
            await keyboardMacro.wrap(textEditor, {}, Cmd.Enter);
            await vscode.commands.executeCommand('type', { text: 'A' });
            await vscode.commands.executeCommand('type', { text: 'B' });
            keyboardMacro.finishRecording();
            assert.strictEqual(textEditor.document.lineAt(12).text, 'abCD');
            assert.strictEqual(textEditor.document.lineAt(13).text, 'ABcd');
            assert.deepStrictEqual(getSelections(), [[13, 2]]);

            setSelections([[17, 3]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(17).text, 'abcCD');
            assert.strictEqual(textEditor.document.lineAt(18).text, 'ABd');
            assert.deepStrictEqual(getSelections(), [[18, 2]]);
        });
    });
});
