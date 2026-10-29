# Changelog

Each entry is a plugin version. Claude Code updates installed plugins to the version in
`plugins/hronaut/.claude-plugin/plugin.json`, so every change that reaches users bumps it and adds an entry here.

## 1.0.2 - 2026-10-29

- New description in the plugin directory and README: "Give your coding agent its own browser. Keep yours."
  Hronaut is a visible desktop browser for coding agents, with a separate workspace for each project. The plugin
  itself is unchanged.

## 1.0.1 - 2026-10-28

- The plugin is now open source under the MIT License, including its copy of the Hronaut skill. Hronaut itself, the
  app the plugin connects to, keeps its Subscription and Trial License.

## 1.0.0 - 2026-10-28

- The plugin moved here from hronaut/hronaut, where it shipped with Hronaut up to 3.12, and now has its own versions.
  If you added the old marketplace, switch to this one:
  `/plugin marketplace remove hronaut`, `/plugin marketplace add hronaut/hronaut-claude-plugin`, then
  `/plugin install hronaut@hronaut`. The plugin itself is unchanged: Hronaut's MCP server with the **Hronaut MCP
  address** option, the owner-token helpers and the Hronaut skill from Hronaut 3.12.0.
