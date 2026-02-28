#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:?Usage: scripts/smoke-test-gcp.sh <base_url>}"

check() {
  local target="$1"
  local label="$2"
  echo "Checking ${label}: ${target}"
  curl -sS --fail --max-time 20 "${target}"
}

check "${BASE_URL}/api/health" "health"
check "${BASE_URL}/api/region/summary?address=%EC%84%9C%EC%9A%B8" "region summary"
check "${BASE_URL}/api/region/metrics?regionCode=seoul" "region metrics"

echo "Smoke test payload:"
cat <<'JSON'
{
  "regionCode": "gangnam-daechi",
  "metrics": {
    "agingScore": 82,
    "infraRisk": 74,
    "marketScore": 68,
    "policyFit": 77
  }
}
JSON

curl -sS --fail --max-time 20 -X POST "${BASE_URL}/api/analysis/report" \
  -H "Content-Type: application/json" \
  -d '{
    "regionCode": "gangnam-daechi",
    "metrics": {
      "agingScore": 82,
      "infraRisk": 74,
      "marketScore": 68,
      "policyFit": 77
    }
  }'

curl -sS --fail --max-time 20 "${BASE_URL}/api/analysis/reports?limit=5"

curl -sS --fail --max-time 20 "${BASE_URL}/api/analysis/document?format=json" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "regionCode": "gangnam-daechi",
    "metrics": {
      "agingScore": 82,
      "infraRisk": 74,
      "marketScore": 68,
      "policyFit": 77
    }
  }'
