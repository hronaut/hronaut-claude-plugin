# @hronaut/mcp

Connects an MCP client to [Hronaut](https://hronaut.dev), a visible desktop browser for coding agents, running on this
computer. The client starts it as a stdio MCP server; it relays each message to Hronaut's local MCP server and adds the
owner token from Hronaut's profile, so no address or token goes into the client's settings.

```json
{
  "mcpServers": {
    "hronaut": { "command": "npx", "args": ["-y", "@hronaut/mcp@1.0.1"] }
  }
}
```

Hronaut's Claude Code plugin uses it: `/plugin marketplace add hronaut/hronaut-claude-plugin`, then
`/plugin install hronaut@hronaut`.

## How it connects

- The address is always `http://127.0.0.1:47812/mcp`, or the port in `HRONAUT_MCP_PORT` when you start Hronaut with
  one. The token is never sent anywhere else.
- The token is `HRONAUT_MCP_TOKEN` when it is set, as Hronaut uses it instead of its token file, and otherwise the
  `mcp-token` file in Hronaut's profile: `~/.config/hronaut` on Linux, `~/Library/Application Support/hronaut` on
  macOS, `%APPDATA%\hronaut` on Windows, or the folder in `HRONAUT_USER_DATA_DIR`. It is read for each request, so
  starting Hronaut after the client is fine.
- While Hronaut is not running, each request gets an error that says to start it and reconnect.

It needs Node.js 20 or later and has no dependencies.

## License

[MIT](LICENSE). Hronaut, the app it connects to, is source-available under the
[Subscription and Trial License](https://github.com/hronaut/hronaut/blob/main/LICENSE).
