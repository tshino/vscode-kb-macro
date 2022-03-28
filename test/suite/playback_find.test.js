'use strict';
// This regression test should fail until #33 is fixed.
// First, we need to pass this test.
/*
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro, awaitController } = require('../../src/extension.js');

describe('Recording and Playback: Find', () => {
    let textEditor;
    const Cmd = CommandsToTest;

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
    const record = async function(sequence) {
        keyboardMacro.startRecording();
        for (let i = 0; i < sequence.length; i++) {
            const { command, args } = sequence[i];
            if (command === '$wrap') {
                await keyboardMacro.wrapSync(args);
            } else {
                await vscode.commands.executeCommand(command, args);
            }
        }
        keyboardMacro.finishRecording();
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for Recording and Playback of Find action.');
        textEditor = await TestUtil.setupTextEditor({ content: '', language: 'javascript' });
    });

    describe('Find', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n' +
                '\n' +
                '1 abcde\n' +
                '2 abcde 3 abcde 4 abcde\n' +
                '5 abcde 6 abcde\n' +
                ''
            ));
        });
        it('should select the next match', async () => {
            const seq = [
                // Ctrl+F
                { command: '$wrap', args: Cmd.Find },

                // This should find the first match.
                // Following pair of commands emulates user's typing in the find input box,
                // thus these are not invoked through $wrap but invoked directly.
                { command: 'editor.actions.findWithArgs', args: { searchString: 'abcde' } },
                { command: 'editor.action.nextMatchFindAction' },

                // F3: should find the second match
                { command: '$wrap', args: Cmd.NextMatchFind },
            ];

            await vscode.commands.executeCommand('editor.actions.findWithArgs', { searchString: '' });
            await vscode.commands.executeCommand('closeFindWidget');
            await setSelections([[0, 0]]);
            await record(seq);
            assert.deepStrictEqual(getSelections(), [[3, 2, 3, 7]]);

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                Cmd.Find,
                Cmd.NextMatchFind
            ]);

            await vscode.commands.executeCommand('closeFindWidget');
            await keyboardMacro.playback();
            assert.deepStrictEqual(getSelections(), [[3, 10, 3, 15]]);
        });
    });
});
*/
