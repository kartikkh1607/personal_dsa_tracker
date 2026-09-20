import { useCallback, useEffect, useRef, useState } from 'react'
import { buildHash, initialRoute, parseHash, rememberRoute } from '../route.js'

// The page, filters and open problem live in the URL hash. This keeps that hash,
// the browser's history and React state in step, so refresh, Back/Forward and
// bookmarks all land where the user expects.
export function useRoute() {
  const [route, setRoute] = useState(initialRoute)
  const routeRef = useRef(route)
  // True while the open detail panel has its own history entry, so closing it
  // can step back instead of stacking another entry.
  const drawerPushedRef = useRef(false)

  // Every navigation goes through here. It updates the address bar and
  // remembers the page for next time. Filter tweaks replace the current history
  // entry rather than piling up new ones.
  const navigate = useCallback((patch, { replace = false } = {}) => {
    const next = { ...routeRef.current, ...patch }
    routeRef.current = next
    if (patch.problem === null) drawerPushedRef.current = false
    const hash = buildHash(next)
    if (hash !== window.location.hash) window.history[replace ? 'replaceState' : 'pushState'](null, '', hash)
    rememberRoute(next)
    setRoute(next)
  }, [])

  useEffect(() => {
    window.history.replaceState(null, '', buildHash(routeRef.current))
    rememberRoute(routeRef.current)
    function handlePopState() {
      const next = parseHash(window.location.hash)
      routeRef.current = next
      drawerPushedRef.current = false
      rememberRoute(next)
      setRoute(next)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const openQuestion = useCallback(
    (id) => {
      const alreadyOpen = routeRef.current.problem != null
      navigate({ problem: id }, { replace: alreadyOpen })
      if (!alreadyOpen) drawerPushedRef.current = true
    },
    [navigate],
  )

  const closeQuestion = useCallback(() => {
    if (drawerPushedRef.current) {
      drawerPushedRef.current = false
      window.history.back()
    } else {
      navigate({ problem: null }, { replace: true })
    }
  }, [navigate])

  return { route, navigate, openQuestion, closeQuestion }
}
