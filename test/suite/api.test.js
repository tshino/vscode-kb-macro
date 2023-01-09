'use strict';
const assert = require('assert');
const { api, keyboardMacro } = require('../../src/extension.js');

describe('api', () => {
    describe('startBackgroundRecording', () => {
        it('should be an async function', () => {
            const func = api.startBackgroundRecording;
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'AsyncFunction');
        });
    });
    describe('stopBackgroundRecording', () => {
        it('should be an async function', () => {
            const func = api.stopBackgroundRecording;
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'AsyncFunction');
        });
    });
    describe('getRecentBackgroundRecords', () => {
        beforeEach(async () => {
            await api.stopBackgroundRecording();
            keyboardMacro.discardHistory();
        });
        it('should be a non-async function', () => {
            const func = api.getRecentBackgroundRecords;
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'Function');
        });
        it('should return the recent records of background recording', async () => {
            await api.startBackgroundRecording();
            await keyboardMacro.wrapSync({
                command: 'workbench.action.togglePanel'
            });
            await keyboardMacro.wrapSync({
                command: 'workbench.action.toggleSidebarVisibility'
            });
            await api.stopBackgroundRecording();

            assert.deepStrictEqual(
                api.getRecentBackgroundRecords(),
                [
                    {
                        command: 'workbench.action.togglePanel'
                    },
                    {
                        command: 'workbench.action.toggleSidebarVisibility'
                    }
                ]
            );
        });
    });
    describe('areEqualRecords', () => {
        it('should return true if given two records are equal', () => {
            const record1 = { command: 'c1' };
            const record2 = { command: 'c1' };

            assert.strictEqual(api.areEqualRecords(record1, record2), true);
        });
        it('should return false if given two records are not equal', () => {
            const record1 = { command: 'c1' };
            const record2 = { command: 'c2' };

            assert.strictEqual(api.areEqualRecords(record1, record2), false);
        });
        it('should return null for invalid arguments', () => {
            assert.strictEqual(api.areEqualRecords(null, null), null);
            assert.strictEqual(api.areEqualRecords({}, {}), null);
            assert.strictEqual(api.areEqualRecords({}, undefined), null);
            assert.strictEqual(api.areEqualRecords({ command: 1234 }, { command: 1234 }), null);
        });
    });
});
