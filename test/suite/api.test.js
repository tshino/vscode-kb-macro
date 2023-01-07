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
});
