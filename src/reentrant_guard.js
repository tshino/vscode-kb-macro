'use strict';

const reentrantGuard = (function() {

    let locked = false;

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
            if (locked) {
                return;
            }
            locked = true;
            try {
                await body(args);
            } catch (error) {
                printError(error);
            } finally {
                locked = false;
            }
        };
    };
    const makeGuardedCommandSync = function(func) {
        return function(args) {
            if (locked) {
                return;
            }
            locked = true;
            try {
                func(args);
            } catch (error) {
                printError(error);
            } finally {
                locked = false;
            }
        };
    };

    return {
        makeGuardedCommand,
        makeGuardedCommandSync,

        // testing purpose only
        setPrintError
    };
})();

module.exports = reentrantGuard;
