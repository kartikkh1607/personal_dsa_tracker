import { createClient } from '@supabase/supabase-js'

// Sync is optional. With no Supabase project configured the app is exactly what
// it was before sync existed: progress in this browser, no account, no network.
// That is also what every test and the offline build get.
const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const SYNC_CONFIGURED = Boolean(url && publishableKey)

// Google sign-in needs an OAuth client set up in Google Cloud and added as a
// provider in Supabase, so it stays hidden until someone says it is ready.
export const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true'

let client = null

// Built on first use rather than at import time, so an unconfigured build never
// constructs one and importing this module stays free.
export function getClient() {
  if (!SYNC_CONFIGURED) return null
  client ??= createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The magic link comes back with a code in the URL. Reading it here is
      // what turns that redirect into a session.
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })
  return client
}
