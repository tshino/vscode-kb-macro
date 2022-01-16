'use strict';

const endOfFileDetectorUtil = (function() {
    const getCursorPosition = function(textEditor) {
        return textEditor.selections[textEditor.selections.length - 1].active;
    };
    const calculateDistanceBelow = function(textEditor) {
        if (!textEditor) {
            return [0, 0];
        }
        const lineCount = textEditor.document.lineCount;
        const currentLine = getCursorPosition(textEditor).line;
        const lineLength = textEditor.document.lineAt(currentLine).text.length;
        const currentChar = getCursorPosition(textEditor).character;
        return [
            Math.max(0, lineCount - 1 - currentLine),
            Math.max(0, lineLength - currentChar)
        ];
    };
    const compareDistance = function(a, b) {
        if (a[0] < b[0]) {
            return -1;
        } else if (a[0] > b[0]) {
            return 1;
        }
        if (a[1] < b[1]) {
            return -1;
        } else if (a[1] > b[1]) {
            return 1;
        }
        return 0;
    };
    return {
        getCursorPosition,
        calculateDistanceBelow,
        compareDistance
    };
})();

module.exports = {
    endOfFileDetectorUtil
};
