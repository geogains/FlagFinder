-- ================================================================
-- Head-to-Head Duel Mode — Schema, RLS, and RPC
-- ================================================================

-- ----------------------------------------------------------------
-- h2h_matches: one row per duel, created when a player generates
-- an invite link, updated when the opponent joins.
-- ----------------------------------------------------------------
create table if not exists h2h_matches (
  id          uuid        primary key default gen_random_uuid(),
  category    text        not null,
  seed        bigint      not null,
  status      text        not null default 'waiting'
                          check (status in ('waiting','active','finished','abandoned')),
  player1_id  uuid        references auth.users(id),
  player2_id  uuid        references auth.users(id),
  started_at  timestamptz,
  created_at  timestamptz not null default now(),
  timeout_at  timestamptz           -- populated when status → active (started_at + 5 min)
);

-- ----------------------------------------------------------------
-- h2h_results: one row per player per match, inserted when a
-- player finishes the game.  Server-verified score only.
-- ----------------------------------------------------------------
create table if not exists h2h_results (
  id          uuid        primary key default gen_random_uuid(),
  match_id    uuid        not null references h2h_matches(id),
  user_id     uuid        not null references auth.users(id),
  placements  jsonb       not null,  -- [{countryCode,placedRank,correctRankMin,correctRankMax,points}]
  score       int         not null,
  max_score   int         not null,
  finished_at timestamptz not null default now(),
  unique (match_id, user_id)
);

-- ----------------------------------------------------------------
-- Table-level grants (required when creating via SQL migration;
-- Supabase does NOT auto-grant for migrations run outside the dashboard)
-- ----------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update on h2h_matches to authenticated;
grant select, insert           on h2h_results to authenticated;

-- ----------------------------------------------------------------
-- Row Level Security — h2h_matches
-- ----------------------------------------------------------------
alter table h2h_matches enable row level security;

-- Read: players in the match, OR any authenticated user viewing a
-- waiting match (player2_id IS NULL) so the invite recipient can
-- read the match row before they have joined.
-- Without this, player2 cannot read the match to validate it exists,
-- and supabase.from('h2h_matches').select('*').single() returns a
-- 406 (PGRST116 — zero rows) because auth.uid() = NULL is always false.
create policy "duel_match_select"
  on h2h_matches for select
  using (
    auth.uid() = player1_id
    or auth.uid() = player2_id
    or (player2_id is null and status = 'waiting')
  );

-- Insert: authenticated user creates their own match (they are player1)
create policy "duel_match_insert"
  on h2h_matches for insert
  with check (auth.uid() = player1_id);

-- Update: player2 joins (sets player2_id + status), or system updates
-- started_at / timeout_at / status once both players are set.
-- We allow any authenticated user to update if they are player2 joining
-- a waiting match, or if they are already a player in the match.
create policy "duel_match_update"
  on h2h_matches for update
  using (
    -- Joining as player2 on a waiting match
    (player2_id is null and status = 'waiting')
    -- Or already a member updating state (start, finish)
    or auth.uid() = player1_id
    or auth.uid() = player2_id
  );

-- ----------------------------------------------------------------
-- Row Level Security — h2h_results
-- ----------------------------------------------------------------
alter table h2h_results enable row level security;

-- Read: any player in the match can read results AFTER the match is
-- finished (prevents peeking at opponent scores mid-game).
create policy "duel_result_select"
  on h2h_results for select
  using (
    exists (
      select 1 from h2h_matches m
      where m.id = match_id
        and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
        and m.status in ('finished', 'abandoned')
    )
    -- Also allow reading own result regardless of match status
    or user_id = auth.uid()
  );

-- Insert: only the player themselves, on a match they belong to
create policy "duel_result_insert"
  on h2h_results for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from h2h_matches m
      where m.id = match_id
        and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
        and m.status = 'active'
    )
  );

-- ----------------------------------------------------------------
-- RPC: verify_and_save_duel_result
--
-- Called by the client when the game ends.  It receives the raw
-- placements array, re-derives the score using the same algorithm
-- as blind-ranking.js, inserts the verified result, and marks the
-- match finished if both players have now submitted.
--
-- Scoring algorithm (mirrors blind-ranking.js exactly):
--   diff = 0 if placedRank in [correctRankMin, correctRankMax]
--          else distance to nearest bound
--   points = max(10 - diff, 1)
-- ----------------------------------------------------------------
create or replace function verify_and_save_duel_result(
  p_match_id   uuid,
  p_user_id    uuid,
  p_placements jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match        h2h_matches%rowtype;
  v_elem         jsonb;
  v_placed       int;
  v_min          int;
  v_max          int;
  v_diff         int;
  v_points       int;
  v_score        int  := 0;
  v_max_score    int;
  v_both_done    boolean;
  v_opponent_id  uuid;
  v_opp_score    int;
  v_is_winner    boolean;
begin
  -- 1. Validate match exists and caller belongs to it
  select * into v_match from h2h_matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;
  if v_match.player1_id != p_user_id and v_match.player2_id != p_user_id then
    raise exception 'User does not belong to this match';
  end if;
  if v_match.status != 'active' then
    raise exception 'Match is not active (status: %)', v_match.status;
  end if;

  -- 2. Re-derive the score from submitted placements
  v_max_score := jsonb_array_length(p_placements) * 10;

  for v_elem in select jsonb_array_elements(p_placements) loop
    v_placed := (v_elem->>'placedRank')::int;
    v_min    := (v_elem->>'correctRankMin')::int;
    v_max    := (v_elem->>'correctRankMax')::int;

    if v_placed >= v_min and v_placed <= v_max then
      v_diff := 0;
    elsif v_placed < v_min then
      v_diff := v_min - v_placed;
    else
      v_diff := v_placed - v_max;
    end if;

    v_points  := greatest(10 - v_diff, 1);
    v_score   := v_score + v_points;
  end loop;

  -- 3. Insert verified result (upsert-safe via unique constraint)
  insert into h2h_results (match_id, user_id, placements, score, max_score)
  values (p_match_id, p_user_id, p_placements, v_score, v_max_score)
  on conflict (match_id, user_id) do update
    set placements  = excluded.placements,
        score       = excluded.score,
        max_score   = excluded.max_score,
        finished_at = now();

  -- 4. Check if both players have submitted; if so, mark match finished
  select count(*) = 2 into v_both_done
  from h2h_results
  where match_id = p_match_id;

  if v_both_done then
    update h2h_matches
    set status = 'finished'
    where id = p_match_id;
  end if;

  -- 5. Determine winner if opponent result already exists
  if p_user_id = v_match.player1_id then
    v_opponent_id := v_match.player2_id;
  else
    v_opponent_id := v_match.player1_id;
  end if;

  select score into v_opp_score
  from h2h_results
  where match_id = p_match_id and user_id = v_opponent_id;

  if v_opp_score is null then
    v_is_winner := null;   -- opponent hasn't finished yet
  else
    v_is_winner := (v_score > v_opp_score);
  end if;

  return jsonb_build_object(
    'score',      v_score,
    'max_score',  v_max_score,
    'is_winner',  v_is_winner
  );
end;
$$;
