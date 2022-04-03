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

    const makePredictionOnBracketCompletion = function(changes) {
        const sels = [];
        const offset = changes[0].text.length;
        for (let i = 0; i + 1 < changes.length; i += 2) {
            const start = changes[i].range.start.translate(0, offset);
            const end = changes[i + 1].range.start.translate(0, offset);
            sels.push(new vscode.Selection(start, end));
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
    const isInsertingWithDeleting = function(changes, selections) {
        const emptySelection = selections.every(sel => sel.isEmpty);
        if (!emptySelection) {
            return false;
        }
        const uniformRangeLength = changes.every(chg => chg.rangeLength === changes[0].rangeLength);
        if (!uniformRangeLength) {
            return false;
        }
        const sameLine = selections.every((sel, i) => sel.active.line === changes[i].range.start.line);
        if (!sameLine) {
            return false;
        }
        const deleteLeft = selections[0].active.character - changes[0].range.start.character;
        const deleteRight = changes[0].range.end.character - selections[0].active.character;
        if (deleteLeft < 0 || deleteRight < 0) {
            return false;
        }
        const uniformDeletingLength = selections.every((sel, i) => (
            deleteLeft === sel.active.character - changes[i].range.start.character &&
            deleteRight === changes[i].range.end.character - sel.active.character
        ));
        return uniformDeletingLength;
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

    const detectTyping = function(textEditor, selections, changes) {
        if (changes.length === selections.length && isUniformTextInsert(changes)) {
            if (replacesCorrespondingSelection(changes, selections)) {
                // Every change is a pure insertion of or replacing the corresponding
                // selected range with a common text.
                const prediction = util.makeSelectionsAfterTyping(changes);
                if (!util.isEqualSelections(selections, prediction)) {
                    cursorMotionDetector.setPrediction(textEditor, prediction);
                }
                notifyDetectedTyping(TypingType.Direct, { text: changes[0].text });
                return true;
            }
            if (isInsertingWithDeleting(changes, selections)) {
                // Every change (in possible multi-cursor) is a combination of deleting
                // common number of characters to the left and inserting a common text.
                // This happens when a code completion occurs.
                // Example)
                //  1. type 'a'
                //  2. type 'r', 'Array' is suggested
                //  3. accept the suggestion
                //  4. then edit event happens, that replaces 'ar' with 'Array'
                const deleteLeft = selections[0].active.character - changes[0].range.start.character;
                const deleteRight = changes[0].range.end.character - selections[0].active.character;
                const prediction = util.makeSelectionsAfterTyping(changes);
                if (!util.isEqualSelections(selections, prediction)) {
                    cursorMotionDetector.setPrediction(textEditor, prediction);
                }
                const args = { text: changes[0].text };
                if (0 < deleteLeft) {
                    args.deleteLeft = deleteLeft;
                }
                if (0 < deleteRight) {
                    args.deleteRight = deleteRight;
                }
                notifyDetectedTyping(TypingType.Direct, args);
                return true;
            }
        }
        if (isBracketCompletionWithSelection(selections, changes)) {
            // It seems like a kind of bracket completion (but not 100% sure).
            // Supposed senario:
            //  1. select a text 'hello'
            //  2. type '('
            //  3. then a pair of bracket is inserted around 'hello',
            //     resulting '(hello)'.
            const prediction = makePredictionOnBracketCompletion(changes);
            cursorMotionDetector.setPrediction(textEditor, prediction);
            notifyDetectedTyping(TypingType.Default, { text: changes[0].text });
            return true;
        }
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
        const prediction = cursorMotionDetector.getPrediction(textEditor);
        if (prediction) {
            if (detectTyping(textEditor, prediction, changes)) {
                return;
            }
        }
        const selections = util.sortSelections(textEditor.selections);
        detectTyping(textEditor, selections, changes);
    };

    return {
        TypingType,
        CursorMotionType: cursorMotionDetector.CursorMotionType,
        onDetectTyping,
        onDetectCursorMotion: cursorMotionDetector.onDetectCursorMotion,
        start,
        stop,
        suspend,
        resume,
        setAloneEnabled: cursorMotionDetector.setAloneEnabled,
        processDocumentChangeEvent,
        processSelectionChangeEvent : cursorMotionDetector.processSelectionChangeEvent,
        setPrediction: cursorMotionDetector.setPrediction, // testing purpose only
        getPrediction: cursorMotionDetector.getPrediction // testing purpose only
    };
};

module.exports = { TypingDetector };
