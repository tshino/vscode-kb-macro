'use strict';
const assert = require('assert');
const { CommandSequence } = require('../../src/command_sequence.js');

describe('CommandSequence', () => {
    describe('get', () => {
        it('should return current array of commands', () => {
            const seq = CommandSequence();
            const commands = seq.get();
            assert.deepStrictEqual(commands, []);
        });
    });
    describe('push', () => {
        it('should add new item', () => {
            const seq = CommandSequence();
            const COMMAND1 = { command: 'abc', args: { arg1: 'arg1' }};
            seq.push(COMMAND1);
            assert.deepStrictEqual(seq.get(), [ COMMAND1 ]);
        });
        it('should add multiple items', () => {
            const seq = CommandSequence();
            const COMMAND1 = { command: 'abc', args: { arg1: 'arg1' }};
            const COMMAND2 = { command: 'def', args: { arg2: 'arg2' }};
            seq.push(COMMAND1);
            seq.push(COMMAND2);
            assert.deepStrictEqual(seq.get(), [ COMMAND1, COMMAND2 ]);
        });
        it('should only retain latest N=maxLength items if specified', () => {
            const seq = CommandSequence({ maxLength: 5 });
            seq.push({ command: 'cmd1' });
            seq.push({ command: 'cmd2' });
            seq.push({ command: 'cmd3' });
            seq.push({ command: 'cmd4' });
            seq.push({ command: 'cmd5' });
            seq.push({ command: 'cmd6' });
            assert.strictEqual(seq.get().length, 5);
            assert.deepStrictEqual(seq.get()[0], { command: 'cmd2' });
            assert.deepStrictEqual(seq.get()[4], { command: 'cmd6' });
        });
    });
    describe('clear', () => {
        it('should discard all items pushed', () => {
            const seq = CommandSequence();
            seq.push({ command: 'abc', args: { arg1: 'arg1' }});
            seq.push({ command: 'def', args: { arg2: 'arg2' }});
            seq.clear();
            assert.deepStrictEqual(seq.get(), []);
        });
    });
    describe('optimize', () => {
        it('should retain unknown commands', () => {
            const seq = CommandSequence();
            const COMMAND1 = { command: 'abc', args: { arg1: 'arg1' }};
            const COMMAND2 = { command: 'def', args: { arg2: 'arg2' }};
            seq.push(COMMAND1);
            seq.push(COMMAND2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ COMMAND1, COMMAND2 ]);
        });
        it('should concatenate consecutive direct typing commands', () => {
            const TYPE1 = {
                command: '$type',
                args: { text: 'A' }
            };
            const TYPE2 = {
                command: '$type',
                args: { text: 'B' }
            };
            const TYPE3 = {
                command: '$type',
                args: { text: 'C' }
            };
            const TYPE123 = {
                command: '$type',
                args: { text: 'ABC' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.push(TYPE3);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE123 ]);
        });
        it('should not modify input objects (1: consucutive typing)', () => {
            const TYPE1 = { command: '$type', args: { text: 'A' } };
            const TYPE2 = { command: '$type', args: { text: 'B' } };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ { command: '$type', args: { text: 'AB' } } ]);
            assert.deepStrictEqual(TYPE1, { command: '$type', args: { text: 'A' } });
            assert.deepStrictEqual(TYPE2, { command: '$type', args: { text: 'B' } });
        });
        it('should not concatenate direct typing commands with deleting (1)', () => {
            const TYPE1 = {
                command: '$type',
                args: { text: 'X' }
            };
            const TYPE2 = {
                command: '$type',
                args: { deleteLeft: 2, text: 'ABC' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE1, TYPE2 ]);
        });
        it('should not concatenate direct typing commands with deleting (2)', () => {
            const TYPE1 = {
                command: '$type',
                args: { text: 'X' }
            };
            const TYPE2 = {
                command: '$type',
                args: { deleteRight: 2, text: 'ABC' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE1, TYPE2 ]);
        });
        it('should concatenate direct typing followed by another typing with deleting to the left', () => {
            const TYPE1 = {
                command: '$type',
                args: { text: 'a' }
            };
            const TYPE2 = {
                command: '$type',
                args: { text: 'b' }
            };
            const TYPE3 = {
                command: '$type',
                args: { deleteLeft: 2, text: 'ABC' }
            };
            const TYPE123 = {
                command: '$type',
                args: { text: 'ABC' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.push(TYPE3);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE123 ]);
        });
        it('should concatenate direct typing with deleting followed by another typing without deleting (1)', () => {
            const TYPE1 = {
                command: '$type',
                args: { deleteLeft: 1, text: 'a' }
            };
            const TYPE2 = {
                command: '$type',
                args: { text: 'b' }
            };
            const TYPE12 = {
                command: '$type',
                args: { deleteLeft: 1, text: 'ab' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE12 ]);
        });
        it('should concatenate direct typing with deleting followed by another typing without deleting (2)', () => {
            const TYPE1 = {
                command: '$type',
                args: { deleteRight: 1, text: 'a' }
            };
            const TYPE2 = {
                command: '$type',
                args: { text: 'b' }
            };
            const TYPE12 = {
                command: '$type',
                args: { deleteRight: 1, text: 'ab' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE12 ]);
        });
        it('should remove a pair of cursor motion that results no effect', () => {
            const MOVE1 = {
                command: '$moveCursor',
                args: { characterDelta: -3 }
            };
            const MOVE2 = {
                command: '$moveCursor',
                args: { characterDelta: 3 }
            };
            const seq = CommandSequence();
            seq.push(MOVE1);
            seq.push(MOVE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), []);
        });
        it('should not modify input objects (2: pair of cursor motion)', () => {
            const MOVE1 = { command: '$moveCursor', args: { characterDelta: -3 } };
            const MOVE2 = { command: '$moveCursor', args: { characterDelta: 3 } };
            const seq = CommandSequence();
            seq.push(MOVE1);
            seq.push(MOVE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), []);
            assert.deepStrictEqual(MOVE1, { command: '$moveCursor', args: { characterDelta: -3 } });
            assert.deepStrictEqual(MOVE2, { command: '$moveCursor', args: { characterDelta: 3 } });
        });
        it('should retain consecutive cursor motions that have vertical motion', () => {
            const MOVE1 = {
                command: '$moveCursor',
                args: { characterDelta: -3, lineDelta: -1 }
            };
            const MOVE2 = {
                command: '$moveCursor',
                args: { characterDelta: 3, lineDelta: 1 }
            };
            const seq = CommandSequence();
            seq.push(MOVE1);
            seq.push(MOVE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ MOVE1, MOVE2 ]);
        });
        it('should retain consecutive cursor motions that have selectionLength', () => {
            const MOVE1 = {
                command: '$moveCursor',
                args: { characterDelta: -3 }
            };
            const MOVE2 = {
                command: '$moveCursor',
                args: { characterDelta: 3, selectionLength: 5 }
            };
            const seq = CommandSequence();
            seq.push(MOVE1);
            seq.push(MOVE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ MOVE1, MOVE2 ]);
        });
        it('should retain consecutive cursor motions that include splitting motion', () => {
            const MOVE1 = {
                command: '$moveCursor',
                args: { characterDelta: [ 1, 2 ] }
            };
            const MOVE2 = {
                command: '$moveCursor',
                args: { characterDelta: -1 }
            };
            const seq = CommandSequence();
            seq.push(MOVE1);
            seq.push(MOVE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ MOVE1, MOVE2 ]);
        });
        it('should retain consecutive cursor motions that include group motion', () => {
            const MOVE1 = {
                command: '$moveCursor',
                args: { characterDelta: 2, groupSize: 2 }
            };
            const MOVE2 = {
                command: '$moveCursor',
                args: { characterDelta: -2 }
            };
            const seq = CommandSequence();
            seq.push(MOVE1);
            seq.push(MOVE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ MOVE1, MOVE2 ]);
        });
        it('should combine cursor motion to the left and successive typing with deleting to the right', () => {
            const INPUT = [
                {
                    command: '$moveCursor',
                    args: { characterDelta: -1 }
                },
                {
                    command: '$type',
                    args: { deleteRight: 1, text: 'a' }
                }
            ];
            const EXPECTED = {
                command: '$type',
                args: { deleteLeft: 1, text: 'a' }
            };
            const seq = CommandSequence();
            seq.push(INPUT[0]);
            seq.push(INPUT[1]);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ EXPECTED ]);
        });
        it('should not modify input objects (3: cursor motion followed by deleting and typing)', () => {
            const INPUT = [
                { command: '$moveCursor', args: { characterDelta: -1 } },
                { command: '$type', args: { deleteRight: 1, text: 'a' } }
            ];
            const EXPECTED = { command: '$type', args: { deleteLeft: 1, text: 'a' } };
            const seq = CommandSequence();
            seq.push(INPUT[0]);
            seq.push(INPUT[1]);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ EXPECTED ]);
            assert.deepStrictEqual(INPUT[0], { command: '$moveCursor', args: { characterDelta: -1 } });
            assert.deepStrictEqual(INPUT[1], { command: '$type', args: { deleteRight: 1, text: 'a' } });
        });
        it('should shrink three commands into one', () => {
            const INPUT = [
                {
                    command: '$type',
                    args: { text: '()' }
                },
                {
                    command: '$moveCursor',
                    args: { characterDelta: -1 }
                },
                {
                    command: '$type',
                    args: { deleteRight: 1, text: ')' }
                }
            ];
            const EXPECTED = [
                {
                    command: '$type',
                    args: { text: '()' }
                }
            ];
            const seq = CommandSequence();
            for (const cmd of INPUT) {
                seq.push(cmd);
            }
            seq.optimize();
            assert.deepStrictEqual(seq.get(), EXPECTED);
        });
    });
});
