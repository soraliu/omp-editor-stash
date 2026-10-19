# omp-editor-stash

Pi/omp extension that adds an **editor stash** to your coding agent: press `Alt+S` (Option+S on macOS) to stash the current editor draft, ask your quick question, then press `Alt+S` again to restore the draft. Stashed prompts are persisted to a history file (up to 12 entries) and can be re-inserted through the `/stash-history` picker.

Ported from the Editor Stash feature of [pi-powerline-footer](https://github.com/nicobailon/pi-powerline-footer) (v0.17.1) as a standalone extension that works on both pi and omp without the powerline footer.

## What

- **`Alt+S` — stash toggle** for the editor draft:

  | Editor has text | Stash exists | Action |
  | --- | --- | --- |
  | yes | no | Stash the text, clear the editor |
  | no | yes | Restore the stashed text into the editor |
  | yes | yes | Update the stash with the current text |
  | no | no | `Nothing to stash` notification |

- **Stash indicator**: while a stash is active, the status line shows `stash`.
- **`Ctrl+Alt+H` / `/stash-history`**: open the stash history picker; select an entry to insert it into the editor (insert / replace / append).
- **Persistence**: history is written to `<agent-dir>/editor-stash/stash-history.json` (`~/.pi/agent` under pi, `~/.omp/agent` under omp) and survives restarts. The active stash itself is session-local.

## Install

omp:

```
omp plugin install git+https://github.com/soraliu/omp-editor-stash
```

pi:

```
pi install git+https://github.com/soraliu/omp-editor-stash
```

> Untested under pi — the code only uses APIs shared by pi 1.1.0 and omp, but only the omp side is exercised.

## Development

```
bun install
bun run check   # tsc --noEmit + biome check
node dev.ts --no-session   # runs omp with this checkout loaded via -e
```

`dev.ts` moves an installed copy of the same package aside for the run so it is not loaded twice, and restores it afterwards.

## Credits

Editor stash behavior ported from [pi-powerline-footer](https://github.com/nicobailon/pi-powerline-footer) by nicobailon (MIT).
