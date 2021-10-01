'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { TypingRecorder } = require('../../src/typing_recorder.js');

describe('TypingRecorder', () => {
    const typingRecorder = TypingRecorder();
    let textEditor;

    const setupDetectedTypingLog = function() {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
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
    const record = function(contentChanges) {
        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: contentChanges
        });
        typingRecorder.stop();
    };
    const checkResult = function(logs, { expectedLogs, expectedPrediction }) {
        assert.deepStrictEqual(logs, expectedLogs);
        if (expectedPrediction) {
            const prediction = typingRecorder.getExpectedSelections();
            assert.deepStrictEqual(
                TestUtil.selectionsToArray(prediction),
                expectedPrediction
            );
        }
    };
    const testRecording = function({ changes, precond, expectedLogs, expectedPrediction }) {
        const logs = setupDetectedTypingLog();
        setSelections(precond);

        record(changes);

        checkResult(logs, { expectedLogs, expectedPrediction });
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for TypingRecorder.');
        textEditor = await TestUtil.setupTextEditor({
            content: (
                '\n'.repeat(10) +
                'abcd\n'.repeat(10) +
                '    efgh\n'.repeat(10)
            )
        });
    });

    describe('direct typing', async () => {
        it('should process events, detect typing and invoke the callback function', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
            ], precond: [[3, 0]], expectedLogs: ['a'], expectedPrediction: [[3, 1]] });
        });
        it('should not perform detection without start() called', async () => {
            const logs = setupDetectedTypingLog();

            setSelections([[3, 0]]);
            // <-- no start()
            typingRecorder.processDocumentChangeEvent({
                document: textEditor.document,
                contentChanges: [
                    makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
                ]
            });

            checkResult(logs, { expectedLogs: [] });
        });
        it('should not perform detection if the event is from a different editor', async () => {
            const logs = setupDetectedTypingLog();
            const differentDocument = {};

            setSelections([[3, 0]]);
            typingRecorder.start(textEditor);
            typingRecorder.processDocumentChangeEvent({
                document: differentDocument, // <-- !!
                contentChanges: [
                    makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
                ]
            });
            typingRecorder.stop();

            checkResult(logs, { expectedLogs: [], expectedPrediction: [[3, 0]] });
        });
        it('should ignore an event without any contentChange', async () => {
            const logs = setupDetectedTypingLog();

            setSelections([[4, 0]]);
            record([]);

            checkResult(logs, { expectedLogs: [], expectedPrediction: [[4, 0]] });
        });
        it('should ignore an event of empty text insertion', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), '')
            ], precond: [[3, 0]], expectedLogs: [], expectedPrediction: [[3, 0]] });
        });
        it('should ignore an text insertion event that occurred at a location other than the cursor', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(2, 0, 2, 0), 'a')
            ], precond: [[3, 0]], expectedLogs: [], expectedPrediction: [[3, 0]] });
        });
        it('should detect typing with multiple characters', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'abc')
            ], precond: [[3, 0]], expectedLogs: ['abc'], expectedPrediction: [[3, 3]] });
        });
        it('should detect typing with multi-cursor (uniform text insertion)', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a'),
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'a')
            ], precond: [[3, 0], [4, 0]], expectedLogs: ['a'], expectedPrediction: [[3, 1], [4, 1]] });
        });
        it('should detect typing with multi-cursor that extends backward', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a'),
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'a')
            ], precond: [[4, 0], [3, 0]], expectedLogs: ['a'], expectedPrediction: [[3, 1], [4, 1]] });
            // Note, the prediction is always expected to be sorted.
        });
        it('should detect typing with multi-cursor even if the document changes are reported in reverse order', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'a'),
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
            ], precond: [[3, 0], [4, 0]], expectedLogs: ['a'], expectedPrediction: [[3, 1], [4, 1]] });
        });
        it('should ignore an event of multiple insertions with non-uniform texts', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a'),
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'b')
            ], precond: [[3, 0], [4, 0]], expectedLogs: [], expectedPrediction: [[3, 0], [4, 0]] });
        });
        it('should detect typing with a selection', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x')
            ], precond: [[12, 1, 12, 3]], expectedLogs: ['x'], expectedPrediction: [[12, 2]] });
        });
        it('should detect typing with a selection that is reversed', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x')
            ], precond: [[12, 3, 12, 1]], expectedLogs: ['x'], expectedPrediction: [[12, 2]] });
        });
        it('should detect typing with a selection that contains a line-break', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(12, 2, 13, 1), 'x')
            ], precond: [[12, 2, 13, 1]], expectedLogs: ['x'], expectedPrediction: [[12, 3]] });
        });
        it('should detect typing with multiple selections', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x'),
                makeContentChange(new vscode.Range(13, 1, 13, 3), 'x')
            ], precond: [[12, 1, 12, 3], [13, 1, 13, 3]],
            expectedLogs: ['x'], expectedPrediction: [[12, 2], [13, 2]] });
        });
        it('should detect typing with multiple selections that are reversed', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x'),
                makeContentChange(new vscode.Range(13, 1, 13, 3), 'x')
            ], precond: [[12, 3, 12, 1], [13, 3, 13, 1]],
            expectedLogs: ['x'], expectedPrediction: [[12, 2], [13, 2]] });
        });
        it('should detect typing with multiple selections that extends backward', async () => {
            testRecording({ changes: [
                makeContentChange(new vscode.Range(12, 1, 12, 3), 'x'),
                makeContentChange(new vscode.Range(13, 1, 13, 3), 'x')
            ], precond: [[13, 3, 13, 1], [12, 3, 12, 1]],
            expectedLogs: ['x'], expectedPrediction: [[12, 2], [13, 2]] });
        });
    });
});
