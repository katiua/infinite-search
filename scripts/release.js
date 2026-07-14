#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const input = process.argv[2]

if (!input) {
  console.error('Usage: pnpm release <version>')
  process.exit(1)
}

const version = input.replace(/^v/, '')
const tag = `v${version}`

const packagePath = path.resolve('package.json')
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

pkg.version = version

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)

const run = (command) => {
  console.log(`\n> ${command}`)
  execSync(command, {
    stdio: 'inherit',
  })
}

try {
  run('git add .')
  run(`git commit -m "release: ${tag}"`)
  run(`git tag ${tag}`)
  run('git push origin main')
  run(`git push origin ${tag}`)

  console.log(`\n Release ${tag} completed.`)
} catch (err) {
  void err
  console.error('\n Release failed.')
  process.exit(1)
}
