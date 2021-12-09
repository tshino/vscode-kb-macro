# Change Log

All notable changes to the Keyboard Macro Bata extension will be documented in this file.

### [Unreleased]
- New
  - Added [a list of recommended keymap wrappers](keymap-wrapper/README.md).

### [0.3.0] - 2021-11-27
- New
  - (Internal) Introduced a new script `verify-wrapper.js` to verify default keybinding wrappers. [#10](https://github.com/tshino/vscode-kb-macro/issues/10)
- Fix
  - Some of the default keyboard shortcuts of VS Code were not being recorded unexpectedly due to a bug in the `gen-wrapper.js` script.

### [0.2.0] - 2021-11-23
- New
  - Support for complex snippet insertion especially one with multiple occurrences of a single placeholder. [#6](https://github.com/tshino/vscode-kb-macro/issues/6)
- Fix
  - Failure to detect typed characters under some conditions.
  - Wrong location of multi-cursor after playback of typing under some conditions.
  - Incorrect prediction of multi-cursor location on typing detection under some conditions.

### [0.1.0] - 2021-11-17
- Initial release
