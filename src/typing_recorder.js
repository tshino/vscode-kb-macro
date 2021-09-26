'use strict';

const TypingRecorder = function() {
    let onDetectTyping  = null;
    let recording = false;
    let targetTextEditor = null;

    const setOnDetectTyping = function(callback) {
        onDetectTyping = callback;
    };
    const notifyDetectedTyping = function(text) {
        if (onDetectTyping) {
            onDetectTyping({
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
        // console.log('chg', changes);
        notifyDetectedTyping(changes[0].text);
    };

    return {
        setOnDetectTyping,
        start,
        stop,
        processDocumentChangeEvent
    };
};

module.exports = { TypingRecorder };
