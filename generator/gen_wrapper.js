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

function addWhenContext(when, context) {
    if (when) {
        const conditions = when.split('||');
        const restricted = conditions.map(cond => context + ' && ' + cond.trim()).join(' || ');
        return restricted;
    } else {
        return context;
    }
}

async function loadBaseKeybindings(baseKeybindings) {
    let base = [];
    for (const item of baseKeybindings) {
        let keybindings = await readJSON(item['path'], { allowComments: true });
        if (item['when']) {
            keybindings = keybindings.map(keybinding => {
                keybinding.when = addWhenContext(keybinding.when, item['when']);
                return keybinding;
            });
        }
        base = base.concat(keybindings);
    }
    return base;
}

function makeWrapper(keybinding) {
    const wrapped = {
        key: keybinding.key,
        command: 'kb-macro.wrap',
        args: makeCommandSpec(keybinding),
        when: addWhenContext(keybinding.when, 'kb-macro.recording')
    };
    return wrapped;
}

async function main() {
    const packageJson = await readJSON(PackageJsonPath);
    const config = await readJSON(ConfigPath);

    const baseKeybindings = config['baseKeybindings'] || [];
    const exclusion = new Set(config['exclusion'] || []);
    const awaitOptions = new Map(config['awaitOptions'] || []);

    const base = await loadBaseKeybindings(baseKeybindings);

    const wrappers = base.map(
        keybinding => {
            if (exclusion.has(keybinding.command)) {
                keybinding.when = addWhenContext(keybinding.when, 'kb-macro.recording');
                return keybinding;
            } else {
                const wrapper = makeWrapper(keybinding);
                if (awaitOptions.has(wrapper.args.command)) {
                    wrapper.args.await = awaitOptions.get(wrapper.args.command);
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

    await writeJSON(PackageJsonPath, packageJson);
}

main();
