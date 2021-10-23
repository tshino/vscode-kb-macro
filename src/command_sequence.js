'use strict';

const CommandSequence = function() {
    const sequence = [];

    const clear = function() {
        sequence.length = 0;
    };
    const push = function(commandSpec) {
        sequence.push(commandSpec);
    };
    const optimize = function() {
        for (let i = 0; i < sequence.length; i++) {
            if (0 < i &&
                sequence[i - 1].command === 'internal:performType' &&
                sequence[i].command === 'internal:performType' &&
                !(sequence[i - 1].args || {}).deleteLeft &&
                !(sequence[i].args || {}).deleteLeft
            ) {
                sequence[i - 1].args.text += sequence[i].args.text;
                sequence.splice(i, 1);
                i--;
            }
        }
    };

    return {
        clear,
        push,
        optimize,
        get: function() { return sequence; }
    };
};

module.exports = { CommandSequence };
