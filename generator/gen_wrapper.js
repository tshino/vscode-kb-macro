'use strict';
const genWrapperUtil = require('./gen_wrapper_util');

const PackageJsonPath = './package.json';
const ConfigPath = 'generator/config.json';

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
            console.error('Invalid awaitOption found:', awaitOption);
            process.exit(1);
        }
    }
}

async function main() {
    const packageJson = await genWrapperUtil.readJSON(PackageJsonPath);
    const config = await genWrapperUtil.readJSON(ConfigPath);

    const exclusion = new Set(config['exclusion'] || []);
    const awaitOptions = new Map(config['awaitOptions'] || []);
    checkAwaitOptions(awaitOptions);

    const baseKeybindings = await genWrapperUtil.loadBaseKeybindings(config['baseKeybindings'] || []);
    const commands = new Set(baseKeybindings.flatMap(item => item.keybindings).map(keybinding => keybinding.command));
    checkExclusion(exclusion, commands);

    // combine the three sets of default keybindings of VS Code for Windows, Linux, and macOS.
    const combined = genWrapperUtil.combineBaseKeybingings(baseKeybindings);

    const wrappers = combined.map(
        keybinding => {
            if (exclusion.has(keybinding.command) || keybinding.command === '') {
                // make a keybinding of a direct call for the excluded command
                keybinding.when = makeWrapperWhen(keybinding);
                return keybinding;
            } else {
                // make a wrapper keybinding (indirect call) to enable recording of the command
                const wrapper = makeWrapper(keybinding);
                if (awaitOptions.has(wrapper.args.command)) {
                    const awaitOption = awaitOptions.get(wrapper.args.command);
                    if (awaitOption) {
                        wrapper.args['await'] = awaitOption;
                    }
                }
                return wrapper;
            }
        }
    );

    packageJson['contributes']['keybindings'] = (
        []
        .concat(config['header'] || [])
        .concat(wrappers)
        .concat(config['footer'] || [])
    );

    await genWrapperUtil.writeJSON(PackageJsonPath, packageJson);
}

main();
