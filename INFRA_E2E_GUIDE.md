# Urban-DDS Infra E2E 구축 가이드 (GCP + Vertex AI + Firebase)

기준일: 2026-02-28  
대상: 현재 저장소(`Next.js + app/api + Firestore + Gemini`)를 처음부터 운영 가능한 상태로 구축

## 0) 먼저 결론: 사용자 인증 vs 애플리케이션 인증

1. **Gemini/Vertex AI**  
   - 현재 구조(서버 API에서 호출)는 **애플리케이션 인증**이 정답입니다.
2. **Firestore(firebase-admin)**  
   - 현재 구조(서버에서 admin SDK 사용)는 **애플리케이션 인증**이 정답입니다.
3. **사용자 인증이 필요한 경우**  
   - 브라우저에서 Firestore를 직접 읽고 쓸 때(Firebase Auth + Security Rules).

요약: 지금 프로젝트는 **둘 다 애플리케이션 인증**으로 가세요.

---

## 1) 사전 준비

1. 설치
   - `gcloud CLI`
   - `firebase CLI`(선택, 콘솔로만 진행하면 필수 아님)
   - `Node.js 22+`
2. 로그인

```bash
gcloud auth login
gcloud auth application-default login
```

3. 프로젝트/리전 변수 설정

```bash
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export SERVICE_NAME="urban-dds-runner"
export REPO_NAME="urban-dds"
```

PowerShell:

```powershell
$env:PROJECT_ID="your-project-id"
$env:REGION="us-central1"
$env:SERVICE_NAME="urban-dds-runner"
$env:REPO_NAME="urban-dds"
```

---

## 2) GCP 프로젝트 생성 및 API 활성화

```bash
gcloud config set project "$PROJECT_ID"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  iamcredentials.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com
```

검증:

```bash
gcloud services list --enabled | grep -E "run|cloudbuild|artifactregistry|secretmanager|aiplatform|firestore"
```

---

## 3) Firebase/Firestore 준비

1. Firebase Console에서 동일 `PROJECT_ID` 선택 후 Firebase 활성화  
2. Firestore Database 생성(Native mode)

CLI로 생성(선택):

```bash
gcloud firestore databases create --location="$REGION" --type=firestore-native
```

검증:

```bash
gcloud firestore databases describe --database="(default)" --location="$REGION"
```

---

## 4) 서비스 계정 및 IAM

현재 저장소 기준 권장 계정:

1. 런타임 SA: `urban-dds-runner@${PROJECT_ID}.iam.gserviceaccount.com`
2. 빌드 SA: `urban-dds-builder@${PROJECT_ID}.iam.gserviceaccount.com`

생성:

```bash
gcloud iam service-accounts create urban-dds-runner
gcloud iam service-accounts create urban-dds-builder
```

권한 부여:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:urban-dds-runner@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:urban-dds-runner@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:urban-dds-runner@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:urban-dds-builder@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:urban-dds-builder@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:urban-dds-builder@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

검증:

```bash
gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten="bindings[].members" \
  --format="table(bindings.role,bindings.members)" \
  --filter="bindings.members:urban-dds-runner OR bindings.members:urban-dds-builder"
```

---

## 5) Secret Manager 등록

필수 시크릿:

1. `GEMINI_API_KEY` (Google AI Studio 키를 쓸 때)
2. `FIREBASE_PROJECT_ID` (선택)
3. `FIREBASE_CLIENT_EMAIL` (선택)
4. `FIREBASE_PRIVATE_KEY` (선택)

주의:
- Cloud Run에서 **ADC를 사용하면** Firebase 2~4는 생략 가능
- 현재 코드의 Vertex 모드는 Cloud Run 메타데이터 토큰(ADC) 기반 호출

등록 예시:

```bash
echo -n "$GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=- \
  || echo -n "$GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

검증:

```bash
gcloud secrets list
gcloud secrets versions list GEMINI_API_KEY
```

---

## 6) 로컬 환경변수 설정

1. `.env.example`를 `.env.local`로 복사  
2. 현재 코드 기준 핵심 변수:

- 프론트
  - `NEXT_PUBLIC_API_BASE_URL` (비우면 same-origin API)
  - `NEXT_PUBLIC_DEFAULT_ADDRESS`
- Gemini/Vertex
  - `GEMINI_API_MODE=googleai` 또는 `vertex`
  - `GEMINI_MODEL`
  - `GEMINI_API_KEY` (googleai 모드)
  - `GOOGLE_CLOUD_PROJECT` (vertex 모드)
  - `VERTEX_LOCATION` (vertex 모드)
- Firestore
  - `FIREBASE_USE_FIRESTORE`
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (로컬에서 admin key 사용할 때)

로컬 확인(PowerShell):

```powershell
$required = @(
  "GEMINI_API_MODE","GEMINI_MODEL","FIREBASE_USE_FIRESTORE","NEXT_PUBLIC_DEFAULT_ADDRESS"
)
foreach ($key in $required) {
  if ([string]::IsNullOrWhiteSpace((Get-ChildItem Env:$key -ErrorAction SilentlyContinue).Value)) {
    Write-Host "MISSING: $key"
  } else {
    Write-Host "OK: $key"
  }
}
```

---

## 7) 로컬 실행 및 기능 검증

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

브라우저:

- `http://localhost:3000`
- 주소 입력 -> 지역 조회 -> Gemini 분석 실행

API 검증:

```bash
curl -s http://localhost:3000/api/health
curl -s "http://localhost:3000/api/region/summary?address=%EC%84%9C%EC%9A%B8"
curl -s -X POST http://localhost:3000/api/analysis/report \
  -H "Content-Type: application/json" \
  -d '{"regionCode":"gangnam-daechi","metrics":{"agingScore":82,"infraRisk":74,"marketScore":68,"policyFit":77}}'
```

---

## 8) Cloud Run 배포 (이 저장소 기준)

현재 저장소에는 배포 파일이 준비되어 있습니다.

1. `next.config.js` (`output: 'standalone'`)
2. `Dockerfile`
3. `cloudbuild.yaml`
4. `scripts/deploy-gcp.sh`

배포:

```bash
./scripts/deploy-gcp.sh "$PROJECT_ID" "$REGION" "$SERVICE_NAME" "$REPO_NAME" "latest" "urban-dds-builder"
```

배포 후 URL 확인:

```bash
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)'
```

---

## 9) Cloud Run 환경변수/시크릿 연결 확인 방법

환경변수 확인:

```bash
gcloud run services describe "$SERVICE_NAME" --region "$REGION" \
  --format="flattened(spec.template.spec.containers[0].env[])"
```

서비스 계정 확인:

```bash
gcloud run services describe "$SERVICE_NAME" --region "$REGION" \
  --format="value(spec.template.spec.serviceAccountName)"
```

원격 스모크:

```bash
BASE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')"
./scripts/smoke-test-gcp.sh "$BASE_URL"
```

---

## 10) Vertex AI 모드 체크포인트

현재 코드(`lib/services/gemini.ts`) 동작 특성:

1. `GEMINI_API_MODE=vertex`면 Vertex 호출 시도
2. Vertex 호출은 Cloud Run 메타데이터 토큰(ADC) 기반
3. Vertex 실패 시 Google AI key 모드로 fallback 가능

따라서 실전 권장:

1. Cloud Run에서 `GEMINI_API_MODE=vertex`
2. 런타임 SA에 `roles/aiplatform.user` 부여
3. `GOOGLE_CLOUD_PROJECT`, `VERTEX_LOCATION` 설정
4. 필요하면 `GEMINI_API_KEY`는 fallback 용도로만 유지

---

## 11) 자주 발생하는 문제

1. `Invalid request body`
   - `Content-Type: application/json` 누락 또는 JSON 포맷 오류
2. Firestore 저장 안 됨
   - `FIREBASE_USE_FIRESTORE=true`인지 확인
   - Cloud Run SA의 `roles/datastore.user` 확인
3. Vertex 호출 실패
   - `GEMINI_API_MODE=vertex` + `GOOGLE_CLOUD_PROJECT` + `VERTEX_LOCATION` 확인
   - 런타임 SA `roles/aiplatform.user` 확인
4. Cloud Run 기동 실패
   - `Dockerfile`/`standalone` 경로 확인
   - 빌드 로그에서 `.next/standalone/server.js` 생성 확인

---

## 12) 최종 체크리스트

1. GCP APIs 활성화 완료
2. Firestore 생성 완료
3. SA/IAM 설정 완료
4. Secret 등록 완료
5. `.env.local` 검증 완료
6. 로컬 `typecheck/lint/build` 통과
7. Cloud Run 배포 성공
8. 원격 스모크 테스트 성공
9. Frontend에서 조회 -> 분석 -> 결과 확인 성공

---

## 공식 참고 문서

1. Vertex AI 모델/버전: https://cloud.google.com/vertex-ai/generative-ai/docs/models  
2. Vertex AI 인증(ADC): https://cloud.google.com/docs/authentication/provide-credentials-adc  
3. Firestore 생성/관리: https://cloud.google.com/firestore/docs/create-database-server-client-library  
4. Firebase Admin SDK setup: https://firebase.google.com/docs/admin/setup  
5. Secret Manager: https://cloud.google.com/secret-manager/docs/create-secret-quickstart  
6. Cloud Run 배포: https://cloud.google.com/run/docs/deploying  
