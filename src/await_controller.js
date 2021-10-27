'use strict';

const AwaitController = function() {
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

    const waitFor = function(awaitOption) {
        const TIMEOUT = 300;
        const awaitList = awaitOption.split(' ');

        return new Promise((resolve, reject) => {
            let count = 0;
            const doneOne = function() {
                count -= 1;
                if (count == 0) {
                    resolve();
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
                }
            }
            if (count === 0) {
                resolve();
            } else {
                setTimeout(() => {
                    if (0 < count) {
                        count = 0;
                        reject();
                    }
                }, TIMEOUT);
            }
        });
    };

    return {
        processDocumentChangeEvent,
        processSelectionChangeEvent,
        waitFor
    };
};

module.exports = { AwaitController };
