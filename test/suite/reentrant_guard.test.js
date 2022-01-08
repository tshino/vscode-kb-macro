'use strict';
const assert = require('assert');
const reentrantGuard = require('../../src/reentrant_guard.js');
const { TestUtil } = require('./test_util.js');

describe('reentrantGuard', () => {
    describe('makeGuardedCommand', () => {
        const makeGuardedCommand = reentrantGuard.makeGuardedCommand;
        const logs = [];
        beforeEach(() => {
            logs.length = 0;
        });
        it('should return an async function', async () => {
            const func = makeGuardedCommand(() => {});
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'AsyncFunction');
        });
        it('should return a function that invokes the given function', async () => {
            const target = function() {
                logs.push('hello');
            };
            const func = makeGuardedCommand(target);
            assert.deepStrictEqual(logs, []);
            await func();
            assert.deepStrictEqual(logs, [ 'hello' ]);
            await func();
            assert.deepStrictEqual(logs, [ 'hello', 'hello' ]);
        });
        it('should return a function that passes arguments to the given function', async () => {
            const target = function(arg) {
                logs.push('hello ' + arg);
            };
            const func = makeGuardedCommand(target);
            await func('world');
            assert.deepStrictEqual(logs, [ 'hello world' ]);
        });
        it('should return a function that invokes the given async function', async () => {
            const asyncTarget = async function() {
                logs.push('hello');
                await TestUtil.sleep(10);
                logs.push('bye');
            };
            const func = makeGuardedCommand(asyncTarget);
            logs.push('before call');
            await func();
            logs.push('after call');
            assert.deepStrictEqual(logs, [
                'before call',
                'hello',
                'bye',
                'after call'
            ]);
        });
        it('should prevent the function from reentry', async () => {
            const asyncTarget = async function() {
                logs.push('hello');
                await TestUtil.sleep(10);
                logs.push('bye');
            };
            const func = makeGuardedCommand(asyncTarget);
            logs.push('before concurrent call');
            const promise1 = func();
            const promise2 = func();
            await Promise.all([promise1, promise2]);
            logs.push('after concurrent call');
            await func();
            logs.push('after third call');
            assert.deepStrictEqual(logs, [
                'before concurrent call',
                'hello',
                'bye',
                'after concurrent call',
                'hello',
                'bye',
                'after third call'
            ]);
        });
        it('should prevent different functions from calling concurrently', async () => {
            const asyncTarget1 = async function() {
                logs.push('hello 1');
                await TestUtil.sleep(10);
                logs.push('bye 1');
            };
            const asyncTarget2 = async function() {
                logs.push('hello 2');
                await TestUtil.sleep(10);
                logs.push('bye 2');
            };
            const func1 = makeGuardedCommand(asyncTarget1);
            const func2 = makeGuardedCommand(asyncTarget2);
            logs.push('before concurrent call');
            const promise1 = func1();
            const promise2 = func2();
            await Promise.all([promise1, promise2]);
            logs.push('after concurrent call');
            await func2();
            logs.push('after third call');
            assert.deepStrictEqual(logs, [
                'before concurrent call',
                'hello 1',
                'bye 1',
                'after concurrent call',
                'hello 2',
                'bye 2',
                'after third call'
            ]);
        });
        it('should prevent the function from leaking exceptions', async () => {
            const target = function(arg) {
                if (arg === 0) {
                    logs.push('will throw');
                    throw 'error';
                } else {
                    logs.push('will not throw');
                }
            };
            const func = makeGuardedCommand(target);
            logs.push('before call');
            await func(0);
            await func(1);
            logs.push('after call');
            assert.deepStrictEqual(logs, [
                'before call',
                'will throw',
                'will not throw',
                'after call'
            ]);
        });
    });
    // TODO: add test for makeGuardedCommandSync
});
