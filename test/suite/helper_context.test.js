'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { HelperContext } = require('../../src/helper_context.js');

describe('HelperContext', () => {
    const HeadOfLine = HelperContext().ContextName.HeadOfLine;

    describe('reset', () => {
        it('should set initial context value (1)', () => {
            const helperContext = HelperContext();
            const textEditor = {
                selections: [ new vscode.Selection(3, 0, 3, 0) ]
            };
            helperContext.reset(textEditor);
            assert.strictEqual(helperContext.getContext(HeadOfLine), true);
        });
        it('should set initial context value (2)', () => {
            const helperContext = HelperContext();
            const textEditor = {
                selections: [ new vscode.Selection(2, 4, 2, 4) ]
            };
            helperContext.reset(textEditor);
            assert.strictEqual(helperContext.getContext(HeadOfLine), false);
        });
    });
    describe('processActiveTextEditorChangeEvent', () => {
        it('should update context value', () => {
            const helperContext = HelperContext();
            const textEditor1 = { selections: [ new vscode.Selection(2, 4, 2, 4) ] };
            const textEditor2 = { selections: [ new vscode.Selection(3, 0, 3, 0) ] };
            helperContext.reset(textEditor1);
            helperContext.processActiveTextEditorChangeEvent(textEditor2);
            assert.strictEqual(helperContext.getContext(HeadOfLine), true);
        });
    });
    describe('processSelectionChangeEvent', () => {
        it('should update context value', () => {
            const helperContext = HelperContext();
            const textEditor1 = { selections: [ new vscode.Selection(2, 4, 2, 4) ] };
            helperContext.reset(textEditor1);
            textEditor1.selections[0] = new vscode.Selection(3, 0, 3, 0);
            const event = { textEditor: textEditor1 };
            helperContext.processSelectionChangeEvent(event);
            assert.strictEqual(helperContext.getContext(HeadOfLine), true);
        });
    });
    describe('onChangeContext', () => {
        it('should set callback function', () => {
            const logs = [];
            const helperContext = HelperContext();
            helperContext.onChangeContext(({ name, value }) => {
                logs.push([ name, value ]);
            });

            const textEditor1 = { selections: [ new vscode.Selection(4, 1, 4, 1) ] };
            helperContext.reset(textEditor1);
            textEditor1.selections[0] = new vscode.Selection(4, 0, 4, 0);
            helperContext.processSelectionChangeEvent({ textEditor: textEditor1 });
            textEditor1.selections[0] = new vscode.Selection(4, 0, 4, 10);
            helperContext.processSelectionChangeEvent({ textEditor: textEditor1 });

            assert.deepStrictEqual(logs, [
                [ 'headOfLine', false ],
                [ 'headOfLine', true ],
                [ 'headOfLine', false ]
            ]);
        });
    });
    describe('headOfLine', () => {
        const helperContext = HelperContext();
        it('should be true if cursor is at head of a line', () => {
            helperContext.reset({ selections: [ new vscode.Selection(5, 0, 5, 0) ] });
            assert.strictEqual(helperContext.getContext(HeadOfLine), true);
        });
        it('should be false if cursor is not at head of a line', () => {
            helperContext.reset({ selections: [ new vscode.Selection(5, 1, 5, 1) ] });
            assert.strictEqual(helperContext.getContext(HeadOfLine), false);
        });
        it('should be false if selection is not empty', () => {
            helperContext.reset({ selections: [ new vscode.Selection(5, 0, 5, 10) ] });
            assert.strictEqual(helperContext.getContext(HeadOfLine), false);
        });
        it('should be false if there are multiple cursors', () => {
            helperContext.reset({ selections: [
                new vscode.Selection(5, 0, 5, 0),
                new vscode.Selection(6, 0, 6, 0)
            ] });
            assert.strictEqual(helperContext.getContext(HeadOfLine), false);
        });
    });
});
