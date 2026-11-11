# Hronaut for Claude Code

**Give your coding agent its own browser. Keep yours.**

Connects Claude Code to [Hronaut](https://hronaut.dev), a visible desktop browser for coding agents, with a separate workspace for each project. Your everyday Chrome stays out of it, and you can pause and take over at any time. Requires the Hronaut app (10-day free trial at [hronaut.dev](https://hronaut.dev/download)).

The plugin adds Hronaut's MCP server and the Hronaut skill, which teaches the agent to work in its own isolated workspace and hand sign-ins and CAPTCHAs to you.

Through Hronaut's tools the agent opens tabs in its own workspace, reads pages, clicks and types, takes screenshots, inspects console and network traffic, and runs accessibility and performance audits. Hronaut also has wallets for testing dApps: by default Hronaut asks you to approve each wallet request, and automatic approval is a bounded opt-in you turn on per wallet, site and network.

## Examples

- "Open http://localhost:3000/signup in Hronaut, sign up with test data, and report console errors and failed requests."
- "Check the checkout page on our staging site in Hronaut at 375 and 1280 pixels wide, take screenshots, and list layout problems."
- "Audit http://localhost:5173/settings for accessibility in Hronaut, fix what you find in the code, and audit again to confirm."
- "Sign in to the admin panel in Hronaut and hand me the 2FA step; then check that the user list loads."

## Install

Start Hronaut, then in Claude Code:

```text
/plugin marketplace add hronaut/hronaut-claude-plugin
/plugin install hronaut@hronaut
```

On Claude Code 2.1.275 or later, `/plugin install hronaut --marketplace hronaut/hronaut-claude-plugin` does both in one step. `/mcp` shows Hronaut as connected.

## How it connects

The plugin starts [`@hronaut/mcp`](https://www.npmjs.com/package/@hronaut/mcp) with `npx`, so it needs Node.js 20 or later. That small open-source program relays Claude Code's MCP messages to Hronaut's local endpoint, `http://127.0.0.1:47812/mcp`. To each request it adds the owner token from the token file in Hronaut's profile, so the token is never written to Claude Code's settings or shown to the agent. It connects only to this computer, sends nothing anywhere else and stores nothing. Hronaut accepts the connection without a token while its MCP authentication is off.

- Changed Hronaut's MCP port? Set `HRONAUT_MCP_PORT` for Claude Code as you do for Hronaut.
- Hronaut uses another profile folder? Set `HRONAUT_USER_DATA_DIR` as you do for Hronaut.
- Start Hronaut with `HRONAUT_MCP_TOKEN`? Give Claude Code the same variable; the plugin then sends it instead of the token file's.
- Hronaut not running? Its tools answer with an error that says so. Start Hronaut, then reconnect in `/mcp`.
- Added Hronaut with `claude mcp add` before? Claude Code keeps using that server, with the token it stored in its settings, instead of the plugin's. Remove it with `claude mcp remove hronaut --scope user`.

Hronaut runs on your computer, so a cloud-hosted agent cannot reach it. See the [setup guide](https://hronaut.dev/setup) and the [privacy policy](https://hronaut.dev/privacy).

## License

This plugin is open source under the [MIT License](LICENSE): you may use, change and share it, including in paid products. Hronaut, the app it connects to, is source-available under the [Subscription and Trial License](https://github.com/hronaut/hronaut/blob/main/LICENSE). The 10-day trial starts with the first agent tool call, with no credit card required. Ongoing use of the app requires a subscription afterward: $4/month or $24/year per named user (50% off $48).
