# 달 남극 지평선 프로파일 이관 메타데이터

확인일 2026-11-14

## 이관 담당자에게 보낼 답변

`landing_screen`의 과학 데이터는 27개 후보 대표점에서 사전 계산한 지형 지평선 프로파일입니다. `candidates.csv`를 좌표 및 표고의 기준으로 삼고, `site`로 각 `<site>_horizon.csv`와 연결해 주세요. Reader에서는 DEM을 읽어 지평선을 재계산하는 단계 대신 이 프로파일을 읽으면 됩니다.

**관측자 높이는 27개 사이트 모두 지표 위 1.0 m입니다.** Site01 GeoJSON의 값과 일치하며, 전 사이트에 적용된 높이는 생성 코드의 `R + point.ground + 1`에서 확인했습니다. `elevation_5m_m`은 5 m 격자 DEM에서 읽은 후보 픽셀의 **지표 표고(m)**입니다. 관측자의 기준 구면 위 높이에는 여기에 1.0 m를 더합니다.

좌표는 JPL DE421에 연결된 달 `MOON_ME` 프레임의 달 중심 기준 위도와 동경 양수 경도입니다. 기준 구면 반지름은 **1,737,400 m**입니다. 방위각은 현지 북쪽 0°에서 시계 방향으로 증가하고, 지평선 고도각은 현지 수평면에서 위를 양수로 잽니다. DEM 제품, NoData 처리와 재현 방법은 아래에 기록했습니다. 이관된 데이터의 파일 구조와 메타데이터를 확인한 뒤, 일치하는 관측점·높이의 천체 각도를 연결해 주세요. 이 문서는 이관용 확인 기록이며 수신 시스템의 파일 이관이나 Reader 적용 상태는 별도로 확인해야 합니다.

## 입력 제품과 좌표

| 항목 | 값 |
|---|---|
| 국지 표고 | NASA PGDA High-Resolution LOLA Topography for Lunar South Pole Sites, 사이트별 `<site>_final_adj_5mpp_surf.tif` |
| 광역 표고 | NASA PGDA A New View of the Lunar South Pole from LOLA, `LDEM_80S_20MPP_ADJ.TIF` (로컬 `LDEM_80S_20MPP_ADJ.tiff`) |
| 원본 투영 | 달 남극 입체 투영, 중심 위도 −90°, 중앙 경선 0°, 극점 축척 1, X/Y 단위 m |
| 달 기준 프레임 | `MOON_ME` (JPL DE421), 구면형 달 중심 기준 위도 |
| 지표 표고 기준 | 기준 반지름 1,737,400 m에 대한 방사 방향 높이, 단위 m |
| CSV 각도 단위 | 십진 도. 남위 음수, 동경 양수, 서경 음수 |

[NASA 5 m 후보지 DEM](https://pgda.gsfc.nasa.gov/products/78) · [NASA 20 m 광역 DEM](https://pgda.gsfc.nasa.gov/products/90)

## 파일과 열

- `candidates.csv`는 27개 사이트의 대표점 목록입니다. `latitude_deg`, `longitude_deg`는 대표점 좌표입니다. `elevation_5m_m`은 후보 픽셀의 지표 표고입니다. `square_side_m`은 해당 지도의 최대 경사 5° 이하 정사각형 한 변입니다. `screened`는 한 변 100 m 이상의 지형 선별 기준을 통과했다는 뜻입니다.
- `Site01_mmgis.geojson`은 표시용 대표점입니다. 좌표 배열은 `[경도, 위도]` 순서이며, 달 좌표로 해석합니다.
- `<site>_horizon.csv`는 사이트당 3,600행입니다. `azimuth_deg`는 0.0°부터 359.9°까지 0.1° 간격으로 증가합니다. 현지 북·동·남·서는 각각 0°, 90°, 180°, 270°입니다.
- `horizon_deg`는 위 방향에서 표본 중 최대인 지형 고도각입니다. 관측점의 방사 방향에 수직인 현지 수평면이 0°입니다. 음수도 유효한 값입니다.
- `blocker_horizontal_distance_m`는 그 최대각을 만든 지형점까지의 현지 접평면상 수평 거리입니다. `searched_ground_distance_m`는 마지막 유효 표본까지의 기준 구면상 호 거리입니다. 두 거리의 정의가 다릅니다.

## 생성 및 NoData 정책

프로파일은 각 방위각의 대권 방향을 따라 표고를 쌍선형 보간해 최대 고도각을 구합니다. 5 m 사이트 DEM 내부에서는 5 m 간격으로, 그 바깥에서는 20 m 간격으로 진행합니다. 국지 DEM의 보간이 불가능하거나 결과가 NaN 또는 무한대이면 광역 DEM으로 대체합니다. 광역 DEM도 보간할 수 없거나 결과가 비유한이면 그 방향의 추적을 종료하고 마지막 유효 표본 거리까지의 최대값을 기록합니다. 첫 유효 표본이 하나도 없으면 생성은 오류를 내며, 결측각을 0°로 채우지 않습니다. 구현은 유한성 검사에 기반하며 별도의 유한 NoData 센티널을 해석하지 않습니다.

탐색 상한은 1,000 km입니다. 방향마다 실제 DEM 범위 내에서 확인한 길이는 `searched_ground_distance_m`을 사용하세요. 달 곡률은 관측자와 지형점을 기준 구면 및 각 표고에서 계산한 기하로 반영했습니다. 결과는 표본으로 계산한 지형 차폐각이며 태양 원반, 지상국 링크 조건, DEM 범위 밖 지형은 별도로 평가해야 합니다.

## 도구 버전 및 재현

생성 도구는 프로젝트 전용 Java 소스입니다. 별도의 릴리스 번호 대신 아래 SHA-256으로 확인 시점의 코드를 식별합니다. 현재 실행 환경은 Eclipse Temurin OpenJDK **25.0.5+8 LTS**입니다.

| 소스 | SHA-256 |
|---|---|
| LunarHorizonRefresh.java | `aa5cfe16c9a1f6178cf08b54b6d7280a1bd07d26968fa7fa822ca841e0759485` |
| LunarHorizon.java | `772b460155c8c4e463164445991ca035c5f73731384ca6f52d5eb9ce97f7ec44` |
| LunarLandingScreen.java | `1027ae7c8f497eb32df6047884d2f5f29088068b8aa4bbd8ef0a2f5ddc1ace04` |

원본 TIFF, `NASA_LOLA_5m_DEM`, `landing_screen/candidates.csv`가 있는 프로젝트 폴더에서 새 출력 폴더명을 사용합니다.

```bash
java -Xmx6g LunarHorizonRefresh.java landing_screen_reproduced
```

## Reader 확인과 Horizons 연결

`site`별 CSV가 하나씩 존재하는지, 헤더와 방위각 격자가 맞는지, 필요한 값이 유한한지 확인합니다. 좌표·관측 높이·각도 기준의 일치 여부를 확인할 수 없다면 수신 측의 `METADATA_INCOMPLETE` 상태를 유지합니다. 프로파일을 사용해도 관측점 또는 높이를 바꾸면 그 조건의 지평선은 다시 계산해야 합니다.

Site01의 위도는 −89.6307206°, 경도는 −129.9644390°(동경 0–360° 표기로 230.0355610°), 지표 표고는 863.783 m입니다. 지표 위 1 m에 대응하는 기준 구면 위 높이는 **0.864783 km**입니다. Horizons Observer Table에서 태양(10) 또는 지구 중심(399)의 겉보기 방위각·고도각(항목 4)을 받습니다. 달 표면 사용자 정의 관측점의 좌표 입력 순서는 경도, 위도, 높이(km)입니다. 출력 헤더에서 달 관측점의 프레임과 기준면을 확인하고 필요하면 관측점 좌표를 변환합니다.

가시성의 기하학적 여유각은 천체 중심 고도각에서 같은 방위각의 `horizon_deg`를 뺀 값입니다. 양수이면 DEM 범위 내에서 중심이 가시이고, 0 이하이면 차폐입니다. 359.9°와 0.0°는 연속이며 Reader가 그 경계에서도 같은 방위각 조회 방식을 사용해야 합니다. Site01의 기준 검산값은 방위각 220.0°에서 **8.1972760°**, 차폐 지형 수평 거리 **5,730.6 m**, 탐색 거리 **311,785 m**입니다.

[JPL Horizons 매뉴얼](https://ssd.jpl.nasa.gov/horizons/manual.html)
