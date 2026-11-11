# Hronaut skill for Claude Code

**Give your coding agent its own browser. Keep yours.**

Teaches Claude Code to use [Hronaut](https://hronaut.dev), a visible desktop browser for coding agents, with a separate workspace for each project. Your everyday Chrome stays out of it, and you can pause and take over at any time. Requires the Hronaut app (10-day free trial at [hronaut.dev](https://hronaut.dev/download)).

The plugin adds the Hronaut skill. It tells the agent to work only in its own isolated workspace, to read pages before acting on them, and to hand sign-ins, CAPTCHAs and other sensitive steps to you. Hronaut's browser tools come from Hronaut's MCP server, which you connect once from the Hronaut app, as described below.

Through those tools the agent opens tabs in its own workspace, reads pages, clicks and types, takes screenshots, inspects console and network traffic, and runs accessibility and performance audits. Hronaut also has wallets for testing dApps: by default Hronaut asks you to approve each wallet request, and automatic approval is a bounded opt-in you turn on per wallet, site and network.

## Examples

- "Open http://localhost:3000/signup in Hronaut, sign up with test data, and report console errors and failed requests."
- "Check the checkout page on our staging site in Hronaut at 375 and 1280 pixels wide, take screenshots, and list layout problems."
- "Audit http://localhost:5173/settings for accessibility in Hronaut, fix what you find in the code, and audit again to confirm."
- "Sign in to the admin panel in Hronaut and hand me the 2FA step; then check that the user list loads."

## Connect Hronaut's tools

Hronaut runs on your computer, so its MCP server is local. Connect it in one of two ways:

- In Hronaut, open **Home**, choose Claude Code and run the command it shows. Hronaut gives the address and its owner token; the token stays out of your repositories.
- Or install the full Hronaut plugin, which connects the MCP server for you, instead of this one:

```text
/plugin marketplace add hronaut/hronaut-claude-plugin
/plugin install hronaut@hronaut
```

`/mcp` then shows Hronaut as connected. A cloud-hosted agent cannot reach Hronaut. See the [setup guide](https://hronaut.dev/setup) and the [privacy policy](https://hronaut.dev/privacy).

## License

This plugin is open source under the [MIT License](LICENSE): you may use, change and share it, including in paid products. Hronaut, the app it works with, is source-available under the [Subscription and Trial License](https://github.com/hronaut/hronaut/blob/main/LICENSE). The 10-day trial starts with the first agent tool call, with no credit card required. Ongoing use of the app requires a subscription afterward: $4/month or $24/year per named user (50% off $48).
