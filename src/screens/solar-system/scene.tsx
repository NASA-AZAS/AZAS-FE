import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useLoader } from './render-surface';
import { Sun } from './sun';
import type { BodyId } from './space-hud';

import { scale, viewDistance, INITIAL_MOON_ANGLE, introMoonDistance } from './scale';

export type ViewControls = {
  yaw: number; pitch: number; zoom: number; locked: boolean;
  revision: number; fromBody: BodyId | null;
};
type Props = {
  intro: boolean;
  systemView: boolean;
  onSystemFocus: () => void;
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

export function SolarScene({ onMoonIntro, systemView, onSystemFocus, intro, controls, paused, selected, onReady }: Props) {
  const [earthMap, moonMap, earthNormal, cloudsMap] = useLoader(THREE.TextureLoader, [
    require('../../../assets/textures/earth.jpg'),
    require('../../../assets/textures/moon.jpg'),
    require('../../../assets/textures/earth-normal.jpg'),
    require('../../../assets/textures/earth-clouds.png'),
  ]);
  earthMap.colorSpace = moonMap.colorSpace = cloudsMap.colorSpace = THREE.SRGBColorSpace;
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
  const { camera } = useThree();
  useEffect(onReady, [onReady]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, .05);
    if (!paused) time.current += dt;
    const t = time.current;
    visualOverview.current = THREE.MathUtils.lerp(visualOverview.current, intro || systemView ? 1 : selected ? 0 : THREE.MathUtils.smoothstep(flightDistance.current / viewDistance.overview, .08, .8), 1 - Math.exp(-dt * 4));
    const overview = visualOverview.current;
    sunVisual.current?.scale.setScalar(scale.sunRadius / 1.55 * (1 + overview * 19));
    earthVisual.current?.scale.setScalar(scale.earthRadius / 1.02 * (1 + overview * 799));
    moon.current?.scale.setScalar(scale.moonRadius / .36 * (1 + overview * 1199));
    moonOrbitVisual.current?.scale.setScalar(1 + overview * 39);
    const a = .35 + t * .022;
    const mx = Math.cos(INITIAL_MOON_ANGLE + t * .16) * scale.moonOrbit * (1 + overview * 39);
    const mz = Math.sin(INITIAL_MOON_ANGLE + t * .16) * scale.moonOrbit * (1 + overview * 39);
    const ex = Math.cos(a) * scale.earthOrbit;
    const ez = Math.sin(a) * scale.earthOrbit;
    if (earthSystem.current) earthSystem.current.position.set(ex, 0, ez);
    if (earth.current) earth.current.rotation.y = t * .13 - 1.1;
    if (moon.current) { moon.current.position.set(mx, 0, mz); moon.current.rotation.y = t * .16; }
    moonHit.current?.position.set(mx, 0, mz);
    if (clouds.current) clouds.current.rotation.y = t * .145 - 1.1;
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
    const distance = flightDistance.current * controls.current.zoom;
    const near = Math.max(distance / 1000, .000001);
    if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
    if (selected === 'sun' && !controls.current.locked) controls.current.yaw += dt * .025;
    const moonViewYaw = intro
      ? Math.atan2(-Math.cos(INITIAL_MOON_ANGLE + t * .16), -Math.sin(INITIAL_MOON_ANGLE + t * .16))
      : Math.atan2(-target.x, -target.z);
    if (selected === 'moon' && !controls.current.locked) {
      const change = Math.atan2(Math.sin(moonViewYaw - lastMoonViewYaw.current), Math.cos(moonViewYaw - lastMoonViewYaw.current));
      controls.current.yaw += change;
    }
    lastMoonViewYaw.current = moonViewYaw;
    // Earth arrives on its daylight side; Moon is viewed from Earth's direction to show phases.
    if (controls.current.locked && (selected === 'earth' || (selected === 'moon' && !intro))) {
      flight.yaw = Math.atan2(-target.x, -target.z);
      flight.pitch = .25;
    }
    if (controls.current.locked && selected === 'moon' && intro) { flight.yaw = moonViewYaw; flight.pitch = 0; }
    const angleProgress = smooth(u);
    const yawDelta = THREE.MathUtils.euclideanModulo(flight.yaw - flight.startYaw + Math.PI, Math.PI * 2) - Math.PI;
    const yaw = controls.current.locked ? flight.startYaw + yawDelta * angleProgress : controls.current.yaw;
    const pitch = controls.current.locked ? THREE.MathUtils.lerp(flight.startPitch, flight.pitch, angleProgress) : controls.current.pitch;
    if (controls.current.locked) { controls.current.yaw = yaw; controls.current.pitch = pitch; }
    desired.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(distance);
    if (controls.current.locked) camera.position.copy(desired);
    else camera.position.lerp(desired, 1 - Math.exp(-dt * 9));
    camera.lookAt(0, 0, 0);
    if (controls.current.locked) {
      controls.current.locked = u < 1 || camera.position.distanceTo(desired) > Math.max(distance * .02, .000001);
    }
  });

  return (
    <>
      <color attach="background" args={['#03070d']} />
      <ambientLight intensity={.035} />
      <DeepSpace />
      <StarField />
      <group ref={physicalSystem}>
      <pointLight position={[0, 0, 0]} intensity={scale.earthOrbit ** 2 * 4} decay={2} color="#ffedc9" />
      <Orbit radius={scale.earthOrbit} opacity={.24} />
      <group ref={sunVisual}><Sun time={time} /></group>
      <group ref={earthSystem} onClick={(event) => {
        if (!selected && !intro && !controls.current.locked) { event.stopPropagation(); onSystemFocus(); }
      }}>
        {!selected && !intro && <>
          <mesh><sphereGeometry args={[6, 16, 12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
          <mesh ref={moonHit}><sphereGeometry args={[3, 16, 12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
        </>}

        <group ref={earthVisual} onClick={(event) => {
          if (intro && !controls.current.locked) { event.stopPropagation(); onSystemFocus(); }
        }}>
        <mesh ref={earth} rotation={[0, -1.1, .12]}>
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
          <sphereGeometry args={[.36, 48, 32]} /><meshStandardMaterial map={moonMap} bumpMap={moonMap} bumpScale={.025} roughness={.95} />
        </mesh>
      </group>
      </group>
    </>
  );
}
