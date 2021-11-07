'use strict';
const vscode = require('vscode');
const util = require('./util.js');
const { CursorMotionDetector } = require('./cursor_motion_detector.js');

const TypingDetector = function() {
    const TypingType = {
        Direct: 0,
        Default: 1
    };
    let onDetectTypingCallback  = null;
    let recording = false;
    let suspending = false;
    const cursorMotionDetector = CursorMotionDetector();

    const onDetectTyping = function(callback) {
        onDetectTypingCallback = callback;
    };
    const notifyDetectedTyping = function(type, args) {
        if (onDetectTypingCallback) {
            onDetectTypingCallback(type, args);
        }
    };

    const start = function() {
        recording = true;
        suspending = false;
        cursorMotionDetector.start(vscode.window.activeTextEditor);
    };
    const stop = function() {
        recording = false;
        suspending = false;
        cursorMotionDetector.stop();
    };
    const suspend = function() {
        suspending = true;
        cursorMotionDetector.stop();
    };
    const resume = function() {
        suspending = false;
        cursorMotionDetector.start(vscode.window.activeTextEditor);
    };

    const makePrediction = function(changes) {
        let sels = [], lineOffset = 0;
        for (let i = 0; i < changes.length; i++) {
            let chg = changes[i];
            let pos = chg.range.start.translate({
                lineDelta: lineOffset,
                characterDelta: chg.text.length
            });
            const numLF = Array.from(chg.text).filter(ch => ch === '\n').length;
            if (0 < numLF) {
                const lenLastLine = chg.text.length - (chg.text.lastIndexOf('\n') + 1);
                pos = new vscode.Position(pos.line + numLF, lenLastLine);
                lineOffset += numLF;
            }
            lineOffset -= chg.range.end.line - chg.range.start.line;
            sels[i] = new vscode.Selection(pos, pos);
        }
        return sels;
    };
    const sortContentChanges = function(changes) {
        changes = Array.from(changes);
        changes.sort((a, b) => a.rangeOffset - b.rangeOffset);
        return changes;
    };
    const isUniformTextInsert = function(changes) {
        const text0 = changes[0].text;
        const isUniformText = changes.every((chg) => chg.text === text0);
        return isUniformText && text0 !== '';
    };
    const replacesCorrespondingSelection = function(changes, selections) {
        // every change replaces the text of the respective selection
        return changes.every((chg, i) => selections[i].isEqual(chg.range));
    };
    const deletesLeftAndInserts = function(changes, selections) {
        const emptySelection = selections.every(sel => sel.isEmpty);
        const uniformRangeLength = changes.every(chg => chg.rangeLength === changes[0].rangeLength);
        const cursorAtEndOfRange = selections.every((sel, i) => sel.active.isEqual(changes[i].range.end));
        return emptySelection && uniformRangeLength && cursorAtEndOfRange;
    };
    const isBracketCompletionWithSelection = function(selections, changes) {
        let uniformPairedText = changes.every(
            (chg,i) => chg.text === changes[i % 2].text
        );
        return (
            uniformPairedText &&
            selections.length * 2 === changes.length &&
            changes.every(chg => chg.range.isEmpty) &&
            selections.every((sel,i) => (
                sel.start.isEqual(changes[i * 2].range.start) &&
                sel.end.isEqual(changes[i * 2 + 1].range.start)
            )) &&
            changes.every(chg => chg.text.length === 1)
        );
    };

    const processDocumentChangeEvent = function(event) {
        if (!recording || suspending) {
            return;
        }
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor || event.document !== textEditor.document) {
            return;
        }
        if (event.contentChanges.length === 0) {
            return;
        }

        const changes = sortContentChanges(event.contentChanges);
        const selections = (
            cursorMotionDetector.getPrediction(textEditor) ||
            util.sortSelections(textEditor.selections)
        );

        if (changes.length === selections.length && isUniformTextInsert(changes)) {
            if (replacesCorrespondingSelection(changes, selections)) {
                // Every change is a pure insertion of or replacing the corresponding
                // selected range with a common text.
                const prediction = makePrediction(changes);
                if (!util.isEqualSelections(selections, prediction)) {
                    cursorMotionDetector.setPrediction(textEditor, prediction);
                }
                notifyDetectedTyping(TypingType.Direct, { text: changes[0].text });
                return;
            }
            if (deletesLeftAndInserts(changes, selections)) {
                // Every change (in possible multi-cursor) is a combination of deleting
                // common number of characters to the left and inserting a common text.
                // This happens when a code completion occurs.
                // Example)
                //  1. type 'a'
                //  2. type 'r', 'Array' is suggested
                //  3. accept the suggestion
                //  4. then edit event happens, that replaces 'ar' with 'Array'
                const deleteLeft = changes[0].rangeLength;
                const prediction = makePrediction(changes);
                if (!util.isEqualSelections(selections, prediction)) {
                    cursorMotionDetector.setPrediction(textEditor, prediction);
                }
                notifyDetectedTyping(TypingType.Direct, { deleteLeft, text: changes[0].text });
                return;
            }
        }
        if (isBracketCompletionWithSelection(selections, changes)) {
            // It seems like a kind of bracket completion (but not 100% sure).
            // Supposed senario:
            //  1. select a text 'hello'
            //  2. type '('
            //  3. then a pair of bracket is inserted around 'hello',
            //     resulting '(hello)'.
            notifyDetectedTyping(TypingType.Default, { text: changes[0].text });
            return;
        }
    };

    return {
        TypingType,
        onDetectTyping,
        onDetectCursorMotion: cursorMotionDetector.onDetectCursorMotion,
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
