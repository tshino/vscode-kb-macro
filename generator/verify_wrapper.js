'use strict';
const assert = require('assert');
const genWrapperUtil = require('./gen_wrapper_util');

const PackageJsonPath = './package.json';
const ConfigPath = 'generator/config.json';

const containsWhenContext = function(when, context) {
    if (when) {
        return when.split('||').every(cond => {
            return cond.split('&&').some(cond => {
                return cond.trim() === context;
            });
        });
    }
    return false;
}

const availableOnWindows = function(keybinding) {
    return (
        !containsWhenContext(keybinding.when, 'isLinux') &&
        !containsWhenContext(keybinding.when, 'isMac') &&
        !containsWhenContext(keybinding.when, '!isWindows') &&
        !/\bmeta\b/.test(keybinding.key) &&
        !/\bcmd\b/.test(keybinding.key)
    );
}
const availableOnLinux = function(keybinding) {
    return (
        !containsWhenContext(keybinding.when, 'isWindows') &&
        !containsWhenContext(keybinding.when, 'isMac') &&
        !containsWhenContext(keybinding.when, '!isLinux') &&
        !/\bwin\b/.test(keybinding.key) &&
        !/\bcmd\b/.test(keybinding.key)
    );
}
const availableOnMac = function(keybinding) {
    return (
        !containsWhenContext(keybinding.when, 'isWindows') &&
        !containsWhenContext(keybinding.when, 'isLinux') &&
        !containsWhenContext(keybinding.when, '!isMac') &&
        (
            (
                !/\bwin\b/.test(keybinding.key) &&
                !/\bmeta\b/.test(keybinding.key)
            ) || (
                'mac' in keybinding
            )
        )
    );
}

async function verifyWrapper() {
    const packageJson = await genWrapperUtil.readJSON(PackageJsonPath);
    const config = await genWrapperUtil.readJSON(ConfigPath);

    // const exclusion = new Set(config['exclusion'] || []);
    // const awaitOptions = new Map(config['awaitOptions'] || []);

    const baseKeybindings = await genWrapperUtil.loadBaseKeybindings(config['baseKeybindings'] || []);

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

    const wrappers = keybindings.slice(header.length, -footer.length);

    // Windows
    {
        const wrapper = wrappers.filter(availableOnWindows);
        const base = baseKeybindings.filter(({ context }) => context === 'isWindows')[0].keybindings;

        // wrapper.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // base.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // await genWrapperUtil.writeJSON('wrapper.json', wrapper);
        // await genWrapperUtil.writeJSON('base.json', base);
        assert.strictEqual(wrapper.length, base.length, 'the number of default keybindings should match to the base (Windows)');
    }
    // Linux
    {
        const wrapper = wrappers.filter(availableOnLinux);
        const base = baseKeybindings.filter(({ context }) => context === 'isLinux')[0].keybindings;

        // wrapper.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // base.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // await genWrapperUtil.writeJSON('wrapper.json', wrapper);
        // await genWrapperUtil.writeJSON('base.json', base);
        assert.strictEqual(wrapper.length, base.length, 'the number of default keybindings should match to the base (Linux)');
    }
    // Mac
    {
        const wrapper = wrappers.filter(availableOnMac);
        const base = baseKeybindings.filter(({ context }) => context === 'isMac')[0].keybindings;

        // wrapper.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // base.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // await genWrapperUtil.writeJSON('wrapper.json', wrapper);
        // await genWrapperUtil.writeJSON('base.json', base);
        assert.strictEqual(wrapper.length, base.length, 'the number of default keybindings should match to the base (macOS)');
    }

    for (const wrapper of wrappers) {
        assert.ok(
            containsWhenContext(wrapper.when, 'kb-macro.recording'),
            '"when" in a wrapper should contain "kb-macro.recording &&" context'
        );
    }
}

async function main() {
    try {
        await verifyWrapper();
    } catch (error) {
        console.error(error);
    }
}

main();
