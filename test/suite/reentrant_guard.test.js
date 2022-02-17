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
        it('should prevent other functions from calling concurrently', async () => {
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
        it('should print error message on exception', async () => {
            const target = function() {
                logs.push('will throw');
                throw 'error!';
            };
            const old = reentrantGuard.setPrintError(error => {
                logs.push('error: ' + error);
            });
            try {
                const func = makeGuardedCommand(target);
                logs.push('before call');
                await func();
                logs.push('after call');
                assert.deepStrictEqual(logs, [
                    'before call',
                    'will throw',
                    'error: error!',
                    'after call'
                ]);
            } finally {
                reentrantGuard.setPrintError(old);
            }
        });
    });
    describe('makeGuardedCommandSync', () => {
        const makeGuardedCommandSync = reentrantGuard.makeGuardedCommandSync;
        const logs = [];
        beforeEach(() => {
            logs.length = 0;
        });
        it('should return a non-async function', async () => {
            const func = makeGuardedCommandSync(() => {});
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'Function');
        });
        it('should return a function that invokes the given function', async () => {
            const target = function() {
                logs.push('hello');
            };
            const func = makeGuardedCommandSync(target);
            assert.deepStrictEqual(logs, []);
            func();
            assert.deepStrictEqual(logs, [ 'hello' ]);
            func();
            assert.deepStrictEqual(logs, [ 'hello', 'hello' ]);
        });
        it('should return a function that passes arguments to the given function', async () => {
            const target = function(arg) {
                logs.push('hello ' + arg);
            };
            const func = makeGuardedCommandSync(target);
            func('world');
            assert.deepStrictEqual(logs, [ 'hello world' ]);
        });
        it('should prevent the function from interrupting other guarded functions', async () => {
            const asyncTarget = async function() {
                logs.push('hello async');
                await TestUtil.sleep(10);
                logs.push('bye async');
            };
            const syncTarget = async function() {
                logs.push('hello sync');
            };
            const func1 = reentrantGuard.makeGuardedCommand(asyncTarget);
            const func2 = makeGuardedCommandSync(syncTarget);
            logs.push('before concurrent call');
            const promise1 = func1();
            func2();
            await promise1;
            logs.push('after concurrent call');
            func2();
            logs.push('after third call');
            assert.deepStrictEqual(logs, [
                'before concurrent call',
                'hello async',
                'bye async',
                'after concurrent call',
                'hello sync',
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
            const func = makeGuardedCommandSync(target);
            logs.push('before call');
            func(0);
            func(1);
            logs.push('after call');
            assert.deepStrictEqual(logs, [
                'before call',
                'will throw',
                'will not throw',
                'after call'
            ]);
        });
        it('should print error message on exception', async () => {
            const target = function() {
                logs.push('will throw');
                throw 'error!';
            };
            const old = reentrantGuard.setPrintError(error => {
                logs.push('error: ' + error);
            });
            try {
                const func = makeGuardedCommandSync(target);
                logs.push('before call');
                func();
                logs.push('after call');
                assert.deepStrictEqual(logs, [
                    'before call',
                    'will throw',
                    'error: error!',
                    'after call'
                ]);
            } finally {
                reentrantGuard.setPrintError(old);
            }
        });
    });
    describe('makeQueueableCommand', () => {
        const makeQueueableCommand = reentrantGuard.makeQueueableCommand;
        const logs = [];
        beforeEach(() => {
            logs.length = 0;
        });
        it('should return an async function', async () => {
            const func = makeQueueableCommand(() => {});
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'AsyncFunction');
        });
        it('should return a function that invokes the given function', async () => {
            const target = function() {
                logs.push('hello');
            };
            const func = makeQueueableCommand(target);
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
            const func = makeQueueableCommand(target);
            await func('world');
            assert.deepStrictEqual(logs, [ 'hello world' ]);
        });
        it('should return a function that invokes the given async function', async () => {
            const asyncTarget = async function() {
                logs.push('hello');
                await TestUtil.sleep(10);
                logs.push('bye');
            };
            const func = makeQueueableCommand(asyncTarget);
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
        it('should enqueue and serialize invocation of the function', async () => {
            const asyncTarget = async function(arg) {
                logs.push('hello ' + arg);
                await TestUtil.sleep(10);
                logs.push('bye');
            };
            const func = makeQueueableCommand(asyncTarget);
            logs.push('before concurrent call');
            const promise1 = func('1');
            const promise2 = func('2');
            assert.strictEqual(reentrantGuard.getQueueLength(), 1);
            await Promise.all([promise1, promise2]);
            logs.push('after concurrent call');
            assert.strictEqual(reentrantGuard.getQueueLength(), 0);
            await func('3');
            logs.push('after third call');
            assert.strictEqual(reentrantGuard.getQueueLength(), 0);
            assert.deepStrictEqual(logs, [
                'before concurrent call',
                'hello 1',
                'bye',
                'hello 2',
                'bye',
                'after concurrent call',
                'hello 3',
                'bye',
                'after third call'
            ]);
        });
        it('should not enqueue over queueSize if specified', async () => {
            const asyncTarget = async function(arg) {
                logs.push('hello ' + arg);
                await TestUtil.sleep(10);
                logs.push('bye');
            };
            const func = makeQueueableCommand(asyncTarget, { queueSize: 3 });
            logs.push('before concurrent call');
            const promise1 = func('1');
            const promise2 = func('2');
            const promise3 = func('3');
            const promise4 = func('4');
            const promise5 = func('5');
            assert.strictEqual(reentrantGuard.getQueueLength(), 3);
            await Promise.all([promise1, promise2, promise3, promise4, promise5]);
            logs.push('after concurrent call');
            await func('6');
            logs.push('after last call');
            assert.strictEqual(reentrantGuard.getQueueLength(), 0);
            assert.deepStrictEqual(logs, [
                'before concurrent call',
                'hello 1',
                'bye',
                'hello 2',
                'bye',
                'hello 3',
                'bye',
                'hello 4',
                'bye',
                'after concurrent call',
                'hello 6',
                'bye',
                'after last call'
            ]);
        });
        it('should prevent queueable function from interrupting guarded functions', async () => {
            const asyncTarget = async function(arg) {
                logs.push('hello ' + arg);
                await TestUtil.sleep(10);
                logs.push('bye');
            };
            const guarded = reentrantGuard.makeGuardedCommand(asyncTarget);
            const queueable = makeQueueableCommand(asyncTarget);
            logs.push('before concurrent call');
            const promise1 = guarded('guarded');
            const promise2 = queueable('queueable');
            assert.strictEqual(reentrantGuard.getQueueLength(), 0);
            await Promise.all([promise1, promise2]);
            logs.push('after concurrent call');
            assert.strictEqual(reentrantGuard.getQueueLength(), 0);
            assert.deepStrictEqual(logs, [
                'before concurrent call',
                'hello guarded',
                'bye',
                'after concurrent call'
            ]);
        });
        it('should prevent guarded function from interrupting queueable functions', async () => {
            const asyncTarget = async function(arg) {
                logs.push('hello ' + arg);
                await TestUtil.sleep(10);
                logs.push('bye');
            };
            const guarded = reentrantGuard.makeGuardedCommand(asyncTarget);
            const queueable = makeQueueableCommand(asyncTarget);
            logs.push('before concurrent call');
            const promise1 = queueable('queueable');
            const promise2 = guarded('guarded');
            assert.strictEqual(reentrantGuard.getQueueLength(), 0);
            await Promise.all([promise1, promise2]);
            logs.push('after concurrent call');
            assert.strictEqual(reentrantGuard.getQueueLength(), 0);
            assert.deepStrictEqual(logs, [
                'before concurrent call',
                'hello queueable',
                'bye',
                'after concurrent call'
            ]);
        });
        it('should prevent the function from leaking exceptions', async () => {
            const old = reentrantGuard.setPrintError(error => {
                logs.push('error: ' + error);
            });
            try {
                const willThrow = makeQueueableCommand(function() {
                    logs.push('will throw');
                    throw 'error';
                });
                const wontThrow = makeQueueableCommand(function() {
                    logs.push('will not throw');
                });
                logs.push('before call');
                await willThrow();
                await wontThrow();
                logs.push('after call');
                assert.deepStrictEqual(logs, [
                    'before call',
                    'will throw',
                    'error: error',
                    'will not throw',
                    'after call'
                ]);
            } finally {
                reentrantGuard.setPrintError(old);
            }
        });
        it('should invoke queued function even if another queued function threw exception (1)', async () => {
            const old = reentrantGuard.setPrintError(error => {
                logs.push('error: ' + error);
            });
            try {
                const willThrow = makeQueueableCommand(async function() {
                    logs.push('will throw...');
                    await TestUtil.sleep(10);
                    logs.push('will throw now');
                    throw 'error';
                });
                const wontThrow = makeQueueableCommand(async function() {
                    logs.push('will not throw');
                });
                logs.push('before concurrent call');
                const promise1 = willThrow();
                const promise2 = wontThrow();
                await Promise.all([promise1, promise2]);
                logs.push('after concurrent call');
                assert.deepStrictEqual(logs, [
                    'before concurrent call',
                    'will throw...',
                    'will throw now',
                    'error: error',
                    'will not throw',
                    'after concurrent call'
                ]);
            } finally {
                reentrantGuard.setPrintError(old);
            }
        });
        it('should invoke queued function even if another queued function threw exception (2)', async () => {
            const old = reentrantGuard.setPrintError(error => {
                logs.push('error: ' + error);
            });
            try {
                const wontThrow1 = makeQueueableCommand(async function() {
                    logs.push('will not throw (1) begin');
                    await TestUtil.sleep(10);
                    logs.push('will not throw (1) end');
                });
                const willThrow = makeQueueableCommand(async function() {
                    logs.push('will throw...');
                    await TestUtil.sleep(10);
                    logs.push('will throw now');
                    throw 'error';
                });
                const wontThrow2 = makeQueueableCommand(async function() {
                    logs.push('will not throw (2)');
                });
                logs.push('before concurrent call');
                const promise1 = wontThrow1();
                const promise2 = willThrow();
                await promise1;
                const promise3 = wontThrow2();
                await Promise.all([promise2, promise3]);
                logs.push('after concurrent call');
                assert.deepStrictEqual(logs, [
                    'before concurrent call',
                    'will not throw (1) begin',
                    'will not throw (1) end',
                    'will throw...',
                    'will throw now',
                    'error: error',
                    'will not throw (2)',
                    'after concurrent call'
                ]);
            } finally {
                reentrantGuard.setPrintError(old);
            }
        });
        it('should finish each call when it ends its actual execution', async () => {
            const asyncTarget = async function(arg) {
                await TestUtil.sleep(10);
                logs.push('hello ' + arg);
                await TestUtil.sleep(10);
                logs.push('bye');
            };
            const func = makeQueueableCommand(asyncTarget);
            logs.push('before concurrent call');
            const promise1 = func('1');
            const promise2 = func('2');
            const promise3 = func('3');
            assert.strictEqual(reentrantGuard.getQueueLength(), 2);
            await promise1;
            logs.push('after await 1');
            await promise2;
            logs.push('after await 2');
            await promise3;
            logs.push('after await 3');
            assert.strictEqual(reentrantGuard.getQueueLength(), 0);
            assert.deepStrictEqual(logs, [
                'before concurrent call',
                'hello 1',
                'bye',
                'after await 1',
                'hello 2',
                'bye',
                'after await 2',
                'hello 3',
                'bye',
                'after await 3'
            ]);
        });
    });
});
