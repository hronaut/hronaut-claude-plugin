# Hronaut for Claude Code and Codex

The Claude Code and Codex plugins for [Hronaut](https://hronaut.dev), a visible desktop browser your coding agent
drives over MCP. Each adds Hronaut's MCP server and the Hronaut skill. Start Hronaut, then in Claude Code:

```text
/plugin marketplace add hronaut/hronaut-claude-plugin
/plugin install hronaut@hronaut
```

Or in a terminal, for Codex CLI and Codex in the ChatGPT desktop app:

```bash
codex plugin marketplace add hronaut/hronaut-claude-plugin
codex plugin add hronaut@hronaut
```

What each plugin does, how it connects and its options: [plugins/hronaut/README.md](plugins/hronaut/README.md) for
Claude Code, [plugins/hronaut-codex/README.md](plugins/hronaut-codex/README.md) for Codex. Hronaut itself lives in
[hronaut/hronaut](https://github.com/hronaut/hronaut); report problems [there](https://github.com/hronaut/hronaut/issues).

## Repository layout

- `.claude-plugin/marketplace.json`: the marketplace Claude Code's `/plugin marketplace add` reads, with one plugin.
- `plugins/hronaut/`: the Claude Code plugin, exactly as Claude Code installs it and Anthropic's plugin directory
  lists it.
- `.agents/plugins/marketplace.json`: the marketplace `codex plugin marketplace add` reads, with one plugin. Codex
  reads it before `.claude-plugin/marketplace.json`.
- `plugins/hronaut-codex/`: the Codex plugin, exactly as Codex installs it, with its own versions and changelog.
- `tests/`: checks of the manifests and of the headers helpers on Linux, macOS and Windows, and an end-to-end test
  that installs the Codex plugin with the Codex CLI, when it is installed.
- `.github/workflows/sync.yml`: once a day copies the Hronaut skill and license from the newest Hronaut release into
  both plugins, and releases a new patch version of each plugin they changed.

## Development

```bash
npm ci
npm install --no-save @openai/codex@0.165.0   # for the Codex plugin's end-to-end test
npm test
npx --yes @anthropic-ai/claude-code plugin validate --strict plugins/hronaut
npx --yes @anthropic-ai/claude-code plugin validate --strict .
```

Every change users should get bumps `version` in `plugins/hronaut/.claude-plugin/plugin.json` and adds a
[CHANGELOG](CHANGELOG.md) entry with that version; for the Codex plugin, `version` in
`plugins/hronaut-codex/.codex-plugin/plugin.json` and [its CHANGELOG](plugins/hronaut-codex/CHANGELOG.md). See [AGENTS.md](AGENTS.md) for the rules Anthropic's plugin
directory adds.

## License

Source-available under the [Hronaut Subscription and Trial License](LICENSE).
