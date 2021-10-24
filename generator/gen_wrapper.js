'use strict';
const fsPromises = require('fs/promises');

const PackageJsonPath = './package.json';
const DefaultKeybindingsPath = 'generator/default-keybindings-win.json';

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

function makeWrapper(keybinding) {
    const spec = {
        command: keybinding.command
    };
    if ('args' in keybinding) {
        spec.args = keybinding.args;
    }
    const wrapped = {
        key: keybinding.key,
        command: 'kb-macro.wrap',
        args: spec
    };
    if ('when' in keybinding) {
        const conditions = keybinding.when.split('||');
        const restricted = conditions.map(cond => 'kb-macro.recording && ' + cond.trim()).join(' || ');
        wrapped.when = restricted;
    } else {
        wrapped.when = 'kb-macro.recording';
    }
    return wrapped;
}

async function main() {
    const packageJson = await readJSON(PackageJsonPath);
    const defaultKeybindings = await readJSON(DefaultKeybindingsPath);

    const defaultWrappers = defaultKeybindings.map(makeWrapper);

    const extensionCommands = packageJson.contributes.keybindings.filter(
        rule => rule.command !== 'kb-macro.wrap'
    );

    packageJson.contributes.keybindings = (
        []
        .concat(extensionCommands)
        .concat(TypingWrappers)
        .concat(defaultWrappers)
    );

    await writeJSON(PackageJsonPath, packageJson);
}

main();
