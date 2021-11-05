'use strict';

function addWhenContext(when, context) {
    if (when) {
        const conditions = when.split('||');
        const restricted = conditions.map(cond => context + ' && ' + cond.trim()).join(' || ');
        return restricted;
    } else {
        return context;
    }
}

// Makes combined keybindings of different default keybindings of windows, macos and linux.
function combineBaseKeybingings(baseKeybindings) {
    let combined = [];
    for (const item of baseKeybindings) {
        let keybindings = item['keybindings'];
        if (item['when']) {
            keybindings = keybindings.map(keybinding => {
                keybinding.when = addWhenContext(keybinding.when, item['when']);
                return keybinding;
            });
        }
        combined = combined.concat(keybindings);
    }
    return combined;
}

module.exports = { addWhenContext, combineBaseKeybingings };
