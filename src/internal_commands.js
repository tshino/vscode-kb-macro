'use strict';
const vscode = require('vscode');
const util = require('./util.js');

const internalCommands = (function() {
    // Performs typing.
    // This is needed because the existing built-in 'default:type' command is not
    // appropriate for the purpose since it triggers some unwanted side-effects
    // like bracket completion.
    const performType = async function(textEditor, _edit, args) {
        const indices = util.makeIndexOfSortedSelections(textEditor.selections);
        const text = (args && args.text) || '';
        const numDeleteLeft = (args && args.deleteLeft) || 0;
        const numLF = Array.from(text).filter(ch => ch === '\n').length;
        const lenLastLine = numLF === 0 ? 0 : text.length - (text.lastIndexOf('\n') + 1);
        let lineOffset = 0;
        const newSelections = [];
        await textEditor.edit(edit => {
            for (let i = 0; i < indices.length; i++) {
                const selection = textEditor.selections[indices[i]];
                let pos = selection.active;
                let removedLineCount = 0;
                if (0 < numDeleteLeft) {
                    let range = new vscode.Range(
                        new vscode.Position(
                            pos.line,
                            Math.max(0, pos.character - numDeleteLeft)
                        ),
                        pos
                    );
                    edit.delete(range);
                } else if (!selection.isEmpty) {
                    edit.delete(selection);
                    pos = selection.start;
                    removedLineCount = selection.end.line - selection.start.line;
                }
                edit.insert(pos, text);
                lineOffset += numLF;
                if (numLF === 0) {
                    pos = new vscode.Position(
                        pos.line + lineOffset,
                        Math.max(0, pos.character - numDeleteLeft) + text.length
                    );
                } else {
                    pos = new vscode.Position(pos.line + lineOffset, lenLastLine);
                }
                lineOffset -= removedLineCount;
                newSelections[indices[i]] = new vscode.Selection(pos, pos);
            }
        });
        if (!util.isEqualSelections(textEditor.selections, newSelections)) {
            textEditor.selections = newSelections;
        }
    };

    return {
        performType
    };
})();

module.exports = internalCommands;
