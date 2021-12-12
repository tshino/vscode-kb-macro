'use strict';
const util = require('util');
const genWrapperUtil = require('./gen_wrapper_util');

async function loadBaseKeybindings(baseKeybindingsConfig) {
    const base = [];
    for (const { path, context } of baseKeybindingsConfig) {
        const keybindings = await genWrapperUtil.readJSON(path, { allowComments: true });
        base.push({ keybindings, context });
    }
    return base;
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
                keybinding.when = genWrapperUtil.addWhenContext(keybinding.when, context);
            }
            return keybinding;
        });
    } else {
        return keybindings;
    }
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

function makeCommandLookup(baseKeybindings) {
    const commandLookup = new Map();
    for (const { keybindings, context } of baseKeybindings) {
        for (const keybinding of keybindings) {
            const command = keybinding['command'];
            if (!commandLookup.has(command)) {
                commandLookup.set(command, []);
            }
            const list = commandLookup.get(command);
            const key = keybinding['key'];
            list.push({ key, context });
        }
    }
    return commandLookup;
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
                const pos = genWrapperUtil.keybindingsContains(keybindings, keybinding);
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

function makeUnifiedKeybindings(contextList, commonKeybindings) {
    return commonKeybindings.map(x => {
        const originalKeybinding = x.keybinding;
        const keybinding = genWrapperUtil.copyKeybinding(originalKeybinding);
        const bitmap = x.positions.map(pos => 0 <= pos);
        if (!bitmap.every(enable => enable)) {
            // partial common keybindings (e.g. 'isWindows || isLinux')
            const subset = makeWhenSubsetContext(contextList, bitmap);
            keybinding.when = genWrapperUtil.addWhenContext(keybinding.when, subset);
        }
        const contexts = bitmap.map(
            (enable, i) => enable ? contextList[i] : ''
        ).filter(c => c !== '');
        return {
            originalKeybinding,
            keybinding,
            contexts
        };
    });
}

function makeNonUnifiedKeybindingsList(context, commonKeybindings, dict, contextIndex) {
    const keybindingsList = [];
    let index = 0;
    for (let i = 0; i <= commonKeybindings.length; i++) {
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
            keybindingsList.push(sliced);
            index = pos + 1;
        }
    }
    return keybindingsList;
}

function makeCombinedKeybindingsForKeyPart1(contextList, unified, nonUnified) {
    let combined = [];
    for (let i = 0; i < unified.length; i++) {
        combined = combined.concat(nonUnified.flatMap(
            (x, j) => addKeybindingsContext(x[i], contextList[j])
        ));
        const u = unified[i];
        if (!u.macKey) {
            combined.push(u.keybinding);
        } else {
            const [ nonUnifiedMac, pos ] = u.macKeybinding;
            const nu = nonUnifiedMac[nonUnifiedMac.length - 1];
            if (pos >= nu.length || nu[pos].done) {
                combined.push(u.keybinding);
                continue;
            }
            // flush keybindings that must be written before the unified keybinding.
            const putBefore = nu.slice(0, pos).filter(keybinding => !keybinding.done);
            combined = combined.concat(addKeybindingsContext(putBefore, 'isMac'));
            for (let k = 0; k < pos + 1; k++) {
                nu[k] = { done: true };
            }

            const keybinding = genWrapperUtil.copyKeybinding(u.originalKeybinding);
            keybinding['mac'] = u.macKey;
            combined.push(keybinding);
        }
    }
    return combined;
}

function makeCombinedKeybindingsForKeyPart2(contextList, nonUnified) {
    const leftover = nonUnified.flatMap(
        (x, j) => {
            const nu = x[x.length - 1].filter(keybinding => !keybinding.done);
            return addKeybindingsContext(nu, contextList[j])
        }
    );
    return leftover;
}

// Make combined keybindings of different default keybindings of windows, macos and linux.
function combineBaseKeybingings(baseKeybindings) {
    const contextList = baseKeybindings.map(item => item.context);
    const keyDict = makeKeyDict(baseKeybindings);
    const commandLookup = makeCommandLookup(baseKeybindings);

    // Find out any chance to reduce the number of keybindings by unifying redundant ones.
    const commonKeyDict = makeCommonKeybindingsDict(contextList, keyDict);
    const unifiedKeybindings = new Map(Array.from(commonKeyDict.keys()).map(key => {
        const unified = makeUnifiedKeybindings(contextList, commonKeyDict.get(key));
        return [ key, unified ];
    }));
    const nonUnifiedKeybindings = new Map(Array.from(keyDict.keys()).map(key => ([
        key,
        contextList.map((context, j) => (
            makeNonUnifiedKeybindingsList(context, commonKeyDict.get(key) || [], keyDict.get(key), j)
        ))
    ])));

    // Find out special patterns where 'mac' key can be used to unify keybindings.
    const otherThanMac = contextList.filter(c => c !== 'isMac');
    const macIndex = contextList.findIndex(c => c === 'isMac');
    const checkedKeys = new Set();
    for (const key of keyDict.keys()) {
        checkedKeys.add(key);
        const unified = unifiedKeybindings.get(key) || [];
        for (const u of unified) {
            if (!util.isDeepStrictEqual(u.contexts, otherThanMac)) {
                continue;
            }
            let found = false;
            for (const lookup of commandLookup.get(u.keybinding.command)) {
                if (lookup.context !== 'isMac') {
                    continue;
                }
                const target = genWrapperUtil.copyKeybinding(u.originalKeybinding);
                target.key = lookup.key;
                const nonUnifiedMac = nonUnifiedKeybindings.get(lookup.key)[macIndex];
                if (!checkedKeys.has(lookup.key) && 1 < nonUnifiedMac.length) {
                    // to avoid wrong order listing
                    continue;
                }
                const i = nonUnifiedMac.length - 1;
                for (let k = 0; k < nonUnifiedMac[i].length; k++) {
                    const keybinding = nonUnifiedMac[i][k];
                    if (keybinding.matched) {
                        continue;
                    }
                    if (util.isDeepStrictEqual(target, keybinding)) {
                        // found candidate!
                        u.macKey = lookup.key;
                        u.macKeybinding = [ nonUnifiedMac, k ];
                        keybinding.matched = true;
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
        }
    }
    // clean-up
    for (const key of keyDict.keys()) {
        const unified = unifiedKeybindings.get(key) || [];
        for (const u of unified) {
            if (u.macKey) {
                const [ nonUnifiedMac, k ] = u.macKeybinding;
                delete nonUnifiedMac[nonUnifiedMac.length - 1][k].matched;
            }
        }
    }

    // Reorder and unify keybindings.
    let keybindings = [];
    for (const key of keyDict.keys()) {
        const unified = unifiedKeybindings.get(key) || [];
        const nonUnified = nonUnifiedKeybindings.get(key);
        const combined = makeCombinedKeybindingsForKeyPart1(contextList, unified, nonUnified);
        keybindings = keybindings.concat(combined);
    }
    for (const key of keyDict.keys()) {
        const nonUnified = nonUnifiedKeybindings.get(key);
        const combined = makeCombinedKeybindingsForKeyPart2(contextList, nonUnified);
        keybindings = keybindings.concat(combined);
    }
    return keybindings;
}

module.exports = {
    loadBaseKeybindings,
    combineBaseKeybingings
};
