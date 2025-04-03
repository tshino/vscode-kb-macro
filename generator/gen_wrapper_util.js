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

const decomposeWhenClause = function(when) {
    // returns Array of Arrays.
    // The outer array corresponds to '||' operators.
    // The inner arrays correspond to '&&' operators.
    const splitArray = function(array, separator) {
        const result = [];
        for (let i = 0, j = 0; i < array.length; i++) {
            if (array[i] === separator) {
                result.push(array.slice(j, i));
                j = i + 1;
            } else if (i === array.length - 1) {
                result.push(array.slice(j, i + 1));
            }
        }
        return result;
    };
    const tokens = when.split(/(\|\||&&)/);
    let nest = 0;
    const outMostTokens = [];
    for (let i = 0; i < tokens.length; i++) {
        let str = tokens[i];
        let open = 0, close = 0;
        let m;
        while ((m = str.match(/^\s*(!\s*)*[(]/)) !== null) {
            open += 1;
            str = str.slice(m[0].length);
        }
        while ((m = str.match(/[)]\s*$/)) !== null) {
            close += 1;
            str = str.slice(0, str.length - m[0].length);
        }
        if (nest === 0) {
            outMostTokens.push(tokens[i]);
        } else {
            outMostTokens[outMostTokens.length - 1] += tokens[i];
        }
        nest += open - close;
    }
    const ors_of_ands = splitArray(outMostTokens, '||').map(a =>
        splitArray(a, '&&').map(x => x.join('').trim())
    );
    return ors_of_ands;
};

function addWhenContext(when, context) {
    context = context || '';
    if (when) {
        const conditions = decomposeWhenClause(when).map(
            ands => ands.join(' && ').trim()
        );
        const restricted = decomposeWhenClause(context).map(
            ands => ands.join(' && ').trim()
        ).map(
            ctx => conditions.map(
                cond => ctx ? ctx + ' && ' + cond : cond
            ).join(' || ')
        ).join(' || ');
        return restricted;
    } else {
        return context;
    }
}

const containsWhenContext = function(when, context) {
    if (when) {
        return decomposeWhenClause(when).every(
            cond => cond.some(
                cond => cond.trim() === context
            )
        );
    }
    return false;
};

const hasCommonHeadingWhenContext = function(when, context) {
    if (when) {
        return decomposeWhenClause(when).every(
            cond => (
                0 < cond.length && cond[0].trim() === context
            )
        );
    }
    return false;
};

const removeWhenContext = function(when, context) {
    return decomposeWhenClause(when).map(
        cond => cond.map(
            cond => cond.trim()
        ).filter(cond => cond !== context).join(' && ')
    ).filter(cond => cond !== '').join(' || ');
};

const removeCommonHeadingWhenContext = function(when, context) {
    return (
        hasCommonHeadingWhenContext(when, context)
        ? decomposeWhenClause(when).map(
            cond => (
                (0 < cond.length && cond[0].trim() === context) ? cond.slice(1) : cond
            ).join(' && ')
        ).filter(cond => cond !== '').join(' || ')
        : when
    );
};

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
    return addWhenContext(keybinding.when, 'kb-macro.active');
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
    decomposeWhenClause,
    addWhenContext,
    containsWhenContext,
    hasCommonHeadingWhenContext,
    removeWhenContext,
    removeCommonHeadingWhenContext,
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
