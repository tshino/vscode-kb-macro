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
                command: 'internal:performType',
                args: { text: 'A' }
            };
            const TYPE2 = {
                command: 'internal:performType',
                args: { text: 'B' }
            };
            const TYPE3 = {
                command: 'internal:performType',
                args: { text: 'C' }
            };
            const TYPE123 = {
                command: 'internal:performType',
                args: { text: 'ABC' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.push(TYPE3);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE123 ]);
        });
        it('should not concatenate direct typing commands with deleting', () => {
            const TYPE1 = {
                command: 'internal:performType',
                args: { text: 'X' }
            };
            const TYPE2 = {
                command: 'internal:performType',
                args: { deleteLeft: 2, text: 'ABC' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE1, TYPE2 ]);
        });
        it('should concatenate direct typing followed by another typing with deleting', () => {
            const TYPE1 = {
                command: 'internal:performType',
                args: { text: 'a' }
            };
            const TYPE2 = {
                command: 'internal:performType',
                args: { text: 'b' }
            };
            const TYPE3 = {
                command: 'internal:performType',
                args: { deleteLeft: 2, text: 'ABC' }
            };
            const TYPE123 = {
                command: 'internal:performType',
                args: { text: 'ABC' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.push(TYPE3);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE123 ]);
        });
        it('should concatenate direct typing with deleting followed by another typing without deleting', () => {
            const TYPE1 = {
                command: 'internal:performType',
                args: { deleteLeft: 1, text: 'a' }
            };
            const TYPE2 = {
                command: 'internal:performType',
                args: { text: 'b' }
            };
            const TYPE12 = {
                command: 'internal:performType',
                args: { deleteLeft: 1, text: 'ab' }
            };
            const seq = CommandSequence();
            seq.push(TYPE1);
            seq.push(TYPE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ TYPE12 ]);
        });
        it('should remove a pair of cursor motion that results no effect', () => {
            const MOVE1 = {
                command: 'internal:performCursorMotion',
                args: { characterDelta: -3 }
            };
            const MOVE2 = {
                command: 'internal:performCursorMotion',
                args: { characterDelta: 3 }
            };
            const seq = CommandSequence();
            seq.push(MOVE1);
            seq.push(MOVE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), []);
        });
        it('should retain consecutive cursor motions that have vertical motion', () => {
            const MOVE1 = {
                command: 'internal:performCursorMotion',
                args: { characterDelta: -3, lineDelta: -1 }
            };
            const MOVE2 = {
                command: 'internal:performCursorMotion',
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
                command: 'internal:performCursorMotion',
                args: { characterDelta: -3 }
            };
            const MOVE2 = {
                command: 'internal:performCursorMotion',
                args: { characterDelta: 3, selectionLength: 5 }
            };
            const seq = CommandSequence();
            seq.push(MOVE1);
            seq.push(MOVE2);
            seq.optimize();
            assert.deepStrictEqual(seq.get(), [ MOVE1, MOVE2 ]);
        });
    });
});
