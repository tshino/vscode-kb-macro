'use strict';
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');

describe('util', () => {
    const Selection = (l1,c1,l2,c2) => new vscode.Selection(l1,c1,l2,c2);
    const Range = (l1,c1,l2,c2) => new vscode.Range(l1,c1,l2,c2);

    describe('isEqualSelections', () => {
        it('should return true if two selections are equal (1)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3) ];
            const sel2 = [ Selection(0, 1, 2, 3) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), true);
        });
        it('should return true if two selections are equal (2)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];
            const sel2 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), true);
        });
        it('should return false if two selections are different (1)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3) ];
            const sel2 = [ Selection(0, 1, 2, 4) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
        it('should return false if two selections are different (2)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];
            const sel2 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 5) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
        it('should return false if two selections are different in length (1)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3) ];
            const sel2 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
        it('should return false if two selections are different in length (2)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];
            const sel2 = [ Selection(0, 1, 2, 3) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
        it('should return false if two selections are different even if they are equal as ranges', async () => {
            const sel1 = [ Selection(0, 1, 2, 3) ];
            const sel2 = [ Selection(2, 3, 0, 1) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
    });
    describe('sortSelections', () => {
        it('should return copy of given selections', async () => {
            const input = [ Selection(1, 2, 3, 4) ];
            const result = util.sortSelections(input);
            assert.notStrictEqual(result, input);
        });
        it('should sort selections in ascending order', async () => {
            const input = [
                Selection(2, 1, 2, 1),
                Selection(3, 2, 3, 2),
                Selection(1, 2, 1, 2)
            ];
            const result = util.sortSelections(input);
            const expected = [
                Selection(1, 2, 1, 2),
                Selection(2, 1, 2, 1),
                Selection(3, 2, 3, 2)
            ];
            assert.deepStrictEqual(result, expected);
        });
    });
    describe('makeIndexOfSortedSelections', () => {
        it('should return an array of indices', async () => {
            const input = [ Selection(1, 2, 3, 4) ];
            const result = util.makeIndexOfSortedSelections(input);
            assert.deepStrictEqual(result, [0]);
        });
        it('should indices of sorted array', async () => {
            const input = [
                Selection(1, 1, 1, 1),
                Selection(3, 3, 3, 3),
                Selection(4, 4, 4, 4),
                Selection(2, 2, 2, 2)
            ];
            const result = util.makeIndexOfSortedSelections(input);
            assert.deepStrictEqual(result, [0, 3, 1, 2]);
        });
    });
    describe('makeSelectionsAfterTyping', () => {
        it('should calculate predicted locations where cursors should move to after typing', () => {
            const changes = [ { range: Range(3, 0, 3, 0), text: 'a' } ];
            const expected = [ Selection(3, 1, 3, 1) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (multiple characters)', () => {
            const changes = [ { range: Range(3, 0, 3, 0), text: 'abcde' } ];
            const expected = [ Selection(3, 5, 3, 5) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (multi-cursor)', () => {
            const changes = [
                { range: Range(3, 1, 3, 1), text: 'a' },
                { range: Range(4, 1, 4, 1), text: 'a' }
            ];
            const expected = [ Selection(3, 2, 3, 2), Selection(4, 2, 4, 2) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (multi-cursor in the same line)', () => {
            const changes = [
                { range: Range(3, 1, 3, 1), text: 'ab' },
                { range: Range(3, 5, 3, 5), text: 'ab' }
            ];
            const expected = [ Selection(3, 3, 3, 3), Selection(3, 9, 3, 9) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with a selection that contains line-breaks)', () => {
            const changes = [ { range: Range(12, 1, 14, 5), text: 'x' } ];
            const expected = [ Selection(12, 2, 12, 2) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with multiple selections)', () => {
            const changes = [
                { range: Range(12, 1, 12, 5), text: 'x' },
                { range: Range(13, 1, 13, 5), text: 'x' }
            ];
            const expected = [ Selection(12, 2, 12, 2), Selection(13, 2, 13, 2) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with multiple selections that contains line-breaks) (1)', () => {
            const changes = [
                { range: Range(12, 1, 14, 5), text: 'x' },
                { range: Range(15, 1, 16, 5), text: 'x' }
            ];
            const expected = [ Selection(12, 2, 12, 2), Selection(13, 2, 13, 2) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with multiple selections that contains line-breaks) (2)', () => {
            const changes = [
                { range: Range(12, 1, 14, 5), text: 'x' },
                { range: Range(14, 7, 16, 5), text: 'x' }
            ];
            const expected = [ Selection(12, 2, 12, 2), Selection(12, 5, 12, 5) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with multiple selections in a single line)', () => {
            const changes = [
                { range: Range(12, 1, 12, 3), text: 'x' },
                { range: Range(12, 6, 12, 8), text: 'x' }
            ];
            const expected = [ Selection(12, 2, 12, 2), Selection(12, 6, 12, 6) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
    });
});
