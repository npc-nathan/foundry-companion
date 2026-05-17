#!/bin/bash
# Relay API smoke tests - runs against a running dev server
# Usage: ./scripts/test-relay.sh [base_url]
#   base_url: defaults to http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0
FAILURES=""

green() { echo -e "\033[32m$1\033[0m"; }
red() { echo -e "\033[31m$1\033[0m"; }
bold() { echo -e "\033[1m$1\033[0m"; }

check() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local expect_status="${4:-200}"
  local body="$5"

  local response
  local status

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -o /tmp/relay_test_tmp "$BASE_URL$endpoint" \
      -H "x-api-key: test-key" \
      -H "x-client-id: test-client" \
      -H "Content-Type: application/json" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -o /tmp/relay_test_tmp "$BASE_URL$endpoint" \
      -H "x-api-key: test-key" \
      -H "x-client-id: test-client" \
      -H "Content-Type: application/json" \
      -d "${body:-}" 2>/dev/null)
  fi

  status=$(tail -1 /tmp/relay_test_tmp)
  content=$(cat /tmp/relay_test_tmp)

  if [ "$status" = "$expect_status" ]; then
    green "  PASS: $name (HTTP $status)"
    PASS=$((PASS + 1))
  else
    red "  FAIL: $name (expected $expect_status, got $status)"
    red "    Response: $(echo "$content" | head -c 200)"
    FAIL=$((FAIL + 1))
    FAILURES="$FAILURES\n  - $name"
  fi
}

bold "=== Foundry Companion Relay API Smoke Tests ==="
bold "Server: $BASE_URL"
echo ""

# ── Health check ──
bold "[Health]"
check "Health endpoint" "GET" "/api/relay/api/health"
check "Health returns 200" "GET" "/api/relay/api/health"

# ── Structure endpoints ──
bold "[World Structure]"
check "World structure" "GET" "/api/relay/structure?types=Actor,Scene,Item"
check "World structure (all types)" "GET" "/api/relay/structure?types=Actor,Scene,Item,JournalEntry,RollTable&recursive=true"

# ── Search endpoints ──
bold "[Search]"
check "Search actors" "GET" "/api/relay/search?query=test&type=Actor"
check "Search items" "GET" "/api/relay/search?query=test&type=Item"

# ── Scene endpoints ──
bold "[Scenes]"
check "List scenes" "GET" "/api/relay/structure?types=Scene&includeEntityData=true"

# ── Actor endpoints ──
bold "[Actors]"
check "List actors" "GET" "/api/relay/structure?types=Actor&includeEntityData=true"

# ── Chat endpoints ──
bold "[Chat]"
check "Get chat messages" "GET" "/api/relay/chat?limit=5"

# ── Roll endpoints ──
bold "[Rolls]"
check "Get rolls" "GET" "/api/relay/rolls?limit=5"

# ── Combat endpoints ──
bold "[Combat]"
check "Get encounters" "GET" "/api/relay/encounters"

# ── Client endpoints ──
bold "[Clients]"
check "Get clients" "GET" "/api/relay/clients"
check "Get users" "GET" "/api/relay/users"

# ── World info ──
bold "[World Info]"
check "Get world info" "GET" "/api/relay/world-info"

# ── Macros ──
bold "[Macros]"
check "Get macros" "GET" "/api/relay/macros"

# ── Journal endpoints ──
bold "[Journals]"
check "Get journals" "GET" "/api/relay/structure?types=JournalEntry&includeEntityData=true&recursive=true"

echo ""
bold "=== Results ==="
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  red "  Failures:$FAILURES"
  exit 1
fi
echo ""
green "All relay API smoke tests passed!"
