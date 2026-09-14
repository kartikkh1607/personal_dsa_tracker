import { describe, expect, it } from 'vitest'
import { googleSearchUrl, problemUrl } from './links.js'

describe('problemUrl', () => {
  it('opens a verified link directly', () => {
    expect(problemUrl({ link: 'https://leetcode.com/problems/two-sum/', verified: true, problem: 'Two Sum', platform: 'LeetCode' })).toBe(
      'https://leetcode.com/problems/two-sum/',
    )
  })

  it('searches Google for an unverified one', () => {
    expect(problemUrl({ link: 'https://www.geeksforgeeks.org/search/?q=x', verified: false, problem: 'Rearrange Array Alternately', platform: 'GeeksforGeeks' })).toBe(
      'https://www.google.com/search?q=Rearrange%20Array%20Alternately%20GeeksforGeeks',
    )
  })

  it('encodes characters that would break the query', () => {
    expect(googleSearchUrl('Sum & Difference #2 / 50%', 'LeetCode')).toBe('https://www.google.com/search?q=Sum%20%26%20Difference%20%232%20%2F%2050%25%20LeetCode')
  })
})
