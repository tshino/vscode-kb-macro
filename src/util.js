'use strict';
const vscode = require('vscode');

const util = (function() {

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

    return {
        makeGuardedCommand,
        makeGuardedCommandSync,
        isEqualSelections,
        sortSelections,
        makeIndexOfSortedSelections,
        makeSelectionsAfterTyping
    };
})();

module.exports = util;
