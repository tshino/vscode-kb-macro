'use strict';
const path = require('path');
const glob = require('glob');
const genWrapperUtil = require('./gen_wrapper_util');

const CommonConfigPath = 'generator/config.json';
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

function checkExclusion(exclusion, commands) {
    for (const command of exclusion) {
        if (!commands.has(command)) {
            console.warn('Warning: No matching command:', command);
        }
    }
}

function checkAwaitOptions(awaitOptions) {
    for (const awaitOption of awaitOptions.values()) {
        if (!genWrapperUtil.isValidAwaitOption(awaitOption)) {
            console.error('Error: Invalid awaitOption found:', awaitOption);
            process.exit(1);
        }
    }
}

function resolveWildcardInAwaitOptions(awaitOptions, commands) {
    const newAwaitOptions = new Map;
    for (const [ command, awaitOption ] of awaitOptions) {
        if (command.endsWith('*')) { // wildcard
            const prefix = command.slice(0, -1);
            const matches = Array.from(commands.values()).filter(c => c.startsWith(prefix));
            if (matches.length === 0) {
                console.warn('Warning: No matching commands for wildcard:', command);
            }
            for (const match of matches) {
                newAwaitOptions.set(match, awaitOption);
            }
        } else {
            if (!commands.has(command)) {
                console.warn('Warning: No matching command:', command);
            }
            newAwaitOptions.set(command, awaitOption);
        }
    }
    return newAwaitOptions;
}

async function makeKeymapWrapper(configPath, commonConfig) {
    const dirname = path.dirname(configPath);
    const id = path.basename(configPath, '.config.json');
    const packageJsonPath = path.resolve(dirname, 'tmp/' + id + '.package.json');
    const packageJson = await genWrapperUtil.readJSON(packageJsonPath);
    console.log('** generating keymap wrapper for', { id, displayName: packageJson['displayName'] });

    const config = await genWrapperUtil.readJSON(configPath);

    const baseKeybindings = packageJson['contributes']['keybindings'];
    const commands = new Set(baseKeybindings.map(keybinding => keybinding.command));

    const exclusion = new Set(commonConfig['exclusion'] || []);
    {
        const rawExclusion = config['exclusion'] || [];
        checkExclusion(rawExclusion, commands);
        rawExclusion.forEach(e => exclusion.add(e));
    }

    const awaitOptions = new Map(commonConfig['awaitOptions'] || []);
    {
        const rawAwaitOptions = new Map(config['awaitOptions'] || []);
        const resolved = resolveWildcardInAwaitOptions(rawAwaitOptions, commands);
        resolved.forEach((val, key) => awaitOptions.set(key, val));
    }
    checkAwaitOptions(awaitOptions);

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

    const wrapperKeybindings = (
        []
        .concat(config['header'] || [])
        .concat(wrappers)
        .concat(config['footer'] || [])
    );

    const wrapperPath = path.resolve(dirname, id + '.json');
    await genWrapperUtil.writeJSON(wrapperPath, wrapperKeybindings);
    console.log('...done (' + id + '.json)');
}

async function main() {
    const commonConfig = await genWrapperUtil.readJSON(CommonConfigPath);
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
        await makeKeymapWrapper(configPath, commonConfig);
    }
}

main();
