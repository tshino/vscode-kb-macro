'use strict';
const process = require('process');
const fsPromises = require('fs/promises');


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
        // FIXME: we must deal with || operators.
        wrapped.when = 'kb-macro.recording && ' + keybinding.when;
    } else {
        wrapped.when = 'kb-macro.recording';
    }
    return wrapped;
}

async function main() {
    if (process.argv.length < 4) {
        console.log('Usage: node gen_wrapper.js <input-keybindings.json> <output-keybindings.json>');
        return;
    }

    const inputPath = process.argv[2];
    const outputPath = process.argv[3];

    const input = await readJSON(inputPath);
    const output = Array.from(input).map(makeWrapper);
    await writeJSON(outputPath, output);
}

main();
