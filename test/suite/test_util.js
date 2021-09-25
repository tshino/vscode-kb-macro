'use strict';
const assert = require('assert');
const vscode = require("vscode");

const TestUtil = (function() {
    const setupTextEditor = async function({ content, language }) {
        const doc = await vscode.workspace.openTextDocument({ content, language });
        await vscode.window.showTextDocument(doc);
        const textEditor = vscode.window.activeTextEditor;
        assert.ok( textEditor );
        return textEditor;
    };
    const resetDocument = async function(textEditor, content, eol = vscode.EndOfLine.LF) {
        let lineCount = textEditor.document.lineCount;
        let entireDocument = new vscode.Range(0, 0, lineCount, 0);
        await textEditor.edit((edit) => {
            edit.replace(entireDocument, content);
            edit.setEndOfLine(eol);
        });
    };

    return {
        setupTextEditor,
        resetDocument
    };
})();

module.exports = { TestUtil };
