'use strict';
const assert = require('assert');
const util = require('util');
const genWrapperUtil = require('./gen_wrapper_util');
const defaultKeybindingsLoader = require('./default_keybindings_loader');

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
};
const removeWhenContext = function(when, context) {
    return when.split('||').map(cond => {
        return cond.split('&&').filter(cond => {
            return cond.trim() !== context;
        }).map(cond => cond.trim()).join(' && ');
    }).filter(cond => cond !== '').join(' || ');
};

const availableOnWindows = function(keybinding) {
    return (
        !containsWhenContext(keybinding.when, 'isLinux') &&
        !containsWhenContext(keybinding.when, 'isMac') &&
        !containsWhenContext(keybinding.when, '!isWindows') &&
        !/\bmeta\b/.test(keybinding.key) &&
        !/\bcmd\b/.test(keybinding.key)
    );
};
const availableOnLinux = function(keybinding) {
    return (
        !containsWhenContext(keybinding.when, 'isWindows') &&
        !containsWhenContext(keybinding.when, 'isMac') &&
        !containsWhenContext(keybinding.when, '!isLinux') &&
        !/\bwin\b/.test(keybinding.key) &&
        !/\bcmd\b/.test(keybinding.key)
    );
};
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
};

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
};
const unwrapForWindows = function(keybinding) {
    keybinding = unwrapCommon(keybinding);
    keybinding.when = removeWhenContext(keybinding.when, 'isWindows');
    keybinding.when = removeWhenContext(keybinding.when, '!isLinux');
    keybinding.when = removeWhenContext(keybinding.when, '!isMac');
    if (keybinding.when === '') {
        delete keybinding.when;
    }
    if ('win' in keybinding) {
        keybinding.key = keybinding.win;
    }
    genWrapperUtil.removeOSSpecificKeys(keybinding);
    return keybinding;
};
const unwrapForLinux = function(keybinding) {
    keybinding = unwrapCommon(keybinding);
    keybinding.when = removeWhenContext(keybinding.when, 'isLinux');
    keybinding.when = removeWhenContext(keybinding.when, '!isWindows');
    keybinding.when = removeWhenContext(keybinding.when, '!isMac');
    if (keybinding.when === '') {
        delete keybinding.when;
    }
    if ('linux' in keybinding) {
        keybinding.key = keybinding.linux;
    }
    genWrapperUtil.removeOSSpecificKeys(keybinding);
    return keybinding;
};
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
    }
    genWrapperUtil.removeOSSpecificKeys(keybinding);
    return keybinding;
};

const joinComplementalKeybindings = function(keybindings) {
    for (let i = 0; i + 1 < keybindings.length; i++) {
        const k1 = keybindings[i];
        const k2 = keybindings[i+ 1];
        if (k1.key === k2.key &&
            k1.win === k2.win &&
            k1.linux === k2.linux &&
            k1.mac === k2.mac &&
            k1.command === k2.command &&
            k1.args && k2.args &&
            k1.args.command === k2.args.command) {
            const w1 = k1.when;
            const w2 = k2.when;
            if (!w1 || !w2) {
                continue;
            }
            const p1 = w1.split('||');
            const p2 = w2.split('||');
            if (p1.length !== p2.length) {
                continue;
            }
            const f1 = p1.map(p => p.split('&&').map(f => f.trim()));
            const f2 = p2.map(p => p.split('&&').map(f => f.trim()));
            if (!util.isDeepStrictEqual(f1.map(f => f.length), f2.map(f => f.length))) {
                continue;
            }
            const diff1 = f1.map((f, j) => f.filter((_, k) => f1[j][k] !== f2[j][k]));
            const diff2 = f2.map((f, j) => f.filter((_, k) => f1[j][k] !== f2[j][k]));
            if (!diff1.every(d => d.length === 1) || !diff2.every(d => d.length === 1)) {
                continue;
            }
            const common = f1.map((f, j) => f.filter((_, k) => f1[j][k] === f2[j][k]));
            const c1 = diff1.map(d => d[0]);
            const c2 = diff2.map(d => d[0]);
            if (util.isDeepStrictEqual(c1, c2.map(c => '!' + c)) ||
                util.isDeepStrictEqual(c1.map(c => '!' + c), c2)) {
                keybindings[i].when = common.map(r => r.join(' && ')).join(' || ');
                if (keybindings[i].when === '') {
                    delete keybindings[i].when;
                }
                const a1 = k1.args['await'];
                const a2 = k2.args['await'];
                keybindings[i].args['await'] = a1.length < a2.length ? a2 : a1;
                keybindings.splice(i + 1, 1);
            }
        }
    }
};

const makeUnconditionalAwaitOption = function(awaitOption) {
    const awaitList = genWrapperUtil.parseAwaitOption(awaitOption);
    return awaitList.map(a => a['await']).join(' ');
};

const isWrapped = function(keybinding) {
    return (
        keybinding.command === 'kb-macro.wrap' &&
        'args' in keybinding &&
        'command' in keybinding.args
    );
};

async function verifyWrapper() {
    const packageJson = await genWrapperUtil.readJSON(PackageJsonPath);
    const config = await genWrapperUtil.readJSON(ConfigPath);

    const exclusion = new Set(config['exclusion'] || []);
    const awaitOptions = new Map(config['awaitOptions'] || []);
    const recordOptions = new Map(config['recordOptions'] || []);

    const baseKeybindings = await defaultKeybindingsLoader.loadBaseKeybindings(config['baseKeybindings'] || []);

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
    joinComplementalKeybindings(wrappers);

    // Windows
    {
        const wrapper = wrappers.filter(availableOnWindows);
        const unwrapped = wrapper.map(unwrapForWindows);
        const base = baseKeybindings.filter(({ context }) => context === 'isWindows')[0].keybindings;

        unwrapped.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        base.sort((a,b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        // await genWrapperUtil.writeJSON('unwrapped.json', unwrapped);
        // await genWrapperUtil.writeJSON('base.json', base);

        assert.strictEqual(unwrapped.length, base.length, 'the number of unrapped default keybindings should match the base (Windows)');
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

        assert.strictEqual(unwrapped.length, base.length, 'the number of unrapped default keybindings should match the base (Linux)');
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

        assert.strictEqual(unwrapped.length, base.length, 'the number of unrapped default keybindings should match the base (macOS)');
        assert.deepStrictEqual(unwrapped, base, 'unwrapped wrappers should exactly match the base (macOS)');
    }

    for (const wrapper of wrappers) {
        assert.ok(
            containsWhenContext(wrapper.when, 'kb-macro.recording'),
            '"when" in a wrapper should contain "kb-macro.recording &&" context'
        );
        if (isWrapped(wrapper)) {
            assert.strictEqual(
                exclusion.has(wrapper.args.command),
                false,
                'the command in a wrapped keybinding should not be included in the exclution list'
            );
            if (awaitOptions.has(wrapper.args.command)) {
                const unconditional = makeUnconditionalAwaitOption(awaitOptions.get(wrapper.args.command));
                assert.deepStrictEqual(
                    wrapper.args['await'],
                    unconditional,
                    'a command included in the awaitOptions list should have the await option specified in the list'
                );
            } else {
                assert.strictEqual(
                    'await' in wrapper.args,
                    false,
                    'a command that is not included in the awaitOptions list should not have await option'
                );
            }
            if (recordOptions.has(wrapper.args.command)) {
                assert.deepStrictEqual(
                    wrapper.args.record,
                    recordOptions.get(wrapper.args.command),
                    'a command included in the recordOptions list should have the record option specified in the list'
                );
            } else {
                assert.strictEqual(
                    'record' in wrapper.args,
                    false,
                    'a command that is not included in the recordOptions list should not have record option'
                );
            }
        } else {
            assert.strictEqual(
                exclusion.has(wrapper.command),
                true,
                'the command in a unwrapped keybinding should be included in the exclution list'
            );
        }
    }
}

verifyWrapper().catch(error => {
    console.error(error);
    process.exit(1);
});
