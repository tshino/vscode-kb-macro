'use strict';
const vscode = require('vscode');
const { util } = require('./util.js');

const TypingDetector = function() {
    let onDetectTypingCallback  = null;
    let recording = false;
    let suspending = false;
    let targetTextEditor = null;

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
        suspending = false;
        targetTextEditor = textEditor;
        cursorEventHandler.start(textEditor);
    };
    const stop = function() {
        recording = false;
        suspending = false;
        targetTextEditor = null;
        cursorEventHandler.stop();
    };
    const suspend = function() {
        suspending = true;
        cursorEventHandler.stop();
    };
    const resume = function(textEditor) {
        suspending = false;
        cursorEventHandler.start(textEditor);
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
        const selections = Array.from(cursorEventHandler.getExpectedSelections() || targetTextEditor.selections);
        selections.sort((a, b) => a.start.compareTo(b.start));

        const text0 = changes[0].text;
        const isUniformText = changes.every((chg) => chg.text === text0);
        if (changes.length === selections.length && isUniformText && text0 !== '') {
            const rangesOfChangeEqualSelections = changes.every((chg, i) => selections[i].isEqual(chg.range));
            if (rangesOfChangeEqualSelections) {
                // Pure insertion of a single line of text or,
                // replacing (possibly multiple) selected range(s) with a text
                const expectedSelections = predictSelection(changes);
                cursorEventHandler.setExpectedSelections(expectedSelections);
                notifyDetectedTyping(text0);
            }
        }
    };

    const cursorEventHandler = (function() {
        let onDetectCursorMotionCallback = null;
        let enabled = false;
        let lastSelections = null;
        let lastTextEditor = null;
        const predictions = [];

        const onDetectCursorMotion = function(callback) {
            onDetectCursorMotionCallback = callback;
        };
        const notifyDetectedMotion = function(characterDelta) {
            if (onDetectCursorMotionCallback) {
                onDetectCursorMotionCallback({
                    command: 'cursorMove',
                    args: {
                        to: characterDelta < 0 ? 'left' : 'right',
                        by: 'character',
                        value: Math.abs(characterDelta)
                    }
                });
            }
        };

        const start = function(textEditor) {
            lastSelections = textEditor ? textEditor.selections : null;
            lastTextEditor = textEditor || null;
            predictions.length = 0;
            enabled = true;
        };
        const stop = function() {
            enabled = false;
        };
        const setExpectedSelections = function(expected) {
            predictions.push(expected);
        };
        const detectAndRecordImplicitMotion = function(event) {
            if (0 === predictions.length) {
                const current = Array.from(event.selections);
                if (!util.isEqualSelections(lastSelections, current)) {
                    const characterDelta = current[0].active.character - lastSelections[0].active.character;
                    notifyDetectedMotion(characterDelta);
                }
            } else {
                const predicted = predictions[0];
                const current = Array.from(event.selections);
                current.sort((a, b) => a.start.compareTo(b.start));
                if (!util.isEqualSelections(current, predicted)) {
                    const characterDelta = current[0].active.character - predicted[0].active.character;
                    // Here, an implicit cursor motion has been detected.
                    // We notify it so that it will be recorded to be able to playback.
                    notifyDetectedMotion(characterDelta);
                }
                predictions.splice(0, 1);
            }
        };
        const processSelectionChangeEvent = function(event) {
            if (!enabled) {
                return;
            }
            if (lastTextEditor !== event.textEditor) {
                lastTextEditor = event.textEditor;
                lastSelections = event.selections;
            }
            detectAndRecordImplicitMotion(event);
            lastSelections = event.selections;
        };

        return {
            onDetectCursorMotion,
            start,
            stop,
            setExpectedSelections,
            getExpectedSelections: function() { return predictions.length === 0 ? null : predictions[predictions.length - 1]; },
            processSelectionChangeEvent
        }
    })();

    return {
        onDetectTyping,
        onDetectCursorMotion: cursorEventHandler.onDetectCursorMotion,
        start,
        stop,
        suspend,
        resume,
        processDocumentChangeEvent,
        processSelectionChangeEvent : cursorEventHandler.processSelectionChangeEvent,
        getExpectedSelections: cursorEventHandler.getExpectedSelections // testing purpose only
    };
};

module.exports = { TypingDetector };
