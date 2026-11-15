import { useFrame, useThree } from '@react-three/fiber';
import { useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useLoader } from './render-surface';
import { launchSites } from './launch-sites';
import { lunarSites } from './lunar-sites';
import { Sun } from './sun';
import { TransferTrajectory } from './transfer-trajectory';
import { FlightRocket } from './flight-rocket';
import { createTransferRoute, FLIGHT_DURATION_SECONDS, AVERAGE_SPEED_KMH, type FlightTelemetry, type FlightPlayback, type FlightMarkers } from './transfer-route';
import { SIMULATION_RATE } from './simulation-clock';
import type { BodyId } from './space-hud';

import { scale, viewDistance, INITIAL_MOON_ANGLE, introMoonDistance } from './scale';

export type ViewControls = {
  yaw: number; pitch: number; zoom: number; locked: boolean;
  revision: number; fromBody: BodyId | null;
  surfaceFocus?: { siteId: string; startYaw: number; startPitch: number; progress: number };
  snapView?: boolean;
};
export type LunarProjection = { id: string; x: number; y: number; visible: boolean; opacity?: number }[];
type Props = {
  startup: 'loading' | 'flight' | 'done';
  onStartupDone: () => void;
  exploring?: boolean;
  earthExploring?: boolean;
  missionTransfer?: boolean;
  missionFlight?: boolean;
  flightActive?: boolean;
  flightTelemetry?: MutableRefObject<FlightTelemetry>;
  flightPlayback?: MutableRefObject<FlightPlayback>;
  flightMarkers?: SharedValue<FlightMarkers>;
  flightLaunchId?: string;
  flightLandingId?: string;
  onFlightArrived?: () => void;
  onTransferReady?: () => void;
  candidateSelected?: boolean;
  onExplorerArrival?: () => void;
  onLunarProjection?: (points: LunarProjection) => void;
  speed: number;
  simulationSeconds: MutableRefObject<number>;
  intro: boolean;
  systemView: boolean;
  onSystemFocus: () => void;
  onOverviewFocus: () => void;
  onMoonIntro: () => void;
  controls: MutableRefObject<ViewControls>;
  paused: boolean;
  selected: BodyId | null;
  onReady: () => void;
};

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const glowShader = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  uniform vec3 tint;
  uniform float strength;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 3.0);
    gl_FragColor = vec4(tint, rim * strength);
  }
`;

function Glow({ radius, color, strength }: { radius: number; color: string; strength: number }) {
  const uniforms = useMemo(() => ({ tint: { value: new THREE.Color(color) }, strength: { value: strength } }), [color, strength]);
  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 32]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={glowShader} uniforms={uniforms}
        transparent blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

function Orbit({ radius, center = [0, 0, 0], opacity = .25 }: { radius: number; center?: [number, number, number]; opacity?: number }) {
  const line = useMemo(() => {
    const points = Array.from({ length: 4096 }, (_, i) => {
      const a = i / 4096 * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    });
    return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: '#4a95af', transparent: true, opacity }));
  }, [radius, opacity]);
  useEffect(() => () => { line.geometry.dispose(); line.material.dispose(); }, [line]);
  return <primitive object={line} position={center} />;
}

function StarField() {
  const geometry = useMemo(() => {
    const count = 5200;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const random = (i: number) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
    for (let i = 0; i < count; i++) {
      const theta = random(i * 4) * Math.PI * 2;
      const y = random(i * 4 + 1) * 2 - 1;
      const r = 700 + random(i * 4 + 2) * 400;
      const flat = Math.sqrt(1 - y * y);
      positions.set([r * flat * Math.cos(theta), r * y, r * flat * Math.sin(theta)], i * 3);
      const bright = random(i * 4 + 3);
      sizes[i] = bright > .975 ? 5 : 1.2 + bright * 1.8;
      colors.set(i % 7 === 0 ? [1, .81, .63] : i % 3 === 0 ? [.63, .78, 1] : [.89, .94, 1], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('starSize', new THREE.BufferAttribute(sizes, 1));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);
  const { viewport } = useThree();
  const uniforms = useMemo(() => ({ pixelRatio: { value: Math.min(viewport.dpr, 2) } }), [viewport.dpr]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry}>
    <shaderMaterial transparent depthWrite={false} vertexColors uniforms={uniforms}
      blending={THREE.AdditiveBlending}
      vertexShader={`
        attribute float starSize;
        uniform float pixelRatio;
        varying vec3 starColor;
        void main() {
          starColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = starSize * pixelRatio;
        }
      `}
      fragmentShader={`
        varying vec3 starColor;
        void main() {
          vec2 p = gl_PointCoord - .5;
          float r = length(p);
          float core = exp(-r * r * 24.0);
          float alpha = core * (1.0 - smoothstep(.28, .5, r));
          gl_FragColor = vec4(starColor * 1.25, alpha);
        }
      `} />
  </points>;
}

function DeepSpace() {
  return <mesh>
    <sphereGeometry args={[2000, 32, 24]} />
    <shaderMaterial side={THREE.BackSide} depthWrite={false} vertexShader={vertexShader}
      fragmentShader={`
        varying vec3 vWorld;
        void main() {
          vec3 d = normalize(vWorld);
          float band = exp(-pow((d.y + d.x * .32 + .2) * 3.2, 2.0));
          float cloud = .5 + .5 * sin(d.x * 15.0 + sin(d.z * 9.0)) * sin(d.z * 12.0 + d.y * 7.0);
          vec3 haze = mix(vec3(.018,.027,.065), vec3(.05,.025,.075), cloud);
          gl_FragColor = vec4(vec3(.001,.002,.007) + haze * band * (.2 + cloud * .4), 1.0);
        }
      `} />
  </mesh>;
}

export function SolarScene({ missionFlight, flightActive, flightTelemetry, flightPlayback, flightMarkers, flightLaunchId, flightLandingId, onFlightArrived, missionTransfer, onTransferReady, startup, onStartupDone, exploring, candidateSelected, onExplorerArrival, onLunarProjection, earthExploring, speed, simulationSeconds, onMoonIntro, systemView, onSystemFocus, onOverviewFocus, intro, controls, paused, selected, onReady }: Props) {
  const [earthMap, moonMap, earthNormal, cloudsMap, rocketMap] = useLoader(THREE.TextureLoader, [
    require('../../../assets/textures/earth.jpg'),
    require('../../../assets/textures/moon.jpg'),
    require('../../../assets/textures/earth-normal.jpg'),
    require('../../../assets/textures/earth-clouds.png'),
    require('../../../assets/rocket-neon-dark.png'),
  ]);
  earthMap.colorSpace = moonMap.colorSpace = cloudsMap.colorSpace = rocketMap.colorSpace = THREE.SRGBColorSpace;
  const earthSystem = useRef<THREE.Group>(null);
  const earth = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);
  const moonHit = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  const lastMoonViewYaw = useRef(Math.atan2(-Math.cos(INITIAL_MOON_ANGLE), -Math.sin(INITIAL_MOON_ANGLE)));
  const visualOverview = useRef(intro || !selected ? 1 : 0);
  const sunVisual = useRef<THREE.Group>(null);
  const earthVisual = useRef<THREE.Group>(null);
  const moonOrbitVisual = useRef<THREE.Group>(null);
  const center = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const transition = useRef({ revision: 0, elapsed: 4, from: new THREE.Vector3(),
    startDistance: viewDistance.overview, peak: viewDistance.overview, duration: 3.6,
    yaw: .18, pitch: .48, startYaw: .18, startPitch: .48, direct: false, lowArc: false, source: null as BodyId | null, sourceStart: new THREE.Vector3() });
  const physicalSystem = useRef<THREE.Group>(null);
  const flightDistance = useRef(viewDistance.overview);
  const sourcePosition = useMemo(() => new THREE.Vector3(), []);
  const movingStart = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const { camera, size } = useThree();
  const transferMoon = useMemo(() => {
    const angle = INITIAL_MOON_ANGLE + simulationSeconds.current / 86400 * Math.PI * 2 / 27.3217;
    return new THREE.Vector3(Math.cos(angle) * scale.moonOrbit, 0, Math.sin(angle) * scale.moonOrbit);
  }, [missionTransfer, simulationSeconds]);
  const reducedMotion = useReducedMotion();
  const transferView = useRef({ elapsed: 0, startDistance: 1, startCenter: new THREE.Vector3(), startRotation: new THREE.Quaternion() });
  const flightRoute = useMemo(() => createTransferRoute(transferMoon), [transferMoon]);
  const flightSpriteSize = useRef(.001);
  const rocketView = useMemo(() => ({ elapsed: 0, lastTick: 0, completed: false, initialized: false, yaw: 0, pitch: .35, bearing: 0, distance: .001, point: new THREE.Vector3(), ahead: new THREE.Vector3(), tangent: new THREE.Vector3(), up: new THREE.Vector3() }), []);
  useLayoutEffect(() => {
    if (missionFlight) { rocketView.elapsed = 0; rocketView.completed = false; rocketView.initialized = false; }
    rocketView.lastTick = performance.now();
  }, [missionFlight, rocketView]);
  useLayoutEffect(() => { rocketView.lastTick = performance.now(); }, [flightActive, rocketView]);
  useEffect(() => {
    if (missionTransfer) transferView.current = { elapsed: 0, startDistance: camera.position.length(), startCenter: center.clone(), startRotation: camera.quaternion.clone() };
  }, [missionTransfer, camera, center]);
  const explorerArrived = useRef(false);
  useEffect(() => { explorerArrived.current = false; }, [exploring, earthExploring]);
  const projectionTimer = useRef(0);
  const startupFrames = useRef(0);
  const startupElapsed = useRef(0);
  const startupFinished = useRef(false);

  useFrame((_, delta) => {
    const dt = Math.min(delta, .05);
    if (!paused) {
      time.current += dt * speed;
      simulationSeconds.current += dt * speed * SIMULATION_RATE;
    }
    const t = time.current;
    visualOverview.current = THREE.MathUtils.lerp(visualOverview.current, intro || systemView ? 1 : selected ? 0 : THREE.MathUtils.smoothstep(flightDistance.current / viewDistance.overview, .08, .8), 1 - Math.exp(-dt * 4));
    const overview = exploring ? 0 : visualOverview.current;
    sunVisual.current?.scale.setScalar(scale.sunRadius / 1.55 * (1 + overview * 19));
    earthVisual.current?.scale.setScalar(scale.earthRadius / 1.02 * (1 + overview * 799));
    moon.current?.scale.setScalar(scale.moonRadius / .36 * (1 + overview * 1199));
    moonOrbitVisual.current?.scale.setScalar(1 + overview * 39);
    const days = simulationSeconds.current / 86_400;
    // Mean periods: NASA Earth/Moon fact sheets; initial phase remains the demo's preset.
    // Keep the previous gentle demo spin; calendar/orbits retain their shared clock.
    const earthSpin = t * .13;
    const a = .35 + days * Math.PI * 2 / 365.256;
    const moonAngle = INITIAL_MOON_ANGLE + days * Math.PI * 2 / 27.3217;
    const mx = Math.cos(moonAngle) * scale.moonOrbit * (1 + overview * 39);
    const mz = Math.sin(moonAngle) * scale.moonOrbit * (1 + overview * 39);
    const ex = Math.cos(a) * scale.earthOrbit;
    const ez = Math.sin(a) * scale.earthOrbit;
    if (earthSystem.current) earthSystem.current.position.set(ex, 0, ez);
    if (earth.current) earth.current.rotation.set(0, earthSpin - 1.1, earthExploring ? THREE.MathUtils.degToRad(23.44) : .12, earthExploring ? 'ZYX' : 'XYZ');
    if (moon.current) { moon.current.position.set(mx, 0, mz); moon.current.rotation.set(0, -(moonAngle - INITIAL_MOON_ANGLE), THREE.MathUtils.degToRad(1.542), 'ZYX'); }
    moonHit.current?.position.set(mx, 0, mz);
    if (clouds.current) clouds.current.rotation.set(0, t * .145 - 1.1, earthExploring ? THREE.MathUtils.degToRad(23.44) : .12, earthExploring ? 'ZYX' : 'XYZ');
    if (selected === 'earth') target.set(ex, 0, ez);
    else if (selected === 'moon') target.set(ex + mx, 0, ez + mz);
    else target.set(0, 0, 0);
    const positionOf = (body: BodyId | null, out: THREE.Vector3) => {
      if (body === 'earth') return out.set(ex, 0, ez);
      if (body === 'moon') return out.set(ex + mx, 0, ez + mz);
      return out.set(0, 0, 0);
    };
    if (transition.current.revision !== controls.current.revision) {
      const local = (controls.current.fromBody === 'earth' && selected === 'moon') ||
        (controls.current.fromBody === 'moon' && selected === 'earth');
      const startDistance = Math.max(camera.position.length(), .000001);
      const endDistance = systemView ? scale.moonOrbit * 40 * 3.2 : selected ? (intro ? introMoonDistance : viewDistance[selected]) : viewDistance.overview;
      const direct = (controls.current.fromBody === null && selected === 'sun') || controls.current.fromBody === selected;
      transition.current = {
        revision: controls.current.revision, elapsed: 0, from: center.clone(),
        startDistance, peak: direct ? startDistance : Math.max(startDistance, endDistance, local ? scale.moonOrbit * 4 : viewDistance.overview),
        duration: direct ? 2 : local ? 2.8 : 3.6, direct, lowArc: false,
        yaw: .18, pitch: .48,
        startYaw: Math.atan2(camera.position.x, camera.position.z),
        startPitch: Math.asin(THREE.MathUtils.clamp(camera.position.y / startDistance, -1, 1)),
        source: controls.current.fromBody, sourceStart: positionOf(controls.current.fromBody, new THREE.Vector3()),
      };
      controls.current.locked = true;
      controls.current.zoom = 1;
    }
    const flight = transition.current;
    flight.elapsed += Math.min(delta, .25);
    const u = Math.min(flight.elapsed / flight.duration, 1);
    const smooth = (x: number) => x ** 3 * (x * (x * 6 - 15) + 10);
    const endDistance = systemView ? scale.moonOrbit * 40 * 3.2 : selected ? (intro ? introMoonDistance : viewDistance[selected]) : viewDistance.overview;
    // Lift along a curved path while widening and closing the view continuously.
    // Reset starts by widening around the current body, then finishes at the Sun.
    const resetDistance = Math.exp(THREE.MathUtils.lerp(
      Math.log(flight.startDistance), Math.log(viewDistance.overview), smooth(u)));
    // Keep the source centered until the field of view can contain the trip to the Sun.
    const resetProgress = THREE.MathUtils.clamp(
      (resetDistance / viewDistance.overview - .25) / .75, 0, 1);
    const progress = smooth(selected ? u : resetProgress);
    const arc = flight.direct ? 0 : Math.min(flight.from.distanceTo(target) * (flight.lowArc ? .012 : .025), flight.peak * (flight.lowArc ? .022 : .04));
    positionOf(flight.source, sourcePosition);
    movingStart.copy(flight.from).add(sourcePosition).sub(flight.sourceStart);
    center.lerpVectors(movingStart, target, progress);
    center.y += 4 * progress * (1 - progress) * arc;
    if (physicalSystem.current) physicalSystem.current.position.copy(center).negate();
    if (!selected || flight.direct) {
      flightDistance.current = Math.exp(THREE.MathUtils.lerp(Math.log(flight.startDistance), Math.log(endDistance), smooth(u)));
    } else if (u < .5) {
      flightDistance.current = Math.exp(THREE.MathUtils.lerp(Math.log(flight.startDistance), Math.log(flight.peak), Math.sin(Math.PI * smooth(u))));
    } else {
      flightDistance.current = Math.exp(THREE.MathUtils.lerp(Math.log(flight.peak), Math.log(endDistance), 1 - Math.sin(Math.PI * smooth(u))));
    }
    const distance = flightDistance.current * controls.current.zoom * (exploring && !earthExploring ? 1.35 : 1);
    const near = Math.max(distance / 1000, .000001);
    if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
    if (selected === 'sun' && !controls.current.locked) controls.current.yaw += dt * .025;
    const moonViewYaw = Math.atan2(-Math.cos(moonAngle), -Math.sin(moonAngle));
    if (selected === 'moon' && !controls.current.locked && !exploring) {
      const change = Math.atan2(Math.sin(moonViewYaw - lastMoonViewYaw.current), Math.cos(moonViewYaw - lastMoonViewYaw.current));
      controls.current.yaw += change;
    }
    lastMoonViewYaw.current = moonViewYaw;
    // Earth arrives on its daylight side; Moon is viewed from Earth's direction to show phases.
    if (controls.current.locked && selected === 'earth') {
      flight.yaw = Math.atan2(-target.x, -target.z);
      flight.pitch = .25;
    }
    if (controls.current.locked && selected === 'moon') { flight.yaw = moonViewYaw; flight.pitch = exploring ? .22 : 0; }
    const angleProgress = smooth(u);
    const yawDelta = THREE.MathUtils.euclideanModulo(flight.yaw - flight.startYaw + Math.PI, Math.PI * 2) - Math.PI;
    let yaw = controls.current.locked ? flight.startYaw + yawDelta * angleProgress : controls.current.yaw;
    let pitch = controls.current.locked ? THREE.MathUtils.lerp(flight.startPitch, flight.pitch, angleProgress) : controls.current.pitch;
    const surfaceFocus = controls.current.surfaceFocus;
    if (earthExploring && earth.current && surfaceFocus) {
      const site = launchSites.find(site => site.id === surfaceFocus.siteId);
      if (site) {
        earth.current.updateWorldMatrix(true, false);
        const lat = THREE.MathUtils.degToRad(site.latitude), lon = THREE.MathUtils.degToRad(site.longitude);
        const normal = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)).applyQuaternion(earth.current.getWorldQuaternion(new THREE.Quaternion()));
        const targetYaw = Math.atan2(normal.x, normal.z);
        const deltaYaw = Math.atan2(Math.sin(targetYaw - surfaceFocus.startYaw), Math.cos(targetYaw - surfaceFocus.startYaw));
        yaw = surfaceFocus.startYaw + deltaYaw * surfaceFocus.progress;
        pitch = THREE.MathUtils.lerp(surfaceFocus.startPitch, Math.asin(normal.y), surfaceFocus.progress);
        controls.current.yaw = yaw; controls.current.pitch = pitch;
      }
    }
    if (controls.current.locked) { controls.current.yaw = yaw; controls.current.pitch = pitch; }
    desired.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(distance);
    if (controls.current.locked || controls.current.snapView) camera.position.copy(desired);
    else camera.position.lerp(desired, 1 - Math.exp(-dt * 9));
    controls.current.snapView = false;
    if (exploring) camera.up.set(-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch));
    else camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    if (controls.current.locked) {
      controls.current.locked = u < 1 || camera.position.distanceTo(desired) > Math.max(distance * .02, .000001);
    }
    if (startup !== 'done') {
      const far = viewDistance.overview * 5;
      if (startup === 'flight') startupElapsed.current += Math.min(delta, .05);
      const v = Math.min(1, startupElapsed.current / 2.8);
      const p = v*v*v*(v*(v*6-15)+10);
      center.copy(target).multiplyScalar(p);
      physicalSystem.current?.position.copy(center).negate();
      const endYaw = Math.atan2(-Math.cos(INITIAL_MOON_ANGLE), -Math.sin(INITIAL_MOON_ANGLE));
      const dy = Math.atan2(Math.sin(endYaw - .18), Math.cos(endYaw - .18));
      const yaw = .18 + dy * p, pitch = .48 * (1-p);
      const d = Math.exp(THREE.MathUtils.lerp(Math.log(far), Math.log(introMoonDistance), p));
      camera.position.set(Math.sin(yaw)*Math.cos(pitch)*d, Math.sin(pitch)*d, Math.cos(yaw)*Math.cos(pitch)*d);
      camera.up.set(0,1,0); camera.lookAt(0,0,0);
      camera.near = Math.max(d/1000,.000001); camera.updateProjectionMatrix();
      if (++startupFrames.current === 3) onReady();
      if (v === 1 && !startupFinished.current) {
        startupFinished.current = true;
        controls.current.yaw = endYaw; controls.current.pitch = 0; controls.current.zoom = 1;
        onStartupDone();
      }
    }
    if (missionTransfer && !missionFlight) {
      const view = transferView.current;
      view.elapsed += dt;
      const t = reducedMotion ? 1 : Math.min(1, view.elapsed / 1.8), p = t*t*t*(t*(t*6-15)+10);
      const up = new THREE.Vector3(transferMoon.z, 0, -transferMoon.x).normalize();
      const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), up));
      const fitDistance = scale.moonOrbit * 1.45 / (2 * Math.tan(43 * Math.PI / 360) * (size.width / size.height) * .8);
      const midpoint = new THREE.Vector3(ex, 0, ez).addScaledVector(transferMoon, .5);
      // Leave the lower band clear for the standard rocket dialogue.
      midpoint.addScaledVector(up, 2 * Math.tan(43 * Math.PI / 360) * fitDistance * -.08);
      center.lerpVectors(view.startCenter, midpoint, p);
      physicalSystem.current?.position.copy(center).negate();
      const d = Math.exp(THREE.MathUtils.lerp(Math.log(view.startDistance), Math.log(fitDistance), p));
      camera.quaternion.slerpQuaternions(view.startRotation, rotation, p);
      camera.position.set(0, 0, d).applyQuaternion(camera.quaternion);
      camera.near = Math.max(d / 1000, .000001); camera.updateProjectionMatrix();
    }
    if (missionFlight && flightTelemetry) {
      const view = rocketView;
      if (view.completed) return;
      const now = performance.now();
      const playback = flightPlayback?.current;
      if (playback?.skip) { playback.skip = false; view.completed = true; onFlightArrived?.(); return; }
      else if (flightActive && !playback?.paused) view.elapsed = Math.min(FLIGHT_DURATION_SECONDS, view.elapsed + Math.max(0, now - view.lastTick) / 1000 * (playback?.speed ?? 1));
      view.lastTick = now;
      const progress = view.elapsed / FLIGHT_DURATION_SECONDS;
      flightRoute.sample(progress, view.point);
      // Cut just before the path ends; Moon-center distance does not trigger arrival.
      if (flightRoute.totalLength * (1 - progress) <= scale.moonRadius * .25) {
        view.completed = true;
        onFlightArrived?.();
        return;
      }
      flightRoute.sample(progress < 1 ? Math.min(1, progress + .0002) : .9998, view.ahead);
      if (progress < 1) view.tangent.subVectors(view.ahead, view.point).normalize();
      else view.tangent.subVectors(view.point, view.ahead).normalize();
      const angleDelta = (to: number, from: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
      const behind = Math.atan2(-view.tangent.x, -view.tangent.z);
      const earthBearing = Math.atan2(view.point.x, view.point.z);
      const departureBlend = THREE.MathUtils.smoothstep(progress, .24, .38);
      let bearing = earthBearing + angleDelta(behind, earthBearing) * departureBlend;
      const lunarOffset = view.ahead.subVectors(view.point, transferMoon);
      const lunarBlend = 1 - THREE.MathUtils.smoothstep(lunarOffset.length(), .006, .035);
      bearing += angleDelta(Math.atan2(lunarOffset.x, lunarOffset.z), bearing) * lunarBlend;
      if (!view.initialized) { view.bearing = bearing; view.yaw = controls.current.yaw; view.pitch = controls.current.pitch; view.initialized = true; }
      if (!reducedMotion) view.bearing += angleDelta(bearing, view.bearing) * (1 - Math.exp(-dt * 5));
      view.yaw += angleDelta(controls.current.yaw, view.yaw) * (1 - Math.exp(-dt * 12));
      view.pitch += angleDelta(controls.current.pitch, view.pitch) * (1 - Math.exp(-dt * 12));
      const cameraYaw = view.bearing + view.yaw, cameraPitch = view.pitch;
      // A camera sphere smaller than surface clearance cannot pass through Earth or the Moon.
      const clearance = Math.min(view.point.length() - scale.earthRadius, view.point.distanceTo(transferMoon) - scale.moonRadius);
      const baseDistance = Math.min(.008, Math.max(.00015, clearance * .6));
      const followDistance = Math.max(.00005, Math.min(baseDistance * controls.current.zoom, clearance * .85));
      view.distance = followDistance;
      view.up.set(-Math.sin(cameraYaw) * Math.sin(cameraPitch), Math.cos(cameraPitch), -Math.cos(cameraYaw) * Math.sin(cameraPitch));
      center.set(ex, 0, ez).add(view.point);
      physicalSystem.current?.position.copy(center).negate();
      camera.position.set(Math.sin(cameraYaw) * Math.cos(cameraPitch), Math.sin(cameraPitch), Math.cos(cameraYaw) * Math.cos(cameraPitch)).multiplyScalar(followDistance);
      camera.up.copy(view.up);
      camera.lookAt(view.up.clone().multiplyScalar(-followDistance * .075));
      camera.near = Math.max(followDistance / 1000, .0000001); camera.updateProjectionMatrix();
      if (flightMarkers && earth.current && moon.current) {
        physicalSystem.current?.updateWorldMatrix(true, true);
        camera.updateMatrixWorld();
        const projectSite = (mesh: THREE.Mesh, radius: number, site: { latitude: number; longitude: number } | undefined) => {
          const lat = THREE.MathUtils.degToRad(site?.latitude ?? 0), lon = THREE.MathUtils.degToRad(site?.longitude ?? 0);
          const p = mesh.localToWorld(new THREE.Vector3(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon))).project(camera);
          const x = (p.x + 1) * size.width / 2, y = (1 - p.y) * size.height / 2;
          const covered = y < 225 && (x - 75 < 200 || x + 75 > size.width - 220);
          const visible = p.z > -1 && p.z < 1 && x > 75 && x < size.width - 75 && y > 55 && y < size.height - 150 && !covered;
          return { x: visible ? x : 0, y: visible ? y : 0, visible };
        };
        const e = projectSite(earth.current, 1.03, launchSites.find(site => site.id === flightLaunchId));
        const m = projectSite(moon.current, .365, lunarSites.find(site => site.id === flightLandingId));
        const sunPoint = sunVisual.current?.getWorldPosition(new THREE.Vector3()).project(camera);
        const sx = sunPoint ? (sunPoint.x + 1) * size.width / 2 : 0;
        const sy = sunPoint ? (1 - sunPoint.y) * size.height / 2 : 0;
        const sunVisible = !!sunPoint && sunPoint.z > -1 && sunPoint.z < 1 && sx > 75 && sx < size.width - 75 && sy > 55 && sy < size.height - 150;
        flightMarkers.set({ sunX: sx, sunY: sy, sunVisible, earthX: e.x, earthY: e.y, earthVisible: e.visible, moonX: m.x, moonY: m.y, moonVisible: m.visible });
      }
      flightSpriteSize.current = baseDistance * 2 * Math.tan(43 * Math.PI / 360) * 100 / size.height;
      flightTelemetry.current = { progress, remainingSeconds: Math.max(0, FLIGHT_DURATION_SECONDS - view.elapsed) / (playback?.speed ?? 1), remainingKm: Math.max(0, (1 - progress) * flightRoute.totalLength * 2_000_000), speedKmh: AVERAGE_SPEED_KMH, arrived: progress === 1 };
    }
    if (exploring && !controls.current.locked && !explorerArrived.current) {
      explorerArrived.current = true;
      onExplorerArrival?.();
    }
    const focusMesh = earthExploring ? earth.current : moon.current;
    if (exploring && !missionFlight && focusMesh && onLunarProjection) {
      projectionTimer.current += dt;
      if (projectionTimer.current > 1 / 30) {
        projectionTimer.current = 0;
        physicalSystem.current?.updateWorldMatrix(true, true);
        const origin = focusMesh.localToWorld(new THREE.Vector3());
        const radius = earthExploring ? 1.02 : .36;
        const physicalRadius = earthExploring ? scale.earthRadius : scale.moonRadius;
        const entries = (earthExploring ? launchSites : lunarSites).map(site => {
          const lat = THREE.MathUtils.degToRad(site.latitude), lon = THREE.MathUtils.degToRad(site.longitude);
          return { id: site.id, point: new THREE.Vector3((radius * 1.008) * Math.cos(lat) * Math.cos(lon), (radius * 1.008) * Math.sin(lat), -(radius * 1.008) * Math.cos(lat) * Math.sin(lon)) };
        });
        entries.push({ id: 'North Pole', point: new THREE.Vector3(0, radius * 1.62, 0) }, { id: 'South Pole', point: new THREE.Vector3(0, -radius * 1.62, 0) });
        const inverseMoonRotation = focusMesh.getWorldQuaternion(new THREE.Quaternion()).invert();
        const edgeDirection = new THREE.Vector3(1, 1, 0).applyQuaternion(camera.quaternion).applyQuaternion(inverseMoonRotation);
        edgeDirection.y = 0;
        edgeDirection.normalize().multiplyScalar(.365 * Math.sin(Math.PI / 18));
        edgeDirection.y = -.365 * Math.cos(Math.PI / 18);
        if (!earthExploring) entries.push({ id: 'South Pole Surface', point: edgeDirection });
        camera.updateMatrixWorld();
        const projected = entries.map(({ id, point }) => {
          const world = focusMesh.localToWorld(point);
          const normal = world.clone().sub(origin).normalize();
          const surface = origin.clone().addScaledVector(normal, physicalRadius);
          const visible = normal.dot(camera.position.clone().sub(surface)) > 0;
          world.project(camera);
          const apparentRadius = physicalRadius / camera.position.distanceTo(origin) / Math.tan(43 * Math.PI / 360);
          return { id, opacity: id === 'South Pole Surface' ? THREE.MathUtils.smoothstep(apparentRadius, .8, .98) : 1, x: (world.x + 1) * size.width / 2, y: (1 - world.y) * size.height / 2, visible: (earthExploring ? (missionTransfer || id === 'North Pole' || id === 'South Pole' || visible) : (!candidateSelected || visible)) && !controls.current.locked };
        });
        if (earthExploring) {
          const pixelRadius = physicalRadius / camera.position.distanceTo(origin) * size.height / (2 * Math.tan(43 * Math.PI / 360));
          projected.push({ id: 'earth-select-anchor', opacity: 1, x: size.width / 2 + pixelRadius * 1.4, y: size.height / 2 + pixelRadius * .95, visible: !controls.current.locked });
        }
        if (missionTransfer && moon.current) {
          const earthPoint = origin.clone().project(camera);
          projected.push({ id: 'transfer-earth', opacity: 1, x: (earthPoint.x + 1) * size.width / 2, y: (1 - earthPoint.y) * size.height / 2, visible: true });
          const point = moon.current.getWorldPosition(new THREE.Vector3()).project(camera);
          projected.push({ id: 'transfer-moon', opacity: 1, x: (point.x + 1) * size.width / 2, y: (1 - point.y) * size.height / 2, visible: true });
        }
        onLunarProjection(projected);
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#03070d']} />
      <ambientLight intensity={missionFlight ? .12 : .035} />
      <DeepSpace />
      <StarField />
      <group ref={physicalSystem}>
      <pointLight position={[0, 0, 0]} intensity={scale.earthOrbit ** 2 * 4} decay={2} color="#ffedc9" />
      <Orbit radius={scale.earthOrbit} opacity={.24} />
      <group ref={sunVisual} onClick={event => {
        if (startup === 'done' && !exploring && !missionTransfer && (intro || systemView || selected === null) && !controls.current.locked) {
          event.stopPropagation(); onOverviewFocus();
        }
      }}><Sun time={time} /></group>
      <group ref={earthSystem} onClick={(event) => {
        if (!selected && !intro && !controls.current.locked) { event.stopPropagation(); onSystemFocus(); }
      }}>
        {missionTransfer && onTransferReady && <TransferTrajectory moon={transferMoon} flight={missionFlight} onComplete={onTransferReady} />}
        {missionFlight && flightTelemetry && <FlightRocket map={rocketMap} route={flightRoute} telemetry={flightTelemetry} size={flightSpriteSize} />}
        {!selected && !intro && <>
          <mesh><sphereGeometry args={[6, 16, 12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
          <mesh ref={moonHit}><sphereGeometry args={[3, 16, 12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
        </>}

        <group ref={earthVisual} onClick={(event) => {
          if (intro && !controls.current.locked) { event.stopPropagation(); onSystemFocus(); }
        }}>
        <mesh ref={earth} rotation={[0, -1.1, .12]}>
          {earthExploring && <>
            <mesh><cylinderGeometry args={[.004, .004, 3.06, 8]} /><meshBasicMaterial color="white" /></mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.53, .003, 8, 128]} /><meshBasicMaterial color="white" /></mesh>
          </>}
          <sphereGeometry args={[1.02, 72, 48]} />
          <meshStandardMaterial map={earthMap} normalMap={earthNormal} normalScale={new THREE.Vector2(.65, .65)} roughness={.72} metalness={.04} />
        </mesh>
        <mesh ref={clouds} rotation={[0, -1.1, .12]}>
          <sphereGeometry args={[1.034, 64, 48]} />
          <meshStandardMaterial map={cloudsMap} transparent opacity={.65} depthWrite={false} roughness={1} />
        </mesh>
        <Glow radius={1.075} color="#5bbdff" strength={.38} />
        </group>
        <group ref={moonOrbitVisual}><Orbit radius={scale.moonOrbit} opacity={.25} /></group>
        <mesh ref={moon} onClick={(event) => {
          if (systemView && !controls.current.locked) { event.stopPropagation(); onMoonIntro(); }
        }}>
          {exploring && !earthExploring && <mesh><cylinderGeometry args={[.0015, .0015, 1.08, 8]} /><meshBasicMaterial color="white" /></mesh>}
          {exploring && !earthExploring && <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[.54, .001, 8, 128]} />
            <meshBasicMaterial color="white" side={THREE.DoubleSide} />
          </mesh>}
          <sphereGeometry args={[.36, 48, 32]} /><meshStandardMaterial map={moonMap} bumpMap={moonMap} bumpScale={.025} roughness={.95} />
        </mesh>
      </group>
      </group>
    </>
  );
}
