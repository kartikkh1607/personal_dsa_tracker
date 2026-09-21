// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { NOT_A_TEST_USER, signInErrorFor } from './useSync.js'

// What comes back on the query string when a sign-in doesn't produce a session.
describe('signInErrorFor', () => {
  it('turns Google turning someone away into something they can act on', () => {
    // An OAuth client in testing mode refuses anyone not on its test user
    // list. Google's own wording explains nothing the visitor can use.
    expect(signInErrorFor({ errorCode: 'access_denied', errorDescription: 'Access blocked: app is in testing' })).toBe(NOT_A_TEST_USER)
    expect(signInErrorFor({ errorCode: 'access_denied', errorDescription: null })).toBe(NOT_A_TEST_USER)
  })

  it('passes any other provider error through as it was explained', () => {
    expect(signInErrorFor({ errorCode: 'server_error', errorDescription: 'Something went wrong' })).toBe('Something went wrong')
  })

  it('has nothing to say when there was no error', () => {
    expect(signInErrorFor({})).toBeNull()
    expect(signInErrorFor()).toBeNull()
  })
})
