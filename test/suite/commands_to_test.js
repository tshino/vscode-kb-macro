'use strict';

const CommandsToTest = {
    CursorDown: { command: 'cursorDown' },
    CursorLeft: { command: 'cursorLeft' },
    CursorRight: { command: 'cursorRight' },
    CursorUp: { command: 'cursorUp' },

    CursorBottom: { command: 'cursorBottom' },
    CursorTop: { command: 'cursorTop' },

    Enter: { command: 'type', args: { text: '\n' } },
    Tab: { command: "tab" },
    CommentLine: { command: "editor.action.commentLine" },
};

module.exports = { CommandsToTest };
