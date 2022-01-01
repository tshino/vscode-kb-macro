'use strict';
const { readJSON, writeJSON } = require('./gen_wrapper_util');

(async () => {
    const PackageJsonPath = './package.json';
    const packageJson = await readJSON(PackageJsonPath);
    packageJson['contributes']['keybindings'] = [];
    await writeJSON(PackageJsonPath, packageJson);
})();
