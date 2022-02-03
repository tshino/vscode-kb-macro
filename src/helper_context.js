'use strict';

const HelperContext = function() {
    const ContextName = {
        HeadOfLine: 'headOfLine'
    };
    const contextValues = {
        headOfLine: null
    };
    let onChangeContextCallback = null;

    const onChangeContext = function(callback) {
        onChangeContextCallback = callback;
    };
    const update = function(textEditor) {
        if (!textEditor) {
            return;
        }
        const selections = textEditor.selections;
        const headOfLine = (
            selections[0].active.character === 0 &&
            selections[0].isEmpty &&
            selections.length === 1
        );
        if (contextValues.headOfLine !== headOfLine) {
            contextValues.headOfLine = headOfLine;
            if (onChangeContextCallback) {
                onChangeContextCallback({ name: ContextName.HeadOfLine, value: headOfLine });
            }
        }
    };

    const reset = function(textEditor) {
        update(textEditor);
    };
    const processActiveTextEditorChangeEvent = function(textEditor) {
        update(textEditor);
    };
    const processSelectionChangeEvent = function(event) {
        update(event.textEditor);
    };

    const getContext = function(name) {
        return contextValues[name];
    };

    return {
        ContextName,
        onChangeContext,
        reset,
        processActiveTextEditorChangeEvent,
        processSelectionChangeEvent,
        getContext
    };
};

module.exports = { HelperContext };
