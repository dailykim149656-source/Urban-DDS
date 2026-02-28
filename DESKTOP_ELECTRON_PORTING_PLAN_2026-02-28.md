# Urban-DDS Desktop (Electron) Porting Plan

## 1) 목표
- Next.js(App Router + API Routes) 기반 Urban-DDS를 Electron으로 데스크톱 앱으로 포팅한다.
- 기능(지역 검색, 요약 조회, Gemini 분석, 최근 분석 이력, 스트리트뷰 패널)은 현재 동작과 동일하게 유지한다.
- 데스크톱 앱은 Next.js Standalone 서버를 내부에서 구동하고, BrowserWindow에서 `http://127.0.0.1:<port>`로 접근한다.

## 2) 현재 구조 판단(전제)
- UI: `app/page.tsx` + `app/ui/*`
- 서버 API: `app/api/*` (Next API Routes)
- 비즈니스/외부 연동: `lib/server/*`, `lib/services/*`, `lib/adapters/*`
- Next 설정: `next.config.js`에 `output: 'standalone'`

=> 따라서 Electron이 가장 적합: 기존 API Route를 유지한 상태로 래핑 가능.

## 3) 아키텍처(대상)
1. Electron 메인 프로세스가 앱 시작 시 Next Standalone 서버를 subprocess로 실행
2. 준비 완료 후 `http://127.0.0.1:<port>` 로 UI 렌더링
3. 창 종료 시 Next 서버 프로세스 안전 종료
4. 빌드 산출물은 기존 `.next/standalone`, `.next/static`, `public` 재사용

## 4) 구현 범위
### 4.1 문서화
- `DESKTOP_ELECTRON_PORTING_PLAN_2026-02-28.md` 생성
- 구현 단계, 리스크, 롤백 방법 정의
- `DESKTOP_ELECTRON_TROUBLESHOOTING_2026-02-28.md` 생성

### 4.2 Electron 기본 스택 추가
- `electron/main.js` 신규 생성
  - 사용 포트 탐색
  - Next server 프로세스 실행
  - `api/health` 폴링으로 기동 대기
  - BrowserWindow 로드
  - graceful shutdown
- `electron-builder.config.js` 신규 생성
- `package.json` 스크립트/의존성 추가

### 4.3 실행 스크립트
- `npm run desktop:pack` : Next 빌드 후 Electron 패키징
- `npm run desktop:start` : 로컬에서 데스크톱 앱 실행(빌드 선행)

### 4.4 운영/배포 고려
- `.env`는 운영환경용으로 `desktop` 전용 템플릿 추가 검토
- 런타임에서 필요한 키(`GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, Firebase 관련) 관리 방식 정의

## 5) 작업 항목 상세
1. **초기 설정**
   - Electron 의존성 추가
   - 앱 entry(메인) 등록
   - 시작 포트/서버 경로 안정화

2. **개발/테스트 경로**
   - `npm run build`
   - `npm run desktop:start`로 로컬 패키징 없이 실행 확인
   - 기본 UI/주요 기능 수동 확인

3. **패키징 경로**
   - `npm run desktop:pack`
   - 설치 패키지 실행 확인

4. **문제 대응**
   - 폴링 timeout/재시도 정책 보강
   - 스트리트뷰/Gemini/Firestore 키 미설정시 사용자 가이드 메시지 표시
   - 운영 트러블슈팅 체크리스트 분리 관리
   - 현재 실행 환경(`cmd`/PowerShell sandbox)에서 `next build`/`next dev` 모두 간헐적으로 `spawn EPERM`로 종료되어 데스크톱 검증이 제한됨.
   - 보완 조치: `next.config.js`에 `experimental.workerThreads: true` 추가.
   - 일부 환경에서 스탠드얼론 서버 바인딩이 `listen EACCES`로 실패할 수 있어 Electron 실행 시 `HOSTNAME=127.0.0.1` 사용 반영.
   - 실제 검증은 제약 없는 로컬 터미널 또는 CI에서 재시도 필요.

## 6) 일정(1차)
- Day 1
  - plan 문서 확정, Electron 엔트리/패키징 구성 반영
- Day 2
  - 로컬 실행 검증, 문제점 정리 및 코드 보정
- Day 3
  - 패키징 테스트 + 문서 보강

## 7) 리스크
- API 키 미설정 시 일부 기능 제한(스트리트뷰, Gemini 분석)
- Firebase/Firestore 권한 환경 차이로 최근 이력 저장 동작 차이
- Windows 코드시그니처/보안 정책(배포 시 별도 고려)

## 8) 롤백 플랜
- `package.json`에서 Electron 관련 스크립트와 의존성 제거
- `electron/` 및 electron-builder 설정 삭제
- 기존 웹 배포/CI 플로우는 기존대로 유지
