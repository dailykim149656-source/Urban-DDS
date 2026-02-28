# Urban-DDS

Urban-DDS는 Next.js App Router 기반의 도시정비 의사결정 지원 시스템입니다.
현재 프론트엔드 대시보드 + 백엔드 API가 같은 프로젝트에 포함되어 있습니다.

## 주요 기능

- Frontend dashboard
  - 주소 기반 지역 조회
  - 점수 카드(노후도/인프라/시장성/정책적합)
  - Gemini 기반 정책 분석 결과 출력
- API routes
  - `GET /api/health`
  - `GET /api/region/summary?address=...`
  - `GET /api/region/metrics?regionCode=...`
  - `POST /api/analysis/report` (Google OAuth login required)
    - Payload: `{ "regionCode": "...", "regionId": "...", "metrics": { ... } }`
    - `regionCode` is the preferred identifier; `regionId` can be sent as a compatibility fallback.
  - `POST /api/analysis/document` (`?format=json` for raw JSON)
  - `GET /api/analysis/reports` (Google OAuth login required, user-scoped list, `?limit=10`)

## Local 실행

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run lint
npm run build
# Run production-style mode
npm run start:standalone

# or for development
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 환경변수

샘플은 `.env.example` 참고

- Frontend
  - `NEXT_PUBLIC_API_BASE_URL` (비우면 same-origin `/api/*` 사용)
  - `NEXT_PUBLIC_DEFAULT_ADDRESS`
- Auth (Google OAuth)
  - `AUTH_SECRET` (or `NEXTAUTH_SECRET`)
  - `NEXTAUTH_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- LLM
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
- Public Data (data.go.kr)
  - `REALDATA_ENABLED`
  - `DATA_GO_KR_SERVICE_KEY`
  - `DATA_GO_KR_TIMEOUT_MS`
  - `DATA_GO_KR_BUILDING_ENDPOINT`
  - `DATA_GO_KR_APT_TRADE_ENDPOINT`
- Firestore
  - `FIREBASE_USE_FIRESTORE`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - If Firebase secrets are not present, deployment still succeeds and the app tries ADC (Cloud Run service account) when `FIREBASE_USE_FIRESTORE=true`.

## GCP 배포 (Cloud Run)

- standalone build 기반:
  - `next.config.js` (`output: 'standalone'`)
  - `Dockerfile`
  - `cloudbuild.yaml`
  - `.github/workflows/gcp-cloud-build.yml`
  - `scripts/deploy-gcp.sh`

### One-command deployment

```bash
./scripts/deploy-gcp.sh <gcp-project-id> [REGION] [RUNNER_SERVICE] [ARTIFACT_REPOSITORY] [IMAGE_TAG] [BUILDER_SERVICE]
```

### Smoke test

```bash
./scripts/smoke-test-gcp.sh <base-url>
```

### GitHub Actions deployment

`.github/workflows/gcp-cloud-build.yml` runs on `main` push and runs Cloud Build with:

- `_REGION`
- `_AR_REPO`
- `_SERVICE_NAME`
- `_SERVICE_ACCOUNT`
- `_IMAGE_TAG` (typically `github.sha`)

Set these repository variables/secrets:

- `GCP_WIF_PROVIDER`
- `GCP_WIF_SERVICE_ACCOUNT`
- `GCP_REGION` (optional, default `us-central1`)
- `GCP_RUNNER_SERVICE_NAME` (optional, default `urban-dds-runner`)
- `GCP_RUNNER_SERVICE` (optional legacy alias)
- `GCP_ARTIFACT_REPOSITORY` (optional, default `urban-dds`)
- `GCP_RUNNER_SERVICE_ACCOUNT` (optional; can be provided as variable or secret)

Additional optional controls:

- `RUN_SMOKE_TEST` (set to `0|false|no` to skip in `scripts/deploy-gcp.sh`)

The workflow also performs a post-deploy remote smoke check by executing:
- `scripts/smoke-test-gcp.sh <service-url>`

## Desktop (Electron)

Desktop builds use the already-existing Next.js standalone output.

```bash
npm run desktop:start
```

- Builds the app, starts the embedded Next.js server, and opens the Electron window.
- Use `Ctrl/Cmd + R` in the app window for hard refresh.

```bash
npm run desktop:pack
```

- Builds the app and packages installers for:
  - Windows: NSIS (`.exe`)
  - macOS: DMG (`.dmg`)
  - Linux: AppImage

Build artifacts are emitted to `dist/`.

Notes:
- If your environment depends on external keys, copy `.env.example` to `.env.local` before packaging/running.
- Keep secrets in platform-specific secure storage before production distribution.

Troubleshooting:
- If desktop validation exits with `spawn EPERM` during startup:
  - The sandboxed environment here blocks Node.js worker-process spawning for both `next build` and `next dev`.
  - Re-run on a normal local terminal (CMD/PowerShell) outside this constrained environment.
  - If it still happens locally, verify:
    - Windows security/antivirus policy is not blocking `node.exe`/`fork`.
    - `node_modules` is fully writable and not marked read-only.
    - Running as current user with normal shell rights.
  - Re-run this sequence after fixing:
    - `npm install`
    - `npm run build`
    - `npm run desktop:start`
- For a step-by-step failure triage (EPERM/EACCES/URL parse), use:
  - `DESKTOP_ELECTRON_TROUBLESHOOTING_2026-02-28.md`

Desktop helper scripts:
- `npm run desktop:build`: build only
- `npm run desktop:run`: launch Electron only (requires `.next/standalone/server.js` present)
