'use strict';

const TypingRecorder = function() {
    let onDetectTypingCallback  = null;
    let recording = false;
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
        targetTextEditor = textEditor;
    };
    const stop = function() {
        recording = false;
        targetTextEditor = null;
    };

    const processDocumentChangeEvent = function(event) {
        if (!recording) {
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
        const selections = Array.from(targetTextEditor.selections);
        selections.sort((a, b) => a.start.compareTo(b.start));

        const text0 = changes[0].text;
        const isUniformText = changes.every((chg) => chg.text === text0);
        if (changes.length === selections.length && isUniformText && text0 !== '') {
            const rangesOfChangeEqualSelections = changes.every((chg, i) => selections[i].isEqual(chg.range));
            if (rangesOfChangeEqualSelections) {
                notifyDetectedTyping(text0);
            }
        }
    };

    return {
        onDetectTyping,
        start,
        stop,
        processDocumentChangeEvent
    };
};

module.exports = { TypingRecorder };
