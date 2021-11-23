'use strict';
const vscode = require('vscode');
const util = require('./util.js');

const internalCommands = (function() {
    // Performs typing.
    // This is needed because the existing built-in 'default:type' command is not
    // appropriate for the purpose since it triggers some unwanted side-effects
    // like bracket completion.
    const performType = async function(args) {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            return;
        }
        const indices = util.makeIndexOfSortedSelections(textEditor.selections);
        const text = (args && args.text) || '';
        const numDeleteLeft = (args && args.deleteLeft) || 0;
        const numLF = Array.from(text).filter(ch => ch === '\n').length;
        const lenLastLine = numLF === 0 ? 0 : text.length - (text.lastIndexOf('\n') + 1);
        const newSelections = [];
        await textEditor.edit(edit => {
            let lineOffset = 0, lastLine = 0, characterOffset = 0;
            for (let i = 0; i < indices.length; i++) {
                const selection = textEditor.selections[indices[i]];
                const range = (0 < numDeleteLeft) ? new vscode.Range(
                    selection.active.line,
                    Math.max(0, selection.active.character - numDeleteLeft),
                    selection.active.line,
                    selection.active.character
                ) : new vscode.Range(selection.start, selection.end);
                if (!range.isEmpty) {
                    edit.delete(range);
                }
                edit.insert(range.start, text);
                if (lastLine !== range.start.line) {
                    characterOffset = 0;
                }
                lineOffset += numLF;
                if (numLF === 0) {
                    characterOffset += text.length;
                } else {
                    characterOffset = lenLastLine - range.start.character;
                }
                const newPos = new vscode.Position(
                    range.start.line + lineOffset,
                    range.start.character + characterOffset
                );
                newSelections[indices[i]] = new vscode.Selection(newPos, newPos);
                lineOffset -= range.end.line - range.start.line;
                lastLine = range.end.line;
                characterOffset -= range.end.character - range.start.character;
            }
        });
        if (!util.isEqualSelections(textEditor.selections, newSelections)) {
            textEditor.selections = newSelections;
        }
    };

    const translate = function(document, position, lineDelta, characterDelta) {
        if (lineDelta < 0) {
            const line = Math.max(0, position.line + lineDelta);
            const lineLength = document.lineAt(line).text.length;
            const character = Math.max(0, lineLength + Math.min(characterDelta, 0));
            return new vscode.Position(line, character);
        } else if (0 < lineDelta) {
            const line = Math.min(position.line + lineDelta, document.lineCount);
            const lineLength = document.lineAt(line).text.length;
            const character = Math.min(Math.max(0, characterDelta), lineLength);
            return new vscode.Position(line, character);
        } else if (lineDelta === 0) {
            if (characterDelta < 0) {
                const character = Math.max(0, position.character + characterDelta);
                return new vscode.Position(position.line, character);
            } else {
                const lineLength = document.lineAt(position.line).text.length;
                const character = Math.min(position.character + characterDelta, lineLength);
                return new vscode.Position(position.line, character);
            }
        }
    };

    const performCursorMotion = async function(args) {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            return;
        }

        const document = textEditor.document;
        const characterDelta = args.characterDelta || 0;
        let lineDelta = args.lineDelta || 0;
        const selectionLength = args.selectionLength || 0;
        const groupSize = args.groupSize || 1;

        let selections = textEditor.selections;
        if (1 < groupSize) {
            if (selections.length % groupSize !== 0) {
                return;
            }
            selections = selections.filter((_, i) => i % groupSize === 0);
        }

        if (Array.isArray(characterDelta)) {
            // Splitting motion
            // Each cursor splits into n cursors and goes to locations specified by the args.
            const n = characterDelta.length;
            if (!Array.isArray(lineDelta)) {
                lineDelta = Array(n).fill(lineDelta);
            }
            const newSelections = Array.from(selections).flatMap(sel => {
                return Array.from(Array(n).keys()).map(i => {
                    const start = translate(document, sel.start, lineDelta[i], characterDelta[i]);
                    const end = translate(document, start, 0, selectionLength);
                    return new vscode.Selection(start, end);
                });
            });
            textEditor.selections = newSelections;
        } else {
            // Unifor motion
            // Each cursor moves with the same delta specified by the args.
            const newSelections = Array.from(selections).map(sel => {
                const start = translate(document, sel.start, lineDelta, characterDelta);
                const end = translate(document, start, 0, selectionLength);
                return new vscode.Selection(start, end);
            });
            textEditor.selections = newSelections;
        }
    };

    return {
        performType,
        performCursorMotion
    };
})();

module.exports = internalCommands;
