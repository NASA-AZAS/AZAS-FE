import { useFrame } from '@react-three/fiber';
import { useMemo, type MutableRefObject } from 'react';
import { AdditiveBlending } from 'three';

const noise = `
  float hash(vec3 p) {
    p = fract(p * .3183099 + vec3(.13, .37, .71));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float turbulence(vec3 p) {
    return noise3(p) * .57 + noise3(p * 2.03 + 9.2) * .29
      + noise3(p * 4.07 - 3.8) * .14;
  }
`;

const surfaceVertex = `
  varying vec3 vDirection;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vDirection = normalize(position);
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const surfaceFragment = `
  uniform float time;
  varying vec3 vDirection;
  varying vec3 vWorld;
  varying vec3 vNormal;
  ${noise}
  void main() {
    vec3 p = normalize(vDirection);
    float turn = 0.0;
    p.xz = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * p.xz;
    vec3 drift = vec3(time * .035, -time * .026, time * .018);
    float convection = turbulence(p * 5.5 + drift);
    vec3 warped = p * 24.0 + convection * 2.5 + drift;
    float grains = turbulence(warped);
    float fine = noise3(warped * 3.7 - drift * 1.3);
    float channels = smoothstep(.28, .59, grains);
    vec3 color = mix(vec3(.85, .16, .008), vec3(1.0, .63, .055), channels);
    color = mix(color, vec3(1.0, .91, .42), smoothstep(.54, .79, grains) * .88);
    color += vec3(.14, .075, .008) * fine;
    color *= .86 + .23 * convection;
    float facing = max(0.0, dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
    float limb = pow(1.0 - facing, 2.5);
    color = mix(color, vec3(1.0, .37, .015), limb * .35);
    gl_FragColor = vec4(color * 1.18, 1.0);
    #include <colorspace_fragment>
  }
`;

const coronaVertex = `
  varying vec2 vPosition;
  void main() {
    // Build the plane in view space so camera motion never lags its billboard.
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float worldScale = length(modelViewMatrix[0].xyz);
    float distanceToCenter = length(center.xyz);
    float radius = 1.55 * worldScale;
    float apparentScale = distanceToCenter / sqrt(max(distanceToCenter * distanceToCenter - radius * radius, .000000000001));
    vPosition = position.xy / apparentScale;
    gl_Position = projectionMatrix * (center + vec4(position.xy * worldScale, 0.0, 0.0));
  }
`;

const coronaFragment = `
  uniform float time;
  varying vec2 vPosition;
  ${noise}
  void main() {
    float r = length(vPosition);
    float height = max(0.0, r - 1.49);
    vec2 direction = vPosition / max(r, .001);
    float angle = atan(direction.y, direction.x);
    float t = time * .14;
    float flow = noise3(vec3(direction * 12.0, height * 4.0 - t));
    float fingers = pow(.5 + .5 * sin(angle * 37.0 + flow * 5.0 - height * 8.0 + t), 4.0);
    float longRays = pow(.5 + .5 * sin(angle * 13.0 + sin(angle * 7.0 + t) * 1.8), 7.0);
    float wisps = fingers * exp(-height * (5.8 - flow * 2.0));
    float rays = longRays * exp(-height * 3.8) * .4;
    float rim = exp(-height * 16.0) * .65;
    float bloom = exp(-height * 4.8) * .19;

    // Two arch-shaped prominences reconnect with the photosphere at both feet.
    float archA = max(0.0, 1.0 - pow((angle - .62) / .24, 2.0));
    float archB = max(0.0, 1.0 - pow((angle + 1.84) / .19, 2.0));
    float archHeight = archA * (.37 + .055 * sin(t * .8))
      + archB * (.25 + .035 * sin(t + 1.0));
    float loops = exp(-pow((height - archHeight) / .022, 2.0))
      * smoothstep(.025, .09, archHeight) * .42;
    float outerFade = 1.0 - smoothstep(2.5, 3.05, r);
    float diskMask = smoothstep(1.42, 1.53, r);
    float alpha = (rim + wisps * .61 + rays + bloom + loops) * diskMask * outerFade;
    vec3 color = mix(vec3(1.0, .47, .055), vec3(1.0, .15, .008), smoothstep(.0, .95, height));
    color += vec3(.0, .20, .09) * exp(-height * 12.0);
    gl_FragColor = vec4(color, min(alpha, .94));
    #include <colorspace_fragment>
  }
`;

export function Sun({ time }: { time: MutableRefObject<number> }) {
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  useFrame(() => { uniforms.time.value = time.current; });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.55, 64, 48]} />
        <shaderMaterial vertexShader={surfaceVertex} fragmentShader={surfaceFragment}
          uniforms={uniforms} toneMapped={false} />
      </mesh>
      <mesh frustumCulled={false}>
        <planeGeometry args={[6.2, 6.2]} />
        <shaderMaterial vertexShader={coronaVertex} fragmentShader={coronaFragment}
          uniforms={uniforms} transparent depthWrite={false}
          blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}
