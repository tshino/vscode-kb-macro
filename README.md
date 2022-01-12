# Keyboard Macro Beta

[![Node.js CI](https://github.com/tshino/vscode-kb-macro/actions/workflows/node.js.yml/badge.svg)](https://github.com/tshino/vscode-kb-macro/actions/workflows/node.js.yml)
[![CodeQL](https://github.com/tshino/vscode-kb-macro/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/tshino/vscode-kb-macro/actions/workflows/codeql-analysis.yml)

This extension is still at an early stage of development. Contributions are appreciated.

With this Visual Studio Code extension, you can record and playback your keyboard inputs.

```
    Ctrl+Alt+R : Start/Stop Recording
    Ctrl+Alt+P : Playback
```

**IMPORTANT NOTE**
  - If you are using any other keymap extension or have custom keybindings in the `keybindings.json`, unfortunately, likely keystrokes in them won't be recorded. See the section below to enable them.

**YOU CAN RECORD** (basically):
  - Characters that you type in a text editor
    - including ones via code completion or IME as well.
  - Editor keyboard shortcuts in VS Code default keybindings
    - such as cursor movement, selection, scroll, delete, cut/copy/paste, search/replace, undo/redo, indent, comment, and so on.

**YOU CANNOT RECORD** (mainly due to the lack of capabilities of VS Code API to capture them):
  - Mouse inputs
  - Command execution via Command Palette
  - Menu navigation (even if you use acceralator keys)
  - Widget/Popup UI navigation (e.g. Find and replace widget, IntelliSence popup)
    - Typing on the find/replace input box is not recorded, but shortcut keys like Enter/F3 (Find Next) hit on the widget are recorded.
    - Selecting items on suggest widget (even with arrow keys) are not recorded, however, once you accept one of the items and the text is inserted into the document, that is recorded as if you typed it directly.
  - IME nagivation
    - IME navigation is not recorded directly, however, the characters that are inserted into the document as output from IME are recorded as if they are typed directly.

## How to enable your favorite custom keybindings to record

If you found your favorite shortcuts are not supported to record, you could make them recordable by adding corresponding wrappers to your `keybindings.json`.

If you have a keybinding rule like:
```json
    {
        "key": "ctrl+shift+a",
        "command": "editor.action.selectToBracket",
        "when": "editorTextFocus"
    }
```
the corresponding wrapper should look like below.
```json
    {
        "key": "ctrl+shift+a",
        "command": "kb-macro.wrap",
        "args": {
            "command": "editor.action.selectToBracket"
        },
        "when": "kb-macro.recording && editorTextFocus"
    }
```
Add this keybinding rule below the original one in the `keybindings.json`.

The followings are the details.
- The `kb-macro.wrap` command is the wrapper that executes the target command specified in the `args.command` parameter and records it on the sequence.
- The `when` clause of a wrapper keybinding should contain additional context `kb-macro.recording`, which evaluates to `true` when macro recording is active.
- If you have an `args` parameter for the target command, you could write it in `args.args`.
- If the target command is not a built-in command of VS Code, in other words, it is provided by an extension, likely you may need to add an `args.await` parameter in the wrapper. See below.

## How to enable your favorite keymap extension to record

See [Keymap Wrappers](keymap-wrapper/README.md).

## The `args.await` parameter

When this extension performs playback of a recorded command sequence, the commands should be executed one by one exactly. Specifically, each command in the sequence should end its execution and all the side effects of the command such as document change should be completed before the subsequent command is invoked. Otherwise, it may cause an unexpected result.

The mechanism of this extension to playback recorded command sequence relies on a VS Code API `vscode.commands.executeCommand`. But unfortunately, this API doesn't seem to provide a promise that resolves when the target command ends its execution. Especially, if the target command is of an extension, the API seems to only ensure the start of the command execution. And the same thing happens with some built-in commands.

So, we don't have a proper way to execute commands one by one, without any knowledge of target commands.

We need to know the true timing of the end of command execution, especially for commands with side effects. The `args.await` parameter is the way to tell this extension the set of possible side effects of a target command.
```json
    {
        "key": "ctrl+alt+z",
        "command": "kb-macro.wrap",
        "args": {
            "command": "some.extension.command",
            "await": "document selection"
        },
        "when": "kb-macro.recording && editorTextFocus"
    }
```
The value of an `args.await` parameter is a space-separated keyword list. Possible keywords are shown below.

| Keyword | Event to wait for to happen |
| ------- | ------- |
| `'document'` | Changes in the text document of the active editor |
| `'selection'` | Changes of the selection (typically, cursor movement) in the active editor |
| `'cilpboard'` | Changes of the clipboard text |

If multiple keywords are specified in an `args.await` parameter, it means all of them are expected to happen.

If a target command does not always reproduce the specified side effects, it is okay since the playback mechanism has a timeout, which is 300 milliseconds.

## How to use custom shortcut keys for recording and playback

This is the default keybinding set for recording/playback of this extension. Copy and paste this into your `keybindings.json` and modify it as you like.

```json
    {
        "key": "ctrl+alt+r",
        "command": "kb-macro.startRecording",
        "when": "!kb-macro.recording"
    },
    {
        "key": "ctrl+alt+r",
        "command": "kb-macro.finishRecording",
        "when": "kb-macro.recording"
    },
    {
        "key": "ctrl+alt+p",
        "command": "kb-macro.playback",
        "when": "!kb-macro.recording"
    },
    {
        "key": "ctrl+alt+p",
        "command": "kb-macro.cancelRecording",
        "when": "kb-macro.recording"
    },
    {
        "key": "escape",
        "command": "kb-macro.abortPlayback",
        "when": "kb-macro.playing"
    }
```

## Tips
| Task | Recordable ways to do it |
| ---- | ------------------------ |
| Move focus to editor | Instead of mouse, use `ctrl+1` (mac: `cmd+1`) |
| Switch to another tab | Instead of `ctrl+tab`, use `ctrl+pageup`/`ctrl+pagedown` (mac: `alt+cmd+left`/`alt+cmd+right`) |

## Commands
### For recording
| Command name | Command ID | Function |
| ------------ | ---------- | -------- |
| `Start Recording` | `kb-macro.startRecording` | Start recording |
| `Finish Recording` | `kb-macro.finishRecording` | Stop recording |
| `Cancel Recording` | `kb-macro.cancelRecording` | Stop recording and discard the recorded sequence |

### For playback
| Command name | Command ID | Function |
| ------------ | ---------- | -------- |
| `Playback` | `kb-macro.playback` | Perform playback of the last recorded sequence |
| `Abort Playback` | `kb-macro.abortPlayback` | Abort currently-running playback |
| `Repeat Playback` | `kb-macro.repeatPlayback` | Perform playback specified number of times |

The `kb-macro.repeatPlayback` command shows an input box to specify the number of times.

The `kb-macro.playback` command has an optional `repeat` argument to specify the number of times to repeat. For example,
```json
{
    "key": "ctrl+alt+5",
    "command": "kb-macro.playback",
    "args": { "repeat": 5 }
}
```
this keyboard shortcut performs playback 5 times.


## Known issues
- Keyboard shortcuts that VS Code newly introduced may not be supported by this extension. Because this extension is configured with a fixed set of wrapper keybindings based on a particular version of VS Code for Windows, Linux, and macOS.
- This extension is intended to work with VS Code on Windows, Linux, and macOS, but is tested mainly on Windows at this moment.

## Design details
See [DESIGN.md](DESIGN.md).

## Change log
See [CHANGELOG.md](CHANGELOG.md).
