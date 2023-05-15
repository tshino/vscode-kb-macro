'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { AwaitController } = require('../../src/await_controller.js');

describe('AwaitController', () => {
    const awaitController = AwaitController();

    const withRetries = async (maxRetries, testBody) => {
        while (0 < maxRetries--) {
            let doRetry = false;
            await testBody(() => { doRetry = true; });
            if (!doRetry) {
                return;
            }
        }
        console.warn('TIMEOUT!');
    };

    describe('waitFor', () => {
        it('should immediately fullfill if option is empty', async () => {
            const logs = [];
            const promise = awaitController.waitFor('').then(
                () => logs.push('resolved'),
                () => logs.push('rejected')
            );
            logs.push('begin');
            await TestUtil.sleep(0);
            logs.push('check it out');
            await promise;
            assert.deepStrictEqual(logs, [ 'begin', 'resolved', 'check it out' ]);
        });
        it('should fullfill after document changed', async () => {
            await withRetries(3, async (retry) => {
                const logs = [];
                let rejected = false;
                const promise = awaitController.waitFor('document').then(
                    () => logs.push('resolved'),
                    () => { rejected = true; }
                );
                logs.push('begin');
                await TestUtil.sleep(50);
                logs.push('waiting');
                awaitController.processDocumentChangeEvent({});
                await promise;
                if (rejected) { // timeout
                    retry();
                } else {
                    assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'resolved' ]);
                }
            });
        });
        it('should fullfill after selection changed', async () => {
            await withRetries(3, async (retry) => {
                const logs = [];
                let rejected = false;
                const promise = awaitController.waitFor('selection').then(
                    () => logs.push('resolved'),
                    () => { rejected = true; }
                );
                logs.push('begin');
                await TestUtil.sleep(50);
                logs.push('waiting');
                awaitController.processSelectionChangeEvent({});
                await promise;
                if (rejected) { // timeout
                    retry();
                } else {
                    assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'resolved' ]);
                }
            });
        });
        it('should fullfill after clipboard text changed', async () => {
            await withRetries(3, async (retry) => {
                const logs = [];
                await vscode.env.clipboard.writeText('HELLO');
                let rejected = false;
                const promise = awaitController.waitFor('clipboard').then(
                    () => logs.push('resolved'),
                    () => { rejected = true; }
                );
                logs.push('begin');
                await TestUtil.sleep(50);
                logs.push('waiting');
                await vscode.env.clipboard.writeText('WORLD');
                await promise;
                if (rejected) { // timeout
                    retry();
                } else {
                    assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'resolved' ]);
                }
            });
        });
        it('should fullfill after both document and selection changed', async () => {
            const logs = [];
            const promise = awaitController.waitFor('document selection').then(
                () => logs.push('resolved'),
                () => logs.push('rejected')
            );
            logs.push('begin');
            await TestUtil.sleep(30);
            logs.push('waiting');
            awaitController.processSelectionChangeEvent({});
            await TestUtil.sleep(30);
            logs.push('waiting');
            awaitController.processDocumentChangeEvent({});
            await TestUtil.sleep(30);
            logs.push('check it out');
            await promise;
            assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'waiting', 'resolved', 'check it out' ]);
        });
        it('should fullfill after all of document, selection and clipboard changed', async () => {
            const logs = [];
            await vscode.env.clipboard.writeText('HELLO');
            const promise = awaitController.waitFor('document selection clipboard').then(
                () => logs.push('resolved'),
                () => logs.push('rejected')
            );
            logs.push('begin');
            await TestUtil.sleep(30);
            logs.push('waiting');
            awaitController.processSelectionChangeEvent({});
            await TestUtil.sleep(30);
            logs.push('waiting');
            awaitController.processDocumentChangeEvent({});
            await TestUtil.sleep(30);
            logs.push('waiting');
            await vscode.env.clipboard.writeText('WORLD');
            await promise;
            assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'waiting', 'waiting', 'resolved' ]);
        });
        it('should fail if timeout (document)', async () => {
            const logs = [];
            const promise = awaitController.waitFor('document').then(
                () => logs.push('resolved'),
                () => logs.push('rejected')
            );
            logs.push('begin');
            await TestUtil.sleep(30);
            logs.push('waiting');
            await promise;
            assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'rejected' ]);
        });
        it('should fail if timeout (selection)', async () => {
            const logs = [];
            const promise = awaitController.waitFor('selection').then(
                () => logs.push('resolved'),
                () => logs.push('rejected')
            );
            logs.push('begin');
            await TestUtil.sleep(30);
            logs.push('waiting');
            await promise;
            assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'rejected' ]);
        });
        it('should fail if timeout (clipboard)', async () => {
            const logs = [];
            const promise = awaitController.waitFor('clipboard').then(
                () => logs.push('resolved'),
                () => logs.push('rejected')
            );
            logs.push('begin');
            await TestUtil.sleep(30);
            logs.push('waiting');
            await promise;
            assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'rejected' ]);
        });
        it('should fail if timeout (document selection clipboard)', async () => {
            const logs = [];
            const promise = awaitController.waitFor('document selection clipboard').then(
                () => logs.push('resolved'),
                () => logs.push('rejected')
            );
            logs.push('begin');
            await TestUtil.sleep(30);
            logs.push('waiting');
            await promise;
            assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'rejected' ]);
        });
    });
});
