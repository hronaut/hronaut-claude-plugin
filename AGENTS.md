# Notes for agents

This repository holds Hronaut's Claude Code plugin (`plugins/hronaut/`) and the marketplace that lists it
(`.claude-plugin/marketplace.json`), and Hronaut's Codex plugin (`plugins/hronaut-codex/`) and its marketplace
(`.agents/plugins/marketplace.json`). The Hronaut app is in hronaut/hronaut.

## Versions

- Claude Code updates installed plugins only when `version` in `plugins/hronaut/.claude-plugin/plugin.json` changes.
  Bump it for every change under `plugins/hronaut/` and add a `## <version> - <date>` entry at the top of
  `CHANGELOG.md`; a test checks that they match.
- Codex installs plugins by `version` in `plugins/hronaut-codex/.codex-plugin/plugin.json`. Bump it for every change
  under `plugins/hronaut-codex/` and add an entry at the top of `plugins/hronaut-codex/CHANGELOG.md`. The two plugins
  have separate versions, so a Codex-only change doesn't make a new version for Anthropic's directory to review.
- The `Sync from Hronaut` workflow runs daily. It copies `skills/hronaut/SKILL.md` and `LICENSE` from the newest
  hronaut/hronaut release (never from its main branch, which may describe tools not yet released) into both plugins,
  bumps the patch version of each plugin whose copies changed, tests and pushes to main. It fails instead when the app's token format (`TOKEN_PATTERN` in
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

## The Codex plugin

- Codex reads `.agents/plugins/marketplace.json` before `.claude-plugin/marketplace.json`. Without it, Codex installs
  the Claude Code plugin, whose address is a Claude Code option that Codex leaves as the literal `${user_config.mcp_url}`.
- The plugin uses Codex's own manifest format (`.codex-plugin/plugin.json` with `.mcp.json`), not the portable Agent
  Plugins `plugin.json`: only Codex's format accepts `http_headers_helper`. Portable `mcp.json` allows static headers
  only and reserves `Authorization`.
- Codex runs `http_headers_helper` with `sh -c` on macOS and Linux and `cmd.exe /Q /D /C "<command>"` on Windows,
  from the session's folder, with only a few variables (`HOME`, `PATH` and the like; `APPDATA` on Windows) and no
  plugin folder. So the helper is one self-contained command: `"/bin/sh" -c "…"`, which cmd.exe can't find, then
  `|| powershell …`. Keep exactly six `"` and one `%` in it (cmd.exe expands `%NAME%` pairs and reads special
  characters only outside quotes), escape the inner script's `$` as `\$`, and print `{}` rather than fail: Codex fails
  the connection when the helper fails. `tests/codex-plugin.test.ts` runs it the way Codex does on all three systems.
- A server the user added with `codex mcp add hronaut` replaces the plugin's server of the same name.
- The address is fixed to Hronaut's default port; users can't change a plugin's address, so the token only goes there.
- OpenAI's public plugin directory (shared by ChatGPT and Codex) takes local MCP servers only from partners OpenAI
  allowlists, and no plugins with hooks; distribution is this marketplace.
