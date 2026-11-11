import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const STORE_DESCRIPTION = 'Give your coding agent its own browser. Keep yours. Connects your agent to Hronaut, a visible desktop browser for '
  + 'coding agents, with a separate workspace for each project. Requires the Hronaut app (10-day free trial at hronaut.dev).'
/** What Anthropic's plugin directory accepts in a plugin from an organization it hasn't verified: no scripts. */
const LISTED_FILE = /(^LICENSE|\.(md|txt|json|ya?ml|png|jpe?g|gif|webp|ico))$/

interface PluginManifest {
  name: string
  version: string
  description: string
  icon: string
  userConfig?: unknown
  mcpServers: Record<string, unknown>
}

async function json<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

describe('the Claude Code plugin', () => {
  it('is listed in the repository’s marketplace under the store description', async () => {
    const marketplace = await json<{ name: string; owner: { name: string }; plugins: Array<{ name: string; source: string; description: string }> }>(
      '.claude-plugin/marketplace.json'
    )
    // `/plugin marketplace add hronaut/hronaut-claude-plugin`, then `/plugin install hronaut@hronaut`.
    expect(marketplace.name).toBe('hronaut')
    expect(marketplace.owner.name).toBe('Hronaut')
    expect(marketplace.plugins).toEqual([expect.objectContaining({ name: 'hronaut', source: './plugins/hronaut', description: STORE_DESCRIPTION })])
    const plugin = await json<PluginManifest>('plugins/hronaut/.claude-plugin/plugin.json')
    expect(plugin.name).toBe('hronaut')
    expect(plugin.description).toBe(STORE_DESCRIPTION)
    expect((await readFile(join('plugins/hronaut', plugin.icon))).subarray(1, 4).toString()).toBe('PNG')
  })

  it('names the version of its newest changelog entry, so installed plugins update with each change', async () => {
    const plugin = await json<PluginManifest>('plugins/hronaut/.claude-plugin/plugin.json')
    expect((await readFile('CHANGELOG.md', 'utf8')).match(/^## (\S+)/m)?.[1]).toBe(plugin.version)
  })

  it('is MIT-licensed, skill included, unlike the Hronaut app', async () => {
    const license = await readFile('LICENSE', 'utf8')
    expect(license).toMatch(/^MIT License\r?\n\r?\nCopyright \(c\) 2026 Hronaut\r?\n/)
    // Claude Code installs only the plugin's folder, so the license it names is a copy there.
    expect(await readFile('plugins/hronaut/LICENSE', 'utf8')).toBe(license)
    expect((await json<{ license: string }>('plugins/hronaut/.claude-plugin/plugin.json')).license).toBe('MIT')
    expect((await json<{ license: string }>('package.json')).license).toBe('MIT')
    // The daily sync copies the skill from the app, whose copy names the app's license, and marks this copy MIT.
    expect(await readFile('plugins/hronaut/skills/hronaut/SKILL.md', 'utf8')).toMatch(/^---\r?\n(?:(?!---)[^\n]*\n)*license: MIT\r?\n/)
  })

  it('starts the published @hronaut/mcp bridge, at the version in packages/mcp', async () => {
    const plugin = await json<PluginManifest>('plugins/hronaut/.claude-plugin/plugin.json')
    const bridge = await json<{ name: string; version: string }>('packages/mcp/package.json')
    // The directory refuses a local or variable `url`, headers from the environment and a headersHelper from an
    // organization it hasn't verified, so the plugin runs a stdio bridge that finds Hronaut and its token itself.
    // Pin a version only once the `Publish @hronaut/mcp` workflow has published it.
    expect(plugin.mcpServers).toEqual({ hronaut: { command: 'npx', args: ['-y', `${bridge.name}@${bridge.version}`] } })
    expect(plugin.userConfig).toBeUndefined()
  })

  it('holds only files Anthropic’s plugin directory lists without a verified organization', async () => {
    const files = (await readdir('plugins/hronaut', { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile())
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) expect(file.name).toMatch(LISTED_FILE)
  })

  it('gives Anthropic’s plugin directory its listing details', async () => {
    const plugin = await json<Record<string, unknown>>('plugins/hronaut/.claude-plugin/plugin.json')
    expect(plugin).toMatchObject({
      displayName: 'Hronaut',
      privacyPolicyUrl: 'https://hronaut.dev/privacy',
      termsOfServiceUrl: 'https://hronaut.dev/terms',
      documentationUrl: 'https://hronaut.dev/claude-code-browser-mcp',
      supportUrl: 'https://github.com/hronaut/hronaut/issues',
      icon: './.claude-plugin/icon.png'
    })
    // The directory shows the README as the listing and asks for at least 40 words outside code blocks.
    const readme = (await readFile('plugins/hronaut/README.md', 'utf8')).replace(/```[\s\S]*?```/g, '')
    expect(readme.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(40)
  })

  it('ships the Hronaut skill', async () => {
    // The daily sync copies it from the newest Hronaut release, whose skills/hronaut/SKILL.md is the source.
    expect(await readFile('plugins/hronaut/skills/hronaut/SKILL.md', 'utf8')).toMatch(/^---\r?\nname: hronaut\r?\n/)
  })
})

describe('the Codex marketplace', () => {
  it('sends Codex to the Codex plugin’s own repository', async () => {
    // Codex reads .agents/plugins/marketplace.json before .claude-plugin/marketplace.json. Without it,
    // `codex plugin marketplace add hronaut/hronaut-claude-plugin` would install this Claude Code plugin instead of the
    // Codex plugin, which is written for Codex.
    expect(await json('.agents/plugins/marketplace.json')).toEqual({
      name: 'hronaut',
      interface: { displayName: 'Hronaut' },
      plugins: [{
        name: 'hronaut',
        source: { source: 'git-subdir', url: 'https://github.com/hronaut/hronaut-codex-plugin.git', path: 'plugins/hronaut' },
        policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
        category: 'Developer Tools'
      }]
    })
  })
})
