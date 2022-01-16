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

const EndOfFileDetector = function(textEditor) {
    let lastDistanceBelow = endOfFileDetectorUtil.calculateDistanceBelow(textEditor);

    // whether distanceBelow[0] is predicted to decline or not
    let belowLinesDeclines = null;

    const reachedEndOfFile = function() {
        const distanceBelow = endOfFileDetectorUtil.calculateDistanceBelow(textEditor);
        const compBelow = endOfFileDetectorUtil.compareDistance(distanceBelow, lastDistanceBelow);
        if (distanceBelow[0] === 0 && distanceBelow[1] === 0) {
            // it reached the end of the document
            return true;
        }
        if (compBelow >= 0) {
            // distance to the bottom of the document should always decline, otherwise we stop
            return true;
        }
        if (belowLinesDeclines === null) {
            belowLinesDeclines = distanceBelow[0] < lastDistanceBelow[0];
        } else if (belowLinesDeclines) {
            if (distanceBelow[0] >= lastDistanceBelow[0]) {
                // rest lines below the cursor should decline consistently, otherwise, we stop
                return true;
            }
            if (distanceBelow[0] === 0) {
                // it reached the last line of the document
                return true;
            }
        }
        lastDistanceBelow = distanceBelow;
        return false;
    };

    return {
        reachedEndOfFile
    };
};

module.exports = {
    EndOfFileDetector,

    // testing purpose only
    endOfFileDetectorUtil
};
