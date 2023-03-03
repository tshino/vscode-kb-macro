'use strict';
const path = require('path');
const Mocha = require('mocha');
const fs = require('fs');
const vscode = require('vscode');

function run() {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'bdd',
        color: true
    });
    mocha.timeout(10000);

    const testsRoot = path.resolve(__dirname, '.');

    // Activate the extension explicitly
    vscode.commands.executeCommand('kb-macro.cancelRecording');

    return new Promise((c, e) => {
        fs.readdir(testsRoot, (err, files) => {
            if (err) {
                return e(err);
            }

            // Add files to the test suite
            for (const f of files) {
                if (f.endsWith('.test.js')) {
                    mocha.addFile(path.resolve(testsRoot, f));
                }
            }

            try {
                // Run the mocha test
                mocha.run(failures => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        c();
                    }
                });
            } catch (err) {
                console.error(err);
                e(err);
            }
        });
    }).finally(() => {
        return vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
}

module.exports = {
    run
};
