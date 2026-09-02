# Phosphor Pulse

앰버 형광 판정선에 노트를 맞추는 4레인 리듬게임입니다. 오래된 신스/믹서 하드웨어
패널 컨셉으로 만들었고, 메트로놈과 타격음은 별도 음원 파일 없이 Web Audio API로
직접 합성합니다.

## 바로 실행하기

설치나 빌드 과정이 없습니다. `index.html`을 브라우저로 열면 바로 플레이할 수
있습니다.

```bash
git clone git@github.com:borigunbbang/rhythm_game.git
cd rhythm_game
open index.html      # macOS
# Windows는 index.html 더블클릭
# Linux는 xdg-open index.html
```

이미 저장소를 내려받았다면 폴더에서 `index.html`을 더블클릭해도 됩니다.

## 조작

| 키 | 레인 |
|:--:|:--:|
| `Q` | 1레인 |
| `W` | 2레인 |
| `E` | 3레인 |
| `R` | 4레인 |

노트가 화면 아래 판정선에 겹치는 순간 해당 키를 누르세요.

## 규칙

- 타이밍 정확도에 따라 `PERFECT` / `GOOD` / `MISS` 판정이 갈립니다.
- 판정 범위 밖에서 눌러도 감점은 없지만, 제때 누르지 못하면 자동 `MISS`로
  콤보가 끊깁니다.
- 약 1분 트랙(24마디)이 끝나면 점수·최대 콤보·정확도·등급(S~C)이 결과 화면에
  집계됩니다.

## 파일 구성

- `index.html` — 마크업
- `styles.css` — 스타일
- `script.js` — 게임 로직 및 오디오 합성
