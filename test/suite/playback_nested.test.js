'use strict';
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro, awaitController } = require('../../src/extension.js');

describe('Recording and Playback with Nested Playback', () => {
    let textEditor;
    const Cmd = CommandsToTest;
    const Type = text => ({ command: '$type', args: { text } });
    const Move = delta => ({ command: '$moveCursor', args: { characterDelta: delta } });

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

    before(async () => {
        vscode.window.showInformationMessage('Started test for Recording and Playback with Nested Playback.');
        textEditor = await TestUtil.setupTextEditor({ content: '' });
    });

    describe('playback during recording', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                'zero\n' +
                'one\n' +
                'two\n' +
                'three\n' +
                'four\n' +
                'five\n'
            ));
        });
        it('should record whole sequence', async () => {
            const sequence = [ Cmd.CursorEnd, Cmd.DeleteLeft, Cmd.CursorRight ];
            await setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await keyboardMacro.playback({ sequence });
            keyboardMacro.finishRecording();

            assert.strictEqual(textEditor.document.lineAt(0).text, 'zer');
            assert.deepStrictEqual(getSelections(), [[1, 0]]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), sequence);

            await keyboardMacro.playback();

            assert.strictEqual(textEditor.document.lineAt(1).text, 'on');
            assert.deepStrictEqual(getSelections(), [[2, 0]]);
        });
        it('should record whole sequence and repeat option', async () => {
            const sequence = [ Cmd.CursorEnd, Cmd.DeleteLeft, Cmd.CursorRight ];
            const repeat = 3;
            await setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await keyboardMacro.playback({ sequence, repeat });
            keyboardMacro.finishRecording();

            assert.strictEqual(textEditor.document.lineAt(0).text, 'zer');
            assert.strictEqual(textEditor.document.lineAt(1).text, 'on');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'tw');
            assert.deepStrictEqual(getSelections(), [[3, 0]]);
            assert.deepStrictEqual(
                keyboardMacro.getCurrentSequence(),
                [].concat(sequence).concat(sequence).concat(sequence)
            );

            await keyboardMacro.playback();

            assert.strictEqual(textEditor.document.lineAt(3).text, 'thre');
            assert.strictEqual(textEditor.document.lineAt(4).text, 'fou');
            assert.strictEqual(textEditor.document.lineAt(5).text, 'fiv');
            assert.deepStrictEqual(getSelections(), [[6, 0]]);
        });
        it('should record sequence with $type command', async () => {
            const sequence = [ Cmd.CursorEnd, Type('!!'), Cmd.CursorRight ];
            await setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await keyboardMacro.playback({ sequence });
            keyboardMacro.finishRecording();

            assert.strictEqual(textEditor.document.lineAt(0).text, 'zero!!');
            assert.deepStrictEqual(getSelections(), [[1, 0]]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), sequence);

            await keyboardMacro.playback();

            assert.strictEqual(textEditor.document.lineAt(1).text, 'one!!');
            assert.deepStrictEqual(getSelections(), [[2, 0]]);
        });
        it('should record sequence with $moveCursor command', async () => {
            const sequence = [ Cmd.CursorEnd, Type('()'), Move(-1), Type('!!'), Cmd.CursorEnd, Cmd.CursorRight ];
            await setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await keyboardMacro.playback({ sequence });
            keyboardMacro.finishRecording();

            assert.strictEqual(textEditor.document.lineAt(0).text, 'zero(!!)');
            assert.deepStrictEqual(getSelections(), [[1, 0]]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), sequence);

            await keyboardMacro.playback();

            assert.strictEqual(textEditor.document.lineAt(1).text, 'one(!!)');
            assert.deepStrictEqual(getSelections(), [[2, 0]]);
        });
    });
});
