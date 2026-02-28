#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${1:?Usage: scripts/deploy-gcp.sh <project-id>}"
REGION="${2:-us-central1}"
RUNNER_SERVICE="${3:-urban-dds-runner}"
REPOSITORY="${4:-urban-dds}"
IMAGE_TAG="${5:-latest}"
BUILDER_SERVICE="${6:-urban-dds-builder}"
RUN_SMOKE_TEST="${RUN_SMOKE_TEST:-1}"

RUNNER_SERVICE_ACCOUNT="${RUNNER_SERVICE}@${PROJECT_ID}.iam.gserviceaccount.com"
BUILDER_SERVICE_ACCOUNT="${BUILDER_SERVICE}@${PROJECT_ID}.iam.gserviceaccount.com"

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name"
    exit 1
  fi
}

require_command gcloud

if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" | grep -q .; then
  echo "No active gcloud account found. Run 'gcloud auth login' first."
  exit 1
fi

gcloud config set project "$PROJECT_ID"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Urban-DDS image repository"

gcloud iam service-accounts describe "$RUNNER_SERVICE_ACCOUNT" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$RUNNER_SERVICE" \
    --project="$PROJECT_ID" \
    --display-name="Urban-DDS Cloud Run runtime"

gcloud iam service-accounts describe "$BUILDER_SERVICE_ACCOUNT" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$BUILDER_SERVICE" \
    --project="$PROJECT_ID" \
    --display-name="Urban-DDS Cloud Build deployer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNNER_SERVICE_ACCOUNT" \
  --role="roles/datastore.user" >/dev/null || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNNER_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" >/dev/null || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNNER_SERVICE_ACCOUNT" \
  --role="roles/aiplatform.user" >/dev/null || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$BUILDER_SERVICE_ACCOUNT" \
  --role="roles/run.admin" >/dev/null || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$BUILDER_SERVICE_ACCOUNT" \
  --role="roles/artifactregistry.writer" >/dev/null || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$BUILDER_SERVICE_ACCOUNT" \
  --role="roles/iam.serviceAccountUser" >/dev/null || true

if [ -n "${GEMINI_API_KEY:-}" ]; then
  echo "Creating/updating secret: GEMINI_API_KEY"
  printf '%s' "$GEMINI_API_KEY" | \
    gcloud secrets create GEMINI_API_KEY --data-file=- 2>/dev/null || \
    gcloud secrets versions add GEMINI_API_KEY --data-file=<(printf '%s' "$GEMINI_API_KEY")
fi

if [ -n "${FIREBASE_PROJECT_ID:-}" ] && [ -n "${FIREBASE_CLIENT_EMAIL:-}" ] && [ -n "${FIREBASE_PRIVATE_KEY:-}" ]; then
  echo "Creating/updating secrets: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
  printf '%s' "$FIREBASE_PROJECT_ID" | \
    gcloud secrets create FIREBASE_PROJECT_ID --data-file=- 2>/dev/null || \
    gcloud secrets versions add FIREBASE_PROJECT_ID --data-file=<(printf '%s' "$FIREBASE_PROJECT_ID")
  printf '%s' "$FIREBASE_CLIENT_EMAIL" | \
    gcloud secrets create FIREBASE_CLIENT_EMAIL --data-file=- 2>/dev/null || \
    gcloud secrets versions add FIREBASE_CLIENT_EMAIL --data-file=<(printf '%s' "$FIREBASE_CLIENT_EMAIL")
  printf '%s' "$FIREBASE_PRIVATE_KEY" | \
    gcloud secrets create FIREBASE_PRIVATE_KEY --data-file=- 2>/dev/null || \
    gcloud secrets versions add FIREBASE_PRIVATE_KEY --data-file=<(printf '%s' "$FIREBASE_PRIVATE_KEY")
fi

echo "Submit Cloud Build with substitutions:"
echo "  REGION=$REGION"
echo "  REPOSITORY=$REPOSITORY"
echo "  SERVICE=$RUNNER_SERVICE"
echo "  IMAGE_TAG=$IMAGE_TAG"

gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION="$REGION",_AR_REPO="$REPOSITORY",_SERVICE_NAME="$RUNNER_SERVICE",_SERVICE_ACCOUNT="$RUNNER_SERVICE_ACCOUNT",_IMAGE_TAG="$IMAGE_TAG" .

echo "Cloud Build + Cloud Run deployment triggered."
echo "Service: $RUNNER_SERVICE"

if [ "${RUN_SMOKE_TEST,,}" != "1" ] && \
   [ "${RUN_SMOKE_TEST,,}" != "true" ] && \
   [ "${RUN_SMOKE_TEST,,}" != "yes" ]; then
  echo "Smoke test skipped by RUN_SMOKE_TEST=${RUN_SMOKE_TEST}."
  exit 0
fi

SERVICE_URL=""
for i in 1 2 3 4 5; do
  SERVICE_URL="$(gcloud run services describe "$RUNNER_SERVICE" --region="$REGION" --platform=managed --format='value(status.url)' || true)"
  if [ -n "$SERVICE_URL" ]; then
    break
  fi
  echo "Waiting for Cloud Run service URL... (${i}/5)"
  sleep 5
done

if [ -z "$SERVICE_URL" ]; then
  echo "Unable to resolve deployed service URL; skipping smoke test."
  exit 0
fi

bash scripts/smoke-test-gcp.sh "$SERVICE_URL"
echo "Smoke test passed."
