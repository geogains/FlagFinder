// js/supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

export const SUPABASE_URL = 'https://ajwxgdaninuzcpfwawug.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqd3hnZGFuaW51emNwZndhd3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDI5ODgsImV4cCI6MjA3NzA3ODk4OH0._LvYsqhSZIsWLIvAYtEceg1fXbEuaM0DElY5poVqZxI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    window.location.href = 'index.html?showAuth=true';
    throw new Error('Authentication required');
  }
  return session;
}

// Races getSession() against a timeout so pages never hang forever.
// On timeout, resolves with { data: { session: null } } — callers treat it as unauthenticated.
export function getSessionSafe(timeoutMs = 5000) {
  const timeout = new Promise(resolve =>
    setTimeout(() => resolve({ data: { session: null } }), timeoutMs)
  );
  return Promise.race([supabase.auth.getSession(), timeout]);
}

// Syncs the browser's IANA timezone to users.timezone when it differs from the stored value.
// Reads first, writes only if the value changed — so the DB write is a rare event.
// Fire-and-forget: errors are swallowed so this never affects page initialisation.
;(async () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile, error: readError } = await supabase
      .from('users')
      .select('timezone')
      .eq('id', session.user.id)
      .single();

    if (readError) return;
    if (profile?.timezone === tz) return;

    await supabase
      .from('users')
      .update({ timezone: tz })
      .eq('id', session.user.id);
  } catch (_) {
    // never propagate — this must not affect any page's own initialisation
  }
})();