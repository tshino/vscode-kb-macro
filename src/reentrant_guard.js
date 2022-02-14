'use strict';

const reentrantGuard = (function() {

    const state = {
        locked: false,
        queueable: false
    };
    const queue = [];

    let printError = defaultPrintError;
    function defaultPrintError(error) {
        console.error(error);
        console.info('kb-macro: Exception in guarded command');
    };
    const setPrintError = function(printErrorImpl) {
        const old = printError;
        printError = printErrorImpl;
        return old;
    };

    const makeGuardedCommand = function(body) {
        return async function(args) {
            if (state.locked) {
                return;
            }
            state.locked = true;
            try {
                await body(args);
            } catch (error) {
                printError(error);
            } finally {
                state.locked = false;
            }
        };
    };
    const makeGuardedCommandSync = function(func) {
        return function(args) {
            if (state.locked) {
                return;
            }
            state.locked = true;
            try {
                func(args);
            } catch (error) {
                printError(error);
            } finally {
                state.locked = false;
            }
        };
    };
    const makeQueueableCommand = function(body, { queueSize = 0 } = {}) {
        return async function(args) {
            if (state.locked) {
                if (!state.queueable) {
                    return;
                }
                if (queueSize && queue.length >= queueSize) {
                    return;
                }
                await new Promise(resolve => {
                    queue.push(resolve);
                });
            } else {
                state.locked = true;
                state.queueable = true;
            }
            try {
                await body(args);
            } catch (error) {
                printError(error);
            } finally {
                if (0 < queue.length) {
                    const resolve = queue[0];
                    queue.splice(0, 1);
                    resolve();
                } else {
                    state.locked = false;
                    state.queueable = false;
                }
            }
        };
    };

    return {
        makeGuardedCommand,
        makeGuardedCommandSync,
        makeQueueableCommand,

        // testing purpose only
        setPrintError,
        getQueueLength: function() { return queue.length; }
    };
})();

module.exports = reentrantGuard;
