'use strict';
const fsPromises = require('fs/promises');

const PackageJsonPath = './package.json';
const ConfigPath = 'generator/config.json';

async function readJSON(path, options = {}) {
    const { allowComments } = options;
    const file = "" + await fsPromises.readFile(path);
    let json = file;
    if (allowComments) {
        json = json.replace(/\/\/.+/g, ''); // skip line comments
    }
    const result = JSON.parse(json);
    return result;
}

async function writeJSON(path, value) {
    const json = JSON.stringify(value, null, 4);
    await fsPromises.writeFile(path, json);
}

function makeCommandSpec(keybinding) {
    const spec = {
        command: keybinding.command
    };
    if ('args' in keybinding) {
        spec.args = keybinding.args;
    }
    return spec;
}

function makeWhenRecording(when) {
    if (when) {
        const conditions = when.split('||');
        const restricted = conditions.map(cond => 'kb-macro.recording && ' + cond.trim()).join(' || ');
        return restricted;
    } else {
        return 'kb-macro.recording';
    }
}

function makeWrapper(keybinding) {
    const wrapped = {
        key: keybinding.key,
        command: 'kb-macro.wrap',
        args: makeCommandSpec(keybinding),
        when: makeWhenRecording(keybinding.when)
    };
    return wrapped;
}

async function main() {
    const packageJson = await readJSON(PackageJsonPath);
    const config = await readJSON(ConfigPath);

    const BaseKeybindingsPaths = config.baseKeybindingsPaths || [];
    const Exclusion = new Set(config.exclusion || []);
    const AwaitOptions = new Map(config.awaitOptions || []);

    let base = [];
    for (let i = 0; i < BaseKeybindingsPaths.length; i++) {
        const keybindings = await readJSON(BaseKeybindingsPaths[i], { allowComments: true });
        base = base.concat(keybindings);
    }

    const wrappers = base.map(
        keybinding => {
            if (Exclusion.has(keybinding.command)) {
                keybinding.when = makeWhenRecording(keybinding.when);
                return keybinding;
            } else {
                const wrapper = makeWrapper(keybinding);
                if (AwaitOptions.has(wrapper.args.command)) {
                    wrapper.args.await = AwaitOptions.get(wrapper.args.command);
                }
                return wrapper;
            }
        }
    );

    packageJson.contributes.keybindings = (
        []
        .concat(config.header || [])
        .concat(wrappers)
        .concat(config.footer || [])
    );

    await writeJSON(PackageJsonPath, packageJson);
}

main();
