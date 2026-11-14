# 작업별 스킬 배정

이 표는 하네스가 순서와 역할만 조율하기 위한 것이다. 필요한 스킬의 SKILL.md와 해당 참조만 읽는다. 전체 플러그인·AGENTS.md·모든 참조를 한 번에 읽지 않는다. 설치 여부는 docs/skill-inventory.md에 기록한다. 보류된 스킬은 부르지 않는다.

## 공통

- 코드 작성 담당은 `ponytail`의 최소 변경 원칙을 따른다. 기본 full의 구현 원칙만 사용하며 ultra의 요구사항 재논쟁, 자동 리뷰·audit·debt·gain·훅·장부는 쓰지 않는다. 사용자 지정 UI 품질·검증 범위·보고 형식이 우선이다.
- Expo 작업은 설치된 경우 `expo-overview`로 목표를 분류한다. 목표가 명확하면 다시 질문하지 않는다. 맡는 일이 맞는 개별 스킬만 이어 읽는다.
- `vercel-react-native-skills`는 관련 렌더링·이미지·리스트·상태 규칙만 참고한다. 모노레포·대형 아키텍처·선제 최적화를 이 데모에 추가하지 않는다.

## 메인

| 작업 | 읽을 스킬 |
|---|---|
| 첫 앱 생성 | expo-project-structure |
| 탭·스택·모달·뒤로가기 | expo-router |
| API·로딩·오류·빈 상태 | expo-data-fetching |
| 특정 기능의 공식 예제 | expo-examples |

메인이 명확한 작은 화면을 구현할 때도 필요한 UI 스킬을 직접 쓴다. 스킬 사용 자체가 서브에이전트 호출을 뜻하지 않는다.

## expo-ui · Sol medium

| 작업 | 읽을 스킬 |
|---|---|
| 첫 시각 방향·큰 리디자인 | ui-ux-pro-max |
| 테마·공용 색/간격 통일 | expo-design-system |
| 화면 구성·플랫폼 스타일 | expo-native-ui |
| 버튼·시트·피커·스위치 | expo-ui |
| 전환·제스처·햅틱 | expo-animation |

UI UX Pro Max는 React Native 스택을 지정하고 새 시각 방향에서만 디자인 시스템/팔레트를 검색한다. 로컬 스크립트는 `.agents/skills/ui-ux-pro-max/scripts/search.py`. 작은 수정은 해당 도메인 검색이 실제로 필요할 때만 한다. 사용자가 승인한 범위는 React Native 로컬 디자인 검색뿐이며 웹 코드·훅·외부 API 연동은 사용하지 않는다. 하나의 앱 테마 파일이 구현 기준이며, 다른 MASTER.md·DESIGN.md를 별도의 경쟁 기준으로 자동 생성하지 않는다.

## expo-quick · Luna low

Ponytail + 필요한 Vercel RN 규칙. 컨트롤이면 expo-ui, 화면 이동이면 expo-router 등 해당 작업 스킬 하나를 추가한다. 부모가 정한 디자인/공용 타입을 재사용하며 시각 방향을 새로 정하지 않는다.

## expo-debug · Sol high

재현된 오류에 해당하는 Expo 스킬과 필요한 Vercel RN 규칙만 읽는다. Expo Go에서 지원하지 않는 기능일 때 expo-dev-client, SDK 업그레이드/호환성 문제일 때 expo-upgrade를 쓴다. 일반 오류 해결을 위해 SDK나 의존성을 일괄 업그레이드하지 않는다.

## 우선순위와 도구

- 사용자 요구와 이 프로젝트 운영 규칙 → 설치된 Expo SDK 공식 지침/API → 해당 RN 일반 지침 순서다. 오래된 React Navigation/Reanimated 예제를 그대로 복사하지 않는다.
- 패키지·렌더링 API가 불확실할 때만 Context7의 resolve-library-id → query-docs로 필요한 문서를 찾는다. 질의는 외부 서버로 가므로 공개 라이브러리명·버전·오류 요약만 보낸다. 전체 코드·대화·비밀값은 보내지 않는다. 제한/인증/연결 오류면 공식 문서로 확인하고 불필요한 재시도를 하지 않는다.
- 기존 Headroom MCP는 큰 도구 출력에만 사용한다. 새 프록시·자동 압축 훅은 설치하지 않는다. 필요하면 원문을 복원할 수 있게 한다.
- 외부 스킬의 feedback/제보/텔레메트리 명령 실행, 외부 서비스 메시지 전송은 이번 개발 범위에 포함하지 않는다.
- 모든 검토·Critique·Audit·전수 성능 진단은 사용자가 요청할 때만 한다. 구현 중 실행/타입 확인은 최소 범위로 유지한다.
