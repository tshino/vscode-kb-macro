# Change Log

All notable changes to the Keyboard Macro Bata extension will be documented in this file.

### [Unreleased]
- Update
  - Added a tooltip on the `REC` mark on the status bar to be clear. [#197](https://github.com/tshino/vscode-kb-macro/issues/197)
  - Updated keymap wrapper for Atom Keymap (v3.3.0).
- Documentation:
  - Added 'API' section to [DESIGN.md](./DESIGN.md).

### [0.13.0] - 2023-01-16
- Feature:
  - Added optimization of the input sequence to the playback command. [#195](https://github.com/tshino/vscode-kb-macro/pull/195)
    - This optimization can improve playback performance, especially in a sequence containing a long typing.
  - Added Background Recording API which opens a way to create custom keystroke automation extensions. [#176](https://github.com/tshino/vscode-kb-macro/issues/176)
- Update
  - Changed the activatation context of wrapper keybindings from `kb-macro.recording` to `kb-macro.active`. [#133](https://github.com/tshino/vscode-kb-macro/issues/133)
    - This change does not require any actions for existing users unless they want to use the extra feature Background Recording API.
  - Updated keymap wrapper for Vz Keymap (v0.19.4). [#180](https://github.com/tshino/vscode-kb-macro/pull/180)
  - Updated keymap wrapper for Atom Keymap (v3.2.0).
- Internal
  - Added `vsce` command to devDependencies.

### [0.12.10] - 2022-12-17
- Fix
  - Fixed: Some keybindings related to Code Action, which cannot be played back, were being recorded. [#173](https://github.com/tshino/vscode-kb-macro/pull/173)
- Update
  - Updated default keybindings wrappers based on vscode 1.74.1. [#172](https://github.com/tshino/vscode-kb-macro/pull/172)

### [0.12.9] - 2022-12-10
- Update
  - Updated default keybindings wrappers based on vscode 1.74.0. [#170](https://github.com/tshino/vscode-kb-macro/pull/170)
  - Updated keymap wrapper for Awesome Emacs Keymap (v0.46.0). [#162](https://github.com/tshino/vscode-kb-macro/pull/162)
  - Updated keymap wrapper for Awesome Emacs Keymap (v0.47.0). [#165](https://github.com/tshino/vscode-kb-macro/pull/165)
  - Updated keymap wrapper for Vz Keymap (v0.19.3). [#166](https://github.com/tshino/vscode-kb-macro/pull/166)

### [0.12.8] - 2022-11-05
- Update
  - Updated default keybindings wrappers based on vscode 1.73.0. [#158](https://github.com/tshino/vscode-kb-macro/pull/158)
- Internal:
  - Updated automated workflow to stop using deprecated 'set-output' commands. [#156](https://github.com/tshino/vscode-kb-macro/pull/156)

### [0.12.7] - 2022-10-09
- Update
  - Updated default keybindings wrappers based on vscode 1.72.0. [#151](https://github.com/tshino/vscode-kb-macro/pull/151)
  - Updated keymap wrapper for Delphi Keymap (v9.6.0). [#152](https://github.com/tshino/vscode-kb-macro/pull/152)

### [0.12.6] - 2022-09-05
- Update
  - Updated default keybindings wrappers based on vscode 1.71.0. [#147](https://github.com/tshino/vscode-kb-macro/pull/147)
- Internal:
  - Fixed: Failure in automated workflow to update default keybindings wrappers. [#145](https://github.com/tshino/vscode-kb-macro/issues/145)

### [0.12.5] - 2022-08-28
- Fix
  - Fixed: `ctrl+shift+f` fails to focus Search in recording mode. [#142](https://github.com/tshino/vscode-kb-macro/issues/142)
- Update
  - Updated keymap wrapper for Awesome Emacs Keymap (v0.44.1). [#144](https://github.com/tshino/vscode-kb-macro/pull/144)

### [0.12.4] - 2022-08-06
- Update
  - Updated default keybindings wrappers based on vscode 1.70.0. [#135](https://github.com/tshino/vscode-kb-macro/pull/135)
  - Updated keymap wrapper for Delphi Keymap (v9.5.1). [#136](https://github.com/tshino/vscode-kb-macro/pull/136)
- Documentation:
  - Added 'Dealing with re-entrance' section to [DESIGN.md](./DESIGN.md).
- Internal:
  - Added new `kb-macro.active` when clause context. At this version, it is just an alias of `kb-macro.recording`. [#134](https://github.com/tshino/vscode-kb-macro/pull/134)

### [0.12.3] - 2022-07-09
- Update
  - Updated default keybindings wrappers based on vscode 1.69.0. [#126](https://github.com/tshino/vscode-kb-macro/pull/126)

### [0.12.2] - 2022-06-12
- Fix
  - Fixed: `ctrl+tab` doesn't work correctly with this extension installed. [#119](https://github.com/tshino/vscode-kb-macro/issues/119)
- Update
  - Updated default keybindings wrappers based on vscode 1.67.1. [#106](https://github.com/tshino/vscode-kb-macro/pull/106)
  - Updated default keybindings wrappers based on vscode 1.67.2. [#108](https://github.com/tshino/vscode-kb-macro/pull/108)
  - Updated default keybindings wrappers based on vscode 1.68.0. [#117](https://github.com/tshino/vscode-kb-macro/pull/117)
  - Updated keymap wrapper for Vz Keymap (v0.19.2). [#118](https://github.com/tshino/vscode-kb-macro/pull/118)
- Internal
  - Added summary output for the automated workflow. [#102](https://github.com/tshino/vscode-kb-macro/pull/102)
  - Enabled github-actions version updates with Dependabot.

### [0.12.1] - 2022-05-07
- Documentation:
  - Added 'Testing' section to [DESIGN.md](./DESIGN.md).
- Update
  - Updated default keybindings wrappers based on vscode 1.66.1. [#93](https://github.com/tshino/vscode-kb-macro/pull/93)
  - Updated default keybindings wrappers based on vscode 1.66.2. [#95](https://github.com/tshino/vscode-kb-macro/pull/95)
  - Updated default keybindings wrappers based on vscode 1.67.0. [#101](https://github.com/tshino/vscode-kb-macro/pull/101)
  - Updated keymap wrapper for Vz Keymap (v0.19.0). [#96](https://github.com/tshino/vscode-kb-macro/pull/96)
  - Updated keymap wrapper for Vz Keymap (v0.19.1). [#100](https://github.com/tshino/vscode-kb-macro/pull/100)
  - Updated keymap wrapper for Awesome Emacs Keymap (v0.43.1). [#97](https://github.com/tshino/vscode-kb-macro/pull/97)
  - Updated keymap wrapper for Awesome Emacs Keymap (v0.44.0). [#99](https://github.com/tshino/vscode-kb-macro/pull/99)

### [0.12.0] - 2022-04-05
- Feature
  - Enabled using saved macros during recording. [#72](https://github.com/tshino/vscode-kb-macro/issues/72)
- Documentation:
  - Added 'When clause context' section to the README.
  - Added 'Keymap wrappers' section to [DESIGN.md](./DESIGN.md).
- Update
  - Updated default keybindings based on VS Code 1.66.0. [#87](https://github.com/tshino/vscode-kb-macro/pull/87)
  - Updated default keybindings based on VS Code 1.65.2. [#74](https://github.com/tshino/vscode-kb-macro/pull/74)
  - Updated keymap wrapper for Awesome Emacs Keymap (v0.41.1). [#81](https://github.com/tshino/vscode-kb-macro/pull/81)
  - Updated keymap wrapper for Awesome Emacs Keymap (v0.41.2). [#91](https://github.com/tshino/vscode-kb-macro/pull/91)
  - Updated keymap wrapper for Delphi Keymap (v9.5.0). [#90](https://github.com/tshino/vscode-kb-macro/pull/90)
- Fix
  - Fixed: Typing in the find input box during recording may cause unexpected cursor movements during playback. [#33](https://github.com/tshino/vscode-kb-macro/issues/33)
- Internal
  - Added `record` option to the `kb-macro.wrap` command. [#76](https://github.com/tshino/vscode-kb-macro/pull/76)
  - Fixed: gen_keymap_wrapper.js end with exit code 0 even when it fails [#77](https://github.com/tshino/vscode-kb-macro/pull/77)
  - Added real snippets insertion tests instead of tests based on simulating cursor movements and edits. [#82](https://github.com/tshino/vscode-kb-macro/pull/82)

### [0.11.3] - 2022-03-06
- Update
  - Updated default keybindings based on VS Code 1.65.0. [#71](https://github.com/tshino/vscode-kb-macro/pull/71)
  - Updated [DESIGN.md](./DESIGN.md).
- Fix
  - Fixed: Deadlock happens if wrap invokes wrap [#63](https://github.com/tshino/vscode-kb-macro/issues/63)
- Internal
  - Introduced automated workflow to update default keybindings wrappers. [#57](https://github.com/tshino/vscode-kb-macro/issues/57)
  - Fixed: Editors remain open after testing [#55](https://github.com/tshino/vscode-kb-macro/issues/55)
  - Fixed: gen_wrapper.js and verify_wrapper.js end with exit code 0 even when it fails [#61](https://github.com/tshino/vscode-kb-macro/issues/61)

### [0.11.2] - 2022-02-15
- Update
  - Updated default keybindings based on VS Code 1.64.2 (Windows, Linux, macOS). [#53](https://github.com/tshino/vscode-kb-macro/pull/53)
- Fix
  - The latest recorded sequence is played back if the 'sequence' argument has a syntax error. [#52](https://github.com/tshino/vscode-kb-macro/issues/52)

### [0.11.1] - 2022-02-11
- Update
  - Updated default keybindings based on VS Code 1.64.1 (Windows, Linux, macOS). [#51](https://github.com/tshino/vscode-kb-macro/pull/51)
- Internal
  - Introduced automated workflow for VS Code's default keybindings retrieval. [#49](https://github.com/tshino/vscode-kb-macro/issues/49)

### [0.11.0] - 2022-02-06
- Feature
  - Added a new `Keyboard Macro: Copy Macro as Keybinding` command. [#42](https://github.com/tshino/vscode-kb-macro/pull/42)
  - Added `sequence` argument support to the playback command. [#41](https://github.com/tshino/vscode-kb-macro/pull/41)
- Documentation
  - Added 'How to save the recorded sequence for future use' section to the README.
- Update
  - Updated default keybindings based on VS Code 1.64.0 (Windows, Linux).
  - Updated keymap wrapper for Awesome Emacs Keymap (v0.39.0).
- Fix
  - Fixed uncaught errors 'Cannot read property 'textEditor' of undefined'. [#47](https://github.com/tshino/vscode-kb-macro/pull/47)

### [0.10.0] - 2022-01-28
- Feature
  - Added a new `Keyboard Macro: Repeat Playback Till End of File` command. [#34](https://github.com/tshino/vscode-kb-macro/issues/34)
  - Made the `kb-macro.wrap` command queueable to reduce input misses during recording. [#32](https://github.com/tshino/vscode-kb-macro/pull/32)
- Documentation
  - Added 'Tips' section to the README.
- Internal
  - Renamed internal commands. [#39](https://github.com/tshino/vscode-kb-macro/pull/39)
    - `internal:performType` -> `$type`
    - `internal:performCursorMotion` -> `$moveCursor`

### [0.9.0] - 2022-01-06
- New
  - Added a new `Keyboard Macro: Repeat Playback` command, which lets the user input a number and then repeats the macro specified times. [#29](https://github.com/tshino/vscode-kb-macro/pull/29)
- Documentation
  - Added 'Commands' section to the README.
- Update
  - Updated keymap wrapper for Awesome Emacs Keymap (v0.37.1).
- Fix
  - Some types of code completion were not being reproduced correctly. [#30](https://github.com/tshino/vscode-kb-macro/pull/30)
  - Reenabled running tests with macOS runners on GitHub Actions. [#28](https://github.com/tshino/vscode-kb-macro/pull/28)

### [0.8.0] - 2022-01-01
- New
  - Added Delphi Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#23](https://github.com/tshino/vscode-kb-macro/pull/23)
  - Added Visual Studio Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#24](https://github.com/tshino/vscode-kb-macro/pull/24)
  - Added emacs-style prefix-arguments support through the keymap wrapper for Awesome Emacs Keymap. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#25](https://github.com/tshino/vscode-kb-macro/pull/25)
  - Added new `kb-macro.abortPlayback` command, which is available on `escape` key. [#26](https://github.com/tshino/vscode-kb-macro/pull/26)
  - Added new `kb-macro.playing` when clause context, which evaluates true when the macro playback is ongoing. [#27](https://github.com/tshino/vscode-kb-macro/pull/27)
- Update
  - (Internal) Added colors to warnings and errors on the console output of generator scripts.

### [0.7.0] - 2021-12-26
- New
  - Added Atom Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#22](https://github.com/tshino/vscode-kb-macro/pull/22)
  - Added Notepad++ Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#21](https://github.com/tshino/vscode-kb-macro/pull/21)
  - Added new when clause context `kb-macro.headOfLine`, which evaluates true if the cursor is at the beginning of a line, for the help of defining more precise await options.
- Update
  - Reduced unnecessary delays after the `editor.action.clipboardCutAction` command.
  - Added comment lines to keymap wrapper files to describe keymap name and its version. [#20](https://github.com/tshino/vscode-kb-macro/pull/20)
- Fix
  - Keymap wrapper for Sublime Text may have not been working correctly on Mac due to "mac" keys in user `keybindings.json`.
  - Fixed minor issues on command sequence optimization to reduce redundant cursor movement.

### [0.6.0] - 2021-12-19
- New
  - Added Sublime Text Keymap support. (See [Keymap Wrappers](keymap-wrapper/README.md)) [#18](https://github.com/tshino/vscode-kb-macro/issues/18)
  - Added `repeat` argument support to the playback command. [#19](https://github.com/tshino/vscode-kb-macro/pull/19)
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
