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

export function createDuelChannel(supabase, matchId, currentUserId, callbacks) {
  // callbacks: { onBothReady, onGameStart, onOpponentFinished }
  //   onBothReady()                       — both players emitted player:ready
  //   onGameStart({ started_at })         — game:start received
  //   onOpponentFinished({ userId, score, maxScore })

  let channel       = null;
  let destroyed     = false;
  let pollInterval  = null;
  let gameStarted   = false;
  let opponentDone  = false;

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
        gameStarted = true;
        clearInterval(pollInterval);
        if (callbacks.onGameStart) callbacks.onGameStart(payload);
      })
      .on('broadcast', { event: 'game:finished' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === currentUserId) return;
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
  function checkBothReady() {
    if (readySet.size >= 2 && callbacks.onBothReady) {
      callbacks.onBothReady();
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
