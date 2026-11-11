// Finds Hronaut's MCP address and owner token the way Hronaut itself does, so the bridge needs no configuration.
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Hronaut's default MCP port, DEFAULT_MCP_PORT in the app; the plugin repository's daily sync checks that it still is. */
export const DEFAULT_MCP_PORT = 47_812
/** Hronaut writes tokens of 32 or more URL-safe characters (TOKEN_PATTERN in the app); anything else is never sent. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,}$/

/** The address of Hronaut's MCP server: always this computer, on HRONAUT_MCP_PORT when Hronaut was started with one. */
export function mcpUrl(env = process.env) {
  const port = /^\d{1,5}$/.test(env.HRONAUT_MCP_PORT ?? '') ? Number(env.HRONAUT_MCP_PORT) : DEFAULT_MCP_PORT
  return `http://127.0.0.1:${port > 0 && port < 65_536 ? port : DEFAULT_MCP_PORT}/mcp`
}

/** Hronaut's profile folder. Electron names it after the app's package name, which is lowercase. */
export function profileDirectory(env = process.env, platform = process.platform, home = env.HOME || homedir()) {
  if (env.HRONAUT_USER_DATA_DIR) return env.HRONAUT_USER_DATA_DIR
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'hronaut')
  if (platform === 'win32') return join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'hronaut')
  return join(env.XDG_CONFIG_HOME || join(home, '.config'), 'hronaut')
}

/**
 * The owner token: HRONAUT_MCP_TOKEN, which Hronaut uses instead of its token file when it is started with it, else
 * the one in the profile's token file. Undefined while there is none, as before Hronaut first ran; Hronaut accepts the
 * connection without one while its MCP authentication is off.
 */
export function ownerToken(env = process.env, platform = process.platform) {
  const fromEnvironment = env.HRONAUT_MCP_TOKEN?.trim()
  if (fromEnvironment && TOKEN_PATTERN.test(fromEnvironment)) return fromEnvironment
  let fromFile
  try {
    // Hronaut trims the file, so its token may follow a byte order mark or sit between spaces and line breaks.
    fromFile = readFileSync(join(profileDirectory(env, platform), 'mcp-token'), 'utf8').replace(/^﻿/, '').trim()
  } catch {
    return undefined
  }
  return TOKEN_PATTERN.test(fromFile) ? fromFile : undefined
}
