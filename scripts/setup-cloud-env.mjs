import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const packageJsonPath = path.join(projectRoot, 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
const packageManager = typeof packageJson.packageManager === 'string'
  ? packageJson.packageManager
  : 'pnpm@10'

if (!packageManager.startsWith('pnpm@')) {
  throw new Error(`packageManager must pin pnpm. Received: ${packageManager}`)
}

const pnpmVersion = packageManager.replace('pnpm@', '').trim()
const commands = [
  'corepack enable',
  `corepack prepare pnpm@${pnpmVersion} --activate`,
  'pnpm --version',
  'pnpm install --frozen-lockfile',
]

for (const command of commands) {
  process.stdout.write(`\n> ${command}\n`)
  execSync(command, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  })
}

process.stdout.write('\nCloud setup completed.\n')
