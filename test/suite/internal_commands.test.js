'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const internalCommands = require('../../src/internal_commands.js');

describe('internalCommands', () => {
    let textEditor;
    const setSelections = function(array) {
        textEditor.selections = TestUtil.arrayToSelections(array);
    };
    const getSelections = function() {
        return TestUtil.selectionsToArray(textEditor.selections);
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for Internal Commands.');
        textEditor = await TestUtil.setupTextEditor({ content: '' });
    });
    describe('performType (basic)', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should insert a text (1)', async () => {
            setSelections([[3, 0]]);
            await internalCommands.performType({ text: 'C' });

            assert.strictEqual(textEditor.document.lineAt(3).text, 'C');
            assert.deepStrictEqual(getSelections(), [[3, 1]]);
        });
        it('should insert a text (2)', async () => {
            setSelections([[12, 3]]);
            await internalCommands.performType({ text: 'XYZ' });

            assert.strictEqual(textEditor.document.lineAt(12).text, 'abcXYZd');
            assert.deepStrictEqual(getSelections(), [[12, 6]]);
        });
        it('should insert a text (3)', async () => {
            setSelections([[12, 3]]);
            await internalCommands.performType({ text: '123\n456' });

            assert.strictEqual(textEditor.document.lineAt(12).text, 'abc123');
            assert.strictEqual(textEditor.document.lineAt(13).text, '456d');
            assert.strictEqual(textEditor.document.lineAt(20).text, 'abcd');
            assert.deepStrictEqual(getSelections(), [[13, 3]]);
        });
        it('should not trigger bracket completion', async () => {
            setSelections([[3, 0]]);
            await internalCommands.performType({ text: '(' });

            assert.strictEqual(textEditor.document.lineAt(3).text, '(');
            assert.deepStrictEqual(getSelections(), [[3, 1]]);
        });
        it('should replace selected range with a text (1)', async () => {
            setSelections([[12, 1, 12, 3]]);
            await internalCommands.performType({ text: 'X' });

            assert.strictEqual(textEditor.document.lineAt(12).text, 'aXd');
            assert.deepStrictEqual(getSelections(), [[12, 2]]);
        });
        it('should replace selected range with a text (2)', async () => {
            setSelections([[2, 0, 3, 0]]);
            await internalCommands.performType({ text: 'X' });

            assert.strictEqual(textEditor.document.lineAt(2).text, 'X');
            assert.strictEqual(textEditor.document.lineAt(9).text, 'abcd');
            assert.deepStrictEqual(getSelections(), [[2, 1]]);
        });
        it('should replace selected range with a text (3)', async () => {
            setSelections([[10, 2, 12, 3]]);
            await internalCommands.performType({ text: 'X' });

            assert.strictEqual(textEditor.document.lineAt(10).text, 'abXd');
            assert.strictEqual(textEditor.document.lineAt(18).text, '    efgh');
            assert.deepStrictEqual(getSelections(), [[10, 3]]);
        });
        it('should insert a text into each location of multi-cursor (1)', async () => {
            setSelections([[5, 0], [15, 1], [25, 2]]);
            await internalCommands.performType({ text: 'X' });

            assert.strictEqual(textEditor.document.lineAt(5).text, 'X');
            assert.strictEqual(textEditor.document.lineAt(15).text, 'aXbcd');
            assert.strictEqual(textEditor.document.lineAt(25).text, '  X  efgh');
            assert.deepStrictEqual(getSelections(), [[5, 1], [15, 2], [25, 3]]);
        });
        it('should insert a text into each location of multi-cursor (2)', async () => {
            setSelections([[15, 1], [25, 2], [5, 0]]);
            await internalCommands.performType({ text: 'X' });

            assert.strictEqual(textEditor.document.lineAt(5).text, 'X');
            assert.strictEqual(textEditor.document.lineAt(15).text, 'aXbcd');
            assert.strictEqual(textEditor.document.lineAt(25).text, '  X  efgh');
            assert.deepStrictEqual(getSelections(), [[15, 2], [25, 3], [5, 1]]);
        });
        it('should insert a text into each location of multi-cursor (3)', async () => {
            setSelections([[0, 0], [10, 4], [20, 8]]);
            await internalCommands.performType({ text: 'hello\nbye' });

            assert.strictEqual(textEditor.document.lineAt(0).text, 'hello');
            assert.strictEqual(textEditor.document.lineAt(1).text, 'bye');
            assert.strictEqual(textEditor.document.lineAt(11).text, 'abcdhello');
            assert.strictEqual(textEditor.document.lineAt(12).text, 'bye');
            assert.strictEqual(textEditor.document.lineAt(22).text, '    efghhello');
            assert.strictEqual(textEditor.document.lineAt(23).text, 'bye');
            assert.deepStrictEqual(getSelections(), [[1, 3], [12, 3], [23, 3]]);
        });
        it('should insert a text into each location of multi-cursor (4)', async () => {
            setSelections([[25, 0], [25, 4], [25, 8]]);
            await internalCommands.performType({ text: 'X' });

            assert.strictEqual(textEditor.document.lineAt(25).text, 'X    XefghX');
            assert.deepStrictEqual(getSelections(), [[25, 1], [25, 6], [25, 11]]);
        });
        it('should replace every selected range with a text (1)', async () => {
            setSelections([[0, 0, 2, 0], [10, 4, 12, 0], [20, 8, 22, 4]]);
            await internalCommands.performType({ text: '99\n00' });

            assert.strictEqual(textEditor.document.lineAt(0).text, '99');
            assert.strictEqual(textEditor.document.lineAt(1).text, '00');
            assert.strictEqual(textEditor.document.lineAt(9).text, 'abcd99');
            assert.strictEqual(textEditor.document.lineAt(10).text, '00abcd');
            assert.strictEqual(textEditor.document.lineAt(18).text, '    efgh99');
            assert.strictEqual(textEditor.document.lineAt(19).text, '00efgh');
            assert.deepStrictEqual(getSelections(), [[1, 2], [10, 2], [19, 2]]);
        });
        it('should replace every selected range with a text (2)', async () => {
            setSelections([[25, 0, 25, 2], [25, 3, 25, 5], [25, 6, 25, 8]]);
            await internalCommands.performType({ text: 'X' });

            assert.strictEqual(textEditor.document.lineAt(25).text, 'X XfX');
            assert.deepStrictEqual(getSelections(), [[25, 1], [25, 3], [25, 5]]);
        });
        it('should replace every selected range with a text (3)', async () => {
            setSelections([[25, 2, 26, 0], [26, 4, 27, 2], [27, 6, 28, 4]]);
            await internalCommands.performType({ text: 'X' });

            assert.strictEqual(textEditor.document.lineAt(25).text, '  X    X  efXefgh');
            assert.deepStrictEqual(getSelections(), [[25, 3], [25, 8], [25, 13]]);
        });
        it('should replace every selected range with a text (4)', async () => {
            setSelections([[25, 0, 25, 1], [25, 3, 25, 4], [25, 6, 25, 7]]);
            await internalCommands.performType({ text: 'X\nYZ' });

            assert.strictEqual(textEditor.document.lineAt(25).text, 'X');
            assert.strictEqual(textEditor.document.lineAt(26).text, 'YZ  X');
            assert.strictEqual(textEditor.document.lineAt(27).text, 'YZefX');
            assert.strictEqual(textEditor.document.lineAt(28).text, 'YZh');
            assert.deepStrictEqual(getSelections(), [[26, 2], [27, 2], [28, 2]]);
        });
    });

    describe('performType (with deleteLeft)', () => {
        beforeEach(async () => {
            await TestUtil.resetDocument(textEditor, (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            ));
        });
        it('should delete left-hand side characters and insert a text', async () => {
            setSelections([[10, 4]]);
            await internalCommands.performType({ deleteLeft: 2, text: 'CDEFG' });

            assert.strictEqual(textEditor.document.lineAt(10).text, 'abCDEFG');
            assert.deepStrictEqual(getSelections(), [[10, 7]]);
        });
        it('should delete left-hand side characters and insert a text with multi-cursor (1)', async () => {
            setSelections([[10, 4], [11, 4]]);
            await internalCommands.performType({ deleteLeft: 2, text: 'CDEFG' });

            assert.strictEqual(textEditor.document.lineAt(10).text, 'abCDEFG');
            assert.strictEqual(textEditor.document.lineAt(11).text, 'abCDEFG');
            assert.deepStrictEqual(getSelections(), [[10, 7], [11, 7]]);
        });
        it('should delete left-hand side characters and insert a text with multi-cursor (2)', async () => {
            setSelections([[20, 2], [20, 4], [20, 6]]);
            await internalCommands.performType({ deleteLeft: 1, text: 'XY' });

            assert.strictEqual(textEditor.document.lineAt(20).text, ' XY XYeXYgh');
            assert.deepStrictEqual(getSelections(), [[20, 3], [20, 6], [20, 9]]);
        });
        it('should stop deleting at the beginning of the line', async () => {
            setSelections([[10, 2]]);
            await internalCommands.performType({ deleteLeft: 4, text: 'AB' });

            assert.strictEqual(textEditor.document.lineAt(10).text, 'ABcd');
            assert.deepStrictEqual(getSelections(), [[10, 2]]);
        });
    });

    describe('performCursorMotion (horizontal motion)', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n'.repeat(10) +
                'fghij klmno\n'.repeat(10)
            ));
        });
        it('should move the cursor to left horizontally', async () => {
            setSelections([[3, 3]]);
            await internalCommands.performCursorMotion({ characterDelta: -2 });
            assert.deepStrictEqual(getSelections(), [[3, 1]]);
        });
        it('should move cursors to left horizontally', async () => {
            setSelections([[3, 3], [4, 4]]);
            await internalCommands.performCursorMotion({ characterDelta: -2 });
            assert.deepStrictEqual(getSelections(), [[3, 1], [4, 2]]);
        });
        it('should move the cursor to right horizontally', async () => {
            setSelections([[3, 2]]);
            await internalCommands.performCursorMotion({ characterDelta: 2 });
            assert.deepStrictEqual(getSelections(), [[3, 4]]);
        });
        it('should move cursors to right horizontally', async () => {
            setSelections([[3, 2], [4, 3]]);
            await internalCommands.performCursorMotion({ characterDelta: 2 });
            assert.deepStrictEqual(getSelections(), [[3, 4], [4, 5]]);
        });
        it('should stop at beginning of a line', async () => {
            setSelections([[3, 2]]);
            await internalCommands.performCursorMotion({ characterDelta: -4 });
            assert.deepStrictEqual(getSelections(), [[3, 0]]);
        });
        it('should stop at end of a line', async () => {
            setSelections([[3, 2]]);
            await internalCommands.performCursorMotion({ characterDelta: 4 });
            assert.deepStrictEqual(getSelections(), [[3, 5]]);
        });

        it('should move the cursor to left based on start position of current selection', async () => {
            setSelections([[12, 6, 12, 11]]);
            await internalCommands.performCursorMotion({ characterDelta: -4 });
            assert.deepStrictEqual(getSelections(), [[12, 2]]);
        });
        it('should move the cursor to right based on start position of current selection', async () => {
            setSelections([[12, 2, 12, 5]]);
            await internalCommands.performCursorMotion({ characterDelta: 4 });
            assert.deepStrictEqual(getSelections(), [[12, 6]]);
        });
    });

    describe('performCursorMotion (with lineDelta)', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n'.repeat(10) +
                'fghij klmno\n'.repeat(10)
            ));
        });
        it('should move the cursor up and locate relative to the end of the line', async () => {
            setSelections([[11, 3]]);
            await internalCommands.performCursorMotion({ lineDelta: -3, characterDelta: -3 });
            assert.deepStrictEqual(getSelections(), [[8, 2]]);
        });
        it('should move cursors up and locate relative to the end of the line', async () => {
            setSelections([[11, 3], [12, 4]]);
            await internalCommands.performCursorMotion({ lineDelta: -3, characterDelta: -3 });
            assert.deepStrictEqual(getSelections(), [[8, 2], [9, 2]]);
        });
        it('should move the cursor down and locate relative to the beginning of the line', async () => {
            setSelections([[8, 3]]);
            await internalCommands.performCursorMotion({ lineDelta: 4, characterDelta: 4 });
            assert.deepStrictEqual(getSelections(), [[12, 4]]);
        });
        it('should move cursors down and locate relative to the beginning of the line', async () => {
            setSelections([[8, 3], [9, 4]]);
            await internalCommands.performCursorMotion({ lineDelta: 4, characterDelta: 4 });
            assert.deepStrictEqual(getSelections(), [[12, 4], [13, 4]]);
        });
        it('should stop at beginning of a line (move up)', async () => {
            setSelections([[11, 3]]);
            await internalCommands.performCursorMotion({ lineDelta: -3, characterDelta: -15 });
            assert.deepStrictEqual(getSelections(), [[8, 0]]);
        });
        it('should stop at beginning of a line (move down)', async () => {
            setSelections([[8, 3]]);
            await internalCommands.performCursorMotion({ lineDelta: 4, characterDelta: -15 });
            assert.deepStrictEqual(getSelections(), [[12, 0]]);
        });
        it('should stop at end of a line (move up)', async () => {
            setSelections([[11, 3]]);
            await internalCommands.performCursorMotion({ lineDelta: -3, characterDelta: 15 });
            assert.deepStrictEqual(getSelections(), [[8, 5]]);
        });
        it('should stop at end of a line (move down)', async () => {
            setSelections([[8, 3]]);
            await internalCommands.performCursorMotion({ lineDelta: 4, characterDelta: 15 });
            assert.deepStrictEqual(getSelections(), [[12, 11]]);
        });

        it('should move the cursor up and locate relative to the end of the line and make a selection', async () => {
            setSelections([[11, 3]]);
            await internalCommands.performCursorMotion({ lineDelta: -3, characterDelta: -3, selectionLength: 2 });
            assert.deepStrictEqual(getSelections(), [[8, 2, 8, 4]]);
        });
        it('should move the cursor down and locate relative to the beginning of the line and make a selection', async () => {
            setSelections([[8, 3]]);
            await internalCommands.performCursorMotion({ lineDelta: 4, characterDelta: 4, selectionLength: 2 });
            assert.deepStrictEqual(getSelections(), [[12, 4, 12, 6]]);
        });
    });

    describe('performCursorMotion (with selectionLength)', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n'.repeat(10) +
                'fghij klmno\n'.repeat(10)
            ));
        });
        it('should move the cursor horizontally and make a selection', async () => {
            setSelections([[3, 5]]);
            await internalCommands.performCursorMotion({ characterDelta: -4, selectionLength: 3 });
            assert.deepStrictEqual(getSelections(), [[3, 1, 3, 4]]);
        });
        it('should move cursors horizontally and make selections', async () => {
            setSelections([[3, 5], [4, 5]]);
            await internalCommands.performCursorMotion({ characterDelta: -4, selectionLength: 3 });
            assert.deepStrictEqual(getSelections(), [[3, 1, 3, 4], [4, 1, 4, 4]]);
        });
    });

    describe('performCursorMotion (split into multiple cursors)', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n'.repeat(10) +
                'fghij klmno\n'.repeat(10)
            ));
        });
        it('should split cursor into multiple cursors', async () => {
            setSelections([[3, 4]]);
            await internalCommands.performCursorMotion({ characterDelta: [ -3, -1 ] });
            assert.deepStrictEqual(getSelections(), [[3, 1], [3, 3]]);
        });
        it('should split cursor into multiple cursors (with lineDelta)', async () => {
            setSelections([[3, 4]]);
            await internalCommands.performCursorMotion({
                characterDelta: [ -3, -1 ],
                lineDelta: [ -1, -2 ]
            });
            assert.deepStrictEqual(getSelections(), [[2, 2], [1, 4]]);
        });
        it('should split cursor into multiple cursors (with selectionLength)', async () => {
            setSelections([[3, 4]]);
            await internalCommands.performCursorMotion({
                characterDelta: [ -3, -1 ],
                selectionLength: 1
            });
            assert.deepStrictEqual(getSelections(), [[3, 1, 3, 2], [3, 3, 3, 4]]);
        });
    });
});
