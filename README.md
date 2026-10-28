# Hronaut for Claude Code

The Claude Code plugin for [Hronaut](https://hronaut.dev), a visible desktop browser your coding agent drives over
MCP. It adds Hronaut's MCP server and the Hronaut skill. Start Hronaut, then in Claude Code:

```text
/plugin marketplace add hronaut/hronaut-claude-plugin
/plugin install hronaut@hronaut
```

What the plugin does, how it connects and its options: [plugins/hronaut/README.md](plugins/hronaut/README.md).
The Codex plugin is in [hronaut/hronaut-codex-plugin](https://github.com/hronaut/hronaut-codex-plugin). Hronaut
itself lives in [hronaut/hronaut](https://github.com/hronaut/hronaut); report problems
[there](https://github.com/hronaut/hronaut/issues).

## Repository layout

- `.claude-plugin/marketplace.json`: the marketplace `/plugin marketplace add` reads, with one plugin.
- `plugins/hronaut/`: the plugin, exactly as Claude Code installs it and Anthropic's plugin directory lists it.
- `.agents/plugins/marketplace.json`: what Codex reads when someone adds this repository as a Codex marketplace. It
  lists the Codex plugin from hronaut/hronaut-codex-plugin.
- `tests/`: checks of the manifests and of the headers helpers on Linux, macOS and Windows.
- `.github/workflows/sync.yml`: once a day copies the Hronaut skill and license from the newest Hronaut release,
  and releases a new patch version when they changed.

## Development

```bash
npm ci
npm test
npx --yes @anthropic-ai/claude-code plugin validate --strict plugins/hronaut
npx --yes @anthropic-ai/claude-code plugin validate --strict .
```

Every change users should get bumps `version` in `plugins/hronaut/.claude-plugin/plugin.json` and adds a
[CHANGELOG](CHANGELOG.md) entry with that version. See [AGENTS.md](AGENTS.md) for the rules Anthropic's plugin
directory adds.

## License

Source-available under the [Hronaut Subscription and Trial License](LICENSE).
