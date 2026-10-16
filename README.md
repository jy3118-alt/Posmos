# Posmos

Po 150명과 Moa 1명이 산책하고 쉬는 작은 3D 물감 세계입니다.

운영 주소: https://posmos-beryl.vercel.app/

GitHub 저장소: https://github.com/jy3118-alt/Posmos

- 수영 해변 바로 보기: https://posmos-beryl.vercel.app/?view=beach
- Po 150명 중 6명은 수영·등으로 뜨기·물장구·해변 출입을 합니다.
- 캐릭터 클릭: 카메라 추적. 같은 캐릭터를 다시 클릭하면 해제.
- 왼쪽 드래그: 회전. 오른쪽 드래그: 이동. 휠: 확대/축소.
- 상단 아이콘: 아침 / 노을 / 밤. 시간은 자동으로도 흐릅니다.
- 오른쪽 위 선 아이콘: 틸트 시프트 켜기/끄기. 소리와 설정 패널은 없습니다.

## 실행

Node.js 22 이상에서: `node scripts/preview.mjs`

브라우저에서 http://127.0.0.1:4181/Posmos/ 를 여세요.

## 배포

기본 배포는 연결된 Vercel 프로젝트입니다. main 브랜치에 push하면 Vercel이 자동으로 운영 사이트를 갱신합니다.

vercel.json은 Framework Other, Root Directory 저장소 루트, Output Directory site, 별도 설치·빌드 없음으로 구성합니다. 정적 파일만 배포하며 환경 변수나 Tripo API 키는 필요하지 않습니다.

GitHub Pages는 수동 백업입니다. Actions에서 Manual GitHub Pages backup을 직접 실행할 때만 갱신합니다.

site에는 실제 웹 파일만 있습니다. Blender 원본, 이전 모델, 생성 영수증, 인증 파일과 개발 백업은 포함되지 않습니다.
모델과 텍스처의 출처는 site/CREDITS.md에 기록되어 있습니다.
