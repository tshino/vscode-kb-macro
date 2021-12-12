'use strict';
const assert = require('assert');
const genWrapperUtil = require('../../generator/gen_wrapper_util.js');

describe('gen_wrapper_util', () => {
    describe('addWhenContext', () => {
        const addWhenContext = genWrapperUtil.addWhenContext;
        it('should return given context if when clause is empty', () => {
            assert.strictEqual(addWhenContext('', 'context'), 'context');
        });
        it('should return given when clause if context is empty', () => {
            assert.strictEqual(addWhenContext('when-clause', ''), 'when-clause');
        });
        it('should return given context even if when clause is undefined', () => {
            assert.strictEqual(addWhenContext(undefined, 'context'), 'context');
        });
        it('should return empty string even if given context is undefined', () => {
            assert.strictEqual(addWhenContext(undefined, undefined), '');
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
        it('should combine two when clauses with AND operator (1)', () => {
            assert.strictEqual(addWhenContext('cond1', 'cond2 || cond3'), 'cond2 && cond1 || cond3 && cond1');
        });
        it('should combine two when clauses with AND operator (2)', () => {
            assert.strictEqual(addWhenContext('c1 || c2', 'c3 || c4'), 'c3 && c1 || c3 && c2 || c4 && c1 || c4 && c2');
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
    describe('isValidAwaitOption', () => {
        const isValidAwaitOption = genWrapperUtil.isValidAwaitOption;
        it('should return true if passed string is a valid await option for a wrapper', () => {
            assert.strictEqual(isValidAwaitOption('selection'), true);
            assert.strictEqual(isValidAwaitOption('document'), true);
            assert.strictEqual(isValidAwaitOption('clipboard'), true);
        });
        it('should return true on a valid await option with condition', () => {
            assert.strictEqual(isValidAwaitOption('[condition]selection'), true);
        });
        it('should return true on empty string', () => {
            assert.strictEqual(isValidAwaitOption(''), true);
        });
        it('should return false on string with invalid await target', () => {
            assert.strictEqual(isValidAwaitOption('hello'), false);
            assert.strictEqual(isValidAwaitOption('selection world'), false);
        });
        it('should return false on any value of types other than string', () => {
            assert.strictEqual(isValidAwaitOption(null), false);
            assert.strictEqual(isValidAwaitOption(), false);
            assert.strictEqual(isValidAwaitOption([]), false);
        });
        it('should return true on string with multiple valid await targets', () => {
            assert.strictEqual(isValidAwaitOption('document selection'), true);
            assert.strictEqual(isValidAwaitOption('selection clipboard'), true);
            assert.strictEqual(isValidAwaitOption('selection document clipboard'), true);
        });
        it('should return true on valid await items where one has a condition', () => {
            assert.strictEqual(isValidAwaitOption('[condition]document selection'), true);
        });
    });
    describe('decomposeAwaitOption', () => {
        const decomposeAwaitOption = genWrapperUtil.decomposeAwaitOption;
        it('should not modify unconditional await option', () => {
            const input = 'await1 await2';
            const expected = [
                { context: '', 'await': 'await1 await2' }
            ];
            assert.deepStrictEqual(decomposeAwaitOption(input), expected);
        });
        it('should separate conditional await option into unconditional ones', () => {
            const input = 'await1 [cond1]await2';
            const expected = [
                { context: 'cond1', 'await': 'await1 await2' },
                { context: '!cond1', 'await': 'await1' }
            ];
            assert.deepStrictEqual(decomposeAwaitOption(input), expected);
        });
    });
    describe('makeWrapperWhen', () => {
        const makeWrapperWhen = genWrapperUtil.makeWrapperWhen;
        it('should append recording context to the "when" field', () => {
            const input = { key: 'key1', command: 'command1', when: 'context1' };
            const expected = 'kb-macro.recording && context1';
            assert.strictEqual(makeWrapperWhen(input), expected);
        });
    });
    describe('makeWrapper', () => {
        const makeWrapper = genWrapperUtil.makeWrapper;
        it('should make wrapper keybinding for given base keybinding (1)', () => {
            const input = {
                key: 'key1',
                command: 'command1',
                when: 'context1'
            };
            const expected = [ {
                key: 'key1',
                command: 'kb-macro.wrap',
                args: {
                    command: 'command1'
                },
                when: 'kb-macro.recording && context1'
            } ];
            assert.deepStrictEqual(makeWrapper(input), expected);
        });
        it('should make wrapper keybinding (2) (with args for target command)', () => {
            const input = {
                key: 'key1',
                command: 'command1',
                args: { opt1: 'arg1' },
                when: 'context1'
            };
            const expected = [ {
                key: 'key1',
                command: 'kb-macro.wrap',
                args: {
                    command: 'command1',
                    args: { opt1: 'arg1' }
                },
                when: 'kb-macro.recording && context1'
            } ];
            assert.deepStrictEqual(makeWrapper(input), expected);
        });
        it('should make wrapper keybinding (3) (with "mac" key)', () => {
            const input = {
                key: 'key1',
                mac: 'key2',
                command: 'command1',
                when: 'context1'
            };
            const expected = [ {
                key: 'key1',
                mac: 'key2',
                command: 'kb-macro.wrap',
                args: {
                    command: 'command1'
                },
                when: 'kb-macro.recording && context1'
            } ];
            assert.deepStrictEqual(makeWrapper(input), expected);
        });
        it('should make wrapper keybinding (4) (with awaitOption)', () => {
            const input = {
                key: 'key1',
                command: 'command1',
                when: 'context1'
            };
            const awaitOption = 'await1 await2';
            const expected = [ {
                key: 'key1',
                command: 'kb-macro.wrap',
                args: {
                    command: 'command1',
                    "await": "await1 await2"
                },
                when: 'kb-macro.recording && context1'
            } ];
            assert.deepStrictEqual(makeWrapper(input, awaitOption), expected);
        });
        it('should make wrapper keybinding (5) (with conditional awaitOption)', () => {
            const input = {
                key: 'key1',
                command: 'command1',
                when: 'context1'
            };
            const awaitOption = '[cond1]await1';
            const expected = [
                {
                    key: 'key1',
                    command: 'kb-macro.wrap',
                    args: {
                        command: 'command1',
                        "await": 'await1'
                    },
                    when: 'kb-macro.recording && cond1 && context1'
                },
                {
                    key: 'key1',
                    command: 'kb-macro.wrap',
                    args: {
                        command: 'command1'
                    },
                    when: 'kb-macro.recording && !cond1 && context1'
                }
            ];
            assert.deepStrictEqual(makeWrapper(input, awaitOption), expected);
        });
        it('should make wrapper keybinding (6) (with conditional awaitOption)', () => {
            const input = {
                key: 'key1',
                command: 'command1',
                when: 'context1'
            };
            const awaitOption = 'await1 [cond1]await2';
            const expected = [
                {
                    key: 'key1',
                    command: 'kb-macro.wrap',
                    args: {
                        command: 'command1',
                        "await": "await1 await2"
                    },
                    when: 'kb-macro.recording && cond1 && context1'
                },
                {
                    key: 'key1',
                    command: 'kb-macro.wrap',
                    args: {
                        command: 'command1',
                        "await": "await1"
                    },
                    when: 'kb-macro.recording && !cond1 && context1'
                }
            ];
            assert.deepStrictEqual(makeWrapper(input, awaitOption), expected);
        });
    });
});
