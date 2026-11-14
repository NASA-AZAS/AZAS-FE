# 해커톤 스킬 배정 및 설치 상태

GitHub 스타는 2026-11-13 선택 시점의 저장소 전체 값이다. 개별 스킬 평가나 안전성 보증이 아니다. 원본 커밋·검사 결과는 skill-sources.json에 기록한다.

| 스킬 | 담당 / 호출 조건 | 설치 | 검사 |
|---|---|---|---|
| ponytail | 코드 작성 담당 공통 | 설치됨 | SAFE |
| ui-ux-pro-max | expo-ui: 첫 시각 방향·큰 리디자인 | 설치됨 | DO_NOT_INSTALL 100 · 경고 사용자 승인 |
| vercel-react-native-skills | 메인·expo-quick·expo-debug: 관련 RN 규칙 | 설치됨 | CAUTION · 경고 사용자 승인 |
| expo-overview | 메인: Expo 목표 분류 | 설치됨 | CAUTION · 경고 사용자 승인 |
| expo-project-structure | 메인: 최초 앱 생성 | 설치됨 | SAFE |
| expo-examples | 메인·expo-debug: 공식 예제 | 설치됨 | SAFE |
| expo-design-system | expo-ui: 테마·스타일 통일 | 설치됨 | SAFE |
| expo-native-ui | expo-ui: 모바일 화면 구성 | 설치됨 | CAUTION · 경고 사용자 승인 |
| expo-ui | expo-ui·expo-quick: 네이티브 컨트롤 | 설치됨 | SAFE |
| expo-router | 메인: 화면 이동·탭·모달 | 설치됨 | SAFE |
| expo-animation | expo-ui: 애니메이션·제스처·햅틱 | 설치됨 | SAFE |
| expo-data-fetching | 메인·expo-debug: API 연결·상태 처리 | 설치됨 | DO_NOT_INSTALL · 경고 사용자 승인 |
| expo-dev-client | expo-debug: Expo Go 미지원 기능 | 설치됨 | SAFE |
| expo-upgrade | expo-debug: 실제 SDK 호환성 문제 | 설치됨 | SAFE |

## 운영

- 기본 메인 Sol low, UI Sol medium, 단순 구현 Luna low, 막힌 오류 Sol high. 동시 보조 1개·깊이 1단계.
- 코드 작성 시 Ponytail, Expo 목표 분류 시 expo-overview. 나머지는 해당 작업의 본문/참조만 읽는다.
- 자동 리뷰·전수 QA·유지보수 리팩터링·Ponytail 훅/별도 장부는 없다.
- 각 스킬의 범위가 겹치면 해당 Expo SDK 공식 API를 우선하고 한 가지 구현만 선택한다.
- Context7: 프로젝트 전용 원격 문서 조회, 두 도구만 연결. Headroom: 기존 MCP 재사용.
- Context7 연결 manifest는 SAFE 0, initialize/tools-list 성공. 원격 서버 구현 전체가 검증되었다는 뜻은 아니다.
- 검사: NVIDIA SkillSpector 2.12.0 --no-llm. 의존성 이름/버전은 OSV 조회에 사용될 수 있으나 파일 내용을 외부 모델로 보내지 않았다.
- expo-data-fetching(DO_NOT_INSTALL 85), expo-overview(CAUTION 25), expo-native-ui(CAUTION 19), Vercel RN(CAUTION 46)은 근거와 일부 분석 미완료를 알린 뒤 사용자가 경고를 감수하고 설치하겠다고 승인했다.
- UI UX Pro Max는 Codex 프로젝트 경로만 조정했고 설치할 필요가 없는 개발 테스트를 제외했다. 런타임 스크립트와 데이터·참조를 포함해 점검한다.
- 실측 기록은 scripts/hackathon/bench.py. 이번 설치는 setup으로 분리해 개발 성과·절감률에 섞지 않는다.

UI UX Pro Max 최종 검사: DO_NOT_INSTALL 100, HIGH 10, 일부 분석 미완료. 확인한 주요 지적은 CSV의 금지/안티패턴 예시(시스템 제스처 덮어쓰기, 웹 XSS 예제, 비밀값 보관 예제 등)이며, 문맥상 오탐으로 보인다는 검토와 일부 분석 미완료를 알린 뒤 사용자가 별도로 위험을 감수하고 설치하겠다고 승인했다. React Native 로컬 디자인 검색으로 한정하고 웹 코드·훅·외부 API 연동은 사용하지 않는다.

최종 설치: 외부 스킬 14개(검사 SAFE 9개, 경고 근거 확인 후 사용자 승인 5개) + 프로젝트 오케스트레이터 1개. UI UX Pro Max의 React Native 스택 검색과 디자인 시스템 검색은 로컬 실행 확인 완료.
