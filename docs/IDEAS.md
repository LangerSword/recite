# sayshell — idea and specification

Status: specification. No code is written yet.
Date: 2026-10-08. Event: HackerHouse Goa, Wispr Flow task. Deadline: 2026-10-10 23:59 IST.
Writing rules: ASD-STE100 style, approximately 60% conformance. Short sentences. One instruction per sentence. Defined terms. Active voice.

## 1. Definitions

- **Dictation**: speech converted to text by Wispr Flow. Flow types into the focused window.
- **Line**: the text a user has typed or dictated at a shell prompt, before Enter.
- **Intent**: what the user wants done, in plain words. For example: "delete the merged branches."
- **Proposal**: the shell command that sayshell suggests for an intent.
- **Effect**: a thing a command changes. Effect classes are: files, git refs, network, processes, packages, database, cloud resources, secrets.
- **Gate**: a check that runs before a command reaches the shell. A gate can allow, ask, or block.
- **Claim**: a statement that a command does something. Example: "this removes only merged branches."

## 2. Problem

- Developers now dictate prompts and text by voice.
- A dictated command can be wrong. Speech recognition mishears words. "rm" can become "arm." "-rf" can become "our F."
- A mishearing in a shell can delete data, push to a wrong remote, or change production.
- Shell history does not show what a command would touch. Users learn the effect only after it runs.
- Coding agents also produce shell commands. Users cannot see the effect before approval.

## 3. Why it is needed

- Voice is faster than typing for intent. Typing is faster for exact syntax.
- Dictation puts the words into the focused window with no review step. This is the risk.
- No common tool sits between dictation and the shell and explains the effect of a command.
- Founders and small teams have no security staff. They need a check that runs for them.

## 4. What it does

sayshell is a shell front end for dictated lines.

1. The user dictates an intent into the sayshell prompt, using Wispr Flow.
2. sayshell turns the intent into a proposal. It uses a fixed set of command templates first, and a model only when no template matches.
3. sayshell reads the proposal and lists its effects, in plain words.
4. sayshell runs the gate.
   - Allow: the command runs, and the effects are logged.
   - Ask: the user must type the exact confirm phrase before the command runs.
   - Block: the command does not run. sayshell says why.
5. Every run writes a receipt: the intent, the proposal, the effects, the gate result, and the exit code.

## 5. What it helps with

- Developers: fewer bad commands from speech, and clear effects before a run.
- Founders: a cost and blast-radius check on cloud and database commands.
- Teams: a receipt trail for what a person or an agent ran.
- Agents: a gate that an MCP-connected agent must pass before it runs a command.

## 6. Use cases

| # | Use case | Intent (spoken) | Expected gate |
|---|---|---|---|
| U1 | Clean merged branches | "delete the branches already merged into main" | Ask (deletes refs) |
| U2 | List large files | "show the ten biggest files here" | Allow (read only) |
| U3 | Clear build output | "remove the dist folder" | Ask (deletes files) |
| U4 | Wipe the disk by mishearing | "remove dash r f slash" | Block (root delete) |
| U5 | Force push to main | "force push to main" | Block (rewrites shared ref) |
| U6 | Drop a database | "drop the users table in production" | Block (database destructive) |
| U7 | Deploy to production | "deploy to production" | Ask (network, cloud spend) |
| U8 | Install a package | "install requests" | Ask (package change) |
| U9 | Read a secret | "print the aws secret key" | Block (secret exposure) |
| U10 | Ambiguous intent | "clean it up" | Ask for a clearer intent. No command. |

## 7. Edge cases

- E1. Mishearing of a flag: "dash r f" becomes "-rf" or "arm f." The gate checks the final command, not the intent.
- E2. Mishearing of a path: "slash" or "dot" becomes a different path. The gate expands the path and checks for root, home, or repo-external targets.
- E3. A safe intent with an unsafe proposal. The gate checks the proposal, not the intent.
- E4. A command hidden in a pipeline, subshell, or here-doc. The gate parses each stage.
- E5. Variables that expand to a dangerous path, such as `rm -rf "$DIR/"` with DIR unset. The gate flags unset variables in destructive commands.
- E6. Aliases and functions. The gate resolves them, or it asks.
- E7. Commands that are safe in one repo and unsafe in another. The gate uses the current repo state.
- E8. Dictation that adds punctuation or capitals. The normaliser removes them before the gate runs.
- E9. Duplicate Enter from a dictation tool. The line is handled once.
- E10. Network loss during a remote check. The gate fails closed for destructive classes and open for read-only classes.
- E11. A confirm phrase typed by a script instead of a person. sayshell refuses confirm phrases inside a non-interactive session.
- E12. An agent that calls the gate in a loop. The gate rate-limits and logs repeated blocks.
- E13. Unicode look-alike characters in a command. The normaliser maps them to ASCII and flags the change.
- E14. A command that is correct but unknown to the classifier. The gate asks. It never allows an unknown destructive class.

## 8. Technical design

Language: Python 3.11+ for the core. Shell integration: bash and zsh hooks. Tests: pytest.

Components:

1. **Normaliser** (`normalise.py`). Lowercases spoken words, maps spoken symbols ("dash", "slash", "dot") to characters, removes filler words, and maps look-alike Unicode to ASCII.
2. **Template matcher** (`templates.py`). A table of intent patterns to command templates. Covers about 40 common intents. A template match never needs a model.
3. **Model fallback** (`propose.py`). Used only when no template matches. Output must parse as a single command. Output that contains a pipe to a shell, a download, or a here-doc is rejected.
4. **Effect parser** (`effects.py`). Uses `shlex` and a grammar for common tools (git, rm, find, docker, kubectl, psql, aws, npm, pip). Returns effect classes and targets. Unknown tools return the class `unknown`.
5. **Gate** (`gate.py`). Rules, in this order:
   - Block: root or home delete; force push to protected refs; database drop or truncate; secret printing; curl or wget piped to a shell; writes to system paths.
   - Ask: any delete outside the temp directory; any network write; any cloud write; any package change; any command with class `unknown` that is not read-only.
   - Allow: read-only classes on the current repo or temp directories.
6. **Confirm** (`confirm.py`). Asks for a fixed phrase of the form "yes, run this on <target>". Refuses in non-interactive mode.
7. **Receipt** (`receipt.py`). Appends a JSON line per run: time, intent, proposal, effects, gate result, user decision, exit code. Stored in `~/.local/state/sayshell/receipts.jsonl`.
8. **Shell hook** (`hook.bash`, `hook.zsh`). Routes the line through sayshell when the line starts with the prefix `say:`. Other lines run as usual.
9. **MCP server** (`mcp.py`). Exposes two tools: `propose(intent)` and `gate(command)`. An agent must call `gate` before it runs a command through sayshell.

Data: the receipts file is local. No cloud store. No account.

Fallback when no model is set: templates only. The product still works for the 40 templates.

## 9. Scope cut for the event

In scope:
- Normaliser, template matcher (40 intents), effect parser (git, rm, find, npm, pip, docker, psql, aws read and write), gate, confirm, receipt, bash hook, one demo.
- Tests: unit tests for each component. A negative-control suite of 30 planted dangerous commands. The gate must block or ask on all 30.

Out of scope for the event:
- zsh hook, MCP server, Windows support, team sync, dashboards, a hosted service, a model fallback beyond a stub.
- These are listed in section 11 as next steps.

## 10. Grading plan

Deterministic checks. No LLM judge.

- G1. Template coverage: each of the 40 templates maps to a command. Check by test.
- G2. Gate precision: all 30 planted dangerous commands are blocked or asked. Zero allowed.
- G3. Gate recall on safe commands: the 20 read-only commands are allowed. Zero blocked.
- G4. Mishearing: 15 recorded mishearing cases ("arm f", "our F", "slash" to "stash") are caught by the gate.
- G5. Negative control: remove one gate rule. G2 must fail. If G2 still passes, the grader is blind.
- G6. Receipts: each run writes one line. Count equals run count.

Each check prints its inputs and outputs. The grader reads the real modules, not copies.

## 11. Next steps after the event

- zsh hook and fish hook.
- MCP server for coding agents.
- Team policy file (allowed and blocked rules per repo).
- Model fallback with a local model.
- Signed receipts.

## 12. Known gaps

- Speech recognition accuracy for shell terms is not measured. The mishearing list (G4) comes from my own tests, not from a real user corpus.
- The effect parser covers the listed tools only. Other tools return `unknown`.
- The gate cannot prove that a command is safe. It proves only that the listed classes were checked.
- No user testing yet.
- Wispr Flow is used for dictation in the demo. Wispr Flow's Linux build is unofficial.

## 13. Sources

- Wispr Flow product and dictation behaviour: https://docs.wisprflow.ai/articles/2772472373-what-is-flow
- Wispr Flow on Linux (community port): https://github.com/wispr-flow-linux/wispr-flow-linux
- Wispr Flow has no official Linux app: https://www.blipai.app/blog/wispr-flow-for-linux
- Voice coding limits for symbols: https://bossai.tech/blog/coding-by-voice
- Shell dictation limits and terminal dictation: https://code.visualstudio.com/docs/configure/accessibility/voice
