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
    const notifyDetectedMotion = function(motion) {
        if (onDetectCursorMotionCallback) {
            onDetectCursorMotionCallback(CursorMotionType.Direct, motion);
        }
    };

    // const selectionsToString = function(selections) {
    //     return JSON.stringify(Array.from(selections).map(sel => {
    //         const { anchor, active } = sel;
    //         const { line: l1, character: c1 } = anchor;
    //         const { line: l2, character: c2 } = active;
    //         if (l1 === l2 && c1 === c2) {
    //             return [ l1, c1 ];
    //         } else {
    //             return [ l1, c1, l2, c2 ];
    //         }
    //     }));
    // };

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
        // console.log('pred', selectionsToString(expected));
    };
    const getPrediction = function(textEditor) {
        if (textEditorForPredictions === textEditor) {
            return predictions.length === 0 ? null : predictions[predictions.length - 1];
        } else {
            return null;
        }
    };
    const calculateMotion = function(document, target, base) {
        const basePos = base.start;
        if (target.start.line === basePos.line &&
            target.start.line === target.end.line &&
            target.start.character !== basePos.character) {
            const characterDelta = target.start.character - basePos.character;
            const selectionLength = target.end.character - target.start.character;
            if (selectionLength === 0) {
                return { characterDelta };
            } else {
                return { characterDelta, selectionLength };
            }
        } else if (target.start.line !== basePos.line &&
            target.start.line === target.end.line) {
            const lineDelta = target.start.line - basePos.line;
            if (lineDelta < 0) {
                const lineLength = document.lineAt(target.start.line).text.length;
                const characterDelta = target.start.character - lineLength;
                const selectionLength = target.end.character - target.start.character;
                if (selectionLength === 0) {
                    return { lineDelta, characterDelta };
                } else {
                    return { lineDelta, characterDelta, selectionLength };
                }
            } else {
                const characterDelta = target.start.character;
                const selectionLength = target.end.character - target.start.character;
                if (selectionLength === 0) {
                    return { lineDelta, characterDelta };
                } else {
                    return { lineDelta, characterDelta, selectionLength };
                }
            }
        }
    };
    const equalsMotion = function(a, b) {
        return (
            a && b &&
            a.lineDelta === b.lineDelta &&
            a.characterDelta === b.characterDelta &&
            a.selectionLength === b.selectionLength
        );
    };
    const detectImplicitMotion = function(document, actual, expected) {
        const motion = calculateMotion(document, actual[0], expected[0]);
        if (motion) {
            const isUniformCursorMotion = (
                actual.length === expected.length &&
                actual.every((sel,i) => (
                    equalsMotion(
                        calculateMotion(document, sel, expected[i]),
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
        // console.log('cursor', selectionsToString(lastSelections), selectionsToString(event.selections));
        const document = event.textEditor.document;
        if (textEditorForPredictions !== event.textEditor || 0 === predictions.length) {
            const current = Array.from(event.selections);
            const motion = detectImplicitMotion(document, current, lastSelections);
            if (motion) {
                // Here, the occurence of this cursor change event is unexpected.
                // We consider it an implicit cursor motion.
                // We notify it so that it will be recorded to be able to playback.
                notifyDetectedMotion(motion);
                // console.log('motion without prediction');
            } else {
                // console.log('skip');
            }
        } else {
            const current = util.sortSelections(event.selections);
            const match = predictions.findIndex(
                predicted => util.isEqualSelections(predicted, current)
            );
            if (0 <= match) {
                predictions.splice(0, match + 1);
                // console.log('match');
            } else {
                const predicted = predictions[0];
                const motion = detectImplicitMotion(document, current, predicted);
                if (motion) {
                    // Here, the current cursor position is different from the one predicted.
                    // We consider it an implicit cursor motion.
                    // We notify it so that it will be recorded to be able to playback.
                    notifyDetectedMotion(motion);
                    predictions.splice(0, 1);
                    // console.log('motion with prediction');
                } else {
                    // console.log('differ');
                }
            }
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
