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
// Always reads the current DB value first — there is no localStorage shortcut here, because
// a cached "already synced" flag would prevent this device from ever noticing that some other
// device (e.g. a different login session) changed the stored timezone in the meantime. The
// read is a single cheap PK lookup, and the write only fires on an actual mismatch, so this
// stays self-healing without creating unnecessary writes.
// Fire-and-forget: errors are swallowed so this never affects page initialisation.
;(async () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const userId = session.user.id;

    const { data: profile, error: readError } = await supabase
      .from('users')
      .select('timezone')
      .eq('id', userId)
      .single();

    if (readError) return;
    if (profile?.timezone === tz) return;

    await supabase
      .from('users')
      .update({ timezone: tz })
      .eq('id', userId);
  } catch (_) {
    // never propagate — this must not affect any page's own initialisation
  }
})();