'use strict';
const assert = require('assert');
const { addWhenContext, combineBaseKeybingings } = require('../../generator/gen_wrapper_util.js');

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
    describe('combineBaseKeybingings', () => {
        it('should create a combined list which consists of given keybindings list with additional context', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' },
                        { key: 'ctrl+b', command: 'command2', when: 'context1' }
                    ],
                    when: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+c', command: 'command3', when: 'context2 || context3' },
                        { key: 'ctrl+d', command: 'command4' }
                    ],
                    when: 'isLinux'
                },
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command1', when: 'isWindows' },
                { key: 'ctrl+b', command: 'command2', when: 'isWindows && context1' },
                { key: 'ctrl+c', command: 'command3', when: 'isLinux && context2 || isLinux && context3' },
                { key: 'ctrl+d', command: 'command4', when: 'isLinux' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        })
    });
});
