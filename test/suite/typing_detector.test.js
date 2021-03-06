'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { TypingDetector } = require('../../src/typing_detector.js');

describe('TypingDetector', () => {
    const typingDetector = TypingDetector();
    let textEditor;

    const setupDetectedTypingLog = function() {
        const logs = [];
        typingDetector.onDetectTyping(function(type, args) {
            logs.push([ type, args ]);
        });
        return logs;
    };
    const setSelections = function(array) {
        textEditor.selections = TestUtil.arrayToSelections(array);
    };
    const makeContentChange = function(range, text) {
        const rangeOffset = textEditor.document.offsetAt(range.start);
        const rangeLength = textEditor.document.offsetAt(range.end) - rangeOffset;
        return { range, rangeOffset, rangeLength, text };
    };
    const processEvents = function(contentChanges) {
        typingDetector.start();
        typingDetector.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: contentChanges
        });
        typingDetector.stop();
    };
    const isSorted = function(selections) {
        for (let i = 1; i < selections.length; i++) {
            if (!selections[i - 1].start.isBefore(selections[i].start)) {
                return false;
            }
        }
        return true;
    };
    const checkResult = function(logs, { expectedLogs, expectedPrediction }) {
        assert.deepStrictEqual(logs, expectedLogs);
        if (expectedPrediction !== undefined) {
            const prediction = typingDetector.getPrediction(textEditor);
            if (prediction) {
                assert.strictEqual(isSorted(prediction), true);
            }
            if (expectedPrediction === null || prediction === null) {
                assert.strictEqual(prediction, expectedPrediction);
            } else {
                assert.deepStrictEqual(
                    TestUtil.selectionsToArray(prediction),
                    expectedPrediction
                );
            }
        }
    };
    const testDetection = function({ changes, precond, expectedLogs, expectedPrediction }) {
        const logs = setupDetectedTypingLog();
        setSelections(precond);

        processEvents(changes);

        checkResult(logs, { expectedLogs, expectedPrediction });
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for TypingDetector.');
        textEditor = await TestUtil.setupTextEditor({
            content: (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            )
        });
        assert.strictEqual(textEditor, vscode.window.activeTextEditor);
    });

    describe('direct typing detection', async () => {
        it('should process events, detect typing and invoke the callback function', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
            ], precond: [[3, 0]], expectedLogs: [[0, {text:'a'}]], expectedPrediction: [[3, 1]] });
        });
        it('should not perform detection without start() called', async () => {
            const logs = setupDetectedTypingLog();

            setSelections([[3, 0]]);
            // <-- no start()
            typingDetector.processDocumentChangeEvent({
                document: textEditor.document,
                contentChanges: [
                    makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
                ]
            });

            checkResult(logs, { expectedLogs: [] });
        });
        it('should not perform detection if the event is for a document other than the one for current active editor', async () => {
            const logs = setupDetectedTypingLog();
            const differentDocument = {};

            setSelections([[3, 0]]);
            typingDetector.start();
            typingDetector.processDocumentChangeEvent({
                document: differentDocument, // <-- !!
                contentChanges: [
                    makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
                ]
            });
            typingDetector.stop();

            checkResult(logs, { expectedLogs: [], expectedPrediction: null });
        });
        it('should ignore an event without any contentChange', async () => {
            const logs = setupDetectedTypingLog();

            setSelections([[4, 0]]);
            processEvents([]);

            checkResult(logs, { expectedLogs: [], expectedPrediction: null });
        });
        it('should ignore an event of empty text insertion', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), '')
            ], precond: [[3, 0]], expectedLogs: [], expectedPrediction: null });
        });
        it('should ignore an text insertion event that occurred at a location other than the cursor', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(2, 0, 2, 0), 'a')
            ], precond: [[3, 0]], expectedLogs: [], expectedPrediction: null });
        });
        it('should detect typing occurred at predicted cursor location', async () => {
            const logs = setupDetectedTypingLog();
            setSelections([[2, 0]]);

            typingDetector.start();
            typingDetector.setPrediction(textEditor, TestUtil.arrayToSelections([[3, 0]]));
            typingDetector.processDocumentChangeEvent({
                document: textEditor.document,
                contentChanges: [
                    makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
                ]
            });
            typingDetector.stop();

            checkResult(logs, { expectedLogs: [[0, {text:'a'}]], expectedPrediction: [[3, 1]] });
        });
        it('should detect typing occurred after failed prediction', async () => {
            const logs = setupDetectedTypingLog();
            setSelections([[2, 0], [3, 0]]);

            typingDetector.start();
            typingDetector.setPrediction(textEditor, TestUtil.arrayToSelections([[4, 0], [5, 0], [6, 0]]));
            setSelections([[3, 0], [4, 0]]); // prediction failure
            typingDetector.processSelectionChangeEvent({
                textEditor,
                selections: textEditor.selections
            });
            typingDetector.processDocumentChangeEvent({
                document: textEditor.document,
                contentChanges: [
                    makeContentChange(new vscode.Range(3, 0, 3, 0), 'a'),
                    makeContentChange(new vscode.Range(4, 0, 4, 0), 'a')
                ]
            });
            typingDetector.stop();

            checkResult(logs, { expectedLogs: [[0, {text:'a'}]], expectedPrediction: [[3, 1], [4, 1]] });
        });
        it('should detect typing with multiple characters', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'abc')
            ], precond: [[3, 0]], expectedLogs: [[0, {text:'abc'}]], expectedPrediction: [[3, 3]] });
        });
        it('should detect typing with multi-cursor (uniform text insertion)', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a'),
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'a')
            ], precond: [[3, 0], [4, 0]], expectedLogs: [[0, {text:'a'}]], expectedPrediction: [[3, 1], [4, 1]] });
        });
        it('should detect typing with multi-cursor that occurred in a single line', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'ab'),
                makeContentChange(new vscode.Range(3, 4, 3, 4), 'ab')
            ], precond: [[3, 0], [3, 4]], expectedLogs: [[0, {text:'ab'}]], expectedPrediction: [[3, 2], [3, 8]] });
        });
        it('should detect typing with multi-cursor that extends backward', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a'),
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'a')
            ], precond: [[4, 0], [3, 0]], expectedLogs: [[0, {text:'a'}]], expectedPrediction: [[3, 1], [4, 1]] });
            // Note, the prediction is always expected to be sorted.
        });
        it('should detect typing with multi-cursor even if the document changes are reported in reverse order', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'a'),
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
            ], precond: [[3, 0], [4, 0]], expectedLogs: [[0, {text:'a'}]], expectedPrediction: [[3, 1], [4, 1]] });
        });
        it('should ignore an event of multiple insertions with non-uniform texts', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a'),
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'b')
            ], precond: [[3, 0], [4, 0]], expectedLogs: [], expectedPrediction: null });
        });
        it('should detect typing with a selection', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x')
            ], precond: [[12, 1, 12, 3]], expectedLogs: [[0, {text:'x'}]], expectedPrediction: [[12, 2]] });
        });
        it('should detect typing with a selection that is reversed', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x')
            ], precond: [[12, 3, 12, 1]], expectedLogs: [[0, {text:'x'}]], expectedPrediction: [[12, 2]] });
        });
        it('should detect typing with a selection that contains a line-break', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 2, 13, 1), 'x')
            ], precond: [[12, 2, 13, 1]], expectedLogs: [[0, {text:'x'}]], expectedPrediction: [[12, 3]] });
        });
        it('should detect typing with multiple selections', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x'),
                makeContentChange(new vscode.Range(13, 1, 13, 3), 'x')
            ], precond: [[12, 1, 12, 3], [13, 1, 13, 3]],
            expectedLogs: [[0, {text:'x'}]], expectedPrediction: [[12, 2], [13, 2]] });
        });
        it('should detect typing with multiple selections that occurred in a single line', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(22, 1, 22, 3), 'x'),
                makeContentChange(new vscode.Range(22, 5, 22, 7), 'x')
            ], precond: [[22, 1, 22, 3], [22, 5, 22, 7]],
            expectedLogs: [[0, {text:'x'}]], expectedPrediction: [[22, 2], [22, 5]] });
        });
        it('should detect typing with multiple selections that are reversed', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x'),
                makeContentChange(new vscode.Range(13, 1, 13, 3), 'x')
            ], precond: [[12, 3, 12, 1], [13, 3, 13, 1]],
            expectedLogs: [[0, {text:'x'}]], expectedPrediction: [[12, 2], [13, 2]] });
        });
        it('should detect typing with multiple selections that extends backward', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x'),
                makeContentChange(new vscode.Range(13, 1, 13, 3), 'x')
            ], precond: [[13, 3, 13, 1], [12, 3, 12, 1]],
            expectedLogs: [[0, {text:'x'}]], expectedPrediction: [[12, 2], [13, 2]] });
        });
        it('should detect typing with multiple selections that contain line-breaks', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 1, 13, 3), 'x'),
                makeContentChange(new vscode.Range(14, 1, 15, 3), 'x')
            ], precond: [[12, 1, 13, 3], [14, 1, 15, 3]],
            expectedLogs: [[0, {text:'x'}]], expectedPrediction: [[12, 2], [13, 2]] });
        });
        it('should detect typing of text contains line-breaks with multiple selections', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x\ny'),
                makeContentChange(new vscode.Range(13, 1, 13, 3), 'x\ny')
            ], precond: [[12, 1, 12, 3], [13, 1, 13, 3]],
            expectedLogs: [[0, {text:'x\ny'}]], expectedPrediction: [[13, 1], [15, 1]] });
        });
        it('should detect typing of text contains line-breaks with multiple selections that also contain line-breaks', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 1, 13, 3), 'x\ny'),
                makeContentChange(new vscode.Range(14, 1, 15, 3), 'x\ny')
            ], precond: [[12, 1, 13, 3], [14, 1, 15, 3]],
            expectedLogs: [[0, {text:'x\ny'}]], expectedPrediction: [[13, 1], [15, 1]] });
        });
    });
    describe('code completion detection', async () => {
        it('should process events, detect code completion and invoke the callback function (1)', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(10, 0, 10, 4), 'ABCDE')
            ], precond: [[10, 4]],
            expectedLogs: [[0, {text:'ABCDE', deleteLeft:4}]],
            expectedPrediction: [[10, 5]] });
        });
        it('should process events, detect code completion and invoke the callback function (2)', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(20, 4, 20, 8), 'EFGHI')
            ], precond: [[20, 8]],
            expectedLogs: [[0, {text:'EFGHI', deleteLeft:4}]],
            expectedPrediction: [[20, 9]] });
        });
        it('should process events, detect code completion and invoke the callback function (3)', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(20, 4, 20, 6), '"key": ""')
            ], precond: [[20, 5]],
            expectedLogs: [[0, {text:'"key": ""', deleteLeft:1, deleteRight:1}]],
            expectedPrediction: [[20, 13]] });
        });
        it('should not make prediction if no change is expected', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(10, 0, 10, 4), 'Abcd')
            ], precond: [[10, 4]],
            expectedLogs: [[0, {text:'Abcd', deleteLeft:4}]],
            expectedPrediction: null });
        });
        // TODO: add more tests for code completion detection
    });
    describe('bracket completion detection', async () => {
        it('should process events, detect bracket completion and invoke the callback function (1)', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), '()')
            ], precond: [[3, 0]], expectedLogs: [[0, {text:'()'}]], expectedPrediction: [[3, 2]] });
        });
        it('should process events, detect bracket completion and invoke the callback function (2)', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(4, 0, 4, 0), '{}'),
                makeContentChange(new vscode.Range(5, 0, 5, 0), '{}')
            ], precond: [[4, 0], [5, 0]], expectedLogs: [[0, {text:'{}'}]], expectedPrediction: [[4, 2], [5, 2]] });
        });
        it('should process events, detect bracket completion and invoke the callback function (3)', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 0, 12, 0), '['),
                makeContentChange(new vscode.Range(12, 4, 12, 4), ']')
            ], precond: [[12, 0, 12, 4]],
            expectedLogs: [[1, {text:'['}]], expectedPrediction: [[12, 1, 12, 5]] });
        });
        it('should process events, detect bracket completion and invoke the callback function (4)', async () => {
            testDetection({ changes: [
                makeContentChange(new vscode.Range(12, 0, 12, 0), '['),
                makeContentChange(new vscode.Range(12, 4, 12, 4), ']'),
                makeContentChange(new vscode.Range(22, 4, 22, 4), '['),
                makeContentChange(new vscode.Range(22, 8, 22, 8), ']')
            ], precond: [[12, 0, 12, 4], [22, 4, 22, 8]],
            expectedLogs: [[1, {text:'['}]], expectedPrediction: [[12, 1, 12, 5], [22, 5, 22, 9]] });
        });
    });
    // TODO: add more tests for inputs with IME
});
