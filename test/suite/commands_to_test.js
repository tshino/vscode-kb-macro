'use strict';

const CommandsToTest = {
    CursorDown: { command: 'cursorDown' },
    CursorDownSelect: { command: 'cursorDownSelect' },
    CursorLeft: { command: 'cursorLeft' },
    CursorLeftSelect: { command: 'cursorLeftSelect' },
    CursorRight: { command: 'cursorRight' },
    CursorRightSelect: { command: 'cursorRightSelect' },
    CursorUp: { command: 'cursorUp' },
    CursorUpSelect: { command: 'cursorUpSelect' },

    CursorBottom: { command: 'cursorBottom' },
    CursorBottomSelect: { command: 'cursorBottomSelect' },
    CursorTop: { command: 'cursorTop' },
    CursorTopSelect: { command: 'cursorTopSelect' },
    CursorEnd: { command: 'cursorEnd', args: { sticky: false } },
    CursorEndSelect: { command: 'cursorEndSelect', args: { sticky: false } },
    CursorHome: { command: 'cursorHome' },
    CursorHomeSelect: { command: 'cursorHomeSelect' },

    CancelSelection: { command: 'cancelSelection' },
    RemoveSecondaryCursors: { command: 'removeSecondaryCursors' },

    EditorActionSelectAll: { command: 'editor.action.selectAll' },

    Enter: { command: 'type', args: { text: '\n' } },
    Tab: { command: "tab" },

    DeleteLeft: { command: "deleteLeft" },
    DeleteRight: { command: "deleteRight" },
    DeleteWordLeft: { command: "deleteWordLeft" },
    DeleteWordRight: { command: "deleteWordRight" },
    ClipboardCopy: { command: "editor.action.clipboardCopyAction", await: 'clipboard' },
    ClipboardCut_NotHOL: { command: "editor.action.clipboardCutAction", await: 'document selection clipboard' },
    ClipboardCut_HOL: { command: "editor.action.clipboardCutAction", await: 'document clipboard' },
    ClipboardPaste: { command: "editor.action.clipboardPasteAction", await: 'document selection' },
    CopyLinesDown: { command: "editor.action.copyLinesDownAction" },
    CopyLinesUp: { command: "editor.action.copyLinesUpAction" },
    Outdent: { command: 'outdent' },
    OutdentLines: { command: 'editor.action.outdentLines' },
    IndentLines: { command: 'editor.action.indentLines' },
    MoveLinesDown: { command: "editor.action.moveLinesDownAction" },
    MoveLinesUp: { command: "editor.action.moveLinesUpAction" },
    CommentLine: { command: "editor.action.commentLine" },
    AddCommentLine: { command: "editor.action.addCommentLine" },
    RemoveCommentLine: { command: "editor.action.removeCommentLine" },

    TriggerSuggest: { command: "editor.action.triggerSuggest", record: "side-effect" },
    AcceptSuggestion: { command: "acceptSelectedSuggestion", record: "side-effect" },
    NextSnippetPlaceholder: { command: "jumpToNextSnippetPlaceholder", record: "side-effect" },
    PrevSnippetPlaceholder: { command: "jumpToPrevSnippetPlaceholder", record: "side-effect" }
};

module.exports = { CommandsToTest };
