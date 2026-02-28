# Urban-DDS Desktop Troubleshooting Guide (Electron)

Last updated: 2026-02-28

## 1) 빠른 실패 분기

### A. `spawn EPERM` (빌드/개발 시작 직후)

- 증상
  - `next build` 또는 `next dev` 로그에 아래 에러가 즉시 출력
  - `ChildProcess.spawn` -> `spawn EPERM`
- 의미
  - 현재 셸/환경의 프로세스 스폰 제한 또는 보안 정책으로 인해 Next 워커를 시작하지 못함
- 우선순위 조치
  1. 일반 CMD/PowerShell(샌드박스/원격 터미널 아님)에서 재시도
  2. `node_modules` 삭제 후 재설치: `Remove-Item -Recurse -Force node_modules`
  3. 관리자 권한이 아닌 일반 사용자 계정으로 재실행(또는 관리자 세션에서 다시 테스트)
  4. 백신/보안 소프트웨어의 Node 실행 차단 정책 확인
- 확인 명령

```bash
npm install
npm run build
```

성공하면 데스크톱 실행으로 진행:

```bash
npm run desktop:start
```

### B. `listen EACCES` (독립 실행기)

- 증상
  - `listen EACCES: permission denied 0.0.0.0:3000` 또는 `127.0.0.1:3000`
- 의미
  - 현재 환경에서 해당 포트/주소 바인딩이 제한됨
- 조치
  1. 포트 충돌 없는지 확인: 다른 포트로 변경 (`URBAN_DDS_PORT=` 또는 `PORT=`)
  2. `.next/standalone/server.js`가 쓰는 호스트가 127.0.0.1 인지 확인
  3. 네트워크 정책(로컬 방화벽/사내 보안 정책) 점검

```bash
set PORT=3010
set URBAN_DDS_PORT=3010
set HOSTNAME=127.0.0.1
npm run start:standalone
```

### C. `ERR_INVALID_URL` (`http://localhost:undefined?...`)

- 증상
- 빌드 완료 직후 `TypeError: Failed to parse URL ... localhost:undefined`
- 의미
  - 런타임 내 일부 재검증/캐시 경로 설정에서 호스트/키 정보가 누락된 상태일 수 있음
- 조치
  1. `.env.local`에 `PORT`, `HOSTNAME` 또는 관련 App Route 재검증/캐시 변수 확인
  2. `next.config.js` 변경사항이 최신인지 확인
  3. 캐시 삭제 후 재빌드

```bash
Remove-Item -Recurse -Force .next
npm run build
```

## 2) 데스크톱 실행 로그 템플릿

`npm run desktop:start` 실행 시 아래 형식으로 오류 시각화:

```text
[TIME] command:
[TIME] output tail:
[TIME] error stack:
```

최소 50행 수집:

```bash
npm run desktop:start > .\tmp-desktop-start.out.log 2> .\tmp-desktop-start.err.log
Get-Content .\tmp-desktop-start.out.log -Tail 80
Get-Content .\tmp-desktop-start.err.log -Tail 80
```

## 3) 권장 실행 순서

1. `npm run build` (단일 성공 여부 체크)
2. `npm run desktop:start`
3. 실패 시 위 1항 분기표를 따라 재시도
4. 이상 없으면 `npm run desktop:pack`
