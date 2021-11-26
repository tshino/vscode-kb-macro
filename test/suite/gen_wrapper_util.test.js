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
    describe('combineBaseKeybingings', () => {
        const combineBaseKeybingings = genWrapperUtil.combineBaseKeybingings;
        it('should create a combined keybindings which consists of given set of keybindings with added context', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' },
                        { key: 'ctrl+b', command: 'command2', when: 'context1' }
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+c', command: 'command3' },
                        { key: 'ctrl+d', command: 'command4', when: 'context2 || context3' }
                    ],
                    context: 'isLinux'
                }
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
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command3' },
                        { key: 'ctrl+a', command: 'command3', when: 'context1' }
                    ],
                    context: 'isLinux'
                }
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command1', when: 'isWindows' },
                { key: 'ctrl+a', command: 'command2', when: 'isWindows' },
                { key: 'ctrl+a', command: 'command3', when: 'isLinux' },
                { key: 'ctrl+a', command: 'command3', when: 'isLinux && context1' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should unify keybindings that share a common definition among all sources [compaction]', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' }, // <= common
                        { key: 'ctrl+a', command: 'command2' }
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' }, // <= common
                        { key: 'ctrl+a', command: 'command1', when: 'context1' }
                    ],
                    context: 'isLinux'
                }
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command1' }, // <= common
                { key: 'ctrl+a', command: 'command2', when: 'isWindows' },
                { key: 'ctrl+a', command: 'command1', when: 'isLinux && context1' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should retain the original order of keybindings in each source', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1', when: 'cond1' }, // <= common
                        { key: 'ctrl+a', command: 'command2', when: 'cond2' } // should come after common one
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command3', when: 'cond3' }, // should come before common one
                        { key: 'ctrl+a', command: 'command1', when: 'cond1' } // <= common
                    ],
                    context: 'isLinux'
                }
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command3', when: 'isLinux && cond3' },
                { key: 'ctrl+a', command: 'command1', when: 'cond1' }, // <= common
                { key: 'ctrl+a', command: 'command2', when: 'isWindows && cond2' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should not unify keybindings that cause conflicts that prevent retaining the proper order', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1', when: 'cond1' }, // <= common I
                        { key: 'ctrl+a', command: 'command2', when: 'cond2' },
                        { key: 'ctrl+a', command: 'command3', when: 'cond3' } // <= common II
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command3', when: 'cond3' }, // <= common II
                        { key: 'ctrl+a', command: 'command1', when: 'cond1' } // <= common I
                    ],
                    context: 'isLinux'
                }
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command3', when: 'isLinux && cond3' },
                { key: 'ctrl+a', command: 'command1', when: 'cond1' }, // <= common I
                { key: 'ctrl+a', command: 'command2', when: 'isWindows && cond2' },
                { key: 'ctrl+a', command: 'command3', when: 'isWindows && cond3' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should unify keybindings that share a common definition among a subset of sources [compaction]', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' }, // <= partially common
                        { key: 'ctrl+a', command: 'command2' }
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' }, // <= partially common
                        { key: 'ctrl+a', command: 'command1', when: 'context1' }
                    ],
                    context: 'isLinux'
                },
                {
                    keybindings: [
                        { key: 'ctrl+b', command: 'command1', when: 'context1' }
                    ],
                    context: 'isMac'
                }
            ];
            // We use negative form of '!isMac' rather than OR form 'isWindows || isLinux'
            // for compaction of package.json.
            const expected = [
                { key: 'ctrl+a', command: 'command1', when: '!isMac' }, // <= partially common
                { key: 'ctrl+a', command: 'command2', when: 'isWindows' },
                { key: 'ctrl+a', command: 'command1', when: 'isLinux && context1' },
                { key: 'ctrl+b', command: 'command1', when: 'isMac && context1' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should unify keybindings that share a common definition among 2nd and 3rd source [compaction]', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' }
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command2' } // <= partially common
                    ],
                    context: 'isLinux'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command3' },
                        { key: 'ctrl+a', command: 'command2' } // <= partially common
                    ],
                    context: 'isMac'
                }
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command3', when: 'isMac' },
                { key: 'ctrl+a', command: 'command2', when: '!isWindows' }, // <= partially common
                { key: 'ctrl+a', command: 'command1', when: 'isWindows' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should drop reduntant "isWindows" if the keystroke contains Win key [compaction]', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+win+a', command: 'command1', when: 'context1' }
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+alt+a', command: 'command2', when: 'context2' }
                    ],
                    context: 'isLinux'
                }
            ];
            const expected = [
                { key: 'ctrl+win+a', command: 'command1', when: 'context1' },
                { key: 'ctrl+alt+a', command: 'command2', when: 'isLinux && context2' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should drop reduntant "isLinux" if the keystroke contains Meta key [compaction]', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1', when: 'context1' }
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'meta+a', command: 'command2', when: 'context2' }
                    ],
                    context: 'isLinux'
                }
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command1', when: 'isWindows && context1' },
                { key: 'meta+a', command: 'command2', when: 'context2' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should drop reduntant "isMac" if the keystroke contains Command key [compaction]', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1', when: 'context1' }
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'cmd+a', command: 'command2', when: 'context2' }
                    ],
                    context: 'isMac'
                }
            ];
            const expected = [
                { key: 'ctrl+a', command: 'command1', when: 'isWindows && context1' },
                { key: 'cmd+a', command: 'command2', when: 'context2' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should unify keybindings that are common for Windows and Linux and also Mac except assigned "key" (using "mac" key) (1) [compaction]', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1', when: 'context1' }, // <= common
                        { key: 'ctrl+a', command: 'command2', when: 'context2' }
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1', when: 'context1' }, // <= common
                        { key: 'ctrl+a', command: 'command1', when: 'context3' }
                    ],
                    context: 'isLinux'
                },
                {
                    keybindings: [
                        { key: 'ctrl+b', command: 'command2' },
                        { key: 'ctrl+b', command: 'command1', when: 'context1' } // <= common except 'key'
                    ],
                    context: 'isMac'
                }
            ];
            const expected = [
                { key: 'ctrl+b', command: 'command2', when: 'isMac' },
                { key: 'ctrl+a', command: 'command1', when: 'context1', mac: 'ctrl+b' }, // <= unified with 'mac' key
                { key: 'ctrl+a', command: 'command2', when: 'isWindows && context2' },
                { key: 'ctrl+a', command: 'command1', when: 'isLinux && context3' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should unify keybindings that are common for Windows and Linux and also Mac except assigned "key" (using "mac" key) (2) [compaction]', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1', when: 'context1' }, // <= common A
                        { key: 'ctrl+a', command: 'command2', when: 'context2' },
                        { key: 'ctrl+c', command: 'command3', when: 'context4' } // <= common B
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1', when: 'context1' }, // <= common A
                        { key: 'ctrl+a', command: 'command1', when: 'context3' },
                        { key: 'ctrl+c', command: 'command3', when: 'context4' } // <= common B
                    ],
                    context: 'isLinux'
                },
                {
                    keybindings: [
                        { key: 'ctrl+b', command: 'command2' },
                        { key: 'ctrl+b', command: 'command1', when: 'context1' }, // <= common A except 'key'
                        { key: 'ctrl+b', command: 'command3', when: 'context4' } // <= common B except 'key'
                    ],
                    context: 'isMac'
                }
            ];
            const expected = [
                { key: 'ctrl+b', command: 'command2', when: 'isMac' },
                { key: 'ctrl+a', command: 'command1', when: 'context1', mac: 'ctrl+b' }, // <= A
                { key: 'ctrl+c', command: 'command3', when: 'context4', mac: 'ctrl+b' }, // <= B
                { key: 'ctrl+a', command: 'command2', when: 'isWindows && context2' },
                { key: 'ctrl+a', command: 'command1', when: 'isLinux && context3' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
        it('should unify keybindings using "mac" key (special case that a same command applies to multiple keys) [compaction]', () => {
            const input = [
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' }, // <= common A
                        { key: 'ctrl+a', command: 'command2', when: 'context2' },
                        { key: 'ctrl+c', command: 'command1' } // <= common B
                    ],
                    context: 'isWindows'
                },
                {
                    keybindings: [
                        { key: 'ctrl+a', command: 'command1' }, // <= common A
                        { key: 'ctrl+a', command: 'command1', when: 'context3' },
                        { key: 'ctrl+c', command: 'command1' } // <= common B
                    ],
                    context: 'isLinux'
                },
                {
                    keybindings: [
                        { key: 'ctrl+b', command: 'command2' },
                        { key: 'ctrl+b', command: 'command1' }, // <= common A except 'key'
                        { key: 'ctrl+d', command: 'command1' } // <= common B except 'key'
                    ],
                    context: 'isMac'
                }
            ];
            const expected = [
                { key: 'ctrl+b', command: 'command2', when: 'isMac' },
                { key: 'ctrl+a', command: 'command1', mac: 'ctrl+b' }, // <= A
                { key: 'ctrl+c', command: 'command1', mac: 'ctrl+d' }, // <= B
                { key: 'ctrl+a', command: 'command2', when: 'isWindows && context2' },
                { key: 'ctrl+a', command: 'command1', when: 'isLinux && context3' }
            ];
            assert.deepStrictEqual(combineBaseKeybingings(input), expected);
        });
    });
});
