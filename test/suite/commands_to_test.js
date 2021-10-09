'use strict';

const CommandsToTest = {
    CursorDown: { command: 'cursorDown' },
    CursorLeft: { command: 'cursorLeft' },
    CursorRight: { command: 'cursorRight' },
    CursorUp: { command: 'cursorUp' },

    CursorBottom: { command: 'cursorBottom' },
    CursorBottomSelect: { command: 'cursorBottomSelect' },
    CursorTop: { command: 'cursorTop' },
    CursorTopSelect: { command: 'cursorTopSelect' },
    CursorEnd: { command: 'cursorEnd', args: { sticky: false } },
    CursorEndSelect: { command: 'cursorEndSelect', args: { sticky: false } },
    CursorHome: { command: 'cursorHome' },
    CursorHomeSelect: { command: 'cursorHomeSelect' },

    Enter: { command: 'type', args: { text: '\n' } },
    Tab: { command: "tab" },
    CommentLine: { command: "editor.action.commentLine" },
};

module.exports = { CommandsToTest };
