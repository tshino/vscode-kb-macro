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
| [Atom Keymap](https://marketplace.visualstudio.com/items?itemName=ms-vscode.atom-keybindings) | [link](ms-vscode.atom-keybindings.json) | 2022-04-05 | `Ctrl+Alt+R` | `Ctrl+Alt+R` | `Ctrl+Alt+P` |
| [Awesome Emacs Keymap](https://marketplace.visualstudio.com/items?itemName=tuttieee.emacs-mcx) | [link](tuttieee.emacs-mcx.json) | 2022-05-04 | `C-x S-9` | `C-x S-0` | `C-x e` |
| [Delphi Keymap](https://marketplace.visualstudio.com/items?itemName=alefragnani.delphi-keybindings) | [link](alefragnani.delphi-keybindings.json) | 2022-04-05 | `Ctrl/Cmd+Shift+R` | `Ctrl/Cmd+Shift+R` | `Ctrl/Cmd+Shift+P` |
| [Notepad++ Keymap](https://marketplace.visualstudio.com/items?itemName=ms-vscode.notepadplusplus-keybindings) | [link](ms-vscode.notepadplusplus-keybindings.json) | 2021-12-26 | `Ctrl+Shift+R` | `Ctrl+Shift+R` | `Ctrl+Shift+P` |
| [Sublime Text Keymap](https://marketplace.visualstudio.com/items?itemName=ms-vscode.sublime-keybindings) | [link](ms-vscode.sublime-keybindings.json) | 2021-12-21 | `Ctrl/Cmd+Q` | `Ctrl/Cmd+Q` | `Ctrl/Cmd+Shift+Q` |
| [Visual Studio Keymap](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vs-keybindings) | [link](ms-vscode.vs-keybindings.json) | 2022-04-05 | `Ctrl+M R` | `Ctrl+M R` | `Ctrl+M Enter` |
| [Vz Keymap](https://marketplace.visualstudio.com/items?itemName=tshino.vz-like-keymap) | [link](tshino.vz-like-keymap.json) | 2022-06-12 | `Ctrl+_` | `Ctrl+^` | `Ctrl+^` |

- Each keyboard shortcut for start/stop recording and playback is assigned to the same ones that the original editor is using, as much as possible.
- You can find the definitions of them at the bottom of each keymap wrapper file (find the `startRecording` command etc.). You can customize them as you like.
- Some shortcuts in the above table are overriding the default shortcuts of VS Code such as Command Palette (`Ctrl/Cmd+Shift+P`) unintentionally.
- Notes on **Atom Keymap**:
    - Since Atom seems to not have macro recording functionality, the shortcuts in the keymap wrapper are set as the same as the default of this extension.
- Notes on **Awesome Emacs Keymap**:
    - You can also use the emacs-style prefix-arguments with the playback command! For example `C-u 7 C-x e` will playback the sequence 7 times. Please be sure that you are using the Awesome Emacs Keymap v0.37.0 or later. Thanks to [@whitphx (Tsuchiya)](https://github.com/whitphx) for the collaborative work!
    - The `S-9` (`shift+9`) and `S-0` (`shift+0`) in the table are meant to be `(` and `)` respectively on the US keyboard. We had to write them in such a way because VS Code seems to not allow using `(` or `)` in keybindings. If your keyboard has a different layout, please adjust the keybindings by yourself.
    - You can also use `C-g` to abort the playback.

When you stop using the keymap extension by disabling/uninstalling it, please don't forget to remove also the keymap wrapper from your `keybindings.json`.

## Making a Keymap Wrapper

1. `git clone` this repository
2. Run `npm install`
3. Make a config file for a new keymap wrapper in the `keymap-wrapper` directory. The file name should be in the form of `{EXTENSION-ID}.config.json`.
4. Run `npm run update-keymap-wrapper` (on bash) which downloads `package.json` of each target keymap extension into `keymap-wrapper/tmp` directory and generates and writes a keymap wrapper file into `keymap-wrapper` directory. (or run `node generator/gen_keymap_wrapper.js` to skip downloading)
