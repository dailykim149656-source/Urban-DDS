# Urban-DDS GCP 배포/환경설정 가이드

기준일: 2026-02-28  
대상: 현재 저장소 기준(`cloudbuild.yaml`, `scripts/deploy-gcp.sh`, GitHub Actions 워크플로우 포함)

## 1) 이 문서로 할 수 있는 것

1. GCP 프로젝트 초기 설정
2. Cloud Run 배포 인프라 구성
3. Secret Manager/환경변수 연결
4. 로컬/원격 동작 검증
5. GitHub Actions 자동 배포 연결

---

## 2) 사전 준비

1. `gcloud` 설치 및 로그인
2. GCP 프로젝트 생성 + 결제 연결
3. 로컬에 Node.js 22+ 설치

PowerShell:

```powershell
gcloud auth login
gcloud auth application-default login
```

---

## 3) 프로젝트 기본 변수 설정

PowerShell:

```powershell
$env:PROJECT_ID = "your-gcp-project-id"
$env:REGION = "us-central1"
$env:SERVICE_NAME = "urban-dds-runner"
$env:AR_REPO = "urban-dds"
$env:BUILDER_SERVICE = "urban-dds-builder"
```

프로젝트 지정:

```powershell
gcloud config set project $env:PROJECT_ID
```

---

## 4) 필수 API 활성화

```powershell
gcloud services enable `
  run.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  firestore.googleapis.com `
  logging.googleapis.com `
  monitoring.googleapis.com `
  aiplatform.googleapis.com
```

확인:

```powershell
gcloud services list --enabled
```

---

## 5) 서비스 계정 및 권한

현재 스크립트 기준 역할:

1. 런타임: `${SERVICE_NAME}@${PROJECT_ID}.iam.gserviceaccount.com`
2. 빌더: `${BUILDER_SERVICE}@${PROJECT_ID}.iam.gserviceaccount.com`

권장 권한:

1. 런타임 SA
   - `roles/datastore.user`
   - `roles/secretmanager.secretAccessor`
   - (Vertex 사용 시) `roles/aiplatform.user`
2. 빌더 SA
   - `roles/run.admin`
   - `roles/artifactregistry.writer`
   - `roles/iam.serviceAccountUser`

참고: 이 저장소의 `scripts/deploy-gcp.sh`가 대부분 자동으로 생성/부여합니다.

---

## 6) Secret Manager 등록

## 필수/권장 시크릿

1. `GEMINI_API_KEY` (Google AI 모드 사용 시)
2. `FIREBASE_PROJECT_ID` (선택)
3. `FIREBASE_CLIENT_EMAIL` (선택)
4. `FIREBASE_PRIVATE_KEY` (선택)

PowerShell 등록 예시:

```powershell
$env:GEMINI_API_KEY = "your-real-key"
$env:FIREBASE_PROJECT_ID = "your-firebase-project-id"
$env:FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"
$env:FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----`n...`n-----END PRIVATE KEY-----`n"
```

`deploy-gcp.sh` 실행 시 위 값이 있으면 시크릿을 생성/갱신합니다.

확인:

```powershell
gcloud secrets list
gcloud secrets versions list GEMINI_API_KEY
```

---

## 7) 로컬 환경변수 준비

`.env.example`를 기준으로 `.env.local` 작성:

```powershell
Copy-Item .env.example .env.local
```

핵심 변수:

1. Frontend
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_DEFAULT_ADDRESS`
2. Gemini/Vertex
   - `GEMINI_API_MODE` (`googleai` 또는 `vertex`)
   - `GEMINI_MODEL` (`기본값: gemini-2.5-flash`)
   - `GEMINI_API_KEY`
   - `GOOGLE_CLOUD_PROJECT`
   - `VERTEX_LOCATION`
3. Firebase
   - `FIREBASE_USE_FIRESTORE`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

---

## 8) 배포 방법 A (권장): 스크립트 1회 실행

PowerShell:

```powershell
bash scripts/deploy-gcp.sh $env:PROJECT_ID $env:REGION $env:SERVICE_NAME $env:AR_REPO "latest" $env:BUILDER_SERVICE
```

이 스크립트가 수행하는 작업:

1. 필요한 API 활성화
2. Artifact Registry/서비스계정 생성
3. IAM 권한 부여
4. Cloud Build 트리거
5. Cloud Run 배포
6. 배포 후 스모크 테스트 실행

---

## 9) 배포 방법 B: Cloud Build 수동 실행

```powershell
gcloud builds submit `
  --config cloudbuild.yaml `
  --substitutions _REGION="$env:REGION",_AR_REPO="$env:AR_REPO",_SERVICE_NAME="$env:SERVICE_NAME",_SERVICE_ACCOUNT="$env:SERVICE_NAME@$env:PROJECT_ID.iam.gserviceaccount.com",_IMAGE_TAG="manual-$(Get-Date -Format yyyyMMddHHmmss)"
```

---

## 10) 배포 확인

서비스 URL 확인:

```powershell
$serviceUrl = gcloud run services describe $env:SERVICE_NAME --region $env:REGION --format "value(status.url)"
$serviceUrl
```

스모크 테스트:

```powershell
bash scripts/smoke-test-gcp.sh $serviceUrl
```

헬스 체크 수동:

```powershell
curl "$serviceUrl/api/health"
```

---

## 11) GitHub Actions 자동 배포 설정

워크플로우 파일:

- `.github/workflows/gcp-cloud-build.yml`

필요한 Repository Variables / Secrets:

1. `GCP_WIF_PROVIDER`
2. `GCP_WIF_SERVICE_ACCOUNT`
3. `GCP_REGION` (선택, 기본 `us-central1`)
4. `GCP_RUNNER_SERVICE_NAME` (선택, 기본 `urban-dds-runner`)
5. `GCP_ARTIFACT_REPOSITORY` (선택, 기본 `urban-dds`)
6. `GCP_RUNNER_SERVICE_ACCOUNT` (선택, 미지정 시 자동 추론)

`main` 브랜치 push 시 Cloud Build -> Cloud Run -> smoke test가 실행됩니다.

---

## 12) 문제 해결 가이드

1. `403 Permission denied` (Firestore/Secret/Vertex)
   - 런타임 SA 권한 확인 (`datastore.user`, `secretmanager.secretAccessor`, `aiplatform.user`)
2. `Secret not found`
   - `gcloud secrets list`로 존재 확인
   - `deploy-gcp.sh` 실행 전에 로컬 환경변수 값이 비어있지 않은지 확인
3. `analysis/report`는 되는데 Firestore 저장이 안 됨
   - `FIREBASE_USE_FIRESTORE=true` 여부 확인
   - `/api/health`의 `firestoreEnabled` 확인
4. Vertex 모드가 동작하지 않음
   - `GEMINI_API_MODE=vertex`
   - `GOOGLE_CLOUD_PROJECT`, `VERTEX_LOCATION` 값 확인
   - 런타임 SA에 `roles/aiplatform.user`

---

## 13) 롤백 방법

Cloud Run 이전 리비전으로 트래픽 전환:

```powershell
gcloud run revisions list --service $env:SERVICE_NAME --region $env:REGION
gcloud run services update-traffic $env:SERVICE_NAME --region $env:REGION --to-revisions REVISION_NAME=100
```

---

## 14) 빠른 체크리스트

1. `gcloud auth login` 완료
2. 필수 API 활성화 완료
3. SA/IAM 구성 완료
4. Secret 등록 완료
5. `bash scripts/deploy-gcp.sh ...` 성공
6. `/api/health` + smoke test 통과

