// The page, topic, filters and open problem live in the URL hash, so refresh,
// Back/Forward and bookmarks all keep your place. Example:
//   #/problems?topic=06&show=todo&difficulty=Hard&core=1&notes=1&q=sum&problem=120

const VIEWS = ['home', 'problems', 'patterns']
const SHOW_VALUES = ['all', 'todo', 'solved', 'review', 'saved']
const DIFFICULTY_VALUES = ['Easy', 'Medium', 'Hard']
const LAST_ROUTE_KEY = 'dsa-last-route'

export const DEFAULT_ROUTE = Object.freeze({
  view: 'home',
  topic: null, // two-digit topic number, e.g. "06"
  show: 'all',
  difficulty: null,
  core: false,
  notes: false, // only problems with a note
  q: '',
  pattern: null, // scrolls the topic's list to this pattern
  problem: null, // id of the problem open in the detail panel
})

// Unknown or malformed values fall back to defaults rather than breaking.
export function parseHash(hash) {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?')
  const params = new URLSearchParams(query)
  const topic = params.get('topic') ?? ''
  const problem = Number(params.get('problem'))

  return {
    view: VIEWS.includes(path) ? path : 'home',
    topic: /^\d{2}$/.test(topic) ? topic : null,
    show: SHOW_VALUES.includes(params.get('show')) ? params.get('show') : 'all',
    difficulty: DIFFICULTY_VALUES.includes(params.get('difficulty')) ? params.get('difficulty') : null,
    core: params.get('core') === '1',
    notes: params.get('notes') === '1',
    q: params.get('q') ?? '',
    pattern: params.get('pattern') || null,
    problem: Number.isInteger(problem) && problem > 0 ? problem : null,
  }
}

// Defaults are left out to keep URLs short. List filters only apply to the
// problems page, so they are dropped elsewhere; an open problem works anywhere.
export function buildHash(route) {
  const params = new URLSearchParams()
  if (route.view === 'problems') {
    if (route.topic) params.set('topic', route.topic)
    if (route.show !== 'all') params.set('show', route.show)
    if (route.difficulty) params.set('difficulty', route.difficulty)
    if (route.core) params.set('core', '1')
    if (route.notes) params.set('notes', '1')
    if (route.q) params.set('q', route.q)
    if (route.pattern) params.set('pattern', route.pattern)
  }
  if (route.problem) params.set('problem', String(route.problem))
  const query = params.toString()
  return `#/${route.view}${query ? `?${query}` : ''}`
}

// A link with a hash wins; otherwise reopen wherever the user last was.
export function initialRoute() {
  const hash = window.location.hash
  if (hash && hash !== '#' && hash !== '#/') return parseHash(hash)
  try {
    const saved = localStorage.getItem(LAST_ROUTE_KEY)
    if (saved) return parseHash(saved)
  } catch {
    // Storage blocked - start from the default page.
  }
  return { ...DEFAULT_ROUTE }
}

// The open problem isn't remembered: coming back should show the page, not a panel.
export function rememberRoute(route) {
  try {
    localStorage.setItem(LAST_ROUTE_KEY, buildHash({ ...route, problem: null }))
  } catch {
    // Storage blocked - nothing to remember with.
  }
}
