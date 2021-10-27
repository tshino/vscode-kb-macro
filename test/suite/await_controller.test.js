'use strict';
const assert = require('assert');
const { TestUtil } = require('./test_util.js');
const { AwaitController } = require('../../src/await_controller.js');

describe('AwaitController', () => {
    const awaitController = AwaitController();

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
            const logs = [];
            const promise = awaitController.waitFor('document').then(
                () => logs.push('resolved'),
                () => logs.push('rejected')
            );
            logs.push('begin');
            await TestUtil.sleep(30);
            logs.push('waiting');
            awaitController.processDocumentChangeEvent({});
            await TestUtil.sleep(30);
            logs.push('check it out');
            await promise;
            assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'resolved', 'check it out' ]);
        });
        it('should fullfill after selection changed', async () => {
            const logs = [];
            const promise = awaitController.waitFor('selection').then(
                () => logs.push('resolved'),
                () => logs.push('rejected')
            );
            logs.push('begin');
            await TestUtil.sleep(30);
            logs.push('waiting');
            awaitController.processSelectionChangeEvent({});
            await TestUtil.sleep(30);
            logs.push('check it out');
            await promise;
            assert.deepStrictEqual(logs, [ 'begin', 'waiting', 'resolved', 'check it out' ]);
        });
        // TODO: add tests for failure cases (timeout)
        // TODO: add tests for combination of await option
    });
});
