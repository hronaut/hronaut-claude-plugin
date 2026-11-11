// Relays MCP messages between an MCP client that starts this program (stdio, one JSON-RPC message per line) and the
// Streamable HTTP MCP server of the Hronaut app running on this computer. It adds the owner token from Hronaut's
// profile to each request and sends it nowhere else: the address is always 127.0.0.1.
import { createInterface } from 'node:readline'
import { mcpUrl, ownerToken } from './token.js'

const NOT_RUNNING = 'Hronaut is not running, or its MCP server is off. Start Hronaut, then reconnect (in Claude Code: /mcp).'

/** Splits a text/event-stream body into its events' data, as the MCP Streamable HTTP transport sends them. */
export async function* serverSentEvents(body) {
  const decoder = new TextDecoder()
  let buffer = ''
  let data = []
  let id
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    let end
    while ((end = buffer.search(/\r\n|\r|\n/)) >= 0) {
      const line = buffer.slice(0, end)
      buffer = buffer.slice(end + (buffer.startsWith('\r\n', end) ? 2 : 1))
      if (line === '') {
        if (data.length > 0) yield { data: data.join('\n'), id }
        data = []
      } else if (line.startsWith('data:')) {
        data.push(line.slice(line.startsWith('data: ') ? 6 : 5))
      } else if (line.startsWith('id:')) {
        id = line.slice(3).trim()
      }
    }
  }
  if (data.length > 0) yield { data: data.join('\n'), id }
}

/** Starts relaying between `input`/`output` and Hronaut; resolves when the client closes `input`. */
export function relay({ input = process.stdin, output = process.stdout, env = process.env, log = (text) => process.stderr.write(`${text}\n`) } = {}) {
  const url = mcpUrl(env)
  let sessionId
  let protocolVersion
  let listening = false
  let closed = false
  // Messages wait for Hronaut's answer to `initialize`, which assigns the session they belong to.
  let started = Promise.resolve()

  const send = (message) => output.write(`${JSON.stringify(message)}\n`)
  const headers = (accept) => {
    const token = ownerToken(env)
    return {
      Accept: accept,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
      ...(protocolVersion ? { 'Mcp-Protocol-Version': protocolVersion } : {})
    }
  }
  /** Answers a request that Hronaut could not, so the client is not left waiting. */
  const fail = (message, text) => {
    if (message.id !== undefined && typeof message.method === 'string') send({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: text } })
  }
  const forward = (text, method) => {
    for (const message of [JSON.parse(text)].flat()) {
      if (method === 'initialize' && message.result?.protocolVersion) protocolVersion = message.result.protocolVersion
      send(message)
    }
  }

  async function readAnswer(response, method) {
    const type = response.headers.get('content-type') ?? ''
    if (type.includes('text/event-stream')) {
      for await (const event of serverSentEvents(response.body)) if (event.data.trim()) forward(event.data, method)
    } else if (type.includes('application/json')) {
      const text = await response.text()
      if (text.trim()) forward(text, method)
    } else {
      await response.body?.cancel()
    }
  }

  /** Hronaut's own messages to the client, such as a changed tool list, arrive on a stream the client opens. */
  async function listen() {
    let lastEventId
    while (!closed) {
      try {
        const response = await fetch(url, { headers: { ...headers('text/event-stream'), ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {}) } })
        // A server that sends nothing of its own answers 405.
        if (response.status === 405 || !response.ok) return void (await response.body?.cancel())
        for await (const event of serverSentEvents(response.body)) {
          if (event.id) lastEventId = event.id
          if (event.data.trim()) forward(event.data)
        }
      } catch {
        // Hronaut quit or the stream dropped; try again while the client is connected.
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  function post(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      return log('Ignored a line that is not JSON.')
    }
    const response = started.then(async () => {
      const answer = await fetch(url, {
        method: 'POST',
        headers: { ...headers('application/json, text/event-stream'), 'Content-Type': 'application/json' },
        body: line
      })
      if (message.method === 'initialize') sessionId = answer.headers.get('mcp-session-id') ?? undefined
      return answer
    })
    // Only `initialize` holds back what follows: a long tool call must not delay, say, its own cancellation.
    if (message.method === 'initialize') started = response.catch(() => undefined)
    response.then(async (answer) => {
      if (answer.ok) {
        await readAnswer(answer, message.method)
        if (message.method === 'notifications/initialized' && !listening) {
          listening = true
          void listen()
        }
        return
      }
      const detail = await answer.text().catch(() => '')
      // Hronaut answers 404 to a session it no longer knows, as after a restart; the client starts a new one.
      if (answer.status === 404 && sessionId) sessionId = undefined
      const reason = answer.status === 401 ? 'Hronaut refused the owner token. Restart Hronaut, then reconnect.' : `Hronaut answered ${answer.status}.`
      log(`${reason} ${detail}`.trim())
      fail(message, reason)
    }).catch((error) => {
      log(`${NOT_RUNNING} (${error.cause?.code ?? error.message})`)
      fail(message, NOT_RUNNING)
    })
  }

  return new Promise((resolve) => {
    const lines = createInterface({ input, crlfDelay: Infinity })
    lines.on('line', (line) => line.trim() && post(line))
    lines.on('close', async () => {
      closed = true
      if (sessionId) await fetch(url, { method: 'DELETE', headers: headers('application/json') }).catch(() => undefined)
      resolve()
    })
  })
}
