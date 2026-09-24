// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ProblemList from './ProblemList.jsx'

const core = { id: 1, problem: 'Two Sum II', pattern: 'Two pointers', tier: 'Core', difficulty: 'Medium', platform: 'LeetCode', link: 'https://example.com/1' }
const depth = { id: 2, problem: '3Sum Closest', pattern: 'Two pointers', tier: 'Depth', difficulty: 'Medium', platform: 'LeetCode', link: 'https://example.com/2' }

function subtitles(groupByPattern) {
  const { container } = render(
    <ProblemList
      groups={[{ key: 'Two pointers', label: 'Two pointers', items: [core, depth], solved: 0 }]}
      groupByPattern={groupByPattern}
      progress={{}}
      today="2026-09-25"
      onToggleSolved={() => {}}
      onToggleBookmark={() => {}}
      onOpen={() => {}}
    />,
  )
  return [...container.querySelectorAll('[data-problem-row]')].map((row) => row.querySelector('.psub')?.textContent ?? null)
}

afterEach(cleanup)

describe('ProblemList subtitles', () => {
  it('drops the pattern under a pattern heading, keeping the tier', () => {
    // A Core row has no subtitle element at all, not an empty one.
    expect(subtitles(true)).toEqual([null, 'Depth'])
  })

  it('names the pattern when grouped by topic', () => {
    expect(subtitles(false)).toEqual(['Two pointers', 'Two pointers · Depth'])
  })
})
