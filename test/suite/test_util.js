'use strict';
const assert = require('assert');
const vscode = require("vscode");

const TestUtil = (function() {
    const setupTextEditor = async function({ content, language = 'plaintext' }) {
        const doc = await vscode.workspace.openTextDocument({ content, language });
        await vscode.window.showTextDocument(doc);
        const textEditor = vscode.window.activeTextEditor;
        assert.ok( textEditor );
        const eol = vscode.EndOfLine.LF;
        await textEditor.edit((edit) => {
            edit.setEndOfLine(eol);
        });
        return textEditor;
    };
    const resetDocument = async function(textEditor, content, options = {}) {
        const {
            eol = vscode.EndOfLine.LF,
            languageId = 'plaintext'
        } = options;
        let lineCount = textEditor.document.lineCount;
        let entireDocument = new vscode.Range(0, 0, lineCount, 0);
        await textEditor.edit((edit) => {
            edit.replace(entireDocument, content);
            edit.setEndOfLine(eol);
        });
        await vscode.languages.setTextDocumentLanguage(
            textEditor.document,
            languageId
        );
    };
    const selectionsToArray = function(selections) {
        return Array.from(selections).map(
            s => (
                s.anchor.isEqual(s.active) ?
                    [
                        s.active.line,
                        s.active.character
                    ] :
                    [
                        s.anchor.line,
                        s.ancher.character,
                        s.active.line,
                        s.active.character
                    ]
            )
        );
    };
    const arrayToSelections = function(array) {
        return array.map(
            a => (
                a.length === 2 ?
                    new vscode.Selection(
                        a[0], a[1], a[0], a[1]
                    ) :
                    new vscode.Selection(
                        a[0], a[1], a[2], a[3]
                    )
            )
        );
    };
    // const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

    return {
        setupTextEditor,
        resetDocument,
        selectionsToArray,
        arrayToSelections
    };
})();

module.exports = { TestUtil };
