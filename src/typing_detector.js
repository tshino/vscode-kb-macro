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
    const notifyDetectedTyping = function(args) {
        if (onDetectTypingCallback) {
            onDetectTypingCallback(args);
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

    const makePrediction = function(changes) {
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
        // every change replaces the corresponding selection
        return changes.every((chg, i) => selections[i].isEqual(chg.range));
    };
    const deletesLeftAndInserts = function(changes, selections) {
        const emptySelection = selections.every(sel => sel.isEmpty);
        const uniformRangeLength = changes.every(chg => chg.rangeLength === changes[0].rangeLength);
        const cursorAtEndOfRange = selections.every((sel, i) => sel.active.isEqual(changes[i].range.end));
        return emptySelection && uniformRangeLength && cursorAtEndOfRange;
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

        const changes = sortContentChanges(event.contentChanges);
        const selections = (
            cursorMotionDetector.getPrediction() ||
            util.sortSelections(targetTextEditor.selections)
        );

        if (changes.length === selections.length && isUniformTextInsert(changes)) {
            if (replacesCorrespondingSelection(changes, selections)) {
                // Every change is a pure insertion of or replacing the corresponding
                // selected range with a common text.
                const prediction = makePrediction(changes);
                cursorMotionDetector.setPrediction(prediction);
                notifyDetectedTyping({ text: changes[0].text });
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
                notifyDetectedTyping({ deleteLeft, text: changes[0].text });
                return;
            }
        }
    };

    return {
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
