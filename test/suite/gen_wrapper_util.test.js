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
    describe('negateContext', () => {
        const negateContext = genWrapperUtil.negateContext;
        it('should append operator ! in front of given context', () => {
            assert.strictEqual(negateContext('c1'), '!c1');
        });
        it('should return "false" if given context is empty', () => {
            assert.strictEqual(negateContext(''), 'false');
        });
        it('should not use double negation (1)', () => {
            assert.strictEqual(negateContext('!c1'), 'c1');
        });
    });
    describe('copyKeybinding', () => {
        const copyKeybinding = genWrapperUtil.copyKeybinding;
        it('should clone keybinding object', () => {
            const input = { key: 'key1', command: 'cmd1' };
            const expected = { key: 'key1', command: 'cmd1' };
            assert.strictEqual(copyKeybinding(input) === expected, false);
            assert.deepStrictEqual(copyKeybinding(input), expected);
        });
        it('should clone keybinding object with optional field (1)', () => {
            const input = { key: 'key1', command: 'cmd1', when: 'when1' };
            const expected = { key: 'key1', command: 'cmd1', when: 'when1' };
            assert.deepStrictEqual(copyKeybinding(input), expected);
        });
        it('should clone keybinding object with optional field (2)', () => {
            const input = { key: 'key1', command: 'cmd1', args: 'arg1' };
            const expected = { key: 'key1', command: 'cmd1', args: 'arg1' };
            assert.deepStrictEqual(copyKeybinding(input), expected);
        });
        it('should clone keybinding object with optional field (3)', () => {
            const input = { key: 'key1', command: 'cmd1', mac: 'macKey1' };
            const expected = { key: 'key1', command: 'cmd1', mac: 'macKey1' };
            assert.deepStrictEqual(copyKeybinding(input), expected);
        });
        it('should clone keybinding object with optional field (4)', () => {
            const input = { key: 'key1', command: 'cmd1', linux: 'linuxKey1' };
            const expected = { key: 'key1', command: 'cmd1', linux: 'linuxKey1' };
            assert.deepStrictEqual(copyKeybinding(input), expected);
        });
        it('should clone keybinding object with optional field (5)', () => {
            const input = { key: 'key1', command: 'cmd1', win: 'winKey1' };
            const expected = { key: 'key1', command: 'cmd1', win: 'winKey1' };
            assert.deepStrictEqual(copyKeybinding(input), expected);
        });
    });
    describe('removeOSSpecificKeys', () => {
        const removeOSSpecificKeys = genWrapperUtil.removeOSSpecificKeys;
        it('should delete "mac", "linux", and "win" keys in given keybinding object', () => {
            const input = { key: 'key1', command: 'cmd1', win: 'win1', linux: 'linux1', mac: 'mac1' };
            const expected = { key: 'key1', command: 'cmd1' };
            removeOSSpecificKeys(input);
            assert.deepStrictEqual(input, expected);
        });
    });
    describe('extractOSSpecificKeys', () => {
        const extractOSSpecificKeys = genWrapperUtil.extractOSSpecificKeys;
        it('should return array of cloned given keybinding object', () => {
            const keybinding = { key: 'key1', command: 'cmd1', when: 'ctx1' };
            const result = extractOSSpecificKeys(keybinding);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0] === keybinding, false);
            assert.deepStrictEqual(result, [ keybinding ]);
        });
        it('should separate keybinding with "mac" key', () => {
            const input = { key: 'key1', mac: 'key2', command: 'cmd1' };
            const expected = [
                { key: 'key2', command: 'cmd1', when: 'isMac' },
                { key: 'key1', command: 'cmd1', when: '!isMac' }
            ];
            const result = extractOSSpecificKeys(input);
            assert.deepStrictEqual(result, expected);
        });
        it('should remove "mac" key if the value are equal to "key"', () => {
            const input = { key: 'key1', mac: 'key1', command: 'cmd1' };
            const expected = [
                { key: 'key1', command: 'cmd1' }
            ];
            const result = extractOSSpecificKeys(input);
            assert.deepStrictEqual(result, expected);
        });
        it('should separate keybinding with "linux" key', () => {
            const input = { key: 'key1', linux: 'key2', command: 'cmd1' };
            const expected = [
                { key: 'key2', command: 'cmd1', when: 'isLinux' },
                { key: 'key1', command: 'cmd1', when: '!isLinux' }
            ];
            const result = extractOSSpecificKeys(input);
            assert.deepStrictEqual(result, expected);
        });
        it('should remove "linux" key if the value are equal to "key"', () => {
            const input = { key: 'key1', linux: 'key1', command: 'cmd1' };
            const expected = [
                { key: 'key1', command: 'cmd1' }
            ];
            const result = extractOSSpecificKeys(input);
            assert.deepStrictEqual(result, expected);
        });
        it('should separate keybinding with "win" key', () => {
            const input = { key: 'key1', win: 'key2', command: 'cmd1' };
            const expected = [
                { key: 'key2', command: 'cmd1', when: 'isWindows' },
                { key: 'key1', command: 'cmd1', when: '!isWindows' }
            ];
            const result = extractOSSpecificKeys(input);
            assert.deepStrictEqual(result, expected);
        });
        it('should remove "win" key if the value are equal to "key"', () => {
            const input = { key: 'key1', win: 'key1', command: 'cmd1' };
            const expected = [
                { key: 'key1', command: 'cmd1' }
            ];
            const result = extractOSSpecificKeys(input);
            assert.deepStrictEqual(result, expected);
        });
        it('should remove all of "win", "linux", and "mac" keys if they are all the same to "key"', () => {
            const input = { key: 'key1', win: 'key1', linux: 'key1', mac: 'key1', command: 'cmd1' };
            const expected = [
                { key: 'key1', command: 'cmd1' }
            ];
            const result = extractOSSpecificKeys(input);
            assert.deepStrictEqual(result, expected);
        });
        it('should separate keybinding with "win" and "mac" keys', () => {
            const input = { key: 'key1', win: 'key2', mac: 'key3', command: 'cmd1' };
            const expected = [
                { key: 'key3', command: 'cmd1', when: 'isMac' },
                { key: 'key2', command: 'cmd1', when: 'isWindows' },
                { key: 'key1', command: 'cmd1', when: '!isMac && !isWindows' }
            ];
            const result = extractOSSpecificKeys(input);
            assert.deepStrictEqual(result, expected);
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
    // TODO: add tests for parseAwaitOption()
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
        it('should make wrapper keybinding (7) (with conditional awaitOption with negation)', () => {
            const input = {
                key: 'key1',
                command: 'command1',
                when: 'context1'
            };
            const awaitOption = 'await1 [!cond1]await2';
            const expected = [
                {
                    key: 'key1',
                    command: 'kb-macro.wrap',
                    args: {
                        command: 'command1',
                        "await": "await1 await2"
                    },
                    when: 'kb-macro.recording && !cond1 && context1'
                },
                {
                    key: 'key1',
                    command: 'kb-macro.wrap',
                    args: {
                        command: 'command1',
                        "await": "await1"
                    },
                    when: 'kb-macro.recording && cond1 && context1'
                }
            ];
            assert.deepStrictEqual(makeWrapper(input, awaitOption), expected);
        });
    });
});
