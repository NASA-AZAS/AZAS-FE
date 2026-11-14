# 하네스 활용 개발 기록 · 2026-11-14

HarnessKit으로 구성한 Expo 해커톤 하네스를 사용한 개발 사례 기록이다. 아래 수치는 로컬 관측값이며 하네스의 인과적 효과나 절감률을 뜻하지 않는다.

## 구현·검증 근거

- 시작 화면: 가로 Expo 앱, Three.js 태양·지구·달, 영어 HUD. 타입 검사와 플랫폼 번들, 브라우저 조작 확인. 당시 실기기 미확인.
- iOS 후속 오류: 사용자가 실기기에서 제공한 Three.js `process.emitWarning` 오류를 근거로 Metro의 ESM 연결을 수정. 네이티브 JS 번들에서 해당 CJS 래퍼가 빠졌음을 확인. 실기기 재실행 성공은 아직 사용자에게 확인받지 않았다.
- 화면 개선: 태양 중심·거리 고정, 줌 제거, 별 배경, 지구 노멀·구름층, 달 요철, 태양 대류·코로나·홍염 셰이더. 타입 검사 및 iOS/Android 번들 성공. 브라우저에서 셰이더 오류 없음, 드래그 회전 확인, 일시정지 상태에서 휠·두 손가락 핀치 전후 캔버스 스크린샷 동일 확인. 브라우저 기본 핀치 차단 보정을 재작업 1회로 기록했다.
- [현재 브라우저 화면](evidence/solar-polish.png): 일시정지 상태의 실제 렌더링. 네이티브 실기기 캡처가 아니다.

## 공개 시 지킬 해석 범위

- 이전에 하네스가 만들어진 기록의 전체 비용은 미측정이다. 장부의 setup 한 건은 전체 하네스 제작비가 아니다.
- 자동 검사 통과는 실기기 실행 성공이나 사용자 승인과 다르다. 사용자 확인은 임의로 채우지 않았다.
- 원시 수치·관측 모델·마크는 로컬 `_workspace/metrics/tasks.json`, 진행 중 마크는 `active.json`에 기록한다. 이 폴더는 Git 제외이며 아래 요약은 현재 시점의 저장본이다.
- 하네스 미사용 비교군이 없으므로 “토큰/시간 X% 절감”, “하네스 덕분에 빨라졌다”는 결론은 아직 낼 수 없다.

# 해커톤 관측 기록

개발 작업 33건 · 완료 32건 · 사용자 확인 0건 · setup 1건 별도
재작업 표시 13회 · 완료 작업 경과시간 중앙값 1.0분

| 작업 | 구분 | 상태 | 경과(분) | 관측 토큰 | 시스템 토큰 | 재작업 | 사용자 확인 |
|---|---|---|---:|---:|---:|---:|---|
| 승인된 스킬 설치·배정 및 보안 점검 | setup | done | 18.9 | 7744112 | 508255 | 0 | 미확인 |
| 가로 3D 태양 지구 달 시작 화면 | harness | done | 8.1 | 3208205 | 510401 | 0 | 미확인 |
| Fix Three.js native entry crash | harness | done | 1.1 | 655511 | 136688 | 1 | 미확인 |
| Sun-centered space scene polish; disable zoom | harness | done | 4.4 | 2713995 | 429305 | 1 | 미확인 |
| Half-scale system and preset body focus zoom | harness | done | 1.7 | 1490605 | 196598 | 1 | 미확인 |
| Real physical half-scale sizes/distances and surface-attached corona | harness | done | 3.0 | 1595899 | 106768 | 1 | 미확인 |
| Overview visibility, two-stage focus flight and compact controls | harness | done | 1.0 | 832563 | 112017 | 0 | 미확인 |
| Stable orbital tracking, reset-angle staged flights and manual zoom | harness | done | 2.1 | 1301379 | 118023 | 0 | 미확인 |
| Keep current target while zooming out between body focuses | harness | done | 0.2 | 220938 | 0 | 1 | 미확인 |
| Body-centered continuous flight and gentle Sun camera orbit | harness | done | 1.4 | 1119995 | 123557 | 1 | 미확인 |
| Lock gestures throughout complete focus transitions | harness | done | 1.1 | 1140396 | 127729 | 0 | 미확인 |
| Reset zooms out from current body and angle | harness | done | 1.6 | 1386105 | 131103 | 1 | 미확인 |
| Update button highlight and description on selection immediately | harness | done | 0.1 | 233756 | 0 | 0 | 미확인 |
| Sun-centered reset, Earth-Moon local overview and curved camera flights | harness | done | 1.7 | 986768 | 144079 | 1 | 미확인 |
| Preserve camera angle, direct overview-to-Sun zoom and lower arcs | harness | done | 1.1 | 1251595 | 146992 | 0 | 미확인 |
| Remove camera catch-up and smooth continuous approach | harness | done | 1.0 | 1264939 | 149535 | 1 | 미확인 |
| Fix all automatic flights to Reset View angle | harness | done | 0.2 | 254284 | 0 | 1 | 미확인 |
| Direct source-centered reset zoom and repeated-reset guard | harness | done | 0.8 | 769657 | 153370 | 1 | 미확인 |
| Ignore Reset whenever overview is selected | harness | done | 0.2 | 257738 | 0 | 0 | 미확인 |
| Blend toward reset angle while zooming | harness | done | 0.2 | 258984 | 0 | 0 | 미확인 |
| Direct faster Sun-to-Earth/Moon flights without zoom-out | harness | done | 0.2 | 260199 | 0 | 0 | 미확인 |
| Restore restrained low-arc Sun-to-body zoom-out | harness | done | 0.2 | 261298 | 0 | 0 | 미확인 |
| Raise Sun flight arc to intermediate height | harness | done | 0.2 | 262150 | 0 | 0 | 미확인 |
| Restore standard Sun flight parabola with faster travel | harness | done | 0.2 | 263109 | 0 | 0 | 미확인 |
| Restore original Sun flight duration | harness | done | 0.1 | 263869 | 0 | 0 | 미확인 |
| Focus Earth and Moon from the sunlit side | harness | done | 0.2 | 265107 | 0 | 0 | 미확인 |
| Moon-first Earth-facing phases, reordered copy and reset guards | harness | done | 4.4 | 2466018 | 494777 | 0 | 미확인 |
| Separate intro lunar phases from bright Moon button focus | harness | done | 1.1 | 1128357 | 170447 | 1 | 미확인 |
| Start lunar introduction at full Moon | harness | done | 0.1 | 284832 | 0 | 0 | 미확인 |
| Start intro Moon with roughly one-third shadow | harness | done | 0.1 | 285740 | 0 | 0 | 미확인 |
| Tap enlarged overview bodies to open Earth-Moon orbit view | harness | done | 1.3 | 1163040 | 176485 | 0 | 미확인 |
| Tap Moon in Earth orbit view to reopen lunar introduction | harness | done | 0.8 | 886579 | 180896 | 0 | 미확인 |
| Earth return tap and non-penetrating Earth-Moon camera path | harness | done | 2.1 | 1211895 | 188250 | 1 | 미확인 |
| Plan Earth-Moon flight around Earth instead of pushing camera on contact | harness | cancelled | 2.1 | 1565015 | 192790 | 0 | 미확인 |

## 비교

동일 완료 조건(spec)의 사용자 확인된 baseline/harness 쌍이 없어 절감률은 계산하지 않음.

## 해석 범위

- 토큰은 로컬 token_count.total_token_usage의 마크 간 차이. 캐시 입력은 입력의 부분집합, 추론 출력은 출력의 부분집합이며 다시 더하지 않는다.
- 메인·일반 서브에이전트 합계를 관측 토큰으로 표시한다. Codex의 권한 심사(guardian)는 별도 시스템 열에 남기며 사용자가 요청하는 코드 리뷰와 다르다.
- 이벤트가 늦게 기록되므로 시작/종료 경계와 마지막 응답 일부가 빠지거나 이전 구간 응답이 섞일 수 있다. 정확한 청구·계정 한도 지표가 아니다. 관측 시각·모델·원시 카운터는 tasks.json에 보존한다.
- 경과시간은 사용자 대기·휴식·빌드 대기를 포함한다. 작업 시간이나 순수 추론 시간으로 부르지 않는다.
- 비교는 사람이 같은 완료 조건·시작 상태·기기·네트워크·관측 범위인지 확인한 쌍만 사용한다. 모델/effort가 다르면 하네스 전체 운영 방식 비교이지 지시문만의 효과가 아니다.
- baseline도 이 수집기로 기록하되 하네스 지침을 적용하지 않은 별도 작업이어야 한다. variant 라벨만 바꿔 비교군으로 만들지 않는다. 연습·순서 효과와 적은 표본은 발표 시 공개한다.
- 기록 기능·하네스 제작 비용은 개발 작업과 별도로 보고한다. 토큰 절감률을 요금 또는 사용 가능 시간 증가율로 바꾸어 말하지 않는다.

## 후속 변경: 하프 스케일과 버튼 줌

천체·궤도·태양 코로나를 함께 0.5 스케일로 맞췄다. 버튼 선택 시 해당 천체로 줌인·추적하고 Reset은 태양 중심 전체 보기로 복귀한다. 수동 휠·핀치는 계속 차단한다. 타입 검사와 브라우저의 세 천체 선택/초기화/드래그/수동 줌 차단 검사를 통과했다. 실기기 검증은 미실시. 태양 코로나의 부모 스케일 반영 보정을 재작업 1회로 기록했다.

[지구 선택 시 브라우저 화면](evidence/earth-focus.png)

## 후속 정정: 실제 반지름·평균 거리의 하프 스케일

사용자가 의미한 하프 스케일은 기존 데모 장면의 0.5배가 아니라 실제 물리량의 0.5배였다. 이전 해석 오류를 정정했다. `scale.ts`에서 km에 동일한 0.5 / 1,000,000 계수를 적용한다. 태양/지구/달 평균 반지름 695,700/6,371/1,737.4km, 평균 중심 거리 149,597,870.7/384,400km를 사용하며 원본 NASA 문서는 해당 파일에 연결했다. 궤도는 단순 원운동·시간 가속 데모다.

태양 코로나의 투영 반지름을 표면에 맞췄다. 보조 방향 조명을 제거하고 태양 점광원과 희미한 환경광으로 낮/밤을 표현했다. 타입 검사와 브라우저의 선택 줌/초기화/회전/핀치·휠 차단 확인 통과, 셰이더 오류 없음. 실제 크기 비교용 전체 보기에서 지구는 매우 작아 위치 마커를 따로 표시한다. 기본 화면은 태양 클로즈업이다. 실기기 미확인. 사용자에 의한 이전 스케일 해석 정정을 재작업 1회로 기록했다.

- [태양과 연결된 코로나](evidence/real-scale-sun.png)
- [지구의 낮과 밤](evidence/real-scale-earth.png)
- [달 선택 줌](evidence/real-scale-moon.png)

## 후속 UX 조정

전체 보기에서만 천체 크기와 달의 표시 간격을 과장해 가독성을 확보하고, 집중 보기에서는 실제 물리 하프 스케일로 복원한다. 천체 간 선택 이동은 1.8초 전체 보기 경유 후 다음 천체로 이동한다. 연속 선택/Reset/언마운트 시 예약 이동을 취소한다. 정지·리셋은 오른쪽 하단 아이콘으로 정리했다. 타입 검사 및 브라우저 선택/Reset/회전/수동 줌 차단 확인 통과, 실기기 미확인. 최신 숫자는 로컬 metrics/report.md에 기록한다.

## 궤도·카메라 안정화

- Camera update: reset-angle overview routing, 2s eased center/distance flight, gradual overview display scaling; floating origin removes close-up coordinate jitter; orbit resolution 4096 segments; camera independent of body spin; manual pinch/wheel zoom restored. Typecheck/browser controls PASS; native device not checked.

카메라와 천체 회전을 분리하고, 근접 보기 좌표 정밀도를 위한 원점 이동을 적용했다. 자동 이동 중에는 Reset 각도를 유지한다. 브라우저에서 세 대상 전환·Reset·회전·휠·핀치 확대를 실행해 오류 없음을 확인했다. 궤도 선과 물체의 정렬 및 실기기 체감 부드러움은 사용자 확인 전이다.

## 시점 이동 해석 정정

- Focus correction: only reset the viewing angle; zoom-out holds the current target center, then zoom-in tracks the next target. Explicit Reset still returns to Sun-centered overview. Typecheck passed; this change has not been visually/device checked.

## 천체 중심 전환 연결 개선

- Sun view: slow camera orbit, surface self-rotation removed (convection retained). Switching bodies keeps current body selected/tracked while zooming out; at wide range, center moves to next body before zoom-in. Flight starts from actual camera distance, including manual zoom. Typecheck/browser transition+zoom controls PASS; native smoothness unverified.

- End-to-end camera input lock: drag/pinch/wheel blocked from focus/reset request through outgoing zoom, intermediate stage, incoming zoom, and camera settling. Outgoing stage cannot unlock itself. Manual camera lag does not relock normal controls. Typecheck and browser post-transition control checks passed; native device unverified.

- Reset now zooms outward around the current body while preserving viewing angles; it no longer heads toward the Sun first. App launches directly in the wide overview, with no initial Sun zoom. Typecheck and browser initial overview → Earth → Reset flow passed; physical device unverified.

- HUD selection/description now uses requestedBody, updated immediately on button press independently of the delayed camera target. Reset clears both. Typecheck passed; no visual/device check for this change.

- Camera flight correction: removed timeout-driven zoom-out/center-shift/zoom-in steps. A single frame-driven eased curved flight now widens and moves together. Earth↔Moon uses local peak distance (4 lunar-orbit radii), while other body flights use system-wide range. Reset initially widens at the moving source body, then finishes at the Sun-centered overview. Request revisions handle retarget/reset without stale timers. End-to-end input lock retained. Typecheck and browser Sun/Earth/Moon focus/reset/drag/wheel/pinch checks passed with no runtime errors; physical-device motion remains unverified.

- Flight adjustment: preserve actual starting camera azimuth/elevation instead of rotating toward the reset angle. Overview→Sun directly zooms in over 2 seconds without the wide-out leg. Arc height reduced from 18% of travel (cap 25% of peak range) to 2.5% (cap 4%). Sun idle orbit remains. Typecheck and browser focus/reset/drag/zoom checks passed; device motion unverified.

- Smooth approach correction: automatic flights now set the camera directly from the one computed flight trajectory, removing the extra damping pass/final catch-up. The wide point uses sinusoidal easing over the overall smooth progress instead of two flat quintic endpoints, reducing the apparent mid-flight pause. Manual camera damping retained. Typecheck/browser focus/reset/zoom controls passed; physical-device smoothness remains unverified.

- Angle correction: every automatic focus/reset flight now uses the fixed Reset View yaw .18 / pitch .48 throughout, regardless of the preceding manually rotated angle. Typecheck passed; visual/device check not performed for this small correction.

- Reset fix: keep tracking source body until zoom-out reaches 25% of the system overview distance; only then blend the center toward the Sun, finishing at the canonical overview. Ignore Reset when already at default overview or while Reset is running; manually changed overview still resets. Typecheck and browser repeated Reset (initial/flight/end) + post-reset wheel unlock checks passed; no runtime errors. Physical-device smoothness unverified.

- Reset is now an unconditional no-op whenever overview is selected, including manually rotated/zoomed overview and an in-progress reset. Typecheck passed; no additional visual check for this guard.

- Angle blend: capture actual camera yaw/pitch at automatic flight start, then ease along the shortest yaw path toward the Reset View angle over the same flight progress as zoom. Removes instant angle snap; overview Reset remains a no-op. Typecheck passed; this small change not visually/device checked.

- Sun→Earth/Moon now uses a direct 1.6-second flight with no preliminary widening or vertical arc. Distance blends directly toward the destination close-up; other routes are unchanged. Typecheck passed; visual/device check not performed for this small change.

- Sun→Earth/Moon zoom-out restored with restrained peak range (0.65 Earth orbital radius instead of system overview), 2.6-second duration, and arc height limited to 0.5% of travel / 1% of peak range. Typecheck passed; visual/device check not performed for this adjustment.

- Sun flight arc adjusted to an intermediate height: 1.2% of travel capped at 2.2% of peak range. Zoom range and duration unchanged. Typecheck passed; visual/device check not performed.

- Sun→Earth/Moon standard curved route restored: system overview peak, standard arc (2.5% travel capped at 4% peak). Only duration shortened to 2.2s; single-pass interpolation and smooth arrival retained. Typecheck passed; visual/device check not performed for this parameter adjustment.

- Sun→Earth/Moon duration restored to the standard 3.6 seconds; original curve/range and single-pass arrival retained. Typecheck passed.

- Earth/Moon focus arrival now faces the daylight hemisphere: destination azimuth points from the body toward the Sun, with pitch .25. Angle follows the moving target during automatic flight and blends smoothly from the start angle. Manual orbit remains available after arrival. Typecheck passed; visual/device check not performed for this change.

## 달 시작 화면과 관찰 위상

첫 화면은 일반 달 포커스와 구분되는 확대된 인트로다. 천체 크기·달 간격은 전체 보기 표시 배율을 쓰며, 관찰 방향은 지구 쪽을 따라간다. 가속된 단순 원궤도에서 태양 광원에 대한 관찰 각도가 바뀌므로 밝은 부분이 변화한다. 실제 날짜의 달 위상 계산은 아니다. 버튼·설명은 Moon부터 시작하며 MOON/EARTH/SUN 순서다. 다른 천체 선택 또는 Reset 뒤에는 일반 보기로 전환한다.

타입 검사 통과. 브라우저에서 요청 문구·버튼 순서·반복 리셋 무동작·수동 확대된 전체 보기의 리셋 복구 검사를 통과했다. 최초 리셋 스크린샷 비교는 표시 배율 보간이 끝나기 전에 캡처해 실패했고, 보간 종료를 기다리도록 검증 대기 조건을 수정했다. 실제 화면에서 아래 두 시점의 달 위상 변화를 확인했다. 네이티브 기기 확인은 미실시다.

- [확대된 첫 달 화면](evidence/moon-intro-large.png)
- [공전 후 달의 밝은 부분 변화](evidence/moon-intro-phase.png)

- Moon view correction: intro alone uses the Earth-side observer and starts near a half Moon (initial orbit angle 1.7), then changes phase with motion. Pressing MOON exits intro via direct same-body flight and faces the Sun-lit hemisphere; regular Moon focus keeps that bright-side viewing direction while allowing manual offset. Title explicitly breaks as A DREAM / AS OLD AS HUMANITY. Typecheck and browser render passed; intro vs bright-button screenshots visually confirmed; native unverified.

- Intro initial Moon orbital angle now .35, aligned opposite the Sun from Earth for a full-Moon start; subsequent phase motion unchanged. Typecheck passed.

- Intro starts approximately two-thirds lit / one-third shadow with initial Moon angle 1.68; later phases retained. Typecheck passed; visual check not performed for this parameter adjustment.

- Overview Earth/Moon meshes are tappable (larger invisible hit spheres). A tap opens Earth-centered orbit view at 3.2 enlarged lunar-orbit radii, retaining overview display sizes/separation. Object buttons switch to physical close-up; Reset returns to full system. Typecheck passed; actual overview Earth click and resulting Earth/Moon orbit screenshot visually confirmed in browser with no runtime errors. Native touch unverified.

- In Earth-centered enlarged orbit view, tapping the Moon mesh now opens the phase-changing enlarged Moon introduction at the current simulation time. Input lock and immediate Moon HUD selection retained. Normal MOON button still uses bright-side physical close-up. Typecheck and browser actual mesh navigation sequence overview→Earth orbit→Moon intro passed; native touch unverified.

- Enlarged Moon introduction: Earth mesh tap now returns to enlarged Earth-centered orbit. Earth→Moon flights add clearance over Earth; camera position is constrained outside 1.35× the currently displayed Earth radius. Enlarged Moon observer distance reduced below (Moon separation − 1.4× displayed Earth radius), fixing the previous endpoint inside enlarged Earth. Typecheck and actual browser Moon-view rotation/Earth mesh click/return orbit flow passed without runtime errors; native touch/flight perception unverified.

- User requested camera rollback: removed Earth spherical detour, surface push-out and camera-dependent Earth scaling, restored original enlarged Moon observation distance. Passing through Earth is allowed again. Earth/Moon mesh navigation remains. Detour task marked cancelled; rollback typecheck passed.
