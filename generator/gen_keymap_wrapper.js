'use strict';
const path = require('path');
const glob = require('glob');
const genWrapperUtil = require('./gen_wrapper_util');

const KeymapWrapperPath = 'keymap-wrapper/';

function makeWrapperArgs(keybinding) {
    const args = {
        command: keybinding.command
    };
    if ('args' in keybinding) {
        args.args = keybinding.args;
    }
    return args;
}

function makeWrapperWhen(keybinding) {
    return genWrapperUtil.addWhenContext(keybinding.when, 'kb-macro.recording');
}

function makeWrapper(keybinding) {
    const wrapped = {
        key: keybinding.key,
        command: 'kb-macro.wrap',
        args: makeWrapperArgs(keybinding),
        when: makeWrapperWhen(keybinding)
    };
    if ('mac' in keybinding) {
        wrapped.mac = keybinding.mac;
    }
    return wrapped;
}

async function makeKeymapWrapper(configPath) {
    const dirname = path.dirname(configPath);
    const id = path.basename(configPath, '.config.json');
    const packageJsonPath = path.resolve(dirname, 'tmp/' + id + '.package.json');
    const packageJson = await genWrapperUtil.readJSON(packageJsonPath);
    console.log('generating keymap wrapper for', { id, displayName: packageJson['displayName'] });

    const config = await genWrapperUtil.readJSON(configPath);
    const exclusion = new Set(config['exclusion'] || []);
    const awaitOptions = new Map(config['awaitOptions'] || []);

    const baseKeybindings = packageJson['contributes']['keybindings'];

    // resolve wildcards in awaitOptions
    const wildcardCommands = Array.from(awaitOptions.keys()).filter(
        command => command.endsWith('*')
    );
    for (const wildcard of wildcardCommands) {
        const awaitOption = awaitOptions.get(wildcard);
        const prefix = wildcard.slice(0, -1);
        const matches = baseKeybindings.filter(
            keybinding => keybinding.command.startsWith(prefix)
        ).map(keybinding => keybinding.command);
        for (const match of matches) {
            awaitOptions.set(match, awaitOption);
        }
        awaitOptions.delete(wildcard);
    }

    const wrappers = baseKeybindings.map(
        keybinding => {
            if (exclusion.has(keybinding.command)) {
                // make a keybinding of a direct call for the excluded command
                keybinding.when = makeWrapperWhen(keybinding);
                return keybinding;
            } else {
                // make a wrapper keybinding (indirect call) to enable recording of the command
                const wrapper = makeWrapper(keybinding);
                if (awaitOptions.has(wrapper.args.command)) {
                    wrapper.args.await = awaitOptions.get(wrapper.args.command);
                }
                return wrapper;
            }
        }
    );

    const wrapperPath = path.resolve(dirname, id + '.json');
    await genWrapperUtil.writeJSON(wrapperPath, wrappers);
    console.log('...done (' + id + '.json)');
}

async function main() {
    const files = await new Promise((c, e) => {
        glob('*.config.json', { cwd: KeymapWrapperPath }, (err, files) => {
            if (err) {
                e(err);
            } else {
                c(files);
            }
        });
    });
    for (const f of files) {
        const configPath = path.resolve(KeymapWrapperPath, f);
        await makeKeymapWrapper(configPath);
    }
}

main();
