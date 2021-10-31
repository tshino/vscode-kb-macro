'use strict';

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

    const waitFor = function(awaitOption, timeout = DefaultTimeout) {
        const awaitList = awaitOption.split(' ');
        let resolveFunc = null;
        let count = 0;
        const doneOne = function() {
            count -= 1;
            if (count == 0) {
                resolveFunc();
            }
        };
        for (let i = 0; i < awaitList.length; i++) {
            const e = awaitList[i];
            if (e === 'document') {
                count += 1;
                documentChanged.push(doneOne);
            } else if (e === 'selection') {
                count += 1;
                selectionChanged.push(doneOne);
            } else if (e !== '') {
                console.error('Error (kb-macro): Unknown args.await parameter "' + e + '"');
            }
        }
        if (count === 0) {
            return Promise.resolve(null);
        } else {
            return new Promise((resolve, reject) => {
                resolveFunc = resolve;
                setTimeout(() => {
                    if (0 < count) {
                        count = 0;
                        reject();
                    }
                }, timeout);
            });
        }
    };

    return {
        processDocumentChangeEvent,
        processSelectionChangeEvent,
        waitFor
    };
};

module.exports = { AwaitController };
