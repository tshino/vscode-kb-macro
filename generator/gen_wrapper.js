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
const ExclusionList = [
    'acceptSelectedSuggestion',
    'acceptAlternativeSelectedSuggestion'
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

    const defaultWrappers = defaultKeybindings.map(
        keybinding => {
            if (ExclusionList.includes(keybinding.command)) {
                keybinding.when = makeWhenRecording(keybinding.when);
                return keybinding;
            } else {
                return makeWrapper(keybinding);
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
