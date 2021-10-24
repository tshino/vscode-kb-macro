'use strict';
const fsPromises = require('fs/promises');

const PackageJsonPath = './package.json';
const DefaultKeybindingsPath = 'generator/default-keybindings-win.json';
const ConfigPath = 'generator/config.json';

const TypingWrappers = [
    {
        key: 'enter',
        command: 'kb-macro.wrap',
        args: {
            command: 'type',
            args: {
                text: '\n'
            }
        },
        when: 'kb-macro.recording && editorTextFocus && !editorReadonly && !suggestWidgetVisible && !renameInputVisible'
    }
];

async function readJSON(path) {
    const file = "" + await fsPromises.readFile(path);
    const json = file.replace(/\/\/.+/g, ''); // skip line comments
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
    const defaultKeybindings = await readJSON(DefaultKeybindingsPath);
    const config = await readJSON(ConfigPath);

    const ExclutionList = new Set(config.exclutionList || []);
    const AwaitOptions = new Map(config.awaitOptions || []);

    const defaultWrappers = defaultKeybindings.map(
        keybinding => {
            if (ExclutionList.has(keybinding.command)) {
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

    const extensionCommands = packageJson.contributes.keybindings.filter(
        keybinding => (
            keybinding.command.startsWith('kb-macro.') &&
            keybinding.command !== 'kb-macro.wrap'
        )
    );

    packageJson.contributes.keybindings = (
        []
        .concat(TypingWrappers)
        .concat(defaultWrappers)
        .concat(extensionCommands)
    );

    await writeJSON(PackageJsonPath, packageJson);
}

main();
