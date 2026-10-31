import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import config from '../../config/ai'

const root = join(import.meta.dir, '../..')

describe('inline completions', () => {
  it('mounts the framework action at POST /api/complete behind auth', () => {
    const routes = readFileSync(join(root, 'routes/api.ts'), 'utf8')
    expect(routes).toContain('route.post(\'/complete\', \'Actions/AI/CompleteAction\').middleware(\'auth\')')
  })

  it('is on, and names no model or driver the app does not have', () => {
    expect(config.completion?.enabled).toBe(true)
    expect(config.completion).not.toHaveProperty('model')
  })
})
