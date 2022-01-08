'use strict';

const reentrantGuard = (function() {

    let locked = false;

    const makeGuardedCommand = function(body) {
        return async function(args) {
            if (locked) {
                return;
            }
            locked = true;
            try {
                await body(args);
            } catch (error) {
                console.error(error);
                console.info('kb-macro: Exception in guarded command');
            }
            locked = false;
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
                console.error(error);
                console.info('kb-macro: Exception in guarded command');
            }
            locked = false;
        };
    };

    return {
        makeGuardedCommand,
        makeGuardedCommandSync,
    };
})();

module.exports = reentrantGuard;
