# AZAS-APP · 해커톤 프론트엔드

React Native + Expo 앱의 프론트엔드만 개발한다. 하루짜리 데모의 UI 완성도와 개발 속도, 토큰 절약이 우선이다.

- 앱 구현·수정·이어서 개발할 때 `.agents/skills/expo-hackathon/SKILL.md`를 따른다. 단순 질문에는 직접 답한다.
- 기본은 메인 혼자 구현. 아래 스킬의 조건에 맞을 때만 보조 에이전트 1개에 위임한다.
- 코드·디자인 리뷰는 사용자가 요청할 때만 한다. 자동 리뷰, 유지보수 목적 리팩터링, 테스트 확대를 하지 않는다. 실행·타입 오류를 잡는 최소 확인은 한다.
- 하네스 구성은 HarnessKit이 담당하고, skill-creator는 산출물 형식 검증에만 사용한다.
- 연결 스킬은 `.agents/skills/expo-hackathon/references/skills.md`가 작업별로 배정한다. 코드 원칙은 Ponytail, 디자인 방향은 UI UX Pro Max, Expo 구현은 공식 Expo 스킬을 사용한다. 설치 상태는 `docs/skill-inventory.md`를 따른다.
- 사용자의 범위·리뷰 조건과 해당 Expo SDK 공식 API가 외부 스킬의 일반 지침보다 우선한다. 외부 스킬의 제보/텔레메트리 명령·시뮬레이터 설정 변경 예제를 자동 실행하지 않는다.
- 공모전 수치는 로컬 스크립트로 기록한다. 측정값과 추정, 관측 누락을 구분하며 비교군 없이 절감률을 주장하지 않는다.

구성 기록: `harnesskit.lock`. 사용법·측정 한계: `docs/hackathon-harness.md` (운영할 때마다 읽지 않는다).

프로젝트 구성일: 2026-11-14. 외부 스킬 원본·검사 판정·승인 기록: `docs/skill-sources.json`.
