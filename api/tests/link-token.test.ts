import assert from 'node:assert/strict'
import test from 'node:test'
import { linkToken, tokenHash } from '../lib/backend.ts'

test('link tokens carry at least 128 bits of randomness and are URL safe', () => {
  const token = linkToken()
  assert.match(token, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(Buffer.from(token, 'base64url').byteLength, 32)
})

test('only a fixed-length SHA-256 digest is suitable for token_hash storage', () => {
  const token = linkToken()
  const digest = tokenHash(token)
  assert.match(digest, /^[0-9a-f]{64}$/)
  assert.notEqual(digest, token)
  assert.equal(tokenHash(token), digest)
})
