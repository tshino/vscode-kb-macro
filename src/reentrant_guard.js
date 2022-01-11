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
                if (state.queueable) {
                    if (!queueSize || queue.length < queueSize) {
                        queue.push([body, args]);
                    }
                }
                return;
            }
            state.locked = true;
            state.queueable = true;
            try {
                try {
                    await body(args);
                } catch (error) {
                    printError(error);
                }
                while (0 < queue.length) {
                    try {
                        const [body, args] = queue[0];
                        queue.splice(0, 1);
                        await body(args);
                    } catch (error) {
                        printError(error);
                    }
                }
            } finally {
                state.locked = false;
                state.queueable = false;
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
