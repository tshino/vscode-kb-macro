'use strict';
const util = require('util');

function addWhenContext(when, context) {
    if (when) {
        const conditions = when.split('||');
        const restricted = conditions.map(cond => context + ' && ' + cond.trim()).join(' || ');
        return restricted;
    } else {
        return context;
    }
}

function addKeybindingsContext(keybindings, context) {
    if (context) {
        return keybindings.map(keybinding => {
            keybinding.when = addWhenContext(keybinding.when, context);
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

// Makes combined keybindings of different default keybindings of windows, macos and linux.
function combineBaseKeybingings(baseKeybindings) {
    // Make a map that associates each keystroke to a set of keybindings.
    const keyDict = new Map();
    for (const { keybindings, when = '' } of baseKeybindings) {
        for (const keybinding of keybindings) {
            const key = keybinding['key'];
            if (!keyDict.has(key)) {
                keyDict.set(key, new Map());
            }
            const dict = keyDict.get(key);
            if (!dict.has(when)) {
                dict.set(when, []);
            }
            dict.get(when).push(keybinding);
        }
    }
    const contextList = baseKeybindings.map(item => (item['when'] || ''));
    let combined = [];
    for (const dict of keyDict.values()) {
        // Find common keybindings that are shared among all sources.
        const commonKeybindings = [];
        const firstSet = dict.get(contextList[0]) || [];
        for (let pos0 = 0; pos0 < firstSet.length; pos0++) {
            const positions = [ pos0 ];
            const keybinding = firstSet[pos0];
            let missing = false;
            for (let j = 1; j < contextList.length; j++) {
                const keybindings = dict.get(contextList[j]) || [];
                const pos = keybindingsContains(keybindings, keybinding);
                if (pos < 0) {
                    missing = true;
                    break;
                }
                positions[j] = pos;
            }
            if (!missing) { // found a common keybinding among all contexts
                commonKeybindings.push(positions);
            }
        }
        // Drop common keybindings that are not placed in order.
        for (let i = 0; i + 1 < commonKeybindings.length; i++) {
            if (!commonKeybindings[i].every((pos, j) => pos < commonKeybindings[i + 1][j])) {
                // out of order
                commonKeybindings.splice(i + 1, 1);
                i--;
            }
        }
        // Reorder and unify keybindings.
        commonKeybindings.push(contextList.map(context => (dict.get(context) || []).length));
        for (let i = 0; i < commonKeybindings.length; i++) {
            for (let j = 0; j < contextList.length; j++) {
                const context = contextList[j];
                const keybindings = dict.get(context) || [];
                const from = 0 < i ? commonKeybindings[i - 1][j] + 1 : 0;
                const to = commonKeybindings[i][j];
                const sliced = keybindings.slice(from, to);
                const converted = addKeybindingsContext(sliced, context);
                combined = combined.concat(converted);
            }
            if (i + 1 < commonKeybindings.length) {
                // unified keybinding
                const keybinding = dict.get(contextList[0])[commonKeybindings[i][0]];
                combined.push(keybinding);
            }
        }
    }
    return combined;
}

module.exports = {
    addWhenContext,
    keybindingsContains,
    combineBaseKeybingings
};
