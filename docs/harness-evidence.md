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

개발 작업 42건 · 완료 41건 · 사용자 확인 0건 · setup 1건 별도
재작업 표시 16회 · 완료 작업 경과시간 중앙값 1.0분

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
| Rocket sticker companion with open-bot-avatar eyes and header controls | harness | done | 4.8 | 12828115 | 689384 | 1 | 미확인 |
| Larger tilted floating rocket and smooth native-driven expressions | harness | done | 3.7 | 3152524 | 436389 | 0 | 미확인 |
| Reset stale Worklets plugin transforms and isolate Metro cache | harness | done | 2.8 | 3711244 | 463042 | 1 | 미확인 |
| Replace header orbital mark with supplied Space Apps SVG | harness | done | 0.2 | 377350 | 0 | 0 | 미확인 |
| Use supplied white motif logo with transparent backing | harness | done | 0.3 | 756737 | 0 | 0 | 미확인 |
| Slightly enlarge header logo | harness | done | 0.0 | 0 | 0 | 0 | 미확인 |
| Simulation calendar and 0.25x–2x playback speed menu | harness | done | 4.6 | 4708465 | 329645 | 0 | 미확인 |
| Hide 1x tag, restore Earth spin and dismissible speed menu | harness | done | 0.8 | 1198658 | 99323 | 1 | 미확인 |
| Use outlined play and pause icons | harness | done | 0.0 | 0 | 0 | 0 | 미확인 |

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

## 로켓 동반자와 상단 조작 버튼

이전 작업은 `0c6313a`로 먼저 커밋했다. LIVE SIMULATION 표시를 없애고 정지/리셋을 상단 오른쪽으로 이동했다. 하단 오른쪽 로켓은 사용자가 제공한 몸체를 ImageGen으로 투명 에셋화하고 실제 open-bot-avatar 0.2.1의 DOM-free avatarFrame 눈을 react-native-svg로 렌더링한다. 누르면 1.6초 happy 표정 후 idle로 돌아온다. MIT 원문/출처는 docs/rocket-companion.md 및 docs/licenses에 보관했다.

타입 검사, iOS/Android 번들 생성, 브라우저 버튼 위치/상태 텍스트 제거/표정 전환·복귀 검사를 통과했다. 몸체 표시 및 SVG 쌓임 순서 문제를 보정한 후 아래 화면을 시각 확인했고 console/runtime 오류가 없었다. 실기기 미확인. 이 작업의 start 마크는 이미지 생성 후 기록되어 이미지 생성 호출 비용과 시간은 장부에 포함되지 않는다. 측정 누락을 0으로 주장하지 않는다.

- [기본 표정](evidence/rocket-idle.png)
- [클릭 후 웃는 표정](evidence/rocket-happy.png)

## 로켓 전체 동작과 눈 애니메이션

로켓을 118pt에서 160pt로 키우고 오른쪽으로 기울였다. 몸체와 두 표정 눈 레이어를 한 Reanimated 컨테이너에 넣어 함께 부유/반응한다. 클릭하면 위로 뜨며 기울기와 크기가 반응한다. 기존 50ms(20Hz) setInterval/setState 기반 avatarFrame 재계산을 없앴고, 패키지의 고정 idle/happy 눈 데이터를 네이티브 transform/opacity로 깜빡임·시선·표정 전환한다. UI 스레드 애니메이션으로 바꿨지만 실제 기기 FPS 향상률은 측정하지 않았다.

타입 검사, iOS/Android 번들, 브라우저 크기/부유 transform/웃는 눈 opacity/복귀 검사 통과. console/runtime 오류 없음. 두 화면을 시각 확인했으며 네이티브 기기는 미확인이다.

- [부유·기울기](evidence/rocket-floating.png)
- [몸체와 함께 반응하는 웃음](evidence/rocket-floating-happy.png)

## Worklets 변환 버전 오류 대응

사용자 로그의 마지막 실행 차단 오류는 JS 0.13.0 / Babel plugin 0.13.1 불일치였다. 설치 트리는 Worklets 0.13.0 단일 버전임을 확인했다. 이 레포에서 실행되던 Metro를 종료하고 캐시 초기화 후 재시작했다. Metro cacheVersion에 설치된 Worklets/Reanimated 버전을 넣어 이후 버전 변경 시 변환 캐시를 분리했다. 실제 src/app을 포함한 iOS dev 번들에서 __pluginVersion 표식 505개가 모두 0.13.0인 것을 검증했다. 타입 검사 통과. 기기 내 이전 runtime 상태와 ExpoAsset 관련 예전 로그의 해소 여부는 실기기 재실행 미확인이다. Three.Clock/EXGL 지원 경고는 숨기지 않았다.

검증 과정의 독립 Babel 샘플은 물리 파일 없이 호출하여 테스트 환경 설정 오류가 났고, 처음 받은 Metro 번들은 routerRoot 파라미터가 빠져 앱 화면이 포함되지 않았다. 실제 src/app routerRoot로 받은 전체 앱 번들로 검증을 대체했다. 이 테스트 준비 오류는 앱 수정 횟수와 구분한다.

- Header mark replaced with user-supplied Space Apps Color and Black motif SVG, rendered using existing react-native-svg. Original vector paths/colors retained on a small white backing for contrast against space. Typecheck passed; visual/device check not performed for this small asset change.

- Header logo switched to user-supplied Color and White motif SVG; removed white backing so the original vector renders on transparent background. Typecheck passed.

## 시뮬레이션 시각과 배속

ORBITAL EXPLORER 대신 동일 스타일의 한국시간 달력을 표시한다. 시작값은 2026-11-14 00:00:00 KST. 시뮬레이션 ref를 유일한 시간 원천으로 쓰고 궤도와 달력을 함께 정지/가속한다. 기본 환산은 루프 시간 1초=시뮬레이션 1일이며, 배속은 .25/.5/1/1.5/2. 태양계 움직임에는 NASA 평균 공전 주기(지구365.256일, 달27.3217일)를 적용했고 초기 각도는 기존 예술적 프리셋이라 날짜별 실제 천체력이라고 주장하지 않는다.

날짜 옆 배속 태그, 라인형 배속 아이콘, 축소된 드롭다운을 반영했다. 타입 검사, KST 자정 시작/날짜 이월, 브라우저 시간 정지·재개/배속 변경 시 연속성 및 메뉴/태그 위치 검증 통과. 캡처 시각 확인 완료; 네이티브 실기기 미확인.

공식 수치: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html 및 https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html

- [배속 메뉴](evidence/simulation-speed-menu.png)
- [날짜와 배속 태그](evidence/simulation-speed-tag.png)

- Playback polish: 1x badge hidden; Earth/cloud visual spin restored to previous .13/.145 rad per demo-loop second and still multiplied by playback speed. Calendar and mean orbital clock unchanged (visual spin no longer represents physical sidereal rotation). Outside overlay closes speed dropdown, header actions also dismiss it. Added a 60×48 outline menu button without menu contents. Typecheck and browser hidden/visible badge, outside-dismiss and rectangular button checks passed; native device unverified.

- 헤더 로고는 사용자 제공 Space Apps Color and White motif SVG 원본을 투명 배경으로 적용했으며 52pt로 조정했다. 재생/정지 아이콘은 outline으로 통일했다. 이 표시 조정의 별도 실기기 검사는 미실시다.

- Reset button moved from header to immediately after SUN in the body selector row. Existing reset behavior retained. Typecheck passed.

- MOON button now opens the same enlarged Earth-facing, phase-changing observer as startup (current simulation time retained), replacing the bright-side-only button view. Typecheck passed; no additional visual check for this routing change.

## MOON 버튼 관찰 방향 수정·직전 라우팅 롤백

직전 MOON→인트로 모드 연결은 사용자 지적에 따라 되돌렸다. MOON 버튼은 원래 일반 물리 스케일 근접 보기로 유지하며, 관찰 방향만 지구 쪽을 따라가도록 수정했다. 밝은 면으로 고정하던 도착 각도만 제거했다. 첫 확대 인트로/지구 중심 궤도 탐색/전환 크기 및 기존 버튼 구성은 유지했다.

타입 검사 통과. 브라우저에서 일반 MOON 버튼 진입 후 정지 상태와 재생 6초 후를 캡처·시각 확인했으며 밝은 부분이 달라졌다. runtime 오류 없음. 실기기 미확인.

- [MOON 버튼 진입 후](evidence/moon-focus-phase-start.png)
- [시간 경과 후](evidence/moon-focus-phase-later.png)

- Startup-only hidden playback multiplier 1.5 for 3 seconds after scene ready; user drag/zoom/focus/pause/speed choice ends it earlier. Multiplier eases toward 1 without changing selected UI speed or displaying a tag. Both orbital/calendar clocks share the multiplier. Typecheck passed; visual/device check not performed.

- User cancelled startup boost: removed hidden 1.5x, timer/touch boost reset hooks and startup multiplier. App starts at normal 1x again; explicit playback speed menu retained. Rollback typecheck passed; interrupted until-touch task recorded cancelled.

## 새 대각선 로켓 스티커

사용자가 제공한 첫 번째 로켓을 투명 몸체로 준비하고 두 번째 참조의 창 안 눈 위치만 적용했다. 이미지 자체가 기울어져 있어 기본 회전은 0으로 변경했다. Open Bot Avatar의 눈을 아이보리색으로 표시하고, UI 스레드 shared value로 몸체·눈이 함께 좌우로 흔들리며 웃게 했다. 기존 부유/깜빡임/시선/표정 복귀도 유지한다.

새 위치의 눈 정의가 패키지의 scale 최소값/몸체 내부 검증을 처음 통과하지 못해, 렌더하지 않는 눈 캐리어 몸체 정의와 scale을 수정했다. 눈 자체의 회전 중심도 창 안으로 보정했다. 최종 패키지 정의 검증·타입 검사·브라우저 기본 회전 0/웃음 전환/복귀 검사를 통과했다. 고해상도 캡처에서 몸체와 눈의 위치를 시각 확인했다. 네이티브 실기기 미확인. 첫 이미지 생성 호출은 이 작업의 start 마크 이전이므로 그 호출 비용/시간은 장부에 포함되지 않는다.

- [기본 눈 위치](evidence/diagonal-rocket-idle.png)
- [클릭 후 웃음·흔들림](evidence/diagonal-rocket-happy.png)

- Mascot body replaced with user-supplied neon/holographic rocket prepared as transparent PNG; small eyes repositioned inside its window. Existing restrained shake, floating and happy reaction retained; no idle tilt added. Typecheck/browser render and eye placement visually confirmed. Image generation was before the measurement start, so that cost is unmeasured by this task mark. Native unverified.

## 확정 로켓 크기 조정

`assets/rocket-neon-dark.png`를 최종 몸체로 사용한다. 160pt 터치 영역 안에서 몸체만 90%로 줄이고 눈 크기는 유지했다. 축소 후 창 중심에 눈 위치를 맞췄다. 기존 부유·작은 흔들림·웃음 반응을 유지한다. 타입 검사와 브라우저 기본/웃음 표시를 확인했다. 실기기 미확인.

## 달 핀 탐색 목업

메뉴에서 별도 달 구체로 진입하고 목업 핀 4개를 선택하면 NASA WMTS 평면 지도가 열린다. 위경도 데이터는 `lunar-sites.ts`에 분리했으며 아직 백엔드 연동은 없다. NASA GetCapabilities의 달 EQ 격자 및 JPEG 200 응답을 확인했다. 구체도 같은 NASA 타일로 구성해 핀/표면 좌표를 일치시켰다. 타입·좌표 assertion·브라우저 진입/핀/확대/복귀·타일 실패와 재시도 확인 통과. 실기기 미확인. 구현 및 소스 기록: [lunar-explorer.md](lunar-explorer.md).

## HORIZON_METADATA 반영

Site01 기준점과 MOON_ME/DE421 좌표·반지름·관측 높이 규약을 반영했다. 탐사 초기 방향은 남극, 실측 참조와 기존 목업은 구분한다. 27개 후보 CSV/지평선 파일은 레포에 없어 METADATA_INCOMPLETE를 유지하며 가시성 계산은 미구현이다. Site01 관측 기준 높이 0.864783 km assertion 및 브라우저 핀/메타데이터 표시 확인 통과. 향후 Reader 이관 조건과 과학적 한계는 docs/lunar-explorer.md에 기록했다.

## 기존 시뮬레이션 달에 남극 후보지 통합

별도 달 화면 진입을 제거하고 원래 달의 실제 크기 보기로 연결했다. 흰 목업 핀 3개와 회전축/극 이름을 표시하고, 핀 선택 시 기존 Canvas를 왼쪽으로 줄이며 오른쪽 NASA SP 지도 패널을 연다. 공식 카탈로그 및 Capabilities로 남극 영상 모자이크/투영/타일 행렬을 확인했다. 좌표 assertion·타입·브라우저 핀/축/남극 타일 확인 통과. 실기기 미확인.

## CSV 27개 후보지 적용

사용자 CSV 전 행을 로컬 JSON으로 보존했다. 남극 확대 시점·극 라벨 가림·선택 NASA RED·실제 square_side_m 기반 얇은 정사각형을 반영했다. 인접 핀은 하단 목록으로도 선택 가능하다. 방향 정보 없는 지도 축 정렬 사각형이며 확대 타일은 원본 해상도를 높이지 않는다. 타입·브라우저 후보27개 및 정사각형 크기 확인 통과, 실기기 미확인.

## 로컬 SP_Mosaic.tif 전환

사용자 TIFF(6082px, 인쇄 표기100m/pixel)에서 전체 지도와27개 상세 크롭을 생성해 API 요청을 제거했다. GeoTIFF좌표 태그가 없어 이미지 중심/인쇄 해상도/기준선으로 시각 보정했으며 정밀 등록은 미검증이다. 좌표상27개 모두 범위 내라 삭제0개. 경도/위도선과 후보지 이름을 표시했다. API 차단 브라우저에서 지도 요청0개·핀27개·빨간사각형/확대 확인, 타입 통과. 원본 해상도와 좌표 보정의 한계는 docs/lunar-explorer.md에 기록했다.

## 후보지별 DEM 파노라마

sphere 폴더의27개 JPEG를 후보지 ID에 정확히 매핑했다. 오른쪽 기존 지도를 절반 높이로 줄이고 세로 스크롤 하단에360도 DEM 파노라마를 추가했다. 양끝 정북 기준으로 초기 방향을 맞추고 좌우 네이티브 제스처로 관찰한다. 원본 바이트·이미지비율·좌우터치 장면 변화·세로터치 스크롤 확인, 타입/iOS번들 통과. iPhone 실기기 검증은 미실시.

## 마스코트 발사 연출

사용자 요청에 따라 웃음/기호 반응 완료 후 오른쪽 위로210ms 퇴장, 약500ms 뒤16px 원거리 로켓이280ms 동안 대각선 통과하도록 구성했다. 복귀하지 않는 선택을 반영해 루트 화면에 숨김 상태를 유지한다. 브라우저 반응 순서/약535ms 간격/행성 변경 후 숨김 유지와 타입 검사 통과. 실기기 미검증.

## 발사 완료 후 달 탐사 진입

마스코트 클릭 직후부터 두 번째 비행 완료까지 전체 입력과 궤도/줌 조작을 잠그고 HUD 버튼을 비활성화했다. 원거리 비행 완료 콜백에서 기존 메뉴의 달 탐사 진입 함수를 호출한다. 브라우저 잠금 지속/자동 탐사 진입과 타입 검사 통과, 실기기 미확인.

## 브랜드 스플래시와 원거리 달 진입

사용자 NASA 전체 로고와 마스코트/AZAS를 구분선으로 배치한 우주 시작 화면을 추가했다. 로컬 자산/폰트 캐싱과 3D 초기 렌더 준비 후에만 최대 축소 태양계에서 달로1.15초 진입하며, 준비/진입 동안 조작을 차단한다. 지연시킨 텍스처를 해제하기 전까지 스플래시 유지되는 브라우저 테스트, 타입/iOS번들 통과. Expo Go에서는 앱 내부 연출만 확인 가능하며 네이티브 정적 스플래시는 새 빌드 필요. 실제 iPhone 실행 미검증.

## STEP2 지구 발사지 탐색

버튼0.3pt 테두리/DEM360도 제목을 적용했다. 착륙지 선택 후 기존 지구로 이동하고 안내 진입까지 입력을 잠근다. 사용자CSV13개 발사지와 자전축/적도 고리를 표시하며 STEP1과 같은 대사 페이지/로켓/SELECT형식을 재사용했다. 타입·브라우저 전체 단계 전환 확인 통과. 지구축은 평균 기울기 시각화이며 실기기 미확인.
