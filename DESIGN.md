# Design Decisions

## Recording keystrokes vs. recording commands

First of all, we don't have any VS Code API that allows us to capture command executions at this moment. But, we could imagine that we have an event API for that. Let's name it `onDidExecuteCommand`.

If we could capture all the command executions, is it possible to reproduce the scenario by simply executing all the captured commands by `vscode.commands.executeCommand` API?

Probably, no.

A command may trigger another command. It happens by directly invoking `vscode.commands.executeCommand` in a command or in some way indirectly like making side-effects like document change. So we must distinguish them to execute only the commands that are triggered directly by the user.

On the other hand, capturing keystrokes could be a good solution for reproducing recorded scenarios since a keystroke is always made directly by the user. A keystroke does not trigger another keystroke.

However, we don't have any VS Code API to capture keystrokes directly.

## Capturing keystrokes

We have keybindings. Using that we can associate keystrokes with commands.

However, we can't associate every possible keystroke by defining a single keybinding rule (imagine kind of using wildcard `"key": "*"`).

So we end up defining a bunch of wrapper keybindings to capture the whole set of the default keybindings of VS Code.

