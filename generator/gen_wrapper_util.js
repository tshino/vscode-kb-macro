'use strict';
const fsPromises = require('fs/promises');
const util = require('util');

function error(...msg) {
    msg = [ '\u001b[31mError:' ].concat(msg).concat([ '\u001b[0m' ]);
    console.error.apply(null, msg);
}

function warn(...msg) {
    msg = [ '\u001b[33mWarning:' ].concat(msg).concat([ '\u001b[0m' ]);
    console.warn.apply(null, msg);
}

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

async function writeFile(path, content) {
    await fsPromises.writeFile(path, content);
}

function makeCompactKeybindingsJSON(keybindings) {
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
    return compactJson;
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

function negateContext(context) {
    if (context) {
        context = context.trim();
        if (context.startsWith('!')) {
            return context.slice(1);
        } else {
            return '!' + context;
        }
    } else {
        return 'false';
    }
}

function copyKeybinding(keybinding) {
    const copy = {
        key: keybinding.key,
        command: keybinding.command
    };
    if ('win' in keybinding) {
        copy.win = keybinding.win;
    }
    if ('linux' in keybinding) {
        copy.linux = keybinding.linux;
    }
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

function removeOSSpecificKeys(keybinding) {
    delete keybinding.mac;
    delete keybinding.win;
    delete keybinding.linux;
};

function keybindingsContains(keybindings, keybinding) {
    for (let i = 0; i < keybindings.length; i++) {
        if (util.isDeepStrictEqual(keybindings[i], keybinding)) {
            return i;
        }
    }
    return -1;
}

function extractOSSpecificKeys(keybinding) {
    const clone = keybinding => {
        const clone = copyKeybinding(keybinding);
        removeOSSpecificKeys(clone);
        return clone;
    };
    const keybindings = [];
    const restContext = [];
    if ('mac' in keybinding && keybinding.key !== keybinding.mac) {
        const mac = clone(keybinding);
        mac.key = keybinding.mac;
        mac.when = addWhenContext(keybinding.when, 'isMac');
        keybindings.push(mac);
        restContext.push('!isMac');
    }
    if ('linux' in keybinding && keybinding.key !== keybinding.linux) {
        const linux = clone(keybinding);
        linux.key = keybinding.linux;
        linux.when = addWhenContext(keybinding.when, 'isLinux');
        keybindings.push(linux);
        restContext.push('!isLinux');
    }
    if ('win' in keybinding && keybinding.key !== keybinding.win) {
        const win = clone(keybinding);
        win.key = keybinding.win;
        win.when = addWhenContext(keybinding.when, 'isWindows');
        keybindings.push(win);
        restContext.push('!isWindows');
    }
    const rest = clone(keybinding);
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

function isValidRecordOption(recordOption) {
    if (typeof recordOption !== 'string') {
        return false;
    }
    return (
        recordOption === 'command' || recordOption === 'side-effect'
    );
}

function checkAwaitOptions(awaitOptions) {
    for (const awaitOption of awaitOptions.values()) {
        if (!isValidAwaitOption(awaitOption)) {
            throw `Invalid await option found: ${JSON.stringify(awaitOption)}`;
        }
    }
}

function checkRecordOptions(recordOptions) {
    for (const recordOption of recordOptions.values()) {
        if (!isValidRecordOption(recordOption)) {
            throw `Invalid record option found: ${JSON.stringify(recordOption)}`;
        }
    }
}

function parseAwaitOption(awaitOption) {
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
    return awaitList;
}

function decomposeAwaitOption(awaitOption) {
    const awaitList = parseAwaitOption(awaitOption);
    const conditionals = awaitList.filter(a => a.condition);
    if (1 < conditionals.length) {
        throw 'Using multiple conditional await options is not supported';
    } else if (0 < conditionals.length) {
        return [
            {
                context: conditionals[0].condition,
                'await': awaitList.map(a => a['await']).join(' ')
            },
            {
                context: negateContext(conditionals[0].condition),
                'await': awaitList.filter(a => !a.condition).map(a => a['await']).join(' ')
            }
        ];
    } else {
        return [
            {
                context: '',
                'await': awaitOption || ''
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

function makeWrapper(keybinding, awaitOption, recordOption = '') {
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
        if (recordOption) {
            wrapped.args['record'] = recordOption;
        }
        return wrapped;
    });
    return wrappers;
}

module.exports = {
    error,
    warn,
    readJSON,
    writeJSON,
    writeFile,
    makeCompactKeybindingsJSON,
    addWhenContext,
    negateContext,
    copyKeybinding,
    removeOSSpecificKeys,
    keybindingsContains,
    extractOSSpecificKeys,
    isValidAwaitOption,
    isValidRecordOption,
    checkAwaitOptions,
    checkRecordOptions,
    parseAwaitOption,
    decomposeAwaitOption,
    makeWrapperWhen,
    makeWrapper
};
