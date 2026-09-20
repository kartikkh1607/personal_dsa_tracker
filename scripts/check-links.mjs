// Checks every problem link and records the result as `linkVerified` in the
// question data. The app opens verified links directly and sends everything
// else to a Google search, so re-run this whenever questions.json changes:
//
//   node scripts/check-links.mjs
//
// A link counts as working when it opens the actual problem: a free LeetCode
// problem that exists, or a GeeksforGeeks practice page for a real problem.
// Search pages, premium-only LeetCode problems and dead pages do not.
import { readFileSync, writeFileSync } from 'node:fs'

const QUESTIONS_FILE = 'src/data/questions.json'
const CONCURRENCY = 6
const ATTEMPTS = 3
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36'

const questions = JSON.parse(readFileSync(QUESTIONS_FILE, 'utf8'))

async function withRetry(check) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await check()
    } catch (error) {
      if (attempt === ATTEMPTS) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
}

async function checkLeetCode(url) {
  const slug = url.pathname.match(/^\/problems\/([^/]+)/)?.[1]
  if (!slug) return { ok: false, reason: 'not a problem URL' }
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com', 'User-Agent': USER_AGENT },
    body: JSON.stringify({ query: 'query q($s: String!) { question(titleSlug: $s) { isPaidOnly } }', variables: { s: slug } }),
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`LeetCode HTTP ${response.status}`)
  const { data } = await response.json()
  if (!data?.question) return { ok: false, reason: 'no such problem' }
  if (data.question.isPaidOnly) return { ok: false, reason: 'premium only' }
  return { ok: true }
}

async function checkGeeksforGeeks(url) {
  if (url.pathname.startsWith('/search')) return { ok: false, reason: 'search page' }
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(25000) })
  if (response.status === 404) return { ok: false, reason: 'HTTP 404' }
  if (!response.ok) throw new Error(`GeeksforGeeks HTTP ${response.status}`)
  const title = (await response.text()).match(/<title>([^<]*)<\/title>/i)?.[1] ?? ''
  if (url.pathname.startsWith('/problems/')) {
    // Real problems are titled "<name> | Practice | GeeksforGeeks"; a dead ID
    // falls back to the generic "Practice | GeeksforGeeks | ..." page.
    return / \| Practice \| GeeksforGeeks/.test(title) ? { ok: true } : { ok: false, reason: 'problem page not found' }
  }
  // Articles are titled "<name> - GeeksforGeeks"; missing ones return 404 above.
  return / - GeeksforGeeks\s*$/.test(title) && !/404/.test(title) ? { ok: true } : { ok: false, reason: 'article not found' }
}

async function check(question) {
  let url
  try {
    url = new URL(question.link)
  } catch {
    return { ok: false, reason: 'invalid URL' }
  }
  if (url.hostname.endsWith('leetcode.com')) return withRetry(() => checkLeetCode(url))
  if (url.hostname.endsWith('geeksforgeeks.org')) return withRetry(() => checkGeeksforGeeks(url))
  return { ok: false, reason: `unsupported host ${url.hostname}` }
}

const results = new Map()
let next = 0
let done = 0
async function worker() {
  while (next < questions.length) {
    const question = questions[next++]
    try {
      results.set(question.id, await check(question))
    } catch (error) {
      // Leave the stored value alone when a site can't be reached.
      results.set(question.id, { ok: question.linkVerified, reason: `check failed (${error.message}), kept previous value`, failed: true })
    }
    if (++done % 100 === 0) console.log(`checked ${done}/${questions.length}`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

const reasons = new Map()
const changed = []
for (const question of questions) {
  const result = results.get(question.id)
  if (!result.ok) reasons.set(result.reason, (reasons.get(result.reason) ?? 0) + 1)
  if (question.linkVerified !== result.ok) changed.push(`  [${question.id}] ${question.problem}: ${question.linkVerified} -> ${result.ok}${result.reason ? ` (${result.reason})` : ''}`)
  question.linkVerified = result.ok
}

const json = JSON.stringify(questions, null, 2) + '\n'
writeFileSync(QUESTIONS_FILE, json)

const working = questions.filter((question) => question.linkVerified).length
console.log(`\nworking links: ${working}/${questions.length}; the other ${questions.length - working} open a Google search`)
for (const [reason, count] of reasons) console.log(`  ${count} × ${reason}`)
console.log(`\nchanged ${changed.length}:`)
console.log(changed.join('\n'))
