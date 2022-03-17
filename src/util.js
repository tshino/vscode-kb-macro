'use strict';
const vscode = require('vscode');

const util = (function() {

    const isEqualSelections = function(selections1, selections2) {
        return (
            selections1.length === selections2.length &&
            selections1.every(
                (sel1, i) => (
                    sel1.anchor.isEqual(selections2[i].anchor) &&
                    sel1.active.isEqual(selections2[i].active)
                )
            )
        );
    };
    const sortSelections = function(selections) {
        selections = Array.from(selections);
        selections.sort((a, b) => a.start.compareTo(b.start));
        return selections;
    };
    const makeIndexOfSortedSelections = function(selections) {
        const indices = Array.from({ length: selections.length }, (k,v) => v);
        indices.sort((a, b) => selections[a].start.compareTo(selections[b].start));
        return indices;
    };

    const makeSelectionsAfterTyping = function(sortedChanges) {
        let lineOffset = 0, lastLine = 0, characterOffset = 0;
        const newSelections = sortedChanges.map(({ range, text }) => {
            const numLF = Array.from(text).filter(ch => ch === '\n').length;
            if (lastLine !== range.start.line) {
                characterOffset = 0;
            }
            lineOffset += numLF;
            if (numLF === 0) {
                characterOffset += text.length;
            } else {
                const lenLastLine = text.length - (text.lastIndexOf('\n') + 1);
                characterOffset = lenLastLine - range.start.character;
            }
            const newPos = new vscode.Position(
                range.start.line + lineOffset,
                range.start.character + characterOffset
            );
            lineOffset -= range.end.line - range.start.line;
            lastLine = range.end.line;
            characterOffset -= range.end.character - range.start.character;
            return new vscode.Selection(newPos, newPos);
        });
        return newSelections;
    };

    const validatePositiveIntegerInput = function(value) {
        if (value !== '' && !/^[1-9]\d*$/.test(value)) {
            return 'Input a positive integer number';
        }
    };

    const makeCommandSpec = function(args) {
        if (!args || !args.command || typeof(args.command) !== 'string') {
            return null;
        }
        const spec = {
            command: args.command
        };
        if ('args' in args) {
            spec.args = args.args;
        }
        if ('await' in args) {
            if (typeof(args['await']) !== 'string') {
                return null;
            }
            spec['await'] = args['await'];
        }
        if ('record' in args) {
            if (typeof(args.record) !== 'string') {
                return null;
            }
            spec.record = args.record;
        }
        return spec;
    };

    return {
        isEqualSelections,
        sortSelections,
        makeIndexOfSortedSelections,
        makeSelectionsAfterTyping,
        validatePositiveIntegerInput,
        makeCommandSpec
    };
})();

module.exports = util;
