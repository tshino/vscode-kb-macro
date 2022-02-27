'use strict';
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');
const { TestUtil } = require('./test_util.js');
const { CommandsToTest } = require('./commands_to_test.js');
const { keyboardMacro, awaitController } = require('../../src/extension.js');

describe('Recording and Playback: Typing', () => {
    let textEditor;
    const Cmd = CommandsToTest;
    const Type = text => ({ command: '$type', args: { text } });
    const ReplaceRight = (deleteRight, text) => ({ command: '$type', args: { deleteRight, text } });
    const DefaultType = text => ({ command: 'default:type', args: { text } });
    const MoveLeft = delta => ({ command: '$moveCursor', args: { characterDelta: -delta } });
    const MoveRight = delta => ({ command: '$moveCursor', args: { characterDelta: delta } });
    const MoveLeftSelect = (delta, select) => ({
        command: '$moveCursor',
        args: { characterDelta: -delta, selectionLength: select }
    });
    const MoveRightSelect = (delta, select) => ({
        command: '$moveCursor',
        args: { characterDelta: delta, selectionLength: select }
    });
    const MoveUpSelect = (up, delta, select) => ({
        command: '$moveCursor',
        args: { lineDelta: -up, characterDelta: delta, selectionLength: select }
    });
    const MoveDown = (down, delta) => ({
        command: '$moveCursor',
        args: { lineDelta: down, characterDelta: delta }
    });
    const SplitMotion = (ch, ln, sel) => {
        const motion = { characterDelta: ch };
        if (ln) motion.lineDelta = ln;
        if (sel) motion.selectionLength = sel;
        return {
            command: '$moveCursor',
            args: motion
        };
    };
    const GroupMotion = (size, ch, ln, sel) => {
        const m = SplitMotion(ch, ln, sel);
        m.args.groupSize = size;
        return m;
    };

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
    const getSequence = keyboardMacro.getCurrentSequence;

    before(async () => {
        vscode.window.showInformationMessage('Started test for Typing Recording and Playback.');
        textEditor = await TestUtil.setupTextEditor({ content: '' });
    });

    describe('direct typing', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should detect and reproduce direct typing of a character', async () => {
            await setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('X') ]);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'X');
            assert.deepStrictEqual(getSelections(), [[0, 1]]);

            await setSelections([[10, 2]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abXcd');
            assert.deepStrictEqual(getSelections(), [[10, 3]]);
        });
        it('should detect and reproduce direct typing of multiple characters with one character per command', async () => {
            await setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            await vscode.commands.executeCommand('type', { text: 'Y' });
            await vscode.commands.executeCommand('type', { text: 'Z' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('XYZ') ]);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'XYZ');
            assert.deepStrictEqual(getSelections(), [[0, 3]]);

            await setSelections([[10, 2]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abXYZcd');
            assert.deepStrictEqual(getSelections(), [[10, 5]]);
        });
        it('should detect and reproduce direct typing of multiple characters with two characters in one command', async () => {
            await setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'XY' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('XY') ]);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'XY');
            assert.deepStrictEqual(getSelections(), [[0, 2]]);

            await setSelections([[10, 2]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abXYcd');
            assert.deepStrictEqual(getSelections(), [[10, 4]]);
        });
        it('should detect and reproduce direct typing of multiple characters with three characters in one command', async () => {
            await setSelections([[0, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'XYZ' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('XYZ') ]);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'XYZ');
            assert.deepStrictEqual(getSelections(), [[0, 3]]);

            await setSelections([[10, 2]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abXYZcd');
            assert.deepStrictEqual(getSelections(), [[10, 5]]);
        });
        it('should detect and reproduce direct typing with multi-cursor', async () => {
            await setSelections([[0, 0], [10, 4]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('X') ]);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'X');
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abcdX');
            assert.deepStrictEqual(getSelections(), [[0, 1], [10, 5]]);

            await setSelections([[14, 2], [24, 6]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(14).text, 'abXcd');
            assert.strictEqual(textEditor.document.lineAt(24).text, '    efXgh');
            assert.deepStrictEqual(getSelections(), [[14, 3], [24, 7]]);

            await setSelections([[4, 0], [3, 0], [5, 0]]); // arbitrary order
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(4).text, 'X');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'X');
            assert.strictEqual(textEditor.document.lineAt(5).text, 'X');
            assert.deepStrictEqual(getSelections(), [[4, 1], [3, 1], [5, 1]]); // corresponding order
        });
        it('should detect and reproduce direct typing with a selection', async () => {
            await setSelections([[10, 0, 10, 2]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('X') ]);
            assert.strictEqual(textEditor.document.lineAt(10).text, 'Xcd');
            assert.deepStrictEqual(getSelections(), [[10, 1]]);

            await setSelections([[12, 2, 12, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(12).text, 'abX');
            assert.deepStrictEqual(getSelections(), [[12, 3]]);
        });
        it('should detect and reproduce direct typing with multiple selections', async () => {
            await setSelections([[10, 0, 10, 2], [11, 0, 11, 2]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('X') ]);
            assert.strictEqual(textEditor.document.lineAt(10).text, 'Xcd');
            assert.strictEqual(textEditor.document.lineAt(11).text, 'Xcd');
            assert.deepStrictEqual(getSelections(), [[10, 1], [11, 1]]);

            await setSelections([[12, 2, 12, 4], [13, 2, 13, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(12).text, 'abX');
            assert.strictEqual(textEditor.document.lineAt(13).text, 'abX');
            assert.deepStrictEqual(getSelections(), [[12, 3], [13, 3]]);
        });
        it('should detect and reproduce direct typing with multiple selections which contain line-breaks', async () => {
            await setSelections([[10, 3, 11, 2], [12, 2, 13, 1]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'X' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('X') ]);
            assert.strictEqual(textEditor.document.lineAt(10).text, 'abcXcd');
            assert.strictEqual(textEditor.document.lineAt(11).text, 'abXbcd');
            assert.deepStrictEqual(getSelections(), [[10, 4], [11, 3]]);

            await setSelections([[12, 2, 13, 0], [14, 4, 15, 2]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(12).text, 'abXabcd');
            assert.strictEqual(textEditor.document.lineAt(13).text, 'abcdXcd');
            assert.deepStrictEqual(getSelections(), [[12, 3], [13, 5]]);
        });
    });

    describe('bracket completion', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should record and playback typing of an opening bracket which triggers bracket completion (1)', async () => {
            await setSelections([[5, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('()'), MoveLeft(1) ]);
            assert.strictEqual(textEditor.document.lineAt(5).text, '()');
            assert.deepStrictEqual(getSelections(), [[5, 1]]);

            await setSelections([[13, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(13).text, 'abcd()');
            assert.deepStrictEqual(getSelections(), [[13, 5]]);
        });
        it('should record and playback typing of an opening bracket which triggers bracket completion (2: multi-cursor)', async () => {
            await setSelections([[5, 0], [6, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('()'), MoveLeft(1) ]);
            assert.strictEqual(textEditor.document.lineAt(5).text, '()');
            assert.strictEqual(textEditor.document.lineAt(6).text, '()');
            assert.deepStrictEqual(getSelections(), [[5, 1], [6, 1]]);

            await setSelections([[13, 4], [14, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(13).text, 'abcd()');
            assert.strictEqual(textEditor.document.lineAt(14).text, 'abcd()');
            assert.deepStrictEqual(getSelections(), [[13, 5], [14, 5]]);
        });
        it('should record and playback typing of an closing bracket right after bracket completion (1)', async () => {
            await setSelections([[5, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' }); // This inserts a closing bracket too.
            await vscode.commands.executeCommand('type', { text: ')' }); // This overwrites the closing bracket.
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('()') ]);
            assert.strictEqual(textEditor.document.lineAt(5).text, '()');
            assert.deepStrictEqual(getSelections(), [[5, 2]]);

            await setSelections([[13, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(13).text, 'abcd()');
            assert.deepStrictEqual(getSelections(), [[13, 6]]);
        });
        it('should record and playback typing of an closing bracket right after bracket completion (2: multi-cursor)', async () => {
            await setSelections([[5, 0], [6, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' }); // This inserts a closing bracket too.
            await vscode.commands.executeCommand('type', { text: ')' }); // This overwrites the closing bracket.
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('()') ]);
            assert.strictEqual(textEditor.document.lineAt(5).text, '()');
            assert.strictEqual(textEditor.document.lineAt(6).text, '()');
            assert.deepStrictEqual(getSelections(), [[5, 2], [6, 2]]);

            await setSelections([[13, 4], [14, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(13).text, 'abcd()');
            assert.strictEqual(textEditor.document.lineAt(14).text, 'abcd()');
            assert.deepStrictEqual(getSelections(), [[13, 6], [14, 6]]);
        });
        it('should record and playback typing of an closing bracket right after typing inside brackets (1)', async () => {
            await setSelections([[5, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' }); // This inserts a closing bracket too.
            await vscode.commands.executeCommand('type', { text: '10' });
            await vscode.commands.executeCommand('type', { text: ')' }); // This overwrites the closing bracket.
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('()'), MoveLeft(1), Type('10'), ReplaceRight(1, ')') ]);
            assert.strictEqual(textEditor.document.lineAt(5).text, '(10)');
            assert.deepStrictEqual(getSelections(), [[5, 4]]);

            await setSelections([[13, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(13).text, 'abcd(10)');
            assert.deepStrictEqual(getSelections(), [[13, 8]]);
        });
        it('should record and playback typing of an closing bracket right after typing inside brackets (2: multi-cursor)', async () => {
            await setSelections([[5, 0], [6, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' }); // This inserts a closing bracket too.
            await vscode.commands.executeCommand('type', { text: '10' });
            await vscode.commands.executeCommand('type', { text: ')' }); // This overwrites the closing bracket.
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('()'), MoveLeft(1), Type('10'), ReplaceRight(1, ')') ]);
            assert.strictEqual(textEditor.document.lineAt(5).text, '(10)');
            assert.strictEqual(textEditor.document.lineAt(6).text, '(10)');
            assert.deepStrictEqual(getSelections(), [[5, 4], [6, 4]]);

            await setSelections([[13, 4], [14, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(13).text, 'abcd(10)');
            assert.strictEqual(textEditor.document.lineAt(14).text, 'abcd(10)');
            assert.deepStrictEqual(getSelections(), [[13, 8], [14, 8]]);
        });
        it('should record and playback typing of an opening bracket without bracket completion (1)', async () => {
            await setSelections([[12, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('(') ]);
            assert.strictEqual(textEditor.document.lineAt(12).text, '(abcd');
            assert.deepStrictEqual(getSelections(), [[12, 1]]);

            await setSelections([[23, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(23).text, '    (efgh');
            assert.deepStrictEqual(getSelections(), [[23, 5]]);

            await setSelections([[2, 0]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(2).text, '(');
            assert.deepStrictEqual(getSelections(), [[2, 1]]);
        });
        it('should record and playback typing of an opening bracket without bracket completion (2: multi-cursor)', async () => {
            await setSelections([[12, 0], [13, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Type('(') ]);
            assert.strictEqual(textEditor.document.lineAt(12).text, '(abcd');
            assert.strictEqual(textEditor.document.lineAt(13).text, '(abcd');
            assert.deepStrictEqual(getSelections(), [[12, 1], [13, 1]]);

            await setSelections([[23, 4], [24, 4]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(23).text, '    (efgh');
            assert.strictEqual(textEditor.document.lineAt(24).text, '    (efgh');
            assert.deepStrictEqual(getSelections(), [[23, 5], [24, 5]]);

            await setSelections([[2, 0], [3, 0]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(2).text, '(');
            assert.strictEqual(textEditor.document.lineAt(3).text, '(');
            assert.deepStrictEqual(getSelections(), [[2, 1], [3, 1]]);
        });
        it('should record and playback a bracket completion with typing an opening bracket with selection (1)', async () => {
            await setSelections([[10, 0, 10, 4]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ DefaultType('(') ]);
            assert.strictEqual(textEditor.document.lineAt(10).text, '(abcd)');
            assert.deepStrictEqual(getSelections(), [[10, 1, 10, 5]]);

            await setSelections([[20, 4, 20, 8]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(20).text, '    (efgh)');
            assert.deepStrictEqual(getSelections(), [[20, 5, 20, 9]]);
        });
        it('should record and playback a bracket completion with typing an opening bracket with selection (2: multi-cursor)', async () => {
            await setSelections([[10, 0, 10, 4], [11, 0, 11, 4]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: '(' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ DefaultType('(') ]);
            assert.strictEqual(textEditor.document.lineAt(10).text, '(abcd)');
            assert.strictEqual(textEditor.document.lineAt(11).text, '(abcd)');
            assert.deepStrictEqual(getSelections(), [[10, 1, 10, 5], [11, 1, 11, 5]]);

            await setSelections([[20, 4, 20, 8], [21, 4, 21, 8]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(20).text, '    (efgh)');
            assert.strictEqual(textEditor.document.lineAt(21).text, '    (efgh)');
            assert.deepStrictEqual(getSelections(), [[20, 5, 20, 9], [21, 5, 21, 9]]);
        });
    });

    // Here we make a test case for playback of input with code completion.
    // Unfortunately, this is not a perfect simulation of actual code completion,
    // and some details in events that will happen through the test differ from actual ones.
    // But we consider it's acceptable as a test since it contains most of the same
    // events as actual and reproduces the same results as actual.
    describe('code completion', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should record and playback replacing text with other text (code completion)', async () => {
            await setSelections([[1, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'a' });
            await vscode.commands.executeCommand('type', { text: 'b' });
            await textEditor.edit(edit => {
                edit.replace(new vscode.Selection(1, 0, 1, 2), 'Abcde');
            });
            await setSelections([[1, 5]]);
            await vscode.commands.executeCommand('type', { text: '.' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [
                Type('Abcde.')
            ]);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcde.');

            await setSelections([[20, 0]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(20).text, 'Abcde.    efgh');
            assert.deepStrictEqual(getSelections(), [[20, 6]]);
        });
    });

    describe('snippet insertion', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should record and playback of snippet insertion (single line, no placeholder)', async () => {
            await setSelections([[2, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'log' });
            await textEditor.edit(edit => {
                edit.replace(new vscode.Selection(2, 0, 2, 3), 'console.log();');
            });
            await setSelections([[2, 14]]); // end of the line
            await setSelections([[2, 12]]); // in the parentheses
            await vscode.commands.executeCommand('type', { text: 'msg' });
            await setSelections([[2, 17]]); // end of the line (moved by hitting TAB key)
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [
                Type('console.log();'),
                MoveLeft(2),
                Type('msg'),
                MoveRight(2)
            ]);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'console.log(msg);');

            await setSelections([[5, 0]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(5).text, 'console.log(msg);');
            assert.deepStrictEqual(getSelections(), [[5, 17]]);
        });
        it('should record and playback of snippet insertion (single line with placeholders)', async () => {
            await setSelections([[5, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'new' });
            await textEditor.edit(edit => {
                edit.replace(new vscode.Selection(5, 0, 5, 3), 'const name = new type(arguments);');
            });
            await setSelections([[5, 33]]); // end of the line
            await setSelections([[5, 6, 5, 10]]); // placeholder 'name'
            await vscode.commands.executeCommand('type', { text: 'a' });
            await setSelections([[5, 7]]);
            await setSelections([[5, 14, 5, 18]]); // placeholder 'type'
            await vscode.commands.executeCommand('type', { text: 'Array' });
            await setSelections([[5, 19]]);
            await setSelections([[5, 20, 5, 29]]); // placeholder 'arguments'
            await vscode.commands.executeCommand('type', { text: '5' });
            await setSelections([[5, 21]]);
            await setSelections([[5, 23]]);
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [
                Type('const name = new type(arguments);'),
                MoveLeftSelect(27, 4),
                Type('a'),
                MoveRightSelect(7, 4),
                Type('Array'),
                MoveRightSelect(1, 9),
                Type('5'),
                MoveRight(2)
            ]);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'const a = new Array(5);');

            await setSelections([[8, 0]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(8).text, 'const a = new Array(5);');
            assert.deepStrictEqual(getSelections(), [[8, 23]]);
        });
        it('should record and playback of snippet insertion (multi-line with placeholders)', async () => {
            await setSelections([[4, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'fun' });
            await textEditor.edit(edit => {
                edit.replace(new vscode.Selection(4, 0, 4, 3), 'function name(params) {\n    \n}');
            });
            await setSelections([[6, 1]]); // end of the snippet
            await setSelections([[4, 9, 4, 13]]); // placeholder 'name'
            await vscode.commands.executeCommand('type', { text: 'say' });
            await setSelections([[4, 12]]);
            await setSelections([[4, 13, 4, 19]]); // placeholder 'params'
            await vscode.commands.executeCommand('type', { text: 'name' });
            await setSelections([[4, 17]]);
            await setSelections([[5, 4]]); // inside the function block
            await vscode.commands.executeCommand('type', { text: 'console.log(' });
            await setSelections([[5, 16]]);
            await vscode.commands.executeCommand('type', { text: 'name' });
            await setSelections([[5, 21]]);
            await vscode.commands.executeCommand('type', { text: ';' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [
                Type('function name(params) {\n    \n}'),
                MoveUpSelect(2, -14, 4),
                Type('say'),
                MoveRightSelect(1, 6),
                Type('name'),
                MoveDown(1, 4),
                Type('console.log()'),
                MoveLeft(1),
                Type('name'),
                MoveRight(1),
                Type(';')
            ]);
            assert.strictEqual(textEditor.document.lineAt(4).text, 'function say(name) {');
            assert.strictEqual(textEditor.document.lineAt(5).text, '    console.log(name);');
            assert.strictEqual(textEditor.document.lineAt(6).text, '}');

            await setSelections([[7, 0]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(7).text, 'function say(name) {');
            assert.strictEqual(textEditor.document.lineAt(8).text, '    console.log(name);');
            assert.strictEqual(textEditor.document.lineAt(9).text, '}');
            assert.deepStrictEqual(getSelections(), [[8, 22]]);
        });
        it('should record and playback of snippet insertion (multiple occurrences of a single placeholder)', async () => {
            await setSelections([[4, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'for' });
            await textEditor.edit(edit => {
                edit.replace(
                    new vscode.Selection(4, 0, 4, 3),
                    'for (let index = 0; index < array.length; index++) {\n' +
                    '    const element = array[index];\n' +
                    '    \n' +
                    '}'
                );
            });
            await setSelections([[7, 1]]); // end of the snippet
            await setSelections([
                [4, 9, 4, 14], [4, 20, 4, 25], [4, 42, 4, 47], [5, 26, 5, 31]
            ]); // placeholder 'index'
            await vscode.commands.executeCommand('type', { text: 'idx' });
            await setSelections([[4, 12], [4, 21], [4, 41], [5, 29]]);
            await setSelections([[4, 24, 4, 29], [5, 20, 5, 25]]); // placeholder 'array'
            await vscode.commands.executeCommand('type', { text: 'ary' });
            await setSelections([[4, 27], [5, 23]]);
            await setSelections([[5, 10, 5, 17]]); // placeholder 'element'
            await vscode.commands.executeCommand('type', { text: 'el' });
            await setSelections([[5, 12]]);
            await setSelections([[6, 4]]); // the blank line in the block
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [
                Type('for (let index = 0; index < array.length; index++) {\n' +
                '    const element = array[index];\n' +
                '    \n' +
                '}'),
                SplitMotion([-43, -32, -10, -7], [-3, -3, -3, -2], 5),
                Type('idx'),
                GroupMotion(4, [12, 20], [0, 1], 5),
                Type('ary'),
                GroupMotion(2, 10, 1, 7),
                Type('el'),
                MoveDown(1, 4)
            ]);
            assert.strictEqual(textEditor.document.lineAt(4).text, 'for (let idx = 0; idx < ary.length; idx++) {');
            assert.strictEqual(textEditor.document.lineAt(5).text, '    const el = ary[idx];');
            assert.strictEqual(textEditor.document.lineAt(6).text, '    ');
            assert.strictEqual(textEditor.document.lineAt(7).text, '}');

            await setSelections([[8, 0]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(8).text, 'for (let idx = 0; idx < ary.length; idx++) {');
            assert.strictEqual(textEditor.document.lineAt(9).text, '    const el = ary[idx];');
            assert.strictEqual(textEditor.document.lineAt(10).text, '    ');
            assert.strictEqual(textEditor.document.lineAt(11).text, '}');
            assert.deepStrictEqual(getSelections(), [[10, 4]]);
        });
    });

    describe('typing with IME', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should record and playback text input via IME', async () => {
            await setSelections([[1, 0]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'ｋ' });
            await textEditor.edit(edit => edit.replace(new vscode.Selection(1, 0, 1, 1), 'か'));
            await setSelections([[1, 1]]);
            await textEditor.edit(edit => edit.replace(new vscode.Selection(1, 0, 1, 1), 'かｎ'));
            await setSelections([[1, 2]]);
            await textEditor.edit(edit => edit.replace(new vscode.Selection(1, 0, 1, 2), 'かんｊ'));
            await setSelections([[1, 3]]);
            await textEditor.edit(edit => edit.replace(new vscode.Selection(1, 0, 1, 3), 'かんじ'));
            await setSelections([[1, 3]]);
            await textEditor.edit(edit => edit.replace(new vscode.Selection(1, 0, 1, 3), '感じ'));
            await setSelections([[1, 2]]);
            await textEditor.edit(edit => edit.replace(new vscode.Selection(1, 0, 1, 2), '漢字'));
            await setSelections([[1, 2]]);
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [
                Type('漢字')
            ]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '漢字');

            await setSelections([[20, 0]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(20).text, '漢字    efgh');
            assert.deepStrictEqual(getSelections(), [[20, 2]]);
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
            await setSelections([[10, 2]]);
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync(Cmd.Enter);
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Cmd.Enter ]);
            assert.strictEqual(textEditor.document.lineAt(10).text, 'ab');
            assert.strictEqual(textEditor.document.lineAt(11).text, 'cd');
            assert.deepStrictEqual(getSelections(), [[11, 0]]);

            await setSelections([[14, 3]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(14).text, 'abc');
            assert.strictEqual(textEditor.document.lineAt(15).text, 'd');
            assert.deepStrictEqual(getSelections(), [[15, 0]]);
        });
        it('should record and playback inserting a line break that results auto-indent', async () => {
            await setSelections([[20, 4]]);
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync(Cmd.Enter);
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Cmd.Enter ]);
            assert.strictEqual(textEditor.document.lineAt(20).text, '    ');
            assert.strictEqual(textEditor.document.lineAt(21).text, '    efgh');
            assert.deepStrictEqual(getSelections(), [[21, 4]]);

            await setSelections([[24, 6]]);
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
            await setSelections([[14, 0]]);
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync(Cmd.Tab);
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [ Cmd.Tab ]);
            assert.strictEqual(textEditor.document.lineAt(14).text, '    abcd');
            assert.deepStrictEqual(getSelections(), [[14, 4]]);

            await setSelections([[15, 2]]);
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
            await setSelections([[12, 2]]);
            keyboardMacro.startRecording();
            await vscode.commands.executeCommand('type', { text: 'C' });
            await vscode.commands.executeCommand('type', { text: 'D' });
            await keyboardMacro.wrapSync(Cmd.Enter);
            await vscode.commands.executeCommand('type', { text: 'A' });
            await vscode.commands.executeCommand('type', { text: 'B' });
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(getSequence(), [
                Type('CD'), Cmd.Enter, Type('AB')
            ]);
            assert.strictEqual(textEditor.document.lineAt(12).text, 'abCD');
            assert.strictEqual(textEditor.document.lineAt(13).text, 'ABcd');
            assert.deepStrictEqual(getSelections(), [[13, 2]]);

            await setSelections([[17, 3]]);
            await keyboardMacro.playback();
            assert.strictEqual(textEditor.document.lineAt(17).text, 'abcCD');
            assert.strictEqual(textEditor.document.lineAt(18).text, 'ABd');
            assert.deepStrictEqual(getSelections(), [[18, 2]]);
        });
    });
});
