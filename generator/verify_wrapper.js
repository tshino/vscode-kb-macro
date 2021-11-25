'use strict';
const assert = require('assert');
const genWrapperUtil = require('./gen_wrapper_util');

const PackageJsonPath = './package.json';
const ConfigPath = 'generator/config.json';

async function main() {
    const packageJson = await genWrapperUtil.readJSON(PackageJsonPath);
    const config = await genWrapperUtil.readJSON(ConfigPath);

    const keybindings = packageJson['contributes']['keybindings'];
    const header = config['header'] || [];
    const footer = config['footer'] || [];

    assert.deepStrictEqual(
        keybindings.slice(0, header.length),
        header,
        'default keybindings should start with exact copy of config\'s "header" section'
    );
    assert.deepStrictEqual(
        keybindings.slice(-footer.length),
        footer,
        'default keybindings should end with exact copy of config\'s "footer" section'
    );
}

main();
