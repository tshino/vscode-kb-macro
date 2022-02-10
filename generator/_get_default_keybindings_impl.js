'use strict';
const path = require('path');
const fsPromises = require('fs/promises');
const vscode = require('vscode');

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

async function openDefaultKeybindingsFile() {
    return await new Promise((resolve, reject) => {
        const listener = vscode.window.onDidChangeVisibleTextEditors(textEditors => {
            for (const textEditor of textEditors) {
                const uri = textEditor.document.uri;
                if (uri.scheme === 'vscode' && path.basename(uri.path) === 'keybindings.json') {
                    listener.dispose();
                    resolve(textEditor.document);
                }
            }
        });
        vscode.commands.executeCommand('workbench.action.openDefaultKeybindingsFile').then(() => {
            setTimeout(() => {
                console.error('timeout');
                listener.dispose();
                reject();
            }, 10 * 1000);
        });
    });
}

async function run() {
    await sleep(2000);
    const document = await openDefaultKeybindingsFile();
    const json = document.getText();
    const signature = `// Default Keybindings of ${vscode.env.appName} ${vscode.version}\n`
    const outputPath = path.resolve(__dirname, '../default-keybindings.json');
    await fsPromises.writeFile(outputPath, signature + json);
    console.log(`The default keybindings JSON has been successfully saved to ${outputPath}.`);
}

module.exports = {
    run
};
