'use strict';
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');

describe('util', () => {
    const Selection = (l1,c1,l2,c2) => new vscode.Selection(l1,c1,l2,c2);

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
});
