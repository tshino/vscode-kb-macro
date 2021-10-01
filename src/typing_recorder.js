'use strict';
const vscode = require('vscode');

const TypingRecorder = function() {
    let onDetectTypingCallback  = null;
    let recording = false;
    let targetTextEditor = null;
    let expectedSelections = null;

    const onDetectTyping = function(callback) {
        onDetectTypingCallback = callback;
    };
    const notifyDetectedTyping = function(text) {
        if (onDetectTypingCallback) {
            onDetectTypingCallback({
                command: 'default:type',
                args: {
                    text: text
                }
            });
        }
    };
    const start = function(textEditor) {
        recording = true;
        targetTextEditor = textEditor;
        expectedSelections = Array.from(textEditor.selections);
    };
    const stop = function() {
        recording = false;
        targetTextEditor = null;
    };

    const predictSelection = function(changes) {
        let sels = [], lineOffset = 0;
        for (let i = 0; i < changes.length; i++) {
            let chg = changes[i];
            let pos = chg.range.start.translate({
                lineDelta: lineOffset,
                characterDelta: chg.text.length
            });
            // lineOffset += Array.from(chg.text).filter(c => c === '\n').length;
            lineOffset -= chg.range.end.line - chg.range.start.line;
            sels[i] = new vscode.Selection(pos, pos);
        }
        return sels;
    };

    const processDocumentChangeEvent = function(event) {
        if (!recording) {
            return;
        }
        if (event.document !== targetTextEditor.document) {
            return;
        }
        if (event.contentChanges.length === 0) {
            return;
        }

        const changes = Array.from(event.contentChanges);
        changes.sort((a, b) => a.rangeOffset - b.rangeOffset);
        const selections = Array.from(targetTextEditor.selections);
        selections.sort((a, b) => a.start.compareTo(b.start));

        const text0 = changes[0].text;
        const isUniformText = changes.every((chg) => chg.text === text0);
        if (changes.length === selections.length && isUniformText && text0 !== '') {
            const rangesOfChangeEqualSelections = changes.every((chg, i) => selections[i].isEqual(chg.range));
            if (rangesOfChangeEqualSelections) {
                // Pure insertion of a single line of text or,
                // replacing (possibly multiple) selected range(s) with a text
                expectedSelections = predictSelection(changes);
                notifyDetectedTyping(text0);
            }
        }
    };

    return {
        onDetectTyping,
        start,
        stop,
        processDocumentChangeEvent,
        getExpectedSelections: function() { return expectedSelections; } // testing purpose only
    };
};

module.exports = { TypingRecorder };
