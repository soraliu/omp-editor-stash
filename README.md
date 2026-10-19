# omp-editor-stash

**`git stash` — but for the prompt you're typing.**

Press <kbd>Alt+S</kbd> (<kbd>Option+S</kbd> on macOS) to park your half-written prompt, fire off the quick question that just came up, then press <kbd>Alt+S</kbd> again and the draft is back in the editor. No clipboard juggling, no re-typing.

A tiny extension for terminal coding agents: works with both [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) and omp (oh-my-pi). Ported from the Editor Stash feature of [pi-powerline-footer](https://github.com/nicobailon/pi-powerline-footer) as a standalone package — no powerline footer required.

## Why

You're ten lines into a carefully worded prompt when you realize you need to ask the agent one quick thing first. Until now your options were: park the draft in a clipboard or scratch file, or lose it. `omp-editor-stash` turns that workflow into a single keystroke — the same reflex as `git stash` before a quick fix.

## Features

- **One-key stash toggle** — `Alt+S` stashes, restores, or updates the editor draft (truth table below)
- **Visible state** — a `stash` marker shows in the status line while a stash is active
- **Persisted stash history** — every stashed prompt is saved (up to 12 entries, most recent first) and survives restarts
- **History picker** — `Ctrl+Alt+H` or `/stash-history` to browse and re-insert past prompts (insert / replace / append)
- **Zero config** — install it, press `Alt+S`

## The stash toggle

| Editor has text | Stash exists | `Alt+S` does |
| --- | --- | --- |
| yes | no | Stash the text, clear the editor — *“Text stashed”* |
| no | yes | Restore the stashed text — *“Stash restored”* |
| yes | yes | Update the stash with the current text — *“Stash updated”* |
| no | no | *“Nothing to stash”* |

## History picker

`Ctrl+Alt+H` or `/stash-history` opens a picker over your persisted history:

1. Select an entry (shown as a single-line preview, truncated to 72 columns)
2. If the editor is empty → **Insert**
3. If the editor has text → choose **Replace** or **Append** (or cancel)

## Install

omp:

```
omp plugin install git+https://github.com/soraliu/omp-editor-stash
```

pi:

```
pi install git+https://github.com/soraliu/omp-editor-stash
```

## Keybindings & commands

| Input | Action |
| --- | --- |
| `Alt+S` (`Option+S` on macOS) | Stash toggle: stash / restore / update the editor draft |
| `Ctrl+Alt+H` | Open the stash history picker |
| `/stash-history` | Open the stash history picker (command form) |

## Data & behavior

- History file: `<agent-dir>/editor-stash/stash-history.json` — `~/.pi/agent/…` under pi, `~/.omp/agent/…` under omp. Each harness keeps its own history.
- The **active stash is session-local**: `/new`, `/resume`, or a restart clears it. Stashed prompts stay in history regardless.
- Uses only editor/UI APIs shared by pi 1.1.0 and omp. Only the omp side is exercised in practice; the pi path is untested but should work as-is.

## Development

```
bun install
bun run check   # tsc --noEmit + biome check
node dev.ts --no-session   # runs omp with this checkout loaded via -e
```

`dev.ts` moves an installed copy of the same package aside for the run so it is not loaded twice, and restores it afterwards.

## Credits

Editor stash behavior ported from [pi-powerline-footer](https://github.com/nicobailon/pi-powerline-footer) by nicobailon (MIT). Same license — see [LICENSE](LICENSE).
