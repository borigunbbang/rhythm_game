# Phosphor Pulse — 프로젝트 메모

Q/W/E/R 4레인 노트 낙하 리듬게임. 신스/믹서 하드웨어 패널 컨셉의 순수 HTML/CSS/JS
프로젝트 (빌드 도구, 프레임워크, npm 의존성 없음).

## 파일 구성

- `index.html` — 마크업
- `styles.css` — 앰버 형광 패널 테마 스타일
- `script.js` — 게임 로직 전체 (차트 데이터, 렌더 루프, 오디오 합성)

## 배포

- GitHub 저장소: `git@github.com:borigunbbang/rhythm_game.git` (`main` 브랜치)
- GitHub Pages로 배포됨: https://borigunbbang.github.io/rhythm_game/
  (Settings → Pages, source: `main` / root)

## 알아두면 좋은 설계 결정

- **오디오**: 외부 음원 파일 없음. Web Audio API 오실레이터로 메트로놈 클릭음과
  타격음(레인별 다른 음정)을 직접 합성함.
- **조작 키는 `e.code` 기준**(`KeyQ`/`KeyW`/`KeyE`/`KeyR`), `e.key`가 아님.
  → 처음엔 D/F/J/K를 `e.key`로 매핑했다가, 한글 입력기(IME)가 켜져 있으면
  물리 키를 눌러도 한글 자모가 전달돼서 매핑이 전혀 안 되는 버그가 있었음
  (그래서 항상 MISS만 뜨는 것처럼 보였음). `e.code`는 IME 상태와 무관하게
  물리적 키 위치를 그대로 주기 때문에 이 문제를 근본적으로 해결함. 키를
  다시 바꾸더라도 이 방식은 유지할 것.
- **판정창**: PERFECT ±70ms, GOOD ±160ms (오디오 클럭 `audioCtx.currentTime`
  기준으로 계산, 프레임레이트에 영향받지 않음).
- **차트**: 24마디, 8분음표 해상도, BPM 100, 약 1분 분량. `script.js`의
  `PATTERNS` 배열에 문자열 패턴으로 하드코딩되어 있음.
- **결과 화면 DOM 갱신은 `innerHTML` 한 번에 몰아서 처리**
  (`resultGrid.innerHTML = ...`). 개별 `getElementById` 후 `textContent`를
  하나씩 설정하는 방식은 테스트 중 특정 브라우저 환경에서 간헐적으로 요소가
  누락되는 현상이 있어서 더 안전한 방식으로 바꿔둔 것. 되돌리지 말 것.

## 남은 아이디어 (요청 시 진행)

- 곡/난이도 추가 선택 기능
- 모바일 터치 입력 지원 (현재는 키보드 전용)
