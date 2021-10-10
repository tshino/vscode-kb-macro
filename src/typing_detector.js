'use strict';
const vscode = require('vscode');
const util = require('./util.js');
const { CursorMotionDetector } = require('./cursor_motion_detector.js');

const TypingDetector = function() {
    let onDetectTypingCallback  = null;
    let recording = false;
    let suspending = false;
    let targetTextEditor = null;
    const cursorMotionDetector = CursorMotionDetector();

    const onDetectTyping = function(callback) {
        onDetectTypingCallback = callback;
    };
    const notifyDetectedTyping = function(text) {
        if (onDetectTypingCallback) {
            const args = { text: text };
            onDetectTypingCallback(args);
        }
    };

    // Performs typing.
    // This is needed because the existing built-in 'default:type' command is not
    // appropriate for the purpose since it triggers some unwanted side-effects
    // like bracket completion.
    const performType = async function(textEditor, _edit, args) {
        const indices = util.makeIndexOfSortedSelections(textEditor.selections);
        const text = (args && args.text) || '';
        const numDeleteLeft = 0;
        const numLF = Array.from(text).filter(ch => ch === '\n').length;
        const lenLastLine = numLF === 0 ? 0 : text.length - (text.lastIndexOf('\n') + 1);
        let lineOffset = 0;
        const newSelections = [];
        await textEditor.edit(edit => {
            for (let i = 0; i < indices.length; i++) {
                const selection = textEditor.selections[indices[i]];
                let pos = selection.active;
                let removedLineCount = 0;
                if (!selection.isEmpty) {
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

    const start = function(textEditor) {
        recording = true;
        suspending = false;
        targetTextEditor = textEditor;
        cursorMotionDetector.start(textEditor);
    };
    const stop = function() {
        recording = false;
        suspending = false;
        targetTextEditor = null;
        cursorMotionDetector.stop();
    };
    const suspend = function() {
        suspending = true;
        cursorMotionDetector.stop();
    };
    const resume = function(textEditor) {
        suspending = false;
        cursorMotionDetector.start(textEditor);
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
        if (!recording || suspending) {
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
        const selections = (
            cursorMotionDetector.getPrediction() ||
            util.sortSelections(targetTextEditor.selections)
        );

        const text0 = changes[0].text;
        const isUniformText = changes.every((chg) => chg.text === text0);
        if (changes.length === selections.length && isUniformText && text0 !== '') {
            const rangesOfChangeEqualSelections = changes.every((chg, i) => selections[i].isEqual(chg.range));
            if (rangesOfChangeEqualSelections) {
                // Pure insertion of a single line of text or,
                // replacing (possibly multiple) selected range(s) with a text
                const prediction = predictSelection(changes);
                cursorMotionDetector.setPrediction(prediction);
                notifyDetectedTyping(text0);
            }
        }
    };

    return {
        onDetectTyping,
        onDetectCursorMotion: cursorMotionDetector.onDetectCursorMotion,
        performType,
        start,
        stop,
        suspend,
        resume,
        processDocumentChangeEvent,
        processSelectionChangeEvent : cursorMotionDetector.processSelectionChangeEvent,
        getPrediction: cursorMotionDetector.getPrediction // testing purpose only
    };
};

module.exports = { TypingDetector };
