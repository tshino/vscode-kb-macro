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
        it('should replace every selected range with a text', async () => {
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
        it('should delete left-hand side characters and insert a text with multi-cursor', async () => {
            setSelections([[10, 4], [11, 4]]);
            await internalCommands.performType({ deleteLeft: 2, text: 'CDEFG' });

            assert.strictEqual(textEditor.document.lineAt(10).text, 'abCDEFG');
            assert.strictEqual(textEditor.document.lineAt(11).text, 'abCDEFG');
            assert.deepStrictEqual(getSelections(), [[10, 7], [11, 7]]);
        });
        // TODO: add more tests with 'deleteLeft' option
    });

    describe('performCursorMotion (horizontal)', () => {
        before(async () => {
            await TestUtil.resetDocument(textEditor, (
                'abcde\n'.repeat(10) +
                'fghij klmno\n'.repeat(10) +
                'pqrstu vwxyz\n'.repeat(10)
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
    });
});
