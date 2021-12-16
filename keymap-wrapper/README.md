# Keymap Wrappers

As described in the [README](../README.md) in the root of this repository, it is required to write a keymap wrapper for a keymap extension so that the keymap works combined with this Keyboard Macro extension.

A keymap wrapper is a list of keybindings to wrap each keyboard shortcut of a keymap to enable it to record.

To use a keymap wrapper, you simply insert the whole keybindings into your `keybindings.json`.

While you can create your own keymap wrapper for your favorite keymap extension by hand-writing, it is better to use a script to generate one based on the `package.json` of the keymap extension.

And of course the more better way is to use existing keymap wrapper.

## Available Keymap Wrappers

Open the keymap wrapper (JSON) link, copy the whole keybindings in the file, and paste them into your `keybindings.json`.

| Keymap extension | Keymap wrapper (JSON) | Last updated | Start rec. | Stop rec. | Playback | Note |
| ---------------- | -------------- | ------------ | ---------- | --------- | -------- | ---- |
| [Sublime Text Keymap](https://marketplace.visualstudio.com/items?itemName=ms-vscode.sublime-keybindings) | [ms-vscode.sublime-keybindings.json](ms-vscode.sublime-keybindings.json) | 2021-12-17 | `Ctrl+Q` | `Ctrl+Q` | `Ctrl+Shift+Q` | |
| [Awesome Emacs Keymap](https://marketplace.visualstudio.com/items?itemName=tuttieee.emacs-mcx) | [tuttieee.emacs-mcx.json](tuttieee.emacs-mcx.json) | 2021-12-11 | `C-x S-9` | `C-x S-0` | `C-x e` | VS Code can't map '(' and ')' keys |
| [Vz Keymap](https://marketplace.visualstudio.com/items?itemName=tshino.vz-like-keymap) | [tshino.vz-like-keymap.json](tshino.vz-like-keymap.json) | 2021-12-11 | `Ctrl+_` | `Ctrl+^` | `Ctrl+^` | |

## Making a Keymap Wrapper

1. `git clone` this repository
2. Run `npm install`
3. Make a config file for a new keymap wrapper in the `keymap-wrapper` directory. The file name should be in the form of `{EXTENSION-ID}.config.json`.
4. Run `npm run update-keymap-wrapper` (on bash) which downloads `package.json` of each target keymap extension into `keymap-wrapper/tmp` directory and generates and writes a keymap wrapper file into `keymap-wrapper` directory. (or run `node generator/gen_keymap_wrapper.js` to skip downloading)
