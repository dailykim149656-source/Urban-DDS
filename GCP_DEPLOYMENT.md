# Urban-DDS GCP Deployment

이 문서는 `GCP_DEPLOYMENT_PLAN.md` 기준으로 Cloud Run 배포를 바로 실행 가능한 상태로 정리한 가이드입니다.

## 1) 로컬 동작 확인

```bash
npm ci
npm run typecheck
npm run build
npm run start:standalone
```

## 2) Docker 이미지 빌드/실행 (로컬)

```bash
docker build -t urban-dds .
docker run --env-file .env.example -p 8080:8080 urban-dds
```

브라우저에서 `http://localhost:8080/api/region/summary?address=서울특별시`로 헬스/API 동작을 점검합니다.

## 3) GCP 준비(필수)

 - Cloud Run API / Cloud Build API / Artifact Registry API / Secret Manager API / Firestore API / Vertex AI API(aiplatform.googleapis.com) enable
- Artifact Registry 저장소 생성 (예: `urban-dds`)
- Secret Manager에 키 등록
  - `GEMINI_API_KEY`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY` (`\n` 포함 문자열 그대로 저장)

## 4) IAM 권장 권한

- Runtime SA: `urban-dds-runner`
  - `roles/datastore.user`
  - `roles/secretmanager.secretAccessor`
  - `roles/aiplatform.user` (Vertex 사용 시)
- Build SA: `urban-dds-builder`
  - `roles/run.admin`
  - `roles/artifactregistry.writer`
  - `roles/iam.serviceAccountUser`

## 5) Cloud Build 배포

`cloudbuild.yaml` 사용:

```bash
gcloud builds submit --config cloudbuild.yaml
```

파이프라인 내부에서
- `npm ci`
- `npm run typecheck`
- `npm run build`
- Docker build/push
- Cloud Run deploy
가 모두 동작합니다.

## 5) 수동 배포 대안

```bash
gcloud run deploy urban-dds-runner \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/urban-dds/urban-dds-runner:$SHORT_SHA \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,GEMINI_MODEL=gemini-2.5-flash,FIREBASE_USE_FIRESTORE=true \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-secrets FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest \
  --set-secrets FIREBASE_CLIENT_EMAIL=FIREBASE_CLIENT_EMAIL:latest \
  --set-secrets FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest \
  --service-account=urban-dds-runner@$PROJECT_ID.iam.gserviceaccount.com
```

## 6) 런타임 env 권장값

```env
NODE_ENV=production
GEMINI_MODEL=gemini-2.5-flash
FIREBASE_USE_FIRESTORE=true
```

Firestore 인증은 Cloud Run 기본 서비스 계정 ADC로 우선 사용하고,
필요 시 `.env` 기반의 `FIREBASE_*` 직접 자격증명으로 폴백됩니다.
