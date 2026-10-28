// Temporary: measures Windows PowerShell's start in Codex's helper environment. Removed before merge.
import { spawnSync } from 'node:child_process'
import { describe, it } from 'vitest'

const CORE = ['PATH', 'PATHEXT', 'SHELL', 'COMSPEC', 'SYSTEMROOT', 'WINDIR', 'SYSTEMDRIVE', 'USERNAME', 'USERDOMAIN', 'USERPROFILE', 'HOMEDRIVE',
  'HOMEPATH', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432', 'PROGRAMDATA', 'LOCALAPPDATA', 'APPDATA', 'TEMP', 'TMP', 'TMPDIR', 'POWERSHELL', 'PWSH']

function pick(names: string[]): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [name, value] of Object.entries(process.env)) if (value !== undefined && names.includes(name.toUpperCase())) env[name] = value
  return env
}

describe.runIf(process.platform === 'win32')('Windows PowerShell start', { timeout: 600_000 }, () => {
  it('times each environment', () => {
    const all = Object.keys(process.env).map((name) => name.toUpperCase())
    console.log('variables not in the core list:', all.filter((name) => !CORE.includes(name)).join(' '))
    const variants: Array<[string, Record<string, string>]> = [
      ['full', pick(all)],
      ['core', pick(CORE)],
      ['core+PSModulePath', pick([...CORE, 'PSMODULEPATH'])],
      ['core+processor/computer', pick([...CORE, 'PROCESSOR_ARCHITECTURE', 'PROCESSOR_IDENTIFIER', 'PROCESSOR_LEVEL', 'PROCESSOR_REVISION', 'NUMBER_OF_PROCESSORS', 'OS', 'COMPUTERNAME'])],
      ['core+allusers/common', pick([...CORE, 'ALLUSERSPROFILE', 'PUBLIC', 'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)', 'COMMONPROGRAMW6432'])],
      ['full-PSModulePath', pick(all.filter((name) => name !== 'PSMODULEPATH'))],
      ['core again', pick(CORE)]
    ]
    for (const [name, env] of variants) {
      const start = Date.now()
      const result = spawnSync('powershell', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', "[Console]::Out.Write('ok')"], { env, encoding: 'utf8', timeout: 120_000 })
      console.log(`${name}: ${Date.now() - start} ms, stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr?.slice(0, 300))} status=${result.status} error=${result.error?.message ?? ''}`)
    }
  })
})
