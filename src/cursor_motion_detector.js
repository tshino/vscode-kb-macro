'use strict';

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
    const setPrediction = function(expected) {
        predictions.push(expected);
    };
    const detectImplicitMotion = function(expected, actual) {
        const delta = actual[0].active.character - expected[0].active.character;
        if (delta !== 0) {
            const isUniformCursorMotion = (
                actual.length === expected.length &&
                actual.every((sel,i) => (
                    sel.isEmpty &&
                    expected[i].isEmpty &&
                    sel.active.line === expected[i].active.line &&
                    sel.active.character - expected[i].active.character === delta
                ))
            );
            if (isUniformCursorMotion) {
                return { delta };
            }
        }
    };
    const detectAndRecordImplicitMotion = function(event) {
        if (0 === predictions.length) {
            const current = Array.from(event.selections);
            const motion = detectImplicitMotion(lastSelections, current);
            if (motion) {
                // Here, the occurence of this cursor change event is unexpected.
                // We consider it an implicit cursor motion.
                // We notify it so that it will be recorded to be able to playback.
                notifyDetectedMotion(motion.delta);
            }
        } else {
            const predicted = predictions[0];
            const current = Array.from(event.selections);
            current.sort((a, b) => a.start.compareTo(b.start));
            const motion = detectImplicitMotion(predicted, current);
            if (motion) {
                // Here, the current cursor position is different from the one predicted.
                // We consider it an implicit cursor motion.
                // We notify it so that it will be recorded to be able to playback.
                notifyDetectedMotion(motion.delta);
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
        setPrediction,
        getPrediction: function() { return predictions.length === 0 ? null : predictions[predictions.length - 1]; },
        processSelectionChangeEvent,

        isEnabled: function() { return enabled; } // testing purpose only
    }
};

module.exports = { CursorMotionDetector };
