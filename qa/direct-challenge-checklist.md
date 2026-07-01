# Direct Challenge — Manual QA Checklist

---

## Prerequisites

Before running any test:

- [ ] Migrations `20260626000001` and `20260626000002` applied successfully
- [ ] Two test accounts available — **User A** (challenger) and **User B** (challenged)
- [ ] Both accounts have public profile pages (`/u/[username]`)
- [ ] User A has at least one free category available
- [ ] Local server running (`python3 -m http.server 8000`)
- [ ] Browser DevTools open on Console tab throughout — zero unexpected errors is the bar

---

## 1. Challenge Creation

### 1.1 Challenge button visibility

- [ ] Sign out completely. Visit User B's profile at `/u/[username]`. Confirm the "Challenge Player" button is **not visible** (button has `style="display:none"` and is never revealed for unauthenticated visitors).
- [ ] Sign in as User A. Visit User A's **own** profile. Confirm the "Challenge Player" button does **not appear** (own-profile guard).
- [ ] Sign in as User A. Visit User B's profile. Confirm the **"⚔️ Challenge Player"** button appears after a brief async delay (up to 3 s while `targetUserId` is set).

### 1.2 Step 1 — Category and mode selection

- [ ] Click "⚔️ Challenge Player". Confirm the modal opens showing User B's username in the heading.
- [ ] Confirm the category `<select>` is populated with free categories in one group and premium categories in another (or only free if User A is not premium).
- [ ] Confirm the three mode buttons are present: **Classic**, **VS Mode**, **Top 10**. Classic is active by default.
- [ ] Click VS Mode — confirm it becomes active and Classic deactivates.
- [ ] Click Top 10 — confirm it becomes active.
- [ ] Click **Cancel** — confirm the modal closes and no challenge is created.

### 1.3 Step 2 — Confirmation

- [ ] Select a category and mode. Click **Next →**. Confirm Step 2 is shown.
- [ ] Confirm the confirmation panel shows: User B's avatar (fetched from the profile page), User B's username, the selected category name, the selected mode.
- [ ] Confirm the **← Back** button returns to Step 1 with the previously selected category and mode still active.
- [ ] Confirm no RPC call has been made yet (check Network tab — `send_direct_challenge` should not have fired).

### 1.4 Start & Play

- [ ] On Step 2, click **Start & Play**.
- [ ] Confirm the button shows a loading state (disabled, text changes).
- [ ] Confirm `send_direct_challenge` is called exactly once.
- [ ] Confirm the browser navigates to the correct game page (`duelgame.html`, `duelgame-vs.html`, or `duelgame-top10.html`) with the correct `?mode=` parameter.
- [ ] Confirm `sessionStorage.duelMatch` contains `{ matchId, seed, startedAt, isDirectChallenge: true, isChallenger: true, category }`.

### 1.5 Duplicate challenge prevention

- [ ] After creating a challenge from User A to User B, navigate back and visit User B's profile again.
- [ ] Open the challenge modal and attempt to submit a second challenge to User B.
- [ ] Confirm the error message "You already have a pending challenge with this player" appears (RPC error code `P0004`). The modal stays open.

### 1.6 Self-challenge prevention

- [ ] (If the own-profile guard is somehow bypassed) Attempt to call `send_direct_challenge` with `invited_player_id = auth.uid()` directly via the console.
- [ ] Confirm the RPC returns error `P0002` and the UI shows an appropriate error message.

---

## 2. Challenger

### 2.1 First play — game page entry

- [ ] After clicking "Start & Play", confirm the game page loads without a console error.
- [ ] Confirm `isAsyncChallenger = true` (verify in DevTools: `sessionStorage.duelMatch` has `isDirectChallenge: true` and `isChallenger: true`).
- [ ] Confirm the **opponent badge** shows "📬 Waiting for opponent to accept" (not hidden, not pulsing).
- [ ] Confirm the countdown timer is running and reflects time remaining from `startedAt`.
- [ ] Confirm the game is fully playable (flags appear, rankings work, submission is enabled).

### 2.2 Refresh during game

- [ ] Mid-game, press F5 / Cmd+R to refresh the page.
- [ ] Confirm the page reloads into the same game (progress restored from `h2h_match_progress` if classic, or from sessionStorage seed).
- [ ] Confirm `sessionStorage.duelMatch.startedAt` is **unchanged** — the same timestamp as before the refresh.
- [ ] Confirm the countdown timer reflects time elapsed since the original `startedAt`, not a fresh 5 minutes.

### 2.3 Leave and resume within same session

- [ ] Mid-game, navigate to `account.html` using the back button or address bar.
- [ ] Confirm the account page loads normally.
- [ ] Click "Play Your Turn" on the pending challenge card.
- [ ] Confirm the game page loads again with the **same `startedAt`** — timer has not reset.
- [ ] Confirm time remaining is consistent with how long ago you first started (not a fresh timer).

### 2.4 Timer expiry — redirect

- [ ] To simulate expiry: open DevTools console and manually set `sessionStorage.duelMatch` with a `startedAt` 6 minutes in the past for the current `matchId`.
- [ ] Navigate to `account.html` and click "Play Your Turn".
- [ ] Confirm `_playChallengerTurn` detects expiry and redirects to `account.html#challenges` **without navigating to the game page**.
- [ ] Alternatively, if a game page is already loaded with <5 s remaining, wait for the timeout — confirm it redirects to `account.html#challenges` (not to `duelresults.html`).

### 2.5 Successful submission

- [ ] Complete the game as the challenger. Submit the final answer.
- [ ] Confirm the submit overlay appears ("Submitting result…").
- [ ] Confirm the overlay content changes to "✅ Challenge submitted! / Your opponent has 24 hours to respond."
- [ ] Confirm the page navigates to `account.html#challenges` after approximately 2.5 seconds.
- [ ] Confirm the challenge card for this match now shows **"WAITING"** badge (match still `direct_pending` — challenger has submitted, opponent hasn't accepted yet).

### 2.6 Cannot replay

- [ ] After a successful submission, `sessionStorage.duelMatch.completed` should be `true`. Try navigating directly back to the game page URL.
- [ ] Confirm Stage 3B fast-path fires: the page immediately redirects to `duelresults.html?match=…` (because `completed === true` in sessionStorage).
- [ ] Clear sessionStorage and try again — confirm Stage 3A DB check (`h2h_results` row exists for this user) also redirects to results.

### 2.7 Account page — challenger card states

- [ ] Before playing your turn: card shows "PLAY YOUR TURN" badge, countdown to invite expiry, enabled "Play Your Turn" button with `data-category` set.
- [ ] After submission (opponent not yet accepted): card shows "WAITING" badge, countdown, "Awaiting [User B] to accept…" status line, no play button.
- [ ] After opponent accepts and plays (match `finished`): card shows "FINISHED" badge, both scores displayed as `You: X/Y` and `Opp: X/Y` with **separate denominators**.

---

## 3. Challenged Player

### 3.1 Notification bell

- [ ] Sign in as User B. Visit any page that has the glass header (e.g. `index.html`).
- [ ] Confirm the 🔔 bell appears in the header with a red badge showing the correct pending count.
- [ ] Confirm the bell links to `account.html#challenges`.
- [ ] Sign out. Confirm the bell is **not visible** for unauthenticated users.

### 3.2 Homepage banner

- [ ] Sign in as User B. Visit `index.html`.
- [ ] Confirm the pending-challenge banner appears below the nav with the correct count ("1 pending challenge" or "N pending challenges").
- [ ] Confirm the banner links to `account.html#challenges`.
- [ ] Sign out. Confirm the banner is hidden.
- [ ] Sign back in as User B with zero pending challenges. Confirm the banner is hidden.

### 3.3 Challenge card — incoming state

- [ ] Navigate to `account.html#challenges` as User B.
- [ ] Confirm the incoming challenge card shows: "INCOMING CHALLENGE" badge, "From: [User A]", category and mode, countdown to expiry, **Accept & Play** and **Decline** buttons.

### 3.4 Accept & Play

- [ ] Click **Accept & Play** on the incoming card.
- [ ] Confirm the button shows a loading state.
- [ ] Confirm `accept_direct_challenge` RPC is called.
- [ ] Confirm the browser navigates to the correct game page with `?mode=` set.
- [ ] Confirm `sessionStorage.duelMatch` has `isDirectChallenge: true` and `isChallenger: false` (or `isChallenger` absent).
- [ ] Confirm match status in DB has changed from `direct_pending` to `active`.

### 3.5 Decline

- [ ] With a second pending challenge from User A: click **Decline**.
- [ ] Confirm `decline_direct_challenge` RPC is called.
- [ ] Confirm the card disappears from User B's list.
- [ ] Confirm the challenge appears in User A's list as declined/abandoned.
- [ ] Confirm the bell count decrements on the next page load.

### 3.6 Playing after acceptance — normal game flow

- [ ] As User B, after accepting, confirm the game page loads normally with a live realtime channel (not the async no-op stub).
- [ ] Confirm the opponent badge shows "⚔️ Opponent is playing…" (pulsing) — normal live state.
- [ ] Play the game to completion. Confirm `startWaitingForOpponent()` is triggered (waiting overlay appears).
- [ ] Confirm eventual redirect to `duelresults.html` shows both scores and the correct winner.

### 3.7 Cannot view opponent score early

- [ ] As User B, while match is `active` (User A has submitted, User B has not), open DevTools and call `supabase.rpc('get_my_direct_challenges')` directly.
- [ ] Confirm `opponent_score` and `opponent_max_score` are **null** (RPC only returns them when `status = 'finished'`).
- [ ] Confirm the challenge card on the account page does not display User A's score.

### 3.8 Challenged player — successful submission

- [ ] As User B, complete the game after accepting.
- [ ] Confirm submission follows the normal duel flow: submit overlay → waiting overlay → results page.
- [ ] Confirm `duelresults.html` shows both players' scores and the winner.

---

## 4. Challenge Lifecycle

### 4.1 Pending state (`direct_pending`)

- [ ] Immediately after User A clicks "Start & Play", check the DB: `h2h_matches.status = 'direct_pending'`, `match_type = 'direct'`, `invited_player_id = User B's UUID`, `invite_expires_at` set to ~24 hours from now, `player2_id = NULL`.
- [ ] Confirm User A's result is in `h2h_results` (challenger played first).
- [ ] Confirm User B's bell and banner show count = 1.

### 4.2 Active state

- [ ] After User B accepts: `status = 'active'`, `player2_id = User B's UUID`, `invite_expires_at` unchanged.
- [ ] Confirm User B's bell count decrements (no longer pending).

### 4.3 Finished state

- [ ] After User B submits: `status = 'finished'`.
- [ ] Confirm `get_my_direct_challenges` now returns `opponent_score` and `opponent_max_score` for both users.
- [ ] Confirm both users' account pages show the "FINISHED" card with scores.

### 4.4 Declined state

- [ ] After User B declines: `status = 'abandoned'`, `direct_abandon_reason = 'declined'`.
- [ ] Confirm the challenge no longer appears in User B's pending list.
- [ ] Confirm User A's card reflects the declined/abandoned state.

### 4.5 Expired state

- [ ] Manually set `invite_expires_at` to a past timestamp on a test challenge row.
- [ ] Run `cleanup_stale_duel_matches` (call it directly via SQL or RPC).
- [ ] Confirm `status = 'abandoned'`, `direct_abandon_reason = 'expired'`.
- [ ] Confirm the challenge no longer appears as actionable for either user.

### 4.6 Cleanup job

- [ ] Confirm `cleanup_stale_duel_matches` handles direct challenges correctly: expired `direct_pending` matches are abandoned with `reason = 'expired'`; active and finished matches are unaffected.

---

## 5. UI

### 5.1 Challenges section — account page

- [ ] Navigate to `account.html#challenges`. Confirm the section is visible and the anchor scrolls correctly.
- [ ] With no challenges: confirm "No challenges yet. Challenge a player from their profile page." is shown.
- [ ] With multiple challenges: confirm they render in a list.
- [ ] Confirm the section title and quicknav "⚔️ Challenges" link scroll correctly.

### 5.2 Countdown timers

- [ ] On a pending incoming card, confirm the invite expiry countdown ticks in real time.
- [ ] Confirm the countdown shows correctly formatted time (e.g. "23h 47m" or "14m 30s").
- [ ] Confirm no console errors from the countdown interval logic.

### 5.3 Quicknav ordering

- [ ] On `account.html`, confirm the quicknav order is: ⚔️ Challenges → Account → Badges → GeoDex.

### 5.4 Public profile button

- [ ] Confirm "⚔️ Challenge Player" renders as a filled purple/indigo gradient button (not the old greyed-out "Coming Soon" span).
- [ ] Confirm it does not appear for the signed-out visitor.
- [ ] Confirm it does not appear on the signed-in user's own profile.

### 5.5 Mobile layout

- [ ] On a mobile viewport (375 px), open User B's profile. Confirm the "Challenge Player" button fits the layout without overflow.
- [ ] Confirm the two-step modal is usable on mobile (scrollable, buttons tappable, no cut-off).
- [ ] Confirm challenge cards on `account.html` are readable on mobile.
- [ ] Confirm the bell fits in the header without pushing other elements off-screen.

---

## 6. Regression Testing

### 6.1 Private duel — unchanged

- [ ] Create a private duel via `duel.html` as normal (not via profile challenge).
- [ ] Confirm `sessionStorage.duelMatch` has no `isDirectChallenge` or `isChallenger` flag.
- [ ] Confirm `isAsyncChallenger = false` on the game page.
- [ ] Confirm the opponent badge starts pulsing ("⚔️ Opponent is playing…").
- [ ] Confirm `createDuelChannel` is called normally (not replaced by the no-op stub).
- [ ] Complete the game. Confirm `startWaitingForOpponent()` is called and results appear as before.

### 6.2 Quick Match — unchanged

- [ ] Start a Quick Match game.
- [ ] Confirm `isAsyncChallenger = false`.
- [ ] Confirm the realtime channel is created normally.
- [ ] Confirm timeout redirects to `duelresults.html?…&timeout=1` (not `account.html#challenges`).

### 6.3 Classic mode duel

- [ ] Run a classic-mode private duel to completion. Confirm no regressions in drag-and-drop ranking, scoring, result display, or leaderboard submission.

### 6.4 VS Mode duel

- [ ] Run a VS-mode private duel to completion. Confirm no regressions in head-to-head country comparison, scoring, and result display.

### 6.5 Top 10 duel

- [ ] Run a Top 10 private duel to completion. Confirm no regressions in typing input, answer validation, scoring, and result display.

### 6.6 Daily Challenge

- [ ] Complete today's Daily Challenge. Confirm no regressions in seeded game, leaderboard, and submission flow.

---

## 7. Security

### 7.1 Direct URL access — game page without valid sessionStorage

- [ ] While signed in as User A, clear `sessionStorage` and open `duelgame.html` directly.
- [ ] Confirm the page redirects to `duel.html` immediately (sessionStorage validation gate).

### 7.2 Tampered `isAsyncChallenger` flag

- [ ] As User B (not the challenger), manually set sessionStorage to mimic User A's challenger session: `{ matchId: <real matchId>, seed: <real seed>, startedAt: <now>, isDirectChallenge: true, isChallenger: true, category: <real category> }`.
- [ ] Navigate to the appropriate game page.
- [ ] Confirm the DB validation block rejects the attempt (`liveMatch.player1_id !== currentUserId`) and redirects to `account.html#challenges` with sessionStorage cleared.

### 7.3 Tampered match_type — active private match flagged as async

- [ ] As User A, create a normal `active` private duel with User C.
- [ ] Set sessionStorage to `{ matchId: <active private match id>, seed: …, startedAt: …, isDirectChallenge: true, isChallenger: true }`.
- [ ] Navigate to the game page and confirm the DB check sees `match_type = 'private'` (not `'direct'`) — the `direct_pending` path is blocked because `liveMatch.match_type !== 'direct'`. The match proceeds as `active` but with `isAsyncChallenger = true` set from sessionStorage. Note this edge case: verify that no harm results (no-op channel stubs and async badge are cosmetic) and that submission still calls the correct RPC path.

### 7.4 Double RPC submission — concurrent submits

- [ ] As the challenger, quickly double-submit (e.g. two tabs both completing the game, or button spam before the overlay appears).
- [ ] Confirm `verify_and_save_duel_result` is idempotent or rejects the second call gracefully.
- [ ] Confirm only one row exists in `h2h_results` for this user and match.
- [ ] Confirm no duplicate score entries.

### 7.5 Refresh during submission overlay

- [ ] As the challenger, trigger submission and immediately refresh while "Submitting result…" is visible.
- [ ] If the RPC completed before the refresh: `sessionStorage.duelMatch.completed = true` → Stage 3B redirects to results.
- [ ] If the RPC had not completed: Stage 3A finds no result row and allows replay — the game page reloads, timer is preserved, submission can be retried.

### 7.6 Cross-account score visibility

- [ ] Log in as User C (not a participant in any User A ↔ User B challenge).
- [ ] Call `supabase.rpc('get_my_direct_challenges')` from User C's session. Confirm zero rows returned.
- [ ] Call `accept_direct_challenge` or `decline_direct_challenge` with a matchId from User A ↔ User B. Confirm the RPC returns an error.

### 7.7 Challenger attempts to accept their own challenge

- [ ] As User A, manually call `accept_direct_challenge` with the matchId of a challenge User A sent.
- [ ] Confirm the RPC rejects (User A is `player1_id`, not `invited_player_id`).

---

## 8. Simultaneous Accept Race Condition ⚠️ BLOCKING

### 8.1 Setup

- [ ] Sign in as User B in **two separate browser tabs** (same session, same credentials).
- [ ] Ensure a pending challenge from User A exists and both tabs show the incoming card on `account.html#challenges`.

### 8.2 Simultaneous accept attempt

- [ ] In Tab 1, click **Accept & Play** but do not wait for navigation.
- [ ] Immediately switch to Tab 2 and click **Accept & Play** within ~500 ms.
- [ ] Observe the outcome in both tabs.

### 8.3 Expected results

- [ ] Exactly one tab navigates successfully to the game page. Confirm that tab's `sessionStorage.duelMatch` is valid and the game loads.
- [ ] The second tab either shows an error state / button re-enables, or also navigates — but DB state must be correct (see below).
- [ ] In the DB, confirm `h2h_matches` has exactly one `player2_id` (User B's UUID). No NULL, no double-write.
- [ ] Confirm `status = 'active'` with a single clean transition from `direct_pending`.
- [ ] Confirm `h2h_results` has at most one result row for User B on this match.
- [ ] Confirm no orphaned `direct_pending` row remains.

### 8.4 RPC idempotency note

The `accept_direct_challenge` RPC must use an atomic `UPDATE … WHERE status = 'direct_pending' AND invited_player_id = auth.uid()` so PostgreSQL row-level locking ensures only one transaction succeeds. If the second call arrives after the first commits, the WHERE clause matches zero rows and the RPC returns a clean error. Verify this by reading `20260626000002_direct_challenges_rpcs.sql`.

---

## 9. Notification Refresh After Accept / Decline

### 9.1 Baseline

- [ ] Sign in as User B. Note the bell count (e.g. `2`).
- [ ] Open `account.html#challenges` and confirm the pending card(s) are visible.

### 9.2 After accepting

- [ ] Click **Accept & Play**. Browser navigates to the game page.
- [ ] Complete or abandon the game and return to any page with the glass header.
- [ ] Confirm the bell count is decremented by 1.
- [ ] Confirm the homepage banner count is also decremented (or hidden if count reaches 0).
- [ ] **Expected current behaviour:** count updates on the next full page load. Navigation to the game page and back is a fresh load, so the count naturally refreshes on return.

### 9.3 After declining

- [ ] With a second pending challenge present, click **Decline**.
- [ ] Confirm the card is removed from the challenges list immediately (list re-renders after the RPC).
- [ ] **Without refreshing**, check the bell count in the header.
- [ ] **Expected current behaviour:** the bell count does **not** decrement immediately — `challenge-bell.js` runs once at page load with no polling or realtime subscription. Count updates on the next navigation or manual reload.
- [ ] Reload manually. Confirm the bell count now reflects the post-decline state.
- [ ] Confirm the homepage banner reflects the correct count on reload.
- [ ] If the count does not update even after reload: **FAIL** — log as blocking bug.
- [ ] If the count updates only on reload (not live): **PASS** — log as follow-up ticket for live bell decrement.

### 9.4 Bell hidden after all challenges resolved

- [ ] Resolve all pending challenges.
- [ ] Reload any page with the glass header.
- [ ] Confirm the bell is hidden and the homepage banner is hidden.

---

## 10. Challenge Ordering

### 10.1 Setup

Create the following in order (oldest to newest):

- Challenge A: `finished` — both players completed
- Challenge B: `direct_pending` — challenger (User A) has played, opponent hasn't accepted
- Challenge C: `abandoned` (declined by opponent)
- Challenge D: `direct_pending` — incoming challenge to the test user, newest

### 10.2 Observe current order

- [ ] Navigate to `account.html#challenges`.
- [ ] Record the order in which A, B, C, D appear.
- [ ] **If explicit `ORDER BY` is in the RPC:** verify the order matches the clause.
- [ ] **If no `ORDER BY`:** the order is non-deterministic heap order — log as a defect.

### 10.3 Stability check

- [ ] Reload the page three times.
- [ ] Confirm the challenge order is consistent across all three reloads.
- [ ] **If order varies between reloads: FAIL** — non-deterministic ordering is a bug. Log and fix before launch.
- [ ] **If order is stable but not user-friendly: PASS** — log as follow-up.

### 10.4 Intended ordering (reference for follow-up)

A user-friendly order would be:

1. Actionable first: incoming (`INCOMING CHALLENGE`) and play-now (`PLAY YOUR TURN`) cards — sorted by `invite_expires_at ASC` (most urgent first)
2. Waiting cards (`WAITING`) next
3. Resolved last: `FINISHED`, then `ABANDONED` — sorted by `updated_at DESC`

If the RPC lacks this ordering, log a follow-up ticket.

---

## Sign-off Criteria

The build is ready to ship when:

- All §1–§7 checkboxes pass with zero unexpected console errors
- §8 Race condition: no duplicate `player2_id` write (blocking)
- §9 Notification: bell updates correctly on page load after accept/decline (live update is a non-blocking follow-up)
- §10 Ordering: challenge order is stable across reloads (non-deterministic = blocking; suboptimal-but-stable = non-blocking follow-up)
- `duelresults.html` correctly shows both scores after a full challenger → challenged cycle
- No existing private duel or Quick Match behaviour is altered
- The bell and banner appear only for authenticated users with pending challenges
- The `direct_pending` DB gate reliably blocks any non-challenger from playing early

---

## Known Limitations (Technical Debt)

- **Cross-device/new-session timer:** `startedAt` lives in `sessionStorage`, which is tab- and device-scoped. Opening the challenge on a second device or after a full browser close creates a fresh timer. Long-term fix: store `challenger_started_at` on `h2h_matches` at first play and read it back in the DB validation block. Out of scope for this release.
- **Bell decrement on decline:** Bell count does not update live after a decline — requires a page reload. Future fix: dispatch a custom DOM event from `_declineChallenge()` to trigger a re-fetch of `get_pending_challenge_count` in place.
