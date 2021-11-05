'use strict';
const assert = require('assert');
const { addWhenContext } = require('../../generator/gen_wrapper_util.js');

describe('gen_wrapper_util', () => {
    describe('addWhenContext', () => {
        it('should return given context if when clause is empty', () => {
            assert.strictEqual(addWhenContext('', 'context'), 'context');
        });
        it('should return given context even if when clause is undefined', () => {
            assert.strictEqual(addWhenContext(undefined, 'context'), 'context');
        });
        it('should append AND condition in front of given when clause (1)', () => {
            assert.strictEqual(addWhenContext('when-clause', 'context'), 'context && when-clause');
        });
        it('should append AND condition in front of given when clause (2)', () => {
            assert.strictEqual(addWhenContext('cond1 && cond2', 'context'), 'context && cond1 && cond2');
        });
        it('should append AND condition in front of given when clause (3)', () => {
            assert.strictEqual(addWhenContext('cond1 || cond2', 'context'), 'context && cond1 || context && cond2');
        });
    });
});
