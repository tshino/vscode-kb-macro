'use strict';
const vscode = require('vscode');

const AwaitController = function() {
    const DefaultTimeout = 300;
    const documentChanged = [];
    const selectionChanged = [];

    const processDocumentChangeEvent = function() {
        const notifiers = Array.from(documentChanged);
        documentChanged.length = 0;
        for (let i = 0; i < notifiers.length; i++) {
            notifiers[i]();
        }
    };
    const processSelectionChangeEvent = function() {
        const notifiers = Array.from(selectionChanged);
        selectionChanged.length = 0;
        for (let i = 0; i < notifiers.length; i++) {
            notifiers[i]();
        }
    };
    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const waitForClipboardChange = async function(timeout) {
        const last = await vscode.env.clipboard.readText();
        let quit = false;
        setTimeout(() => { quit = true; }, timeout);
        while (!quit) {
            await sleep(5);
            const current = await vscode.env.clipboard.readText();
            if (current !== last) {
                return;
            }
        }
        throw 'timeout';
    };

    const waitFor = function(awaitOption, timeout = DefaultTimeout) {
        const awaitList = awaitOption.split(' ');
        const promises = [];
        let resolveFunc = null;
        let expectedEventCount = 0;
        const doneOne = function() {
            expectedEventCount -= 1;
            if (expectedEventCount == 0) {
                resolveFunc();
            }
        };
        for (let i = 0; i < awaitList.length; i++) {
            const e = awaitList[i];
            if (e === 'document') {
                expectedEventCount += 1;
                documentChanged.push(doneOne);
            } else if (e === 'selection') {
                expectedEventCount += 1;
                selectionChanged.push(doneOne);
            } else if (e === 'clipboard') {
                promises.push(waitForClipboardChange(timeout));
            } else if (e !== '') {
                console.error('Error (kb-macro): Unknown args.await parameter "' + e + '"');
            }
        }
        if (expectedEventCount !== 0) {
            promises.push(new Promise((resolve, reject) => {
                resolveFunc = resolve;
                setTimeout(() => {
                    if (0 < expectedEventCount) {
                        expectedEventCount = 0;
                        reject();
                    }
                }, timeout);
            }));
        }
        if (promises.length === 0) {
            return Promise.resolve(null);
        } else {
            return Promise.all(promises);
        }
    };

    return {
        processDocumentChangeEvent,
        processSelectionChangeEvent,
        waitFor
    };
};

module.exports = { AwaitController };
