// Links confirmed by scripts/check-links.mjs (or pasted by the user) open the
// problem itself; anything unconfirmed searches Google for it instead, since a
// dead practice URL is a dead end.
export function googleSearchUrl(problem, platform) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${problem} ${platform}`)}`
}

export function problemUrl({ link, verified, problem, platform }) {
  return verified ? link : googleSearchUrl(problem, platform)
}
