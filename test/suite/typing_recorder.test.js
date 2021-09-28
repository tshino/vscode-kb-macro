'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { TypingRecorder } = require('../../src/typing_recorder.js');

describe('TypingRecorder', () => {
    const typingRecorder = TypingRecorder();
    let textEditor;

    const setSelections = function(array) {
        textEditor.selections = TestUtil.arrayToSelections(array);
    };
    const makeContentChange = function(range, text) {
        const rangeOffset = textEditor.document.offsetAt(range.start);
        const rangeLength = textEditor.document.offsetAt(range.end) - rangeOffset;
        return { range, rangeOffset, rangeLength, text };
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

    it('should process events, detect typing and invoke the callback function', async () => {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        setSelections([[3, 0]]);
        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
            ]
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, ['a']);
    });
    it('should not perform detection without start() called', async () => {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        setSelections([[3, 0]]);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
            ]
        });

        assert.deepStrictEqual(logs, []);
    });
    it('should not perform detection if the event is from a different editor', async () => {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
        });
        const differentDocument = {};

        setSelections([[3, 0]]);
        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: differentDocument,
            contentChanges: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a')
            ]
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, []);
    });
    it('should ignore an event without any contentChange', async () => {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: []
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, []);
    });
    it('should ignore an event of empty text insertion', async () => {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        setSelections([[3, 0]]);
        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), '')
            ]
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, []);
    });
    it('should ignore an text insertion event that occurred at a location other than the cursor', async () => {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        setSelections([[3, 0]]);
        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: [
                makeContentChange(new vscode.Range(2, 0, 2, 0), 'a')
            ]
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, []);
    });
    it('should detect typing with multiple characters', async () => {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        setSelections([[3, 0]]);
        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'abc')
            ]
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, ['abc']);
    });
    it('should detect typing with multi-cursor (uniform text insertion)', async () => {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        setSelections([[3, 0], [4, 0]]);
        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a'),
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'a')
            ]
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, ['a']);
    });
    it('should ignore an event of multiple insertions with non-uniform texts', async () => {
        const logs = [];
        typingRecorder.onDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        setSelections([[3, 0], [4, 0]]);
        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: [
                makeContentChange(new vscode.Range(3, 0, 3, 0), 'a'),
                makeContentChange(new vscode.Range(4, 0, 4, 0), 'b')
            ]
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, []);
    });
});
