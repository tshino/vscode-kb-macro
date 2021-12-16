# Change Log

All notable changes to the Keyboard Macro Bata extension will be documented in this file.

### [Unreleased]
- New
  - Added Sublime Text Keymap support. [#18](https://github.com/tshino/vscode-kb-macro/issues/18)

### [0.5.0] - 2021-12-14
- New
  - Added Web extension support. [#17](https://github.com/tshino/vscode-kb-macro/pull/17)
  - (Internal) Introduced Conditional Await syntax on keymap wrapper's config file.
- Update
  - Updated keymap wrappers for Vz Keymap and Awesome Emacs Keymap; Reduced unnecessary delays in playback.

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
