'use strict';
const path = require('path');
const glob = require('glob');
const genWrapperUtil = require('./gen_wrapper_util');

const CommonConfigPath = 'generator/config.json';
const KeymapWrapperPath = 'keymap-wrapper/';

const error = genWrapperUtil.error;
const warn = genWrapperUtil.warn;

function checkCommandPresence(list, commands) {
    for (const command of list) {
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

function resolveWildcardInAwaitOptions(awaitOptions, commands) {
    const newAwaitOptions = new Map;
    for (const [ command, awaitOption ] of awaitOptions) {
        if (command.endsWith('*')) { // wildcard
            const prefix = command.slice(0, -1);
            const matches = Array.from(commands.values()).filter(c => c.startsWith(prefix));
            if (matches.length === 0) {
                warn('No matching commands for wildcard:', command);
            }
            for (const match of matches) {
                newAwaitOptions.set(match, awaitOption);
            }
        } else {
            if (!commands.has(command)) {
                warn('No matching command:', command);
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

    const uniqueId = packageJson['publisher'] + '.' + packageJson['name'];
    const displayName = packageJson['displayName'];
    const version = packageJson['version'];
    console.log('\n** generating keymap wrapper for', { uniqueId, displayName, version });

    if (id !== uniqueId) {
        warn('Config file name does not match extension unique ID');
        console.info(`  config ID   : ${id}`);
        console.info(`  extension ID: ${uniqueId}`);
    }

    const config = await genWrapperUtil.readJSON(configPath);

    const baseKeybindings = packageJson['contributes']['keybindings'];
    const commands = new Set(baseKeybindings.map(keybinding => keybinding.command));

    const ignore = new Set(config['ignore'] || []);
    checkCommandPresence(ignore, commands);

    const exclusion = new Set(commonConfig['exclusion'] || []);
    {
        const rawExclusion = config['exclusion'] || [];
        checkCommandPresence(rawExclusion, commands);
        rawExclusion.forEach(e => exclusion.add(e));
    }

    const awaitOptions = new Map(commonConfig['awaitOptions'] || []);
    {
        const rawAwaitOptions = new Map(config['awaitOptions'] || []);
        const resolved = resolveWildcardInAwaitOptions(rawAwaitOptions, commands);
        resolved.forEach((val, key) => awaitOptions.set(key, val));
    }
    checkAwaitOptions(awaitOptions);

    const wrappers = baseKeybindings.filter(
        keybinding => !ignore.has(keybinding.command)
    ).flatMap(
        genWrapperUtil.extractOSSpecificKeys
    ).flatMap(
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

    const wrapperKeybindings = (
        []
        .concat(config['header'] || [])
        .concat(wrappers)
        .concat(config['footer'] || [])
    );

    const wrapperPath = path.resolve(dirname, id + '.json');
    const compactJson = genWrapperUtil.makeCompactKeybindingsJSON(wrapperKeybindings);
    const fileContent = compactJson.replace(
        /^\[\n/,
        (
            '[\n' +
            `\t// Keymap wrapper for ${displayName} v${version}\n` +
            '\t// (required by Keyboard Macro Beta)\n'
        )
    ) + '\n';
    await genWrapperUtil.writeFile(wrapperPath, fileContent);
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
