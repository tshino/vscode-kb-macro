'use strict';
const util = require('util');

function addWhenContext(when, context) {
    if (when) {
        const conditions = when.split('||');
        const restricted = context.split('||').map(
            context => conditions.map(
                cond => context.trim() + ' && ' + cond.trim()
            ).join(' || ')
        ).join(' || ');
        return restricted;
    } else {
        return context;
    }
}

function addKeybindingsContext(keybindings, context) {
    if (context) {
        return keybindings.map(keybinding => {
            if (context === 'isMac' && /\bcmd\b/.test(keybinding.key)) {
                // skip redundant context
            } else if (context === 'isLinux' && /\bmeta\b/.test(keybinding.key)) {
                // skip redundant context
            } else if (context === 'isWindows' && /\bwin\b/.test(keybinding.key)) {
                // skip redundant context
            } else {
                keybinding.when = addWhenContext(keybinding.when, context);
            }
            return keybinding;
        });
    } else {
        return keybindings;
    }
}

function keybindingsContains(keybindings, keybinding) {
    for (let i = 0; i < keybindings.length; i++) {
        if (util.isDeepStrictEqual(keybindings[i], keybinding)) {
            return i;
        }
    }
    return -1;
}

// Make a map that associates each keystroke to a set of keybindings.
function makeKeyDict(baseKeybindings) {
    const keyDict = new Map();
    for (const { keybindings, context } of baseKeybindings) {
        for (const keybinding of keybindings) {
            const key = keybinding['key'];
            if (!keyDict.has(key)) {
                keyDict.set(key, new Map());
            }
            const dict = keyDict.get(key);
            if (!dict.has(context)) {
                dict.set(context, []);
            }
            dict.get(context).push(keybinding);
        }
    }
    return keyDict;
}

// Find common keybindings that are shared among all sources.
function findCommonKeybinding(contextList, dict) {
    const commonKeybindings = [];
    for (let k = 0; k + 1 < contextList.length; k++) {
        const reference = dict.get(contextList[k]) || [];
        for (let pos0 = 0; pos0 < reference.length; pos0++) {
            if (commonKeybindings.some(commonKeys => (
                commonKeys.positions[k] === pos0
            ))) {
                continue;
            }
            const positions = Array(k).fill(-1).concat([ pos0 ]);
            const keybinding = reference[pos0];
            for (let j = k + 1; j < contextList.length; j++) {
                const keybindings = dict.get(contextList[j]) || [];
                const pos = keybindingsContains(keybindings, keybinding);
                positions[j] = pos;
            }
            if (2 <= positions.filter(pos => 0 <= pos).length) {
                // found a (fully or partially) common keybinding among contexts
                commonKeybindings.push({
                    keybinding,
                    positions
                });
            }
        }
    }
    return commonKeybindings;
}

// Drop common keybindings that are not placed in order.
function removeInconsistentlyOrderedKeybindings(contextList, commonKeybindings) {
    const indices = Array(contextList.length).fill(0);
    for (let i = 0; i < commonKeybindings.length; i++) {
        if (!commonKeybindings[i].positions.every((pos, j) => (pos < 0 || indices[j] <= pos))) {
            // out of order
            commonKeybindings.splice(i, 1);
            i--;
            continue;
        }
        for (let j = 0; j < contextList.length; j++) {
            if (0 <= commonKeybindings[i].positions[j]) {
                indices[j] = commonKeybindings[i].positions[j] + 1;
            }
        }
    }
}

// Make common keybindings list for every keystrokes.
function makeCommonKeybindingsDict(contextList, keyDict) {
    const commonKeyDict = new Map();
    for (const [ key, dict ] of keyDict) {
        const commonKeybindings = findCommonKeybinding(contextList, dict);

        removeInconsistentlyOrderedKeybindings(contextList, commonKeybindings);

        if (0 < commonKeybindings.length) {
            commonKeyDict.set(key, commonKeybindings);
        }
    }
    return commonKeyDict;
}

function makeWhenSubsetContext(contextList, bitmap) {
    const count = bitmap.filter(enable => enable).length;
    if (2 <= count) {
        // negative form (A || B => !C)
        const subset = bitmap.map((enable, j) => (
            !enable ? '!' + contextList[j] : ''
        )).filter(context => context !== '').join(' && ');
        return subset;
    } else {
        // positive form (A || B)
        const subset = bitmap.map((enable, j) => (
            enable ? contextList[j] : ''
        )).filter(context => context !== '').join(' || ');
        return subset;
    }
}

function makeUnifiedKeybindingsList(contextList, commonKeybindings) {
    return commonKeybindings.map(x => {
        const keybinding = x.keybinding;
        const bitmap = x.positions.map(pos => 0 <= pos);
        if (!bitmap.every(enable => enable)) {
            // partial common keybindings (e.g. 'isWindows || isLinux')
            const subset = makeWhenSubsetContext(contextList, bitmap);
            keybinding.when = addWhenContext(keybinding.when, subset);
        }
        return keybinding;
    });
}

function makeNonUnifiedKeybindingsList(contextList, commonKeybindings, dict, contextIndex) {
    const keybindingsList = [];
    let index = 0;
    for (let i = 0; i <= commonKeybindings.length; i++) {
        const context = contextList[contextIndex];
        const pos = (
            i < commonKeybindings.length
                ? commonKeybindings[i].positions[contextIndex]
                : (dict.get(context) || []).length
        );
        if (pos < 0) {
            keybindingsList.push([]);
        } else {
            const keybindings = dict.get(context) || [];
            const sliced = keybindings.slice(index, pos);
            const converted = addKeybindingsContext(sliced, context);
            keybindingsList.push(converted);
            index = pos + 1;
        }
    }
    return keybindingsList;
}

function makeCombinedKeybindingsForKey(contextList, dict, commonKeybindings) {
    const unified = makeUnifiedKeybindingsList(contextList, commonKeybindings);
    const nonUnified = contextList.map((context_, j) => (
        makeNonUnifiedKeybindingsList(contextList, commonKeybindings, dict, j)
    ));

    // Reorder and unify keybindings.
    let combined = [];
    for (let i = 0; i < unified.length; i++) {
        combined = combined.concat(nonUnified.flatMap(x => x[i]));
        combined.push(unified[i]);
    }
    combined = combined.concat(nonUnified.flatMap(x => x[unified.length]));

    return combined;
}

// Make combined keybindings of different default keybindings of windows, macos and linux.
function combineBaseKeybingings(baseKeybindings) {
    const contextList = baseKeybindings.map(item => item.context);
    const keyDict = makeKeyDict(baseKeybindings);
    const commonKeyDict = makeCommonKeybindingsDict(contextList, keyDict);

    let keybindings = [];
    for (const [key, dict] of keyDict) {
        const commonKeybindings = commonKeyDict.get(key) || [];
        const combined = makeCombinedKeybindingsForKey(contextList, dict, commonKeybindings);
        keybindings = keybindings.concat(combined);
    }
    return keybindings;
}

module.exports = {
    addWhenContext,
    keybindingsContains,
    combineBaseKeybingings
};
