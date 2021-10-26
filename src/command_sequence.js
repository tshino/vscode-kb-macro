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
            // Concatenate consecutive direct typing
            if (0 < i &&
                sequence[i - 1].command === 'internal:performType' &&
                sequence[i].command === 'internal:performType'
            ) {
                const args1 = sequence[i - 1].args || {};
                const args2 = sequence[i].args || {};
                const text1 = args1.text || '';
                const text2 = args2.text || '';
                const deleteLeft2 = args2.deleteLeft || 0;
                if (text1.length >= deleteLeft2) {
                    const text = text1.substr(0, text1.length - deleteLeft2) + text2;
                    sequence[i - 1].args.text = text;
                    sequence.splice(i, 1);
                    i--;
                    continue;
                }
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
