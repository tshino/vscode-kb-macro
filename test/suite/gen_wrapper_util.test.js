'use strict';
const assert = require('assert');
const genWrapperUtil = require('../../generator/gen_wrapper_util.js');

describe('gen_wrapper_util', () => {
    describe('addWhenContext', () => {
        const addWhenContext = genWrapperUtil.addWhenContext;
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
    describe('keybindingsContains', () => {
        const keybindingsContains = genWrapperUtil.keybindingsContains;
        it('should detect specified keybinding in given keybindings and return the index', () => {
            const keybindings = [
                { key: 'ctrl+a', command: 'command1' },
                { key: 'ctrl+a', command: 'command2' },
                { key: 'ctrl+b', command: 'command2' },
                { key: 'ctrl+b', command: 'command2', when: 'context1' },
                { key: 'ctrl+b', command: 'command2', when: 'context2' },
                { key: 'ctrl+b', command: 'command2', args: { opt1: 1 } },
                { key: 'ctrl+b', command: 'command2', args: { opt1: 2 } }
            ];
            assert.strictEqual(
                keybindingsContains(keybindings, { key: 'ctrl+a', command: 'command2' }),
                1
            );
            assert.strictEqual(
                keybindingsContains(keybindings, { key: 'ctrl+b', command: 'command2', when: 'context1' }),
                3
            );
            assert.strictEqual(
                keybindingsContains(keybindings, { key: 'ctrl+b', command: 'command2', args: { opt1: 2 } }),
                6
            );
            assert.strictEqual(
                keybindingsContains(keybindings, { key: 'ctrl+c', command: 'command2' }),
                -1
            );
        });
    });
    describe('combineBaseKeybingings', () => {
        const combineBaseKeybingings = genWrapperUtil.combineBaseKeybingings;
        it('should create a combined keybindings which consists of given set of keybindings with added context', () => {
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
                        { key: 'ctrl+c', command: 'command3' },
                        { key: 'ctrl+d', command: 'command4', when: 'context2 || context3' }
                    ],
                    when: 'isLinux'
                },
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command1', when: 'isWindows' },
                { key: 'ctrl+b', command: 'command2', when: 'isWindows && context1' },
                { key: 'ctrl+c', command: 'command3', when: 'isLinux' },
                { key: 'ctrl+d', command: 'command4', when: 'isLinux && context2 || isLinux && context3' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should retain keybindings that share a common key but have different commands or when-clause', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' },
                        { key: 'ctrl+a', command: 'command2' },
                    ],
                    when: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command3' },
                        { key: 'ctrl+a', command: 'command3', when: 'context1' }
                    ],
                    when: 'isLinux'
                },
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command1', when: 'isWindows' },
                { key: 'ctrl+a', command: 'command2', when: 'isWindows' },
                { key: 'ctrl+a', command: 'command3', when: 'isLinux' },
                { key: 'ctrl+a', command: 'command3', when: 'isLinux && context1' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should unify keybindings that share a common definition among all sources', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' }, // <= common
                        { key: 'ctrl+a', command: 'command2' }
                    ],
                    when: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' }, // <= common
                        { key: 'ctrl+a', command: 'command1', when: 'context1' }
                    ],
                    when: 'isLinux'
                },
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command1' }, // <= common
                { key: 'ctrl+a', command: 'command2', when: 'isWindows' },
                { key: 'ctrl+a', command: 'command1', when: 'isLinux && context1' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should ratain original order of keybindings for each source', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1', when: 'cond1' }, // <= common
                        { key: 'ctrl+a', command: 'command2', when: 'cond2' }
                    ],
                    when: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command3', when: 'cond3' },
                        { key: 'ctrl+a', command: 'command1', when: 'cond1' } // <= common
                    ],
                    when: 'isLinux'
                },
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command3', when: 'isLinux && cond3' },
                { key: 'ctrl+a', command: 'command1', when: 'cond1' }, // <= common
                { key: 'ctrl+a', command: 'command2', when: 'isWindows && cond2' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
    });
});
