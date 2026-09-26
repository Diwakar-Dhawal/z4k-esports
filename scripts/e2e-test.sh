#!/usr/bin/env bash
# E2E suite — staff auth via the manager demo account (setup/teardown only).
# Registrations run through the ANON key exactly like real users.
set -a; source "$(dirname "$0")/../.env.local" 2>/dev/null; set +a
BASE="${NEXT_PUBLIC_SUPABASE_URL%/}"
AK="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
EP="$BASE/rest/v1/rpc/register_team"
PASS=0; FAIL=0

STAFF_TOKEN=$(curl -s "$BASE/auth/v1/token?grant_type=password" -X POST \
  -H "apikey: $AK" -H "Content-Type: application/json" \
  -d '{"email":"z4k.manager.demo@gmail.com","password":"Z4kDemo!2026"}' \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
if [ -z "$STAFF_TOKEN" ]; then echo "ERROR: manager login failed"; exit 1; fi
echo "staff auth: OK"

json_rpc() { # tid team wa u1 u2 u3 u4 [guest] [force]
  curl -s "$EP" -X POST -H "apikey: $AK" -H "Content-Type: application/json" -d "{
    \"p_tournament_id\":\"$1\",\"p_team_name\":\"$2\",\"p_team_tag\":\"T\",
    \"p_whatsapp\":\"$3\",
    \"p_players\":[
      {\"ign\":\"P1\",\"uid\":\"$4\",\"player_role\":\"IGL\",\"sort_order\":0},
      {\"ign\":\"P2\",\"uid\":\"$5\",\"player_role\":null,\"sort_order\":1},
      {\"ign\":\"P3\",\"uid\":\"$6\",\"player_role\":null,\"sort_order\":2},
      {\"ign\":\"P4\",\"uid\":\"$7\",\"player_role\":null,\"sort_order\":3}],
    \"p_agree_rules\":true,
    \"p_guest_name\":\"${8:-Guest Captain}\",
    \"p_verified_names\":{},
    \"p_force_review\":${9:-false}}"
}

check() { # name expected_substring actual
  if echo "$3" | grep -q "$2"; then echo "PASS  $1"; PASS=$((PASS+1));
  else echo "FAIL  $1 → $(echo "$3" | head -c 140)"; FAIL=$((FAIL+1)); fi
}

echo "=== setup scratch tournament (service role; auto-approve, 3 slots) ==="
TID=$(curl -s "$BASE/rest/v1/tournaments" -X POST -H "apikey: $AK" -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{
    "slug":"z4k-race-test-'$RANDOM'","name":"Z4K Race Test","game":"BGMI (test)",
    "team_size":4,"substitutes_max":0,"max_teams":3,"auto_approve":true,
    "registration_starts_at":"2026-01-01T00:00:00Z","registration_ends_at":"2027-01-01T00:00:00Z"
  }' | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
if [ -z "$TID" ]; then echo "FAIL  could not create scratch tournament"; exit 1; fi
echo "scratch tournament: $TID"

echo "=== 1. guest registration (auto-approve → returns registration uuid) ==="
R=$(json_rpc "$TID" "Alpha Squad" "9100000001" 8100000001 8100000002 8100000003 8100000004 "Cap Alpha")
if echo "$R" | grep -q '^"[0-9a-f-]\{36\}"$'; then echo "PASS  guest reg returned registration id"; PASS=$((PASS+1));
else echo "FAIL  guest reg → $R"; FAIL=$((FAIL+1)); fi

echo "=== 2. duplicate WhatsApp rejected ==="
R=$(json_rpc "$TID" "Beta Squad" "9100000001" 8100000011 8100000012 8100000013 8100000014 "Cap Beta")
check "DUPLICATE_WHATSAPP" "DUPLICATE_WHATSAPP" "$R"

echo "=== 3. duplicate UID rejected ==="
R=$(json_rpc "$TID" "Gamma Squad" "9100000002" 8100000001 8100000022 8100000023 8100000024 "Cap Gamma")
check "DUPLICATE_UID" "DUPLICATE_UID" "$R"

echo "=== 4. missing guest name rejected ==="
R=$(curl -s "$EP" -X POST -H "apikey: $AK" -H "Content-Type: application/json" -d "{
  \"p_tournament_id\":\"$TID\",\"p_team_name\":\"Delta\",\"p_team_tag\":\"T\",
  \"p_whatsapp\":\"9100000003\",
  \"p_players\":[{\"ign\":\"D1\",\"uid\":\"8100000031\",\"player_role\":null,\"sort_order\":0},
                 {\"ign\":\"D2\",\"uid\":\"8100000032\",\"player_role\":null,\"sort_order\":1},
                 {\"ign\":\"D3\",\"uid\":\"8100000033\",\"player_role\":null,\"sort_order\":2},
                 {\"ign\":\"D4\",\"uid\":\"8100000034\",\"player_role\":null,\"sort_order\":3}],
  \"p_agree_rules\":true,\"p_verified_names\":{}}")
check "GUEST_NAME_REQUIRED" "GUEST_NAME_REQUIRED" "$R"

echo "=== 5. race test: 8 parallel registrations, 2 slots left ==="
for i in 1 2 3 4 5 6 7 8; do
  wa="920000000$i"; uid1="820000000$i"; uid2="830000000$i"; uid3="840000000$i"; uid4="850000000$i"
  json_rpc "$TID" "Race Team $i" "$wa" "$uid1" "$uid2" "$uid3" "$uid4" "Race Cap $i" > "/tmp/race-$i.json" &
done
wait
wins=0; fulls=0; other=0
for i in 1 2 3 4 5 6 7 8; do
  body=$(cat "/tmp/race-$i.json")
  if echo "$body" | grep -q '^"[0-9a-f-]\{36\}"$'; then wins=$((wins+1));
  elif echo "$body" | grep -q 'FULL'; then fulls=$((fulls+1));
  else other=$((other+1)); echo "  unexpected[$i]: $(echo "$body" | head -c 140)"; fi
done
echo "wins=$wins fulls=$fulls other=$other (expect 2 / 6 / 0)"
if [ "$wins" -eq 2 ] && [ "$fulls" -eq 6 ] && [ "$other" -eq 0 ]; then
  echo "PASS  race condition: exactly 2 granted, zero overbooking"; PASS=$((PASS+1));
else echo "FAIL  race outcome wrong"; FAIL=$((FAIL+1)); fi

echo "=== cleanup: delete scratch tournament (cascades registrations) ==="
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/rest/v1/tournaments?id=eq.$TID" -X DELETE \
  -H "apikey: $AK" -H "Authorization: Bearer $STAFF_TOKEN")
echo "delete status: $code"

echo ""
echo "======================================"
echo "RESULT: $PASS passed, $FAIL failed"
echo "======================================"
