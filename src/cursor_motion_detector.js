'use strict';
const util = require('./util.js');

const CursorMotionDetector = function() {
    const CursorMotionType = {
        Trailing: 0,
        Alone: 1
    };
    let onDetectCursorMotionCallback = null;
    let enabled = false;
    let aloneEnabled = false;
    let lastSelections = null;
    let lastTextEditor = null;
    const predictions = [];
    let textEditorForPredictions = null;

    const onDetectCursorMotion = function(callback) {
        onDetectCursorMotionCallback = callback;
    };
    const notifyDetectedMotion = function(type, motion) {
        if (onDetectCursorMotionCallback) {
            onDetectCursorMotionCallback(type, motion);
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
    const setAloneEnabled = function(enabled) {
        aloneEnabled = enabled;
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

    // Detect motion where each cursor moves with the same set of parameters
    const detectUniformMotion = function(document, target, base) {
        const motion = calculateMotion(document, target[0], base[0]);
        if (!motion) {
            return;
        }
        for (let i = 1; i < target.length; i++) {
            if (!equalsMotion(motion, calculateMotion(document, target[i], base[i]))) {
                return;
            }
        }
        // found uniform motion
        return motion;
    };
    // Detect motion where each cursor splits into n cursors in the same ways
    const detectSplittingMotion = function(document, target, base, n) {
        const motions = [];
        for (let j = 0; j < n; j++) {
            motions[j] = calculateMotion(document, target[j], base[0]);
            if (!motions[j]) {
                return;
            }
            if (motions[j].selectionLength !== motions[0].selectionLength) {
                return;
            }
        }
        for (let dest = n; dest < target.length; dest++) {
            const src = Math.floor(dest / n);
            const m = calculateMotion(document, target[dest], base[src]);
            if (!equalsMotion(m, motions[dest % n])) {
                return;
            }
        }
        // found uniform splitting motion
        const motion = {
            characterDelta: motions.map(m => m.characterDelta)
        };
        if (motions.some(m => 'lineDelta' in m)) {
            motion.lineDelta = motions.map(m => m.lineDelta || 0);
        }
        if ('selectionLength' in motions[0]) {
            motion.selectionLength = motions[0].selectionLength;
        }
        return motion;
    };

    // Detect motion where every cursor has one or more corresponding destinations
    // with the same relative motion
    const detectImplicitMotionWithoutGroup = function(document, target, base) {
        if (target.length === base.length) {
            return detectUniformMotion(document, target, base);
        }
        if (target.length % base.length === 0) {
            const n = target.length / base.length;
            return detectSplittingMotion(document, target, base, n);
        }
    };

    // Detect motion where every group of cursors moves in the same manner
    // The first one in each group is used for the base of each motion
    const detectImplicitMotion = function(document, actual, expected) {
        for (let groupSize = 1; groupSize <= expected.length; groupSize++) {
            if (expected.length % groupSize === 0) {
                const base = expected.filter((_,i) => i % groupSize === 0);
                const motion = detectImplicitMotionWithoutGroup(document, actual, base);
                if (motion) {
                    if (1 < groupSize) {
                        motion.groupSize = groupSize;
                    }
                    return motion;
                }
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
                // This type of events includes:
                //   - cursor movement that happen with snippet insertion related commands
                //   - cursor movement that happen when the user types in the find input box
                // We consider it an implicit cursor motion.
                // We notify it so that it will be recorded to be able to playback.
                if (aloneEnabled) {
                    notifyDetectedMotion(CursorMotionType.Alone, motion);
                }
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
                    // This type of events includes:
                    //   - cursor movement happens right after bracket completion
                    // We consider it an implicit cursor motion.
                    // We notify it so that it will be recorded to be able to playback.
                    notifyDetectedMotion(CursorMotionType.Trailing, motion);
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
        setAloneEnabled,
        processSelectionChangeEvent,

        isEnabled: function() { return enabled; } // testing purpose only
    }
};

module.exports = { CursorMotionDetector };
