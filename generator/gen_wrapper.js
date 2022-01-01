'use strict';
const genWrapperUtil = require('./gen_wrapper_util');
const defaultKeybindingsLoader = require('./default_keybindings_loader');

const PackageJsonPath = './package.json';
const ConfigPath = 'generator/config.json';

const error = genWrapperUtil.error;
const warn = genWrapperUtil.warn;

function checkExclusion(exclusion, commands) {
    for (const command of exclusion) {
        if (!commands.has(command)) {
            warn('No matching command:', command);
        }
    }
}

function checkAwaitOptions(awaitOptions) {
    for (const awaitOption of awaitOptions.values()) {
        if (!genWrapperUtil.isValidAwaitOption(awaitOption)) {
            error('Invalid awaitOption found:', awaitOption);
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

    const baseKeybindings = await defaultKeybindingsLoader.loadBaseKeybindings(config['baseKeybindings'] || []);
    const commands = new Set(baseKeybindings.flatMap(item => item.keybindings).map(keybinding => keybinding.command));
    checkExclusion(exclusion, commands);

    // combine the three sets of default keybindings of VS Code for Windows, Linux, and macOS.
    const combined = defaultKeybindingsLoader.combineBaseKeybingings(baseKeybindings);

    const wrappers = combined.flatMap(
        keybinding => {
            if (exclusion.has(keybinding.command) || keybinding.command === '') {
                // make a keybinding of a direct call for the excluded command
                keybinding.when = genWrapperUtil.makeWrapperWhen(keybinding);
                return [ keybinding ];
            } else {
                // make a wrapper keybinding (indirect call) to enable recording of the command
                const awaitOption = awaitOptions.get(keybinding.command) || '';
                const wrappers = genWrapperUtil.makeWrapper(keybinding, awaitOption);
                return wrappers;
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
