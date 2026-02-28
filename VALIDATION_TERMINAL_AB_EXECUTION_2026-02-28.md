# Urban-DDS 문서 대조 검증 + Terminal A/B 실행안 (검증 전담 포함)

기준일: 2026-02-28  
검증자(본 문서 작성): Codex (검증 전담)  
검증 방식: 문서(`*.md`)와 현재 파일 구조/구현의 정적 대조 (실행 테스트 미포함)

## 1) 검토 범위

문서 파일(텍스트):
- `README.md`
- `HACKATHON_ROADMAP.md`
- `PARALLEL_EXECUTION_PLAN.md`
- `TERMINAL_AB_SPLIT_2026-02-28.md`
- `CODE_REVIEW_2026-02-28.md`
- `VALIDATION_AND_NEXT_STEPS_2026-02-28.md`
- `FIREBASE_INFRA_IMPLEMENTATION.md`
- `GCP_DEPLOYMENT_PLAN.md`
- `GCP_DEPLOYMENT.md`
- `GCP_DEPLOYMENT_SETUP_GUIDE.md`
- `INFRA_E2E_GUIDE.md`
- `VERTEX_AI_GEMINI_ANALYSIS_PLAN.md`

구조/구현 대조 파일(핵심):
- `app/**`, `lib/**`, `types/**`
- `package.json`, `next.config.js`, `Dockerfile`, `cloudbuild.yaml`, `.env.example`
- `.github/workflows/gcp-cloud-build.yml`
- `scripts/deploy-gcp.sh`, `scripts/smoke-test-gcp.sh`
- `.gitignore`

참고:
- `주제논의_*.pptx`, `Urban-DDS_ AI 도시정비 의사결정 지원 시스템.zip`은 바이너리 문서로 내용 검토 범위에서 제외.
- 확장자 없는 `Urban-DDS_ AI 도시정비 의사결정 지원 시스템` 파일은 ZIP 포맷 바이너리로 확인됨.

## 2) 현재 구조 기준 적용 상태

### 적용 완료 (문서 내용과 현재 구현이 일치)

1. App Router 기본 구조 복구 완료
- `app/layout.tsx` 존재
- `app/page.tsx` 대시보드 UI 구현

2. README 명시 API 구현 완료
- `GET /api/health` -> `app/api/health/route.ts`
- `GET /api/region/summary` -> `app/api/region/summary/route.ts`
- `GET /api/region/metrics` -> `app/api/region/metrics/route.ts`
- `POST /api/analysis/report` -> `app/api/analysis/report/route.ts`
- `POST /api/analysis/document` -> `app/api/analysis/document/route.ts`
- `GET /api/analysis/reports` -> `app/api/analysis/reports/route.ts`

3. Firestore 저장/조회 훅 구현 완료
- 저장: `lib/server/reportRepository.ts` (`persistAnalysisReport`)
- 조회: `lib/server/reportRepository.ts` (`listRecentAnalysisReports`)
- API 연동: `app/api/analysis/report/route.ts`, `app/api/analysis/reports/route.ts`

4. 배포 파일/파이프라인 구성 완료
- `next.config.js` standalone 설정
- `Dockerfile`, `cloudbuild.yaml`, `scripts/deploy-gcp.sh`, `scripts/smoke-test-gcp.sh`
- GitHub Actions 워크플로우 존재: `.github/workflows/gcp-cloud-build.yml`

5. 이전 리뷰 이슈 중 주요 항목 반영
- 한글 인코딩 깨짐 데이터 복구: `lib/adapters/regionDataAdapter.ts`
- 주소 유효성 방어 추가: `hasMeaningfulAddressInput` + summary route 검증
- `.gitignore` 개선 반영

### 부분 적용 / 불일치 (즉시 보완 필요)

1. Vertex 운영 문서 대비 배포 스크립트 권한/API 누락
- 문서 다수에서 Vertex 운용(`aiplatform`) 전제
- `scripts/deploy-gcp.sh`는 `aiplatform.googleapis.com` 활성화 및 `roles/aiplatform.user` 부여 로직이 없음
- 결과: Vertex 모드(`GEMINI_API_MODE=vertex`)를 표준 경로로 쓰려면 수동 보완 필요

2. 모델 기본값/배포값 불일치
- `lib/services/gemini.ts` 기본 모델: `gemini-2.5-flash`
- `cloudbuild.yaml` 런타임 env: `GEMINI_MODEL=gemini-1.5-flash`
- 결과: 로컬/배포 결과 편차 가능

3. 계약 정합성 완전 고정 미완료 (`regionCode` vs `regionId`)
- 계약 타입은 `regionCode` 중심 + `regionId?` fallback
- 라우트/서비스도 fallback 허용
- 결과: 문서의 “계약 고정” 목표 대비 아직 과도기 상태

4. Vertex 계획 문서의 `response_schema` 수준은 미구현
- 현재는 프롬프트 + JSON 파싱 기반 (`lib/services/gemini.ts`)
- strict schema 강제 호출/검증 파이프라인은 계획 대비 미완

5. 문서 최신화 불일치
- `HACKATHON_ROADMAP.md`의 “남은 작업” 일부(`/api/analysis/document`, `/api/analysis/reports`, 스모크 자동화)는 이미 구현됨
- `GCP_DEPLOYMENT.md`의 로컬 실행 예시는 `npm run start` 중심으로, README의 `start:standalone` 기준과 혼선 여지

### 구조상 리스크 (낮음~중간)

1. 루트에 바이너리 산출물/패키지 파일 혼재
- `Urban-DDS_ AI 도시정비 의사결정 지원 시스템` (확장자 없음 ZIP 바이너리)
- `Urban-DDS_ AI 도시정비 의사결정 지원 시스템.zip`
- 결과: 협업 시 문서/소스 탐색 혼선 가능

## 3) Terminal A/B 업무 분할 (실행 기준)

## Terminal A: 인프라/배포 정합화

목표:
- 문서-구현 간 GCP/Vertex 배포 경로를 완전 일치

작업:
1. `scripts/deploy-gcp.sh` 보강
- `aiplatform.googleapis.com` 활성화 추가
- 런타임 SA에 `roles/aiplatform.user` 부여 옵션 추가

2. `cloudbuild.yaml`/배포 env 정합화
- `GEMINI_MODEL` 기본값 정책 통일(1.5 또는 2.5 중 하나로 확정)
- 문서와 동일 기본값으로 단일화

3. 운영 문서 최신화
- `GCP_DEPLOYMENT.md`, `GCP_DEPLOYMENT_SETUP_GUIDE.md`, `README.md` 배포 섹션에서 동일한 실행 기준으로 통일

완료 기준:
1. Vertex 모드 사용 시 추가 수동 단계 없이 배포 가능
2. 모델 기본값이 코드/배포/문서에서 단일 값으로 일치
3. 배포 가이드 간 상충 문구 제거

소유 파일:
- `scripts/deploy-gcp.sh`
- `cloudbuild.yaml`
- `README.md`
- `GCP_DEPLOYMENT.md`
- `GCP_DEPLOYMENT_SETUP_GUIDE.md`

## Terminal B: 애플리케이션/API 계약 고정

목표:
- 분석 API와 문서 생성 파이프라인의 계약 일관성 확보

작업:
1. `regionCode`/`regionId` 정책 최종 고정
- 계약(`types/contract.ts`)과 라우트/서비스 입력 정책 단일화
- README 샘플 payload와 정확히 동일하게 정리

2. 문서 생성 품질 고정
- `lib/services/gemini.ts`에 구조화 출력 검증 강화
- 계획 문서 기준의 필수 필드 누락 시 fallback 정책 명확화

3. `/api/analysis/document` 확장 여부 확정
- 현재처럼 생성만 할지, Firestore 문서 메타까지 저장할지 결정 후 반영

완료 기준:
1. 계약 문서/타입/라우트가 완전 일치
2. 분석 응답 필수 필드 보장률 향상
3. 문서 API 저장 정책이 코드/문서에 동일하게 명시

소유 파일:
- `types/contract.ts`
- `app/api/analysis/report/route.ts`
- `lib/server/analysisService.ts`
- `app/api/analysis/document/route.ts`
- `lib/services/gemini.ts`
- `README.md`

## 4) 검증 전담(Codex) 업무

역할:
- A/B 결과물 병합 전 검증 게이트 운영
- 계약/배포/문서 정합성 최종 승인

검증 체크리스트:
1. 계약 정합성
- `types/contract.ts` vs API 라우트 입력/출력 불일치 여부

2. 문서-코드 정합성
- README 및 GCP 가이드의 명령/변수/엔드포인트가 실제 파일과 일치하는지

3. 배포 안정성
- `cloudbuild.yaml`, `.github/workflows/gcp-cloud-build.yml`, `scripts/deploy-gcp.sh` 간 파라미터 연결 검증

4. 기능 회귀 위험
- `analysis/report`, `analysis/document`, `analysis/reports`의 인터페이스 변경 영향 검토

검증 리포트 포맷(고정):
```text
[Validation Gate]
- 대상 브랜치:
- 검증 범위:
- 통과:
- 실패/리스크:
- 수정 요청:
- 승인 여부:
```

## 5) 우선순위 결론

1. 최우선: Terminal A의 Vertex 배포 경로 보강 (`aiplatform` API/권한)
2. 동시 진행: Terminal B의 `regionCode` 계약 고정
3. 마지막: 문서 최신화 일괄 정리 (로드맵/배포 가이드/README)

본 결론 기준으로 진행하면, 현재 구조에서 데모 가능 상태를 유지하면서 운영 전환 리스크를 빠르게 줄일 수 있음.
