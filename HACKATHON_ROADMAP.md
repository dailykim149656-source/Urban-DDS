# Urban-DDS Hackathon Roadmap (Updated)

기준일: 2026-02-28

## 1) 현재 상태

- Backend API: 완료
  - `GET /api/health`
  - `GET /api/region/summary?address=...`
  - `GET /api/region/metrics?regionCode=...`
  - `POST /api/analysis/report`
- Frontend Dashboard: 1차 완료
  - 주소 입력/퀵 선택
  - 지역 지표 조회 및 우선순위 표시
  - Gemini 분석 요청 및 결과 렌더링
- Firebase 연동: 완료
  - 분석 결과 Firestore 저장 훅 연결
- GCP 배포 기반: 완료
  - `Dockerfile`, `cloudbuild.yaml`, GitHub Actions 워크플로우

## 2) 이번 업데이트 내용

- `app/page.tsx`를 API 안내 페이지에서 실제 대시보드 UI로 교체
- `app/layout.tsx`에 글로벌 폰트/스타일 적용
- `app/globals.css` 신규 추가
- `.env.example`에 프론트엔드용 환경변수 추가
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_DEFAULT_ADDRESS`

## 3) 데모 기준 사용자 플로우

1. 주소 입력 또는 샘플 주소 클릭
2. 지역 요약 지표 조회
3. `Gemini 분석 실행` 클릭
4. 시나리오/요약/근거 확인

## 4) 남은 작업 (우선순위)

1. Vertex AI 기반 분석 문서 생성 API 추가
   - `/api/analysis/document`
2. Frontend 리포트 화면 확장
   - 보고서 템플릿(요약, 리스크, 실행계획)
3. Firestore 조회 API 추가
   - 최근 분석 이력 리스트
4. 배포 후 스모크 자동화
   - CI에서 `scripts/smoke-test-gcp.sh` 실행

## 5) 팀 분할 제안 (A/B)

- Terminal A (Infra/API)
  - Vertex API 연동
  - 문서 생성 API
  - Firestore 조회 API
- Terminal B (Frontend)
  - 리포트 UI 확장
  - 이력 화면
  - 오류/로딩 UX 개선

## 6) 완료 기준 (DoD)

1. `npm run typecheck` 통과
2. `npm run lint` 통과
3. `npm run build` 통과
4. API 스모크 통과
5. 프론트에서 조회 -> 분석 -> 결과 확인 흐름 정상
