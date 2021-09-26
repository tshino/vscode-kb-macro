'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TypingRecorder } = require('../../src/typing_recorder.js');

describe('TypingRecorder', () => {
    const typingRecorder = TypingRecorder();
    const textEditor = {
        document: {},
        selections: []
    };

    before(async () => {
        vscode.window.showInformationMessage('Started test for TypingRecorder.');
    });

    it('should detect typing and invoke callback function', async () => {
        const logs = [];
        typingRecorder.setOnDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: [ { text: 'a' } ]
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, ['a']);
    });
    it('should not perform detection without start()', async () => {
        const logs = [];
        typingRecorder.setOnDetectTyping(function({ args }) {
            logs.push(args.text);
        });

        typingRecorder.processDocumentChangeEvent({
            document: textEditor.document,
            contentChanges: [ { text: 'a' } ]
        });

        assert.deepStrictEqual(logs, []);
    });
    it('should not perform detection if the event is from different editor', async () => {
        const logs = [];
        typingRecorder.setOnDetectTyping(function({ args }) {
            logs.push(args.text);
        });
        const differentDocument = {};

        typingRecorder.start(textEditor);
        typingRecorder.processDocumentChangeEvent({
            document: differentDocument,
            contentChanges: [ { text: 'a' } ]
        });
        typingRecorder.stop();

        assert.deepStrictEqual(logs, []);
    });
});
