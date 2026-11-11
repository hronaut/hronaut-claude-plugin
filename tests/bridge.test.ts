import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mcpUrl, ownerToken, profileDirectory } from '../packages/mcp/src/token.js'

const BIN = join(process.cwd(), 'packages/mcp/bin/hronaut-mcp.js')
const TOKEN = 'a'.repeat(20) + '-_B9'.repeat(5)
/** Hronaut's default MCP port, DEFAULT_MCP_PORT in the app; the daily sync checks that it still is. */
const DEFAULT_MCP_PORT = 47_812

describe('where the bridge finds Hronaut', () => {
  let home: string

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'hronaut-mcp-'))
  })

  afterEach(async () => {
    await rm(home, { recursive: true, force: true })
  })

  it('always connects to this computer, on HRONAUT_MCP_PORT when it is a port', () => {
    expect(mcpUrl({})).toBe(`http://127.0.0.1:${DEFAULT_MCP_PORT}/mcp`)
    expect(mcpUrl({ HRONAUT_MCP_PORT: '48000' })).toBe('http://127.0.0.1:48000/mcp')
    for (const port of ['', '0', '70000', '48000@attacker.example', ' 48000', '4.8']) {
      expect(mcpUrl({ HRONAUT_MCP_PORT: port })).toBe(`http://127.0.0.1:${DEFAULT_MCP_PORT}/mcp`)
    }
  })

  it('reads the profile Hronaut uses on Linux, macOS and Windows, or the one HRONAUT_USER_DATA_DIR names', () => {
    expect(profileDirectory({}, 'linux', '/home/person')).toBe(join('/home/person', '.config', 'hronaut'))
    expect(profileDirectory({ XDG_CONFIG_HOME: '/xdg' }, 'linux', '/home/person')).toBe(join('/xdg', 'hronaut'))
    expect(profileDirectory({}, 'darwin', '/Users/person')).toBe(join('/Users/person', 'Library', 'Application Support', 'hronaut'))
    expect(profileDirectory({ APPDATA: 'C:\\Users\\person\\AppData\\Roaming' }, 'win32', 'C:\\Users\\person'))
      .toBe(join('C:\\Users\\person\\AppData\\Roaming', 'hronaut'))
    expect(profileDirectory({ HRONAUT_USER_DATA_DIR: '/custom' }, 'linux', '/home/person')).toBe('/custom')
  })

  it('takes the token as Hronaut does: HRONAUT_MCP_TOKEN, else the trimmed token file, and only one Hronaut writes', async () => {
    const env = { HRONAUT_USER_DATA_DIR: home }
    expect(ownerToken(env)).toBeUndefined()
    await writeFile(join(home, 'mcp-token'), `\uFEFF ${TOKEN}\t \r\n\n`)
    expect(ownerToken(env)).toBe(TOKEN)
    expect(ownerToken({ ...env, HRONAUT_MCP_TOKEN: `${TOKEN}env` })).toBe(`${TOKEN}env`)
    expect(ownerToken({ ...env, HRONAUT_MCP_TOKEN: 'short' })).toBe(TOKEN)
    for (const content of ['short-token\n', `${TOKEN}"}\n`, `${TOKEN} ${TOKEN}\n`, `${TOKEN}\n${TOKEN}\n`, '']) {
      await writeFile(join(home, 'mcp-token'), content)
      expect(ownerToken(env)).toBeUndefined()
    }
  })
})

/**
 * A Streamable HTTP MCP server like Hronaut's, which wants the owner token when `token` is set and, like Hronaut,
 * answers requests with JSON unless `json` is false.
 */
async function fakeHronaut(token: string | undefined, { json = true } = {}): Promise<{ server: Server; port: number; authorizations: Array<string | undefined>; notify: () => Promise<void> }> {
  const authorizations: Array<string | undefined> = []
  const transports = new Map<string, StreamableHTTPServerTransport>()
  const servers: McpServer[] = []
  const server = createServer(async (request: IncomingMessage, response) => {
    authorizations.push(request.headers.authorization)
    if (token && request.headers.authorization !== `Bearer ${token}`) return void response.writeHead(401).end('Unauthorized')
    const sessionId = request.headers['mcp-session-id']
    let transport = typeof sessionId === 'string' ? transports.get(sessionId) : undefined
    if (!transport) {
      if (sessionId) return void response.writeHead(404).end()
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: json,
        onsessioninitialized: (id) => void transports.set(id, transport!)
      })
      const mcp = new McpServer({ name: 'hronaut', version: '0.0.0' })
      mcp.registerTool('browser_status', { description: 'Reports the browser' }, async () => ({ content: [{ type: 'text', text: 'ready' }] }))
      servers.push(mcp)
      await mcp.connect(transport)
    }
    await transport.handleRequest(request, response)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    server,
    port: (server.address() as AddressInfo).port,
    authorizations,
    // A tool list that changes reaches the client on the stream it opened after `initialized`.
    notify: async () => {
      for (const mcp of servers) await mcp.server.sendToolListChanged()
    }
  }
}

/** Starts the bridge as Claude Code does and gives its messages, one per line, as they arrive. */
function startBridge(env: Record<string, string>): { child: ChildProcessWithoutNullStreams; next: () => Promise<any>; send: (message: object) => void } {
  const child = spawn(process.execPath, [BIN], { env: { PATH: process.env.PATH ?? '', ...env } })
  const queue: any[] = []
  const waiting: Array<(message: any) => void> = []
  createInterface({ input: child.stdout }).on('line', (line) => {
    const message = JSON.parse(line)
    const resolve = waiting.shift()
    resolve ? resolve(message) : queue.push(message)
  })
  return {
    child,
    next: () => (queue.length > 0 ? Promise.resolve(queue.shift()) : new Promise((resolve) => waiting.push(resolve))),
    send: (message) => child.stdin.write(`${JSON.stringify(message)}\n`)
  }
}

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'claude-code', version: '0.0.0' } }
}

describe('the bridge', { timeout: 20_000 }, () => {
  let home: string
  let hronaut: Awaited<ReturnType<typeof fakeHronaut>> | undefined
  let bridge: ReturnType<typeof startBridge> | undefined

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'hronaut-mcp-'))
  })

  afterEach(async () => {
    bridge?.child.kill()
    await new Promise((resolve) => (hronaut ? hronaut.server.close(resolve) : resolve(undefined)))
    hronaut?.server.closeAllConnections()
    hronaut = bridge = undefined
    await rm(home, { recursive: true, force: true })
  })

  it.each([['JSON', true], ['event stream', false]])('relays a session with Hronaut answering in %s, sending the owner token from the profile', async (_, json) => {
    hronaut = await fakeHronaut(TOKEN, { json })
    await mkdir(join(home, 'profile'))
    await writeFile(join(home, 'profile', 'mcp-token'), `${TOKEN}\n`)
    bridge = startBridge({ HOME: home, HRONAUT_USER_DATA_DIR: join(home, 'profile'), HRONAUT_MCP_PORT: String(hronaut.port) })

    bridge.send(INITIALIZE)
    expect(await bridge.next()).toMatchObject({ id: 1, result: { serverInfo: { name: 'hronaut' } } })
    bridge.send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    bridge.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    expect(await bridge.next()).toMatchObject({ id: 2, result: { tools: [expect.objectContaining({ name: 'browser_status' })] } })
    bridge.send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'browser_status', arguments: {} } })
    expect(await bridge.next()).toMatchObject({ id: 3, result: { content: [{ type: 'text', text: 'ready' }] } })

    await new Promise((resolve) => setTimeout(resolve, 300))
    await hronaut.notify()
    expect(await bridge.next()).toMatchObject({ method: 'notifications/tools/list_changed' })
    expect(new Set(hronaut.authorizations)).toEqual(new Set([`Bearer ${TOKEN}`]))
  })

  it('connects without a token while Hronaut has none', async () => {
    hronaut = await fakeHronaut(undefined)
    bridge = startBridge({ HOME: home, HRONAUT_USER_DATA_DIR: join(home, 'missing'), HRONAUT_MCP_PORT: String(hronaut.port) })
    bridge.send(INITIALIZE)
    expect(await bridge.next()).toMatchObject({ id: 1, result: { serverInfo: { name: 'hronaut' } } })
    expect(hronaut.authorizations).toEqual([undefined])
  })

  it('answers each request with an error that says what to do when Hronaut is not running or refuses the token', async () => {
    hronaut = await fakeHronaut(TOKEN)
    bridge = startBridge({ HOME: home, HRONAUT_USER_DATA_DIR: join(home, 'missing'), HRONAUT_MCP_PORT: String(hronaut.port) })
    bridge.send(INITIALIZE)
    expect(await bridge.next()).toMatchObject({ id: 1, error: { message: expect.stringContaining('refused the owner token') } })
    bridge.child.kill()

    const closed = hronaut.port
    await new Promise((resolve) => hronaut!.server.close(resolve))
    hronaut = undefined
    bridge = startBridge({ HOME: home, HRONAUT_USER_DATA_DIR: join(home, 'missing'), HRONAUT_MCP_PORT: String(closed) })
    bridge.send(INITIALIZE)
    expect(await bridge.next()).toMatchObject({ id: 1, error: { message: expect.stringContaining('Hronaut is not running') } })
    // Notifications get no answer, as JSON-RPC wants.
    bridge.send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    bridge.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    expect(await bridge.next()).toMatchObject({ id: 2, error: { message: expect.stringContaining('Hronaut is not running') } })
  })

  it('ends when the client closes its input', async () => {
    hronaut = await fakeHronaut(undefined)
    bridge = startBridge({ HOME: home, HRONAUT_USER_DATA_DIR: join(home, 'missing'), HRONAUT_MCP_PORT: String(hronaut.port) })
    bridge.send(INITIALIZE)
    await bridge.next()
    const exited = new Promise((resolve) => bridge!.child.on('exit', resolve))
    bridge.child.stdin.end()
    expect(await exited).toBe(0)
  })
})
