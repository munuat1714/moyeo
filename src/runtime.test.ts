import { describe, expect, it } from 'vitest'
import { resolveApiUrl, SERVICE_ORIGIN } from './runtime'

describe('resolveApiUrl', () => {
  it('keeps same-origin paths in the browser', () => {
    expect(resolveApiUrl('/api/naver/local?query=test', false)).toBe('/api/naver/local?query=test')
  })

  it('uses the deployed API origin in the native app', () => {
    expect(resolveApiUrl('/api/naver/local?query=test', true)).toBe(`${SERVICE_ORIGIN}/api/naver/local?query=test`)
  })
})
