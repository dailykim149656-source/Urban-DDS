# Terminal A/B 업무 분할 (2026-02-28)

## 1) 현재 검증 상태 요약

- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `npm run build`: 통과
- 로컬 API 스모크:
  - `GET /api/health`: 정상
  - `GET /api/region/summary?address=서울`: 정상
  - `GET /api/region/metrics?regionCode=seoul`: 정상
  - `POST /api/analysis/report`: 정상 (유효 JSON 본문 기준)

결론:
- 핵심 API/빌드 상태는 양호
- 다만 CI/CD와 저장소 위생 영역은 즉시 보완 필요

## 2) 우선 리스크(수정 우선순위)

1. GitHub Actions에서 Cloud Build 실행 시 배포 파라미터 미주입 가능성
   - `cloudbuild.yaml`은 `--service-account=$_SERVICE_ACCOUNT`를 요구
   - 기본 substitutions에서 `_SERVICE_ACCOUNT`가 빈 문자열
2. `.gitignore`가 `node_modules`만 포함
   - `.next`, `tsconfig.tsbuildinfo`, 캐시 디렉터리 누락

## 3) Terminal A (배포/인프라 담당)

목표: GCP 자동배포 신뢰성 확보

작업:
1. `.github/workflows/gcp-cloud-build.yml`에서 `gcloud builds submit`에 필요한 substitutions 명시
2. `cloudbuild.yaml`의 `_SERVICE_ACCOUNT` 기본값 전략 보완
   - 빈 값 허용 대신 명시적 실패 또는 기본 런타임 SA 규칙 정리
3. Secret Manager 의존 항목 검증 로직 문서화
   - 누락 시 실패 메시지 명확화
4. `scripts/deploy-gcp.sh`와 CI 경로 동작 차이를 README에 반영

완료 기준:
1. GitHub Actions 기준 dry-run 수준에서 파라미터 누락 없음
2. 배포 실패 시 원인 로그가 즉시 식별 가능

소유 파일:
- `.github/workflows/gcp-cloud-build.yml`
- `cloudbuild.yaml`
- `scripts/deploy-gcp.sh`
- `README.md` (배포 섹션)

## 4) Terminal B (애플리케이션/API 품질 담당)

목표: API 계약/문서 생성 기능 확장 준비

작업:
1. `/api/analysis/report` 요청 계약 엄격화
   - `regionCode`만 공식 허용할지, `regionId` fallback 유지할지 결정 후 일관화
2. 분석 응답 구조에 문서 생성 확장 필드 설계
   - `reportVersion`, `model`, `generatedAt` 등 메타 확장 준비
3. Firestore 저장 결과를 로깅 표준으로 정리
   - 성공/실패 로그 포맷 통일
4. Vertex AI 문서 생성 API 사전 스캐폴드
   - `/api/analysis/document` 인터페이스만 먼저 확정

완료 기준:
1. `types/contract.ts`와 구현 코드 불일치 없음
2. `analysis` 관련 API에 대한 샘플 요청/응답 문서 존재
3. 기존 `report` API 회귀 없음(빌드/타입/스모크 통과)

소유 파일:
- `types/contract.ts`
- `lib/server/analysisService.ts`
- `app/api/analysis/report/route.ts`
- `lib/server/reportRepository.ts`
- `README.md` (API 섹션)

## 5) 공통 규칙

1. 머지 전 공통 체크:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
2. 계약 변경 시 A/B 모두 동기화
3. 최종 1시간은 신규 기능 추가 금지, 안정화 전용
