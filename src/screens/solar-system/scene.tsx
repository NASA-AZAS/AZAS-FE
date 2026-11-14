import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useLoader } from './render-surface';
import { Sun } from './sun';
import type { BodyId } from './space-hud';

import { scale, viewDistance } from './scale';

export type ViewControls = { yaw: number; pitch: number; zoom: number; holdCenter: boolean; zoomingOut: boolean; locked: boolean; heldBody: BodyId | null; keepAngle: boolean };
type Props = {
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

export function SolarScene({ controls, paused, selected, onReady }: Props) {
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
  const clouds = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  const visualOverview = useRef(selected ? 0 : 1);
  const sunVisual = useRef<THREE.Group>(null);
  const earthVisual = useRef<THREE.Group>(null);
  const moonOrbitVisual = useRef<THREE.Group>(null);
  const center = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const transition = useRef<{ body: string; elapsed: number; from: THREE.Vector3 }>({ body: `${selected}:false`, elapsed: 2, from: new THREE.Vector3() });
  const physicalSystem = useRef<THREE.Group>(null);
  const flightDistance = useRef(selected ? viewDistance[selected] : viewDistance.overview);
  const flightStartDistance = useRef(selected ? viewDistance[selected] : viewDistance.overview);
  const previousCenter = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  useEffect(onReady, [onReady]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, .05);
    if (!paused) time.current += dt;
    const t = time.current;
    visualOverview.current = THREE.MathUtils.lerp(visualOverview.current, selected ? 0 : 1, 1 - Math.exp(-dt * 4));
    const overview = visualOverview.current;
    sunVisual.current?.scale.setScalar(scale.sunRadius / 1.55 * (1 + overview * 19));
    earthVisual.current?.scale.setScalar(scale.earthRadius / 1.02 * (1 + overview * 799));
    moon.current?.scale.setScalar(scale.moonRadius / .36 * (1 + overview * 1199));
    moonOrbitVisual.current?.scale.setScalar(1 + overview * 39);
    const a = .35 + t * .022;
    const mx = Math.cos(.6 + t * .16) * scale.moonOrbit * (1 + overview * 39);
    const mz = Math.sin(.6 + t * .16) * scale.moonOrbit * (1 + overview * 39);
    const ex = Math.cos(a) * scale.earthOrbit;
    const ez = Math.sin(a) * scale.earthOrbit;
    if (earthSystem.current) earthSystem.current.position.set(ex, 0, ez);
    if (earth.current) earth.current.rotation.y = t * .13 - 1.1;
    if (moon.current) { moon.current.position.set(mx, 0, mz); moon.current.rotation.y = t * .16; }
    if (clouds.current) clouds.current.rotation.y = t * .145 - 1.1;
    const trackingBody = selected ?? (controls.current.holdCenter ? controls.current.heldBody : null);
    if (trackingBody === 'earth') target.set(ex, 0, ez);
    else if (trackingBody === 'moon') target.set(ex + mx, 0, ez + mz);
    else if (controls.current.holdCenter) target.copy(center);
    else target.set(0, 0, 0);
    const flightKey = `${selected}:${controls.current.zoomingOut}`;
    if (transition.current.body !== flightKey) {
      controls.current.locked = true;
      transition.current = { body: flightKey, elapsed: 0, from: center.clone() };
      flightStartDistance.current = Math.max(camera.position.length(), .000001);
    }
    previousCenter.copy(center);
    transition.current.elapsed += Math.min(delta, .25);
    const u = Math.min(transition.current.elapsed / 2, 1);
    const incoming = !!selected && !controls.current.zoomingOut;
    const centerProgress = incoming ? Math.min(transition.current.elapsed / .65, 1) : u;
    const centerEase = centerProgress ** 3 * (centerProgress * (centerProgress * 6 - 15) + 10);
    if (controls.current.zoomingOut) center.copy(target);
    else center.lerpVectors(transition.current.from, target, centerEase);
    if (physicalSystem.current) physicalSystem.current.position.copy(center).negate();
    const destinationDistance = selected && !controls.current.zoomingOut ? viewDistance[selected] : viewDistance.overview;
    const zoomProgress = incoming ? Math.max(0, Math.min((transition.current.elapsed - .65) / 1.35, 1)) : u;
    const ease = zoomProgress ** 3 * (zoomProgress * (zoomProgress * 6 - 15) + 10);
    flightDistance.current = Math.exp(THREE.MathUtils.lerp(Math.log(flightStartDistance.current), Math.log(destinationDistance), ease));
    const distance = flightDistance.current * controls.current.zoom;
    const near = Math.max(distance / 1000, .000001);
    if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
    if (selected === 'sun' && !controls.current.locked) controls.current.yaw += dt * .025;
    const { yaw, pitch } = u < 1 && !controls.current.keepAngle ? { yaw: .18, pitch: .48 } : controls.current;
    desired.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
      .multiplyScalar(distance);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 9));
    camera.lookAt(0, 0, 0);
    // Keep the outgoing/intermediate stage locked until the incoming camera has settled.
    if (controls.current.locked) {
      controls.current.locked = controls.current.zoomingOut || u < 1 ||
        camera.position.distanceTo(desired) > Math.max(distance * .02, .000001);
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
      <group ref={earthSystem}>

        <group ref={earthVisual}>
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
        <mesh ref={moon}>
          <sphereGeometry args={[.36, 48, 32]} /><meshStandardMaterial map={moonMap} bumpMap={moonMap} bumpScale={.025} roughness={.95} />
        </mesh>
      </group>
      </group>
    </>
  );
}
