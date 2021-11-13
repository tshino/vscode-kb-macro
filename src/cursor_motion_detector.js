'use strict';
const util = require('./util.js');

const CursorMotionDetector = function() {
    const CursorMotionType = {
        Direct: 0
    };
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
            onDetectCursorMotionCallback(
                CursorMotionType.Direct,
                {
                    characterDelta: characterDelta
                }
            );
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
    const calculateDeltaPosition = function(target, base) {
        if (target.line === base.line &&
            target.character !== base.character) {
            return { delta: target.character - base.character };
        }
    };
    const equalsDeltaPosition = function(a, b) {
        return a && b && a.delta === b.delta;
    };
    const detectImplicitMotion = function(actual, expected) {
        const motion = calculateDeltaPosition(actual[0].active, expected[0].active);
        if (motion) {
            const isUniformCursorMotion = (
                actual.length === expected.length &&
                actual.every((sel,i) => (
                    sel.isEmpty &&
                    expected[i].isEmpty &&
                    equalsDeltaPosition(
                        calculateDeltaPosition(sel.active, expected[i].active),
                        motion
                    )
                ))
            );
            if (isUniformCursorMotion) {
                return motion;
            }
        }
    };
    const detectAndRecordImplicitMotion = function(event) {
        // console.log('cursor', lastSelections[0].active.character, event.selections[0].active.character);
        if (textEditorForPredictions !== event.textEditor || 0 === predictions.length) {
            const current = Array.from(event.selections);
            const motion = detectImplicitMotion(current, lastSelections);
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
            const motion = detectImplicitMotion(current, predicted);
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
        CursorMotionType,
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
