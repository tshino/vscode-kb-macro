'use strict';
const { readJSON, writeJSON } = require('./gen_wrapper_util');

// This script removes the content in the 'keybindings' section of the package.json.
// This is executed before running tests on GitHub Actions with macOS runners.
// See: https://github.com/tshino/vscode-kb-macro/pull/4
(async () => {
    const PackageJsonPath = './package.json';
    const packageJson = await readJSON(PackageJsonPath);
    packageJson['contributes']['keybindings'] = [];
    await writeJSON(PackageJsonPath, packageJson);
})();
