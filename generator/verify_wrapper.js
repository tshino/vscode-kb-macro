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
const removeWhenContext = function(when, context) {
    return when.split('||').map(cond => {
        return cond.split('&&').filter(cond => {
            return cond.trim() !== context;
        }).map(cond => cond.trim()).join(' && ');
    }).filter(cond => cond !== '').join(' || ');
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

const unwrapCommon = function(keybinding) {
    keybinding = genWrapperUtil.copyKeybinding(keybinding);
    if (keybinding.command === 'kb-macro.wrap') {
        keybinding.command = keybinding.args.command;
        if ('args' in keybinding.args) {
            keybinding.args = keybinding.args.args;
        } else {
            delete keybinding.args;
        }
    }
    keybinding.when = removeWhenContext(keybinding.when, 'kb-macro.recording');
    return keybinding;
}
const unwrapForWindows = function(keybinding) {
    keybinding = unwrapCommon(keybinding);
    keybinding.when = removeWhenContext(keybinding.when, 'isWindows');
    keybinding.when = removeWhenContext(keybinding.when, '!isLinux');
    keybinding.when = removeWhenContext(keybinding.when, '!isMac');
    if (keybinding.when === '') {
        delete keybinding.when;
    }
    if ('mac' in keybinding) {
        delete keybinding.mac;
    }
    return keybinding;
}
const unwrapForLinux = function(keybinding) {
    keybinding = unwrapCommon(keybinding);
    keybinding.when = removeWhenContext(keybinding.when, 'isLinux');
    keybinding.when = removeWhenContext(keybinding.when, '!isWindows');
    keybinding.when = removeWhenContext(keybinding.when, '!isMac');
    if (keybinding.when === '') {
        delete keybinding.when;
    }
    if ('mac' in keybinding) {
        delete keybinding.mac;
    }
    return keybinding;
}
const unwrapForMac = function(keybinding) {
    keybinding = unwrapCommon(keybinding);
    keybinding.when = removeWhenContext(keybinding.when, 'isMac');
    keybinding.when = removeWhenContext(keybinding.when, '!isWindows');
    keybinding.when = removeWhenContext(keybinding.when, '!isLinux');
    if (keybinding.when === '') {
        delete keybinding.when;
    }
    if ('mac' in keybinding) {
        keybinding.key = keybinding.mac;
        delete keybinding.mac;
    }
    return keybinding;
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
        const unwrapped = wrapper.map(unwrapForWindows);
        const base = baseKeybindings.filter(({ context }) => context === 'isWindows')[0].keybindings;

        unwrapped.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        base.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // await genWrapperUtil.writeJSON('unwrapped.json', unwrapped);
        // await genWrapperUtil.writeJSON('base.json', base);

        assert.strictEqual(wrapper.length, base.length, 'the number of default keybindings should match the base (Windows)');
        assert.deepStrictEqual(unwrapped, base, 'unwrapped wrappers should exactly match the base (Windows)');
    }
    // Linux
    {
        const wrapper = wrappers.filter(availableOnLinux);
        const unwrapped = wrapper.map(unwrapForLinux);
        const base = baseKeybindings.filter(({ context }) => context === 'isLinux')[0].keybindings;

        unwrapped.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        base.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // await genWrapperUtil.writeJSON('unwrapped.json', unwrapped);
        // await genWrapperUtil.writeJSON('base.json', base);

        assert.strictEqual(wrapper.length, base.length, 'the number of default keybindings should match the base (Linux)');
        assert.deepStrictEqual(unwrapped, base, 'unwrapped wrappers should exactly match the base (Linux)');
    }
    // Mac
    {
        const wrapper = wrappers.filter(availableOnMac);
        const unwrapped = wrapper.map(unwrapForMac);
        const base = baseKeybindings.filter(({ context }) => context === 'isMac')[0].keybindings;

        unwrapped.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        base.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // await genWrapperUtil.writeJSON('unwrapped.json', unwrapped);
        // await genWrapperUtil.writeJSON('base.json', base);

        assert.strictEqual(wrapper.length, base.length, 'the number of default keybindings should match the base (macOS)');
        assert.deepStrictEqual(unwrapped, base, 'unwrapped wrappers should exactly match the base (macOS)');
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
