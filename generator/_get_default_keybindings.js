'use strict';
const path = require('path');
const fsPromises = require('fs/promises');
const { runTests } = require('@vscode/test-electron');
const { readJSON, writeJSON } = require('./gen_wrapper_util');

async function main() {
    try {
        // Remove the content in the 'contributes' section of the package.json to avoid contamination.
        const PackageJsonPath = path.resolve(__dirname, '../package.json');
        const packageJson = await readJSON(PackageJsonPath);
        packageJson['contributes'] = {};
        await writeJSON(PackageJsonPath, packageJson);

        // Make two empty directories to use to launch VS Code with the cleanest possible profile.
        const emptyDir1 = path.resolve(__dirname, '../empty1');
        const emptyDir2 = path.resolve(__dirname, '../empty2');
        await fsPromises.mkdir(emptyDir1, { recursive: true });
        await fsPromises.mkdir(emptyDir2, { recursive: true });

        // Path to the script that retrieves and saves the default keybindings JSON to a file.
        const scriptPath = path.resolve(__dirname, './_get_default_keybindings_impl.js');

        // Download VS Code, unzip it, launch it without extensions, and run the script.
        await runTests({
            extensionDevelopmentPath: path.resolve(__dirname, '../'),
            extensionTestsPath: scriptPath,
            launchArgs: [
                '--extensions-dir',
                emptyDir1,
                '--user-data-dir',
                emptyDir2
            ]
        });
    } catch (err) {
        console.error('Failed to run');
        process.exit(1);
    }
}

main();
