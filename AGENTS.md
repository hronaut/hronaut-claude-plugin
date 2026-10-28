# Notes for agents

This repository holds Hronaut's Claude Code plugin (`plugins/hronaut/`) and the marketplace that lists it
(`.claude-plugin/marketplace.json`). The Hronaut app is in hronaut/hronaut, and the Codex plugin in
hronaut/hronaut-codex-plugin.

Codex reads `.agents/plugins/marketplace.json` before `.claude-plugin/marketplace.json`, so that file lists the Codex
plugin from hronaut/hronaut-codex-plugin. Without it, `codex plugin marketplace add hronaut/hronaut-claude-plugin`
would install this plugin with the literal address `${user_config.mcp_url}`, a Claude Code option Codex can't fill in.

## License

This repository, the plugin and the plugin's copy of the Hronaut skill are MIT-licensed; `plugins/hronaut/LICENSE` is a
copy of `LICENSE`, since Claude Code installs only the plugin's folder. The Hronaut app is not: it stays under its
Subscription and Trial License in hronaut/hronaut. Don't copy app code here.

## Versions

- Claude Code updates installed plugins only when `version` in `plugins/hronaut/.claude-plugin/plugin.json` changes.
  Bump it for every change under `plugins/hronaut/` and add a `## <version> - <date>` entry at the top of
  `CHANGELOG.md`; a test checks that they match.
- The `Sync from Hronaut` workflow runs daily. It copies `skills/hronaut/SKILL.md` from the newest hronaut/hronaut
  release (never from its main branch, which may describe tools not yet released), with `license: MIT` in its
  frontmatter, bumps the patch version, tests and pushes to main. It fails instead when the app's token format (`TOKEN_PATTERN` in
  `src/main/mcp-token-store.ts`), default MCP port (`DEFAULT_MCP_PORT` in `src/shared/mcp-port.ts`) or package name
  (the profile folder) no longer match what the helpers assume; update the helpers and tests, then run it by hand.
  GitHub turns scheduled workflows off after 60 days without activity in the repository; turn it back on in Actions.

## Anthropic's plugin directory

The plugin is listed in Anthropic's directory (claude.ai/directory/manage), which follows this repository's default
branch with plugin path `plugins/hronaut` and scans every new version. Its checks go beyond
`claude plugin validate`:

- A remote MCP server's `url` must be `https://`, `wss://` or a `${user_config.KEY}` reference. Hronaut's endpoint is
  local http, so the URL is the `mcp_url` option, whose default is `http://127.0.0.1:47812/mcp`.
- `.gitattributes` must not rewrite file contents (`eol`, `filter`, LFS, `export-*`, `working-tree-encoding`,
  `ident`). The helpers are `-text`; the `.sh` is committed with LF and the `.cmd` with CRLF.
- The plugin README is the listing: at least 40 words outside code blocks and at least three example prompts.
- Reading `HRONAUT_MCP_TOKEN` and the token file, and the helper scripts, are held for a reviewer on each version.
  That is expected; don't move the token into a `user_config` option, since the helpers read it from Hronaut's
  profile so it is never stored in Claude Code's settings.

## Headers helpers

Claude Code hides variables named like a token from a headers helper, so `HRONAUT_MCP_TOKEN` is a static header in
`plugin.json` and the helpers read only the token file. They send the token only when `CLAUDE_CODE_MCP_SERVER_URL` is a
numbered port on `127.0.0.1`, `localhost` or `[::1]`. When testing Claude Code end to end in a cloud container, unset
`CCR_AUTO_MODE_USER_ENV_KEYS_FACT`: with it set, Claude Code redacts every `1` in the URL it gives the helper.
