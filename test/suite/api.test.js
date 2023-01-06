'use strict';
const assert = require('assert');
const { api } = require('../../src/extension.js');

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
});
