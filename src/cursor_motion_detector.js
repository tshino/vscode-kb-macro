'use strict';
const { util } = require('./util.js');

const CursorMotionDetector = function() {
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
        processSelectionChangeEvent,

        isEnabled: function() { return enabled; } // testing purpose only
    }
};

module.exports = { CursorMotionDetector };
