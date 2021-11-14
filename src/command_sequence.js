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
            // Remove a pair of cursor movement that results nothing
            if (i + 1 < sequence.length &&
                sequence[i].command === 'internal:performCursorMotion' &&
                sequence[i + 1].command === 'internal:performCursorMotion') {
                const args1 = sequence[i].args || {};
                const args2 = sequence[i + 1].args || {};
                const characterDelta1 = args1.characterDelta || 0;
                const characterDelta2 = args2.characterDelta || 0;
                const lineDelta1 = args1.lineDelta || 0;
                const lineDelta2 = args2.lineDelta || 0;
                const selectionLength2 = args2.selectionLength || 0;
                if (lineDelta1 === 0 &&
                    lineDelta2 === 0 &&
                    selectionLength2 === 0 &&
                    characterDelta1 + characterDelta2 === 0) {
                    sequence.splice(i, 2);
                    i--;
                    continue;
                }
            }
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
