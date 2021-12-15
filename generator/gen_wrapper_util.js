'use strict';
const fsPromises = require('fs/promises');
const util = require('util');

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
    const json = JSON.stringify(value, null, '\t');
    await fsPromises.writeFile(path, json + '\n');
}

async function writeCompactKeybindingsJSON(path, keybindings) {
    const json = JSON.stringify(keybindings, null, '\t');
    const compactJson = json.replace(
        /,\n\s+"(?!when)/gm, ', "'
    ).replace(
        /\{\n\s+/gm, '{ '
    ).replace(
        /: \[\n\s+/gm, ': [ '
    ).replace(
        /\n\s+\]/gm, ' ]'
    ).replace(
        /\s*\n\s+}/gm, ' }'
    );
    await fsPromises.writeFile(path, compactJson + '\n');
}

function addWhenContext(when, context) {
    context = context || '';
    if (when) {
        const conditions = when.split('||');
        const restricted = context.split('||').map(
            context => conditions.map(
                cond => {
                    context = context.trim();
                    cond = cond.trim();
                    return context ? context + ' && ' + cond : cond;
                }
            ).join(' || ')
        ).join(' || ');
        return restricted;
    } else {
        return context;
    }
}

function copyKeybinding(keybinding) {
    const copy = {
        key: keybinding.key,
        command: keybinding.command
    };
    if ('mac' in keybinding) {
        copy.mac = keybinding.mac;
    }
    if ('args' in keybinding) {
        copy.args = keybinding.args;
    }
    if ('when' in keybinding) {
        copy.when = keybinding.when;
    }
    return copy;
}

function keybindingsContains(keybindings, keybinding) {
    for (let i = 0; i < keybindings.length; i++) {
        if (util.isDeepStrictEqual(keybindings[i], keybinding)) {
            return i;
        }
    }
    return -1;
}

function extractOSSpecificKeys(keybinding) {
    const keybindings = [];
    const restContext = [];
    if ('mac' in keybinding && keybinding.key !== keybinding.mac) {
        const mac = copyKeybinding(keybinding);
        mac.key = keybinding.mac;
        mac.when = addWhenContext(keybinding.when, 'isMac');
        delete mac.mac;
        keybindings.push(mac);
        restContext.push('!isMac');
    }
    const rest = copyKeybinding(keybinding);
    delete rest.mac;
    const restWhen = restContext.join(' && ');
    if (restWhen) {
        rest.when = addWhenContext(rest.when, restWhen);
    }
    keybindings.push(rest);
    return keybindings;
}

const ValidAwaitTargets = new Set(['selection', 'document', 'clipboard']);

function isValidAwaitOption(awaitOption) {
    if (typeof awaitOption !== 'string') {
        return false;
    }
    const awaitList = awaitOption.split(' ').filter(target => target !== '');
    return (
        awaitList.length === 0 ||
        awaitList.every(target => {
            const matches = /^\[.+\]([^\]]+)/.exec(target);
            if (matches) {
                target = matches[1];
            }
            return ValidAwaitTargets.has(target);
        })
    );
}

function decomposeAwaitOption(awaitOption) {
    awaitOption = awaitOption || '';
    const awaitList = (
        awaitOption.split(' ')
        .filter(target => target !== '')
        .map(awaitItem => {
            const matches = /^\[(.+)\]([^\]]+)/.exec(awaitItem);
            if (matches) {
                return { condition: matches[1], 'await': matches[2] };
            } else {
                return { condition: '', 'await': awaitItem };
            }
        })
    );
    const conditionals = awaitList.filter(a => a.condition);
    if (1 < conditionals.length) {
        console.error('Error: multiple conditional await options are not supported');
        throw 'error';
    } else if (0 < conditionals.length) {
        return [
            {
                context: conditionals[0].condition,
                'await': awaitList.map(a => a['await']).join(' ')
            },
            {
                context: '!' + conditionals[0].condition,
                'await': awaitList.filter(a => !a.condition).map(a => a['await']).join(' ')
            }
        ];
    } else {
        return [
            {
                context: '',
                'await': awaitOption
            }
        ];
    }
}

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
    return addWhenContext(keybinding.when, 'kb-macro.recording');
}

function makeWrapper(keybinding, awaitOption) {
    const awaitList = decomposeAwaitOption(awaitOption);
    const wrappers = awaitList.map(awaitItem => {
        const when = addWhenContext(keybinding.when, awaitItem.context);
        const wrapped = {
            key: keybinding.key,
            mac: keybinding.mac,
            command: 'kb-macro.wrap',
            args: makeWrapperArgs(keybinding),
            when: makeWrapperWhen({ when })
        };
        if (!('mac' in keybinding)) {
            delete wrapped.mac;
        }
        if (awaitItem['await']) {
            wrapped.args['await'] = awaitItem['await'];
        }
        return wrapped;
    });
    return wrappers;
}

module.exports = {
    readJSON,
    writeJSON,
    writeCompactKeybindingsJSON,
    addWhenContext,
    copyKeybinding,
    keybindingsContains,
    extractOSSpecificKeys,
    isValidAwaitOption,
    decomposeAwaitOption,
    makeWrapperWhen,
    makeWrapper
};
