# Posmos · 물감 마을

Po 150명과 Moa 1명이 산책하고 쉬는 작은 3D 물감 세계입니다.

배포 주소: https://jy3118-alt.github.io/Posmos/

- 캐릭터 클릭: 카메라 추적. 같은 캐릭터를 다시 클릭하면 해제.
- 왼쪽 드래그: 회전. 오른쪽 드래그: 이동. 휠: 확대/축소.
- 상단 아이콘: 아침 / 노을 / 밤. 시간은 자동으로도 흐릅니다.
- 감상 설정: 사용자 동작으로 시작하는 배경음, 틸트 시프트, 전체 화면.

## 실행

Node.js 22 이상에서: `node scripts/preview.mjs`

브라우저에서 http://127.0.0.1:4181/Posmos/ 를 여세요.

## 배포

저장소 Settings → Pages → Source를 **GitHub Actions**로 설정합니다.
main 브랜치에 push하면 Pages 워크플로가 site 폴더를 자동 배포합니다.

site에는 실제 웹 파일만 있습니다. Blender 원본, 이전 모델, 생성 영수증, 인증 파일과 개발 백업은 포함되지 않습니다.
모델과 텍스처의 출처는 site/CREDITS.md에 기록되어 있습니다.
