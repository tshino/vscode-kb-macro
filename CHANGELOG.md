# Change Log

All notable changes to the Keyboard Macro Bata extension will be documented in this file.

### [0.8.0] - 2022-01-01
- New
  - Added Delphi Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#23](https://github.com/tshino/vscode-kb-macro/pull/23)
  - Added Visual Studio Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#24](https://github.com/tshino/vscode-kb-macro/pull/24)
  - Added emacs-style prefix-arguments support through the keymap wrapper for Awesome Emacs Keymap. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#25](https://github.com/tshino/vscode-kb-macro/pull/25)
  - Added new `kb-macro.abortPlayback` command, which is available on `escape` key. [#26](https://github.com/tshino/vscode-kb-macro/pull/26)
  - Added new `kb-macro.playing` 'when'-clause context, which evaluates true when the macro playback is ongoing. [#27](https://github.com/tshino/vscode-kb-macro/pull/27)
- Update
  - (Internal) Added colors to warnings and errors on the console output of generator scripts.

### [0.7.0] - 2021-12-26
- New
  - Added Atom Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#22](https://github.com/tshino/vscode-kb-macro/pull/22)
  - Added Notepad++ Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#21](https://github.com/tshino/vscode-kb-macro/pull/21)
  - Added new 'when' clause context `kb-macro.headOfLine`, which evaluates true if the cursor is at the beginning of a line, for the help of defining more precise await options.
- Update
  - Reduced unnecessary delays after the `editor.action.clipboardCutAction` command.
  - Added comment lines to keymap wrapper files to describe keymap name and its version. [#20](https://github.com/tshino/vscode-kb-macro/pull/20)
- Fix
  - Keymap wrapper for Sublime Text may have not been working correctly on Mac due to "mac" keys in user `keybindings.json`.
  - Fixed minor issues on command sequence optimization to reduce redundant cursor movement.

### [0.6.0] - 2021-12-19
- New
  - Added Sublime Text Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#18](https://github.com/tshino/vscode-kb-macro/issues/18)
  - Added 'repeat' argument support to the playback command. [#19](https://github.com/tshino/vscode-kb-macro/pull/19)
- Update
  - Updated keymap wrapper for Vz Keymap; Removed unnecessary wrappers for Vz Keymap's built-in macro feature.
- Fix
  - Keymap wrapper for Awesome Emacs Keymap may have not been working correctly on Mac due to "mac" keys in user `keybindings.json`.

### [0.5.0] - 2021-12-14
- New
  - Added Web extension support. [#17](https://github.com/tshino/vscode-kb-macro/pull/17)
  - (Internal) Introduced Conditional Await syntax on keymap wrapper's config file.
- Update
  - Updated keymap wrapper for Vz Keymap; Reduced unnecessary delays in playback.
  - Updated keymap wrapper for Awesome Emacs Keymap; Reduced unnecessary delays in playback.

### [0.4.0] - 2021-12-10
- New
  - Added [a list of recommended keymap wrappers](keymap-wrapper/README.md).
    - For now, it includes [Awesome Emacs Keymap](https://marketplace.visualstudio.com/items?itemName=tuttieee.emacs-mcx) and [Vz Keymap](https://marketplace.visualstudio.com/items?itemName=tshino.vz-like-keymap).
  - (Internal) Added a new script `gen_keymap_wrapper.js` to generate keymap wrapper. [#11](https://github.com/tshino/vscode-kb-macro/issues/11)
- Update
  - Updated default keybindings based on VS Code 1.63.0 (Windows, Linux).
- Fix
  - The wrapper generating script had a potential issue of generating keybindings for macOS in the incorrect order.

### [0.3.0] - 2021-11-27
- New
  - (Internal) Introduced a new script `verify_wrapper.js` to verify default keybinding wrappers. [#10](https://github.com/tshino/vscode-kb-macro/issues/10)
- Fix
  - Some of the default keyboard shortcuts of VS Code were not being recorded unexpectedly due to a bug in the `gen_wrapper.js` script.

### [0.2.0] - 2021-11-23
- New
  - Support for complex snippet insertion especially one with multiple occurrences of a single placeholder. [#6](https://github.com/tshino/vscode-kb-macro/issues/6)
- Fix
  - Failure to detect typed characters under some conditions.
  - Wrong location of multi-cursor after playback of typing under some conditions.
  - Incorrect prediction of multi-cursor location on typing detection under some conditions.

### [0.1.0] - 2021-11-17
- Initial release
