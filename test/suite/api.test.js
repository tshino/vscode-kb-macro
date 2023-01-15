'use strict';
const assert = require('assert');
const { api, keyboardMacro } = require('../../src/extension.js');

describe('api', () => {
    describe('newSession', () => {
        let session = null;
        afterEach(async () => {
            if (session) {
                await session.close();
                session = null;
            }
        });
        it('should be a non-async function', () => {
            const func = api.newSession;
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'Function');
        });
        it('should create a new session with background recording APIs', () => {
            session = api.newSession();
            assert.strictEqual('startRecording' in session, true);
            assert.strictEqual('stopRecording' in session, true);
            assert.strictEqual('getRecentSequence' in session, true);
            assert.strictEqual('areEqualRecords' in session, true);
            assert.strictEqual('close' in session, true);
        });
    });
    describe('workaround for early dynamic-macro extension', () => {
        it('should have old style APIs', () => {
            assert.strictEqual('startBackgroundRecording' in api, true);
            assert.strictEqual('stopBackgroundRecording' in api, true);
            assert.strictEqual('getRecentBackgroundRecords' in api, true);
            assert.strictEqual('areEqualRecords' in api, true);
        });
    });
    describe('session.startRecording', () => {
        let session = null;
        beforeEach(async () => {
            session = api.newSession();
        });
        afterEach(async () => {
            await session.close();
        });
        it('should be an async function', () => {
            const func = session.startRecording;
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'AsyncFunction');
        });
    });
    describe('session.stopRecording', () => {
        let session = null;
        beforeEach(async () => {
            session = api.newSession();
        });
        afterEach(async () => {
            await session.close();
        });
        it('should be an async function', () => {
            const func = session.stopRecording;
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'AsyncFunction');
        });
    });
    describe('session.getRecentSequence', () => {
        let session = null;
        beforeEach(async () => {
            session = api.newSession();
        });
        afterEach(async () => {
            await session.close();
        });
        it('should be a non-async function', () => {
            const func = session.getRecentSequence;
            assert.strictEqual(typeof func, 'function');
            assert.strictEqual(func.constructor.name, 'Function');
        });
        it('should return the recent records of background recording', async () => {
            await session.startRecording();
            await keyboardMacro.wrapSync({
                command: 'workbench.action.togglePanel'
            });
            await keyboardMacro.wrapSync({
                command: 'workbench.action.toggleSidebarVisibility'
            });
            await session.stopRecording();

            assert.deepStrictEqual(
                session.getRecentSequence(),
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
    describe('session.areEqualRecords', () => {
        let session = null;
        beforeEach(async () => {
            session = api.newSession();
        });
        afterEach(async () => {
            await session.close();
        });
        it('should return true if given two records are equal', () => {
            const record1 = { command: 'c1' };
            const record2 = { command: 'c1' };

            assert.strictEqual(session.areEqualRecords(record1, record2), true);
        });
        it('should return false if given two records are not equal', () => {
            const record1 = { command: 'c1' };
            const record2 = { command: 'c2' };

            assert.strictEqual(session.areEqualRecords(record1, record2), false);
        });
        it('should return null for invalid arguments', () => {
            assert.strictEqual(session.areEqualRecords(null, null), null);
            assert.strictEqual(session.areEqualRecords({}, {}), null);
            assert.strictEqual(session.areEqualRecords({}, undefined), null);
            assert.strictEqual(session.areEqualRecords({ command: 1234 }, { command: 1234 }), null);
        });
    });
});
