# Notes for agents

This repository holds Hronaut's Claude Code plugin (`plugins/hronaut/`) and the marketplace that lists it
(`.claude-plugin/marketplace.json`). The Hronaut app is in hronaut/hronaut, and the Codex plugin in
hronaut/hronaut-codex-plugin.

Codex reads `.agents/plugins/marketplace.json` before `.claude-plugin/marketplace.json`, so that file lists the Codex
plugin from hronaut/hronaut-codex-plugin. Without it, `codex plugin marketplace add hronaut/hronaut-claude-plugin`
would install this Claude Code plugin instead of the Codex plugin.

## License

This repository, the plugin and the plugin's copy of the Hronaut skill are MIT-licensed; `plugins/hronaut/LICENSE` is a
copy of `LICENSE`, since Claude Code installs only the plugin's folder. The Hronaut app is not: it stays under its
Subscription and Trial License in hronaut/hronaut. Don't copy app code here.

## Versions

- Claude Code updates installed plugins only when `version` in `plugins/hronaut/.claude-plugin/plugin.json` changes.
  Bump it, and the same `version` in `plugins/hronaut-skill/.claude-plugin/plugin.json`, for every change under
  `plugins/` and add a `## <version> - <date>` entry at the top of
  `CHANGELOG.md`; a test checks that they match.
- The `Sync from Hronaut` workflow runs daily. It copies `skills/hronaut/SKILL.md` from the newest hronaut/hronaut
  release (never from its main branch, which may describe tools not yet released), with `license: MIT` in its
  frontmatter, into both plugins, bumps the patch version, tests and pushes to main. It fails instead when the app's token format (`TOKEN_PATTERN` in
  `src/main/mcp-token-store.ts`), default MCP port (`DEFAULT_MCP_PORT` in `src/shared/mcp-port.ts`) or package name
  (the profile folder) no longer match what the bridge assumes; update `packages/mcp/src/token.js` and its tests,
  publish the bridge, pin it in the plugin, then run the sync by hand.
  GitHub turns scheduled workflows off after 60 days without activity in the repository; turn it back on in Actions.

## The stdio bridge

The plugin's MCP server is `npx -y @hronaut/mcp@<version>`. `packages/mcp` is `@hronaut/mcp`, a stdio MCP server with no
dependencies that relays to Hronaut's local Streamable HTTP server at `127.0.0.1` and adds the owner token from
Hronaut's profile, or `HRONAUT_MCP_TOKEN`, to each request. It never sends the token anywhere else.

To change it: bump its version in `packages/mcp/package.json`, merge, run the `Publish @hronaut/mcp` workflow from
main, and only then pin the new version in `plugin.json` (a test checks that the pin matches `packages/mcp`) with a
plugin version bump. The workflow publishes with provenance through npm Trusted Publishing, which trusts
`publish-mcp.yml` in the `npm` environment of this repository; it uses no npm token.

## Anthropic's plugin directory

The directory (claude.ai/directory/manage) lists `plugins/hronaut-skill`, which follows this repository's default
branch and is scanned at every new version. For an organization it hasn't verified (there is no way to apply yet) it
refuses any local MCP server, stdio included, so that plugin is the full one without `mcpServers`: the same skill,
license, icon and listing fields, at the same version (tests check this). Its README is the listing and tells users how
to connect Hronaut's tools. Other checks beyond `claude plugin validate`:

- No `headersHelper`, no `${ENV}` values in headers, and no scripts: only Markdown, text, JSON, YAML and images.
- `.gitattributes` must not rewrite file contents (`eol`, `filter`, LFS, `export-*`, `working-tree-encoding`,
  `ident`); the repository has none.
- The listing README needs at least 40 words outside code blocks and at least three example prompts.

When the organization is verified, the directory can list `plugins/hronaut` instead.
