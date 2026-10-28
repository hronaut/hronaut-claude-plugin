// Copies the Hronaut skill and license from the newest hronaut/hronaut release into the Claude Code and Codex plugins
// and, for each plugin where either changed, bumps its patch version and adds a changelog entry. Fails when the app no
// longer matches what the headers helpers assume. Writes `changed`, `tag` and `release` to $GITHUB_OUTPUT when it is set.
import { appendFile, readFile, writeFile } from 'node:fs/promises'

const APP = 'hronaut/hronaut'
const PLUGINS = [
  { name: 'Claude Code plugin', folder: 'plugins/hronaut', manifest: 'plugins/hronaut/.claude-plugin/plugin.json', changelog: 'CHANGELOG.md' },
  { name: 'Codex plugin', folder: 'plugins/hronaut-codex', manifest: 'plugins/hronaut-codex/.codex-plugin/plugin.json', changelog: 'plugins/hronaut-codex/CHANGELOG.md' }
]
const token = process.env.GITHUB_TOKEN

async function get(url) {
  // The token only lifts the API's rate limit; hronaut/hronaut is public.
  const authorization = token && url.startsWith('https://api.github.com/') ? { Authorization: `Bearer ${token}` } : {}
  const response = await fetch(url, { headers: { 'User-Agent': 'hronaut-claude-plugin-sync', ...authorization } })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.text()
}

const tag = JSON.parse(await get(`https://api.github.com/repos/${APP}/releases/latest`)).tag_name
if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`Unexpected release tag ${tag}`)
const file = (path) => get(`https://raw.githubusercontent.com/${APP}/${tag}/${path}`)

// The helpers and tests hard-code these; a change in the app needs a change here first.
const assumptions = [
  ['src/main/mcp-token-store.ts', (text) => text.includes('const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,}$/'), 'tokens match /^[A-Za-z0-9_-]{32,}$/'],
  ['src/shared/mcp-port.ts', (text) => text.includes('export const DEFAULT_MCP_PORT = 47_812'), 'the default MCP port is 47812'],
  ['package.json', (text) => JSON.parse(text).name === 'hronaut', 'the package name, and so the profile folder, is hronaut']
]
const broken = []
for (const [path, holds, assumption] of assumptions) {
  if (!holds(await file(path))) broken.push(`${path} in ${APP} ${tag}: the helpers assume ${assumption}.`)
}
if (broken.length > 0) {
  console.error(`${broken.join('\n')}\nUpdate the headers helpers and tests to match, then run this workflow again.`)
  process.exit(1)
}

// Each plugin installs only its own folder, so each has a copy; the repository's LICENSE is the same text.
const copies = [
  ['skills/hronaut/SKILL.md', 'skills/hronaut/SKILL.md', 'the Hronaut skill'],
  ['LICENSE', 'LICENSE', 'the license']
]
const texts = new Map()
for (const [source] of copies) texts.set(source, await file(source))
if ((await readFile('LICENSE', 'utf8')) !== texts.get('LICENSE')) await writeFile('LICENSE', texts.get('LICENSE'))

const releases = []
for (const plugin of PLUGINS) {
  const updated = []
  for (const [source, target, name] of copies) {
    const path = `${plugin.folder}/${target}`
    if ((await readFile(path, 'utf8')) !== texts.get(source)) {
      await writeFile(path, texts.get(source))
      updated.push(name)
    }
  }
  if (updated.length === 0) continue
  const manifest = await readFile(plugin.manifest, 'utf8')
  const version = JSON.parse(manifest).version
  const [major, minor, patch] = version.split('.').map(Number)
  const next = `${major}.${minor}.${patch + 1}`
  await writeFile(plugin.manifest, manifest.replace(`"version": "${version}"`, `"version": "${next}"`))
  const changelog = await readFile(plugin.changelog, 'utf8')
  const entry = `## ${next} - ${new Date().toISOString().slice(0, 10)}\n\n- Updates ${updated.join(' and ')} to Hronaut ${tag.slice(1)}.\n\n`
  const at = changelog.indexOf('\n## ') + 1
  await writeFile(plugin.changelog, at > 0 ? changelog.slice(0, at) + entry + changelog.slice(at) : `${changelog.trimEnd()}\n\n${entry}`)
  releases.push(`${plugin.name} ${next}`)
}

console.log(releases.length > 0 ? `Updated from ${tag}: ${releases.join(', ')}.` : `Up to date with ${tag}.`)
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `changed=${releases.length > 0}\ntag=${tag}\nrelease=${releases.join(' and ')}\n`)
}
