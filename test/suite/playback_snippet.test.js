'use strict';
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro, awaitController } = require('../../src/extension.js');

describe('Recording and Playback: Real Snippet Insertion', () => {
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
        vscode.window.showInformationMessage('Started test for Recording and Playback of real Snippet insertion.');
        textEditor = await TestUtil.setupTextEditor({ content: '', language: 'javascript' });
    });

    describe('JavaScript snippets', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                '\n' +
                ''
            ));
        });
        it('forof', async () => {
            const seq = [
                { command: "$wrap", args: {
                    command: "editor.action.insertSnippet",
                    args: {
                        snippet:
                            "for (const ${1:element} of ${2:array}) {\n" +
                            "\t$0\n" +
                            "}"
                    },
                    record: "side-effect"
                } },
                { command: "default:type", args: { text: "iter" } },
                { command: "$wrap", args: Cmd.NextSnippetPlaceholder },
                { command: "default:type", args: { text: "obj" } },
                { command: "$wrap", args: Cmd.NextSnippetPlaceholder },
                { command: "$wrap", args: Cmd.CursorDown },
                { command: "$wrap", args: Cmd.Enter }
            ];

            await setSelections([[0, 0]]);
            await record(seq);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'for (const iter of obj) {');
            assert.strictEqual(textEditor.document.lineAt(2).text, '}');
            assert.deepStrictEqual(getSelections(), [[3, 0]]);

            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(3).text, 'for (const iter of obj) {');
            assert.strictEqual(textEditor.document.lineAt(5).text, '}');
            assert.deepStrictEqual(getSelections(), [[6, 0]]);
        });
        it('forin', async () => {
            const seq = [
                { command: "$wrap", args: {
                    command: "editor.action.insertSnippet",
                    args: {
                        snippet:
                            "for (const ${1:key} in ${2:object}) {\n" +
                            "\tif (Object.hasOwnProperty.call(${2}, ${1})) {\n" +
                            "\t\tconst ${3:element} = ${2}[${1}];\n" +
                            "\t\t$0\n" +
                            "\t}\n" +
                            "}"
                    },
                    record: "side-effect"
                } },
                { command: "$wrap", args: Cmd.NextSnippetPlaceholder },
                { command: "default:type", args: { text: "obj" } },
                { command: "$wrap", args: Cmd.PrevSnippetPlaceholder },
                { command: "default:type", args: { text: "prop" } },
                { command: "$wrap", args: Cmd.NextSnippetPlaceholder },
                { command: "$wrap", args: Cmd.NextSnippetPlaceholder },
                { command: "default:type", args: { text: "val" } },
                { command: "$wrap", args: Cmd.NextSnippetPlaceholder },
                { command: "$wrap", args: Cmd.CursorDown },
                { command: "$wrap", args: Cmd.CursorDown },
                { command: "$wrap", args: Cmd.Enter }
            ];

            await setSelections([[0, 0]]);
            await record(seq);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'for (const prop in obj) {');
            assert.strictEqual(textEditor.document.lineAt(1).text, '    if (Object.hasOwnProperty.call(obj, prop)) {');
            assert.strictEqual(textEditor.document.lineAt(2).text, '        const val = obj[prop];');
            assert.strictEqual(textEditor.document.lineAt(4).text, '    }');
            assert.strictEqual(textEditor.document.lineAt(5).text, '}');
            assert.deepStrictEqual(getSelections(), [[6, 0]]);

            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(6).text, 'for (const prop in obj) {');
            assert.strictEqual(textEditor.document.lineAt(7).text, '    if (Object.hasOwnProperty.call(obj, prop)) {');
            assert.strictEqual(textEditor.document.lineAt(8).text, '        const val = obj[prop];');
            assert.strictEqual(textEditor.document.lineAt(10).text, '    }');
            assert.strictEqual(textEditor.document.lineAt(11).text, '}');
            assert.deepStrictEqual(getSelections(), [[12, 0]]);
        });
    });
});
