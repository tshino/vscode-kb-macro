# Keymap Wrappers

As described in the [README](../README.md) in the root of this repository, it is required to write a keymap wrapper for a keymap extension so that the keymap works combined with this Keyboard Macro extension.

A keymap wrapper is a list of keybindings to wrap each keyboard shortcut of a keymap to enable it to record.

To use a keymap wrapper, you simply insert the whole keybindings into your `keybindings.json`.

While you can create your own keymap wrapper for your favorite keymap extension by hand-writing, it is better to use a script to generate one based on the `package.json` of the keymap extension.

And of course the more better way is to use existing keymap wrapper.

## Available Keymap Wrappers

Click the keymap wrapper link in the table below, which opens a JSON file. Copy the whole keybindings in the file, and paste them into your `keybindings.json`.

| Keymap extension | Keymap wrapper | Last updated | Start recording | Stop recording | Playback |
| ---------------- | -------------- | ------------ | ---------- | --------- | -------- |
| [Atom Keymap](https://marketplace.visualstudio.com/items?itemName=ms-vscode.atom-keybindings) | [link](ms-vscode.atom-keybindings.json) | 2021-12-24 | `Ctrl+Alt+R` | `Ctrl+Alt+R` | `Ctrl+Alt+P` |
| [Awesome Emacs Keymap](https://marketplace.visualstudio.com/items?itemName=tuttieee.emacs-mcx) | [link](tuttieee.emacs-mcx.json) | 2021-12-17 | `C-x S-9` | `C-x S-0` | `C-x e` |
| [Delphi Keymap](https://marketplace.visualstudio.com/items?itemName=alefragnani.delphi-keybindings) | [link](alefragnani.delphi-keybindings.json) | 2021-12-27 | `Ctrl/Cmd+Shift+R` | `Ctrl/Cmd+Shift+R` | `Ctrl/Cmd+Shift+P` |
| [Notepad++ Keymap](https://marketplace.visualstudio.com/items?itemName=ms-vscode.notepadplusplus-keybindings) | [link](ms-vscode.notepadplusplus-keybindings.json) | 2021-12-26 | `Ctrl+Shift+R` | `Ctrl+Shift+R` | `Ctrl+Shift+P` |
| [Sublime Text Keymap](https://marketplace.visualstudio.com/items?itemName=ms-vscode.sublime-keybindings) | [link](ms-vscode.sublime-keybindings.json) | 2021-12-21 | `Ctrl/Cmd+Q` | `Ctrl/Cmd+Q` | `Ctrl/Cmd+Shift+Q` |
| [Vz Keymap](https://marketplace.visualstudio.com/items?itemName=tshino.vz-like-keymap) | [link](tshino.vz-like-keymap.json) | 2021-12-11 | `Ctrl+_` | `Ctrl+^` | `Ctrl+^` |

- Some keybinding for start/stop recording and playback in the above table are overriding the default shortcuts of VS Code such as Command Palette (`Ctrl/Cmd+Shift+P`).
- You can find the definitions of them at the bottom of each keymap wrapper file. You can customize them as you like.
- The `S-9` and `S-0` in the row of Awesome Emacs Keymap are meant to be `(` and `)` on the US keyboard. We had to write as such because VS Code seems to not allow using `(` or `)` in keybindings.

## Making a Keymap Wrapper

1. `git clone` this repository
2. Run `npm install`
3. Make a config file for a new keymap wrapper in the `keymap-wrapper` directory. The file name should be in the form of `{EXTENSION-ID}.config.json`.
4. Run `npm run update-keymap-wrapper` (on bash) which downloads `package.json` of each target keymap extension into `keymap-wrapper/tmp` directory and generates and writes a keymap wrapper file into `keymap-wrapper` directory. (or run `node generator/gen_keymap_wrapper.js` to skip downloading)
