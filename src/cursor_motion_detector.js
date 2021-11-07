'use strict';
const util = require('./util.js');

const CursorMotionDetector = function() {
    let onDetectCursorMotionCallback = null;
    let enabled = false;
    let lastSelections = null;
    let lastTextEditor = null;
    const predictions = [];
    let textEditorForPredictions = null;

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
        textEditorForPredictions = lastTextEditor;
        enabled = true;
    };
    const stop = function() {
        enabled = false;
    };
    const setPrediction = function(textEditor, expected) {
        if (textEditorForPredictions !== textEditor) {
            predictions.length = 0;
            textEditorForPredictions = textEditor;
        }
        predictions.push(expected);
    };
    const getPrediction = function(textEditor) {
        if (textEditorForPredictions === textEditor) {
            return predictions.length === 0 ? null : predictions[predictions.length - 1];
        } else {
            return null;
        }
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
        // console.log('cursor', lastSelections[0].active.character, event.selections[0].active.character);
        if (textEditorForPredictions !== event.textEditor || 0 === predictions.length) {
            const current = Array.from(event.selections);
            const motion = detectImplicitMotion(lastSelections, current);
            if (motion) {
                // Here, the occurence of this cursor change event is unexpected.
                // We consider it an implicit cursor motion.
                // We notify it so that it will be recorded to be able to playback.
                notifyDetectedMotion(motion.delta);
                // console.log('motion without prediction');
            } else {
                // console.log('skip');
            }
        } else {
            const predicted = predictions[0];
            const current = util.sortSelections(event.selections);
            const motion = detectImplicitMotion(predicted, current);
            if (motion) {
                // Here, the current cursor position is different from the one predicted.
                // We consider it an implicit cursor motion.
                // We notify it so that it will be recorded to be able to playback.
                notifyDetectedMotion(motion.delta);
                // console.log('motion with prediction');
            } else {
                // if (util.isEqualSelections(predicted, current)) {
                //     console.log('match');
                // } else {
                //     console.log('differ');
                // }
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
        getPrediction,
        processSelectionChangeEvent,

        isEnabled: function() { return enabled; } // testing purpose only
    }
};

module.exports = { CursorMotionDetector };
