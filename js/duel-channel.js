// js/duel-channel.js
// Supabase Realtime Broadcast wrapper for duel mode.
//
// Events:
//   player:ready    — emitted by each client on load; payload { userId }
//   game:start      — emitted by player1 when both ready; payload { started_at }
//   game:finished   — emitted by each client on completion; payload { userId, score, maxScore }
//
// The module also runs a DB polling fallback every 3 s so that missed
// Broadcast events (e.g. on reconnect) are recovered automatically.

// supabase is passed in by the caller — do NOT import it here.
// All callers must import { supabase } from './js/supabase-client.js' themselves
// and pass the shared instance as the first argument.

export function createDuelChannel(supabase, matchId, currentUserId, callbacks, options = {}) {
  // options.participantIds: [player1_id, player2_id] — when provided, used to validate
  //   sender identity in game:finished events without an extra DB read.
  // callbacks: { onBothReady, onGameStart, onOpponentFinished }
  //   onBothReady()                       — both players emitted player:ready
  //   onGameStart({ started_at })         — game:start received
  //   onOpponentFinished({ userId, score, maxScore })

  let channel        = null;
  let destroyed      = false;
  let pollInterval   = null;
  let gameStarted    = false;
  let opponentDone   = false;
  // One-way latch: once onBothReady fires, it must NEVER fire again for this
  // channel instance — even if the WebSocket reconnects and re-delivers
  // player:ready events or readySet was already >= 2 before the resubscribe.
  let bothReadyFired = false;
  // Prevents concurrent DB queries if multiple player:ready events arrive quickly.
  let checkPending   = false;

  // Track which user IDs have sent player:ready (includes self)
  const readySet = new Set();

  // ----------------------------------------------------------------
  // Subscribe / resubscribe
  // ----------------------------------------------------------------
  function subscribe() {
    channel = supabase.channel('duel:' + matchId, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'player:ready' }, ({ payload }) => {
        if (!payload?.userId) return;
        readySet.add(payload.userId);
        checkBothReady();
      })
      .on('broadcast', { event: 'game:start' }, ({ payload }) => {
        if (gameStarted) return;

        // Sanity-check the started_at timestamp — treat as untrusted input.
        // Rejects spoofed far-future timestamps (which would extend the game timer)
        // and absurd past timestamps. Out-of-bounds events fall through to the
        // DB polling fallback which recovers the authoritative started_at.
        const ts  = payload?.started_at ? new Date(payload.started_at).getTime() : NaN;
        const now = Date.now();
        const MAX_PAST_MS   = 60_000; // 60 s — covers delayed delivery on reconnect
        const MAX_FUTURE_MS =  5_000; // 5 s  — tolerates server/client clock drift
        if (isNaN(ts) || ts < now - MAX_PAST_MS || ts > now + MAX_FUTURE_MS) {
          // Invalid timestamp — DB poll will recover authoritative started_at within 3 s
          return;
        }

        gameStarted = true;
        clearInterval(pollInterval);
        if (callbacks.onGameStart) callbacks.onGameStart(payload);
      })
      .on('broadcast', { event: 'game:finished' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === currentUserId) return;
        // If participant IDs are known, validate the sender is the actual opponent.
        // This prevents a spoofed game:finished from triggering premature results navigation.
        if (options.participantIds && !options.participantIds.includes(payload.userId)) return;
        if (opponentDone) return;
        opponentDone = true;
        if (callbacks.onOpponentFinished) callbacks.onOpponentFinished(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          emitReady();
          startFallbackPoll();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('⚔️ Duel channel error, resubscribing…', status);
          setTimeout(() => { if (!destroyed) resubscribe(); }, 2000);
        }
      });
  }

  function resubscribe() {
    if (channel) supabase.removeChannel(channel);
    channel = null;
    subscribe();
  }

  // ----------------------------------------------------------------
  // Both-ready check (called when any player:ready event arrives)
  // ----------------------------------------------------------------
  // Validates against DB before triggering onBothReady.
  // Realtime player:ready events are treated as hints, not authority —
  // the actual participant list comes from h2h_matches.
  async function checkBothReady() {
    // Fast pre-check: avoid DB if conditions clearly aren't met
    if (readySet.size < 2 || bothReadyFired || !callbacks.onBothReady || checkPending) return;

    checkPending = true;
    try {
      const { data: match } = await supabase
        .from('h2h_matches')
        .select('player1_id, player2_id, status, started_at')
        .eq('id', matchId)
        .single();

      // Re-check after the async gap — another concurrent call may have resolved first
      if (bothReadyFired) return;

      // Reject terminal or already-started matches
      if (!match || match.started_at || match.status === 'abandoned' || match.status === 'finished') return;

      // An opponent must have actually joined
      if (!match.player2_id) return;

      // Both REAL participants must be in the readySet.
      // This blocks spoofed player:ready events — an adversary cannot know both
      // participant UUIDs if they aren't a member of the match (RLS prevents reading
      // the match row after player2 has joined).
      if (!readySet.has(match.player1_id) || !readySet.has(match.player2_id)) return;

      bothReadyFired = true;
      callbacks.onBothReady();
    } finally {
      checkPending = false;
    }
  }

  // ----------------------------------------------------------------
  // DB polling fallback — covers missed Broadcast events
  // ----------------------------------------------------------------
  function startFallbackPoll() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      if (destroyed) return;

      const { data: match } = await supabase
        .from('h2h_matches')
        .select('status, started_at, player1_id, player2_id')
        .eq('id', matchId)
        .single();

      if (!match) return;

      // Recover missed game:start
      if (!gameStarted && match.status === 'active' && match.started_at) {
        gameStarted = true;
        clearInterval(pollInterval);
        if (callbacks.onGameStart) callbacks.onGameStart({ started_at: match.started_at });
        return;
      }

      // Recover missed game:finished (opponent result in DB)
      if (!opponentDone) {
        const opponentId = match.player1_id === currentUserId
          ? match.player2_id
          : match.player1_id;

        if (opponentId) {
          const { data: result } = await supabase
            .from('h2h_results')
            .select('score, max_score')
            .eq('match_id', matchId)
            .eq('user_id', opponentId)
            .maybeSingle();

          if (result) {
            opponentDone = true;
            if (callbacks.onOpponentFinished) {
              callbacks.onOpponentFinished({
                userId:   opponentId,
                score:    result.score,
                maxScore: result.max_score
              });
            }
          }
        }
      }
    }, 3000);
  }

  // ----------------------------------------------------------------
  // Public emit helpers
  // ----------------------------------------------------------------
  function emitReady() {
    readySet.add(currentUserId);  // optimistically mark self ready
    channel?.send({
      type:    'broadcast',
      event:   'player:ready',
      payload: { userId: currentUserId }
    });
  }

  function emitGameStart(startedAt) {
    channel?.send({
      type:    'broadcast',
      event:   'game:start',
      payload: { started_at: startedAt }
    });
  }

  function emitFinished(score, maxScore) {
    channel?.send({
      type:    'broadcast',
      event:   'game:finished',
      payload: { userId: currentUserId, score, maxScore }
    });
  }

  function destroy() {
    destroyed = true;
    if (pollInterval) clearInterval(pollInterval);
    if (channel) supabase.removeChannel(channel);
    channel = null;
  }

  // Kick off subscription
  subscribe();

  return { emitReady, emitGameStart, emitFinished, destroy };
}
