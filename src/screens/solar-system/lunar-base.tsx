import * as THREE from 'three';
import { useLoader } from './render-surface';

// Separate low-poly props; the original DEM panorama texture stays untouched.
export function LunarBase() {
  const [logo] = useLoader(THREE.TextureLoader, [require('../../../assets/rocket-neon-dark.png') as unknown as string]);
  logo.colorSpace = THREE.SRGBColorSpace;
  return <group scale={4} position={[8, -2.2, -.15]} rotation={[0, -1.3, 0]}>
    <ambientLight intensity={1.4} />
    <directionalLight position={[-3, 7, -5]} intensity={2.2} color="#e7e5df" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .005, 0]} scale={[1.5, .8, 1]}><circleGeometry args={[1, 16]} /><meshBasicMaterial color="#171719" transparent opacity={.12} depthWrite={false} /></mesh>
    <group position={[0, .36, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.3, .3, 1.1, 12]} /><meshStandardMaterial color="#aaa9a3" flatShading roughness={1} /></mesh>
      {[-.44, 0, .44].map(x => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.312, .312, .025, 12]} /><meshStandardMaterial color="#6a6c6d" roughness={1} flatShading /></mesh>)}
      {[-.28, .22].map(x => <group key={x} position={[x, -.02, .283]}>
        <mesh><boxGeometry args={[.16, .12, .025]} /><meshStandardMaterial color="#333b40" roughness={1} /></mesh>
        <mesh position={[0, 0, .015]}><boxGeometry args={[.12, .08, .008]} /><meshBasicMaterial color="#657782" /></mesh>
      </group>)}
      <mesh position={[.565, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.19, .19, .035, 8]} /><meshStandardMaterial color="#747779" flatShading roughness={1} /></mesh>
      <mesh position={[-.3, .19, .22]}><boxGeometry args={[.13, .035, .025]} /><meshBasicMaterial color="#ad4d3d" /></mesh>
    </group>
    {[-.38, .38].flatMap(x => [-.22, .22].map(z => <group key={`${x}-${z}`} position={[x, 0, z]}>
      <mesh position={[0, .11, 0]}><boxGeometry args={[.04, .22, .04]} /><meshStandardMaterial color="#666765" roughness={1} /></mesh>
      <mesh position={[0, .015, 0]}><boxGeometry args={[.14, .03, .12]} /><meshStandardMaterial color="#86847e" roughness={1} /></mesh>
    </group>))}
    <group position={[-.3, 0, -.9]}>
      <mesh position={[0, .18, 0]}><boxGeometry args={[.045, .36, .045]} /><meshStandardMaterial color="#747778" /></mesh>
      <group scale={[1.5, 1, 1.6]} position={[0, .38, 0]} rotation={[.22, 0, 0]}>
        <mesh><boxGeometry args={[1.25, .035, .46]} /><meshStandardMaterial color="#61686c" roughness={1} /></mesh>
        {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[-.55 + i * .122, .022, 0]}><boxGeometry args={[.107, .008, .4]} /><meshStandardMaterial color="#343e50" roughness={.85} /></mesh>)}
      </group>
    </group>
    <group position={[.83, 0, -.25]}>
      <mesh position={[0, .32, 0]}><cylinderGeometry args={[.012, .012, .64, 6]} /><meshStandardMaterial color="#999b98" /></mesh>
      <mesh position={[0, .65, 0]} rotation={[0, 0, -.65]}><sphereGeometry args={[.16, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#a6a59e" side={2} flatShading roughness={1} /></mesh>
    </group>
    <group scale={3} position={[-2.5, 0, -2]} rotation={[0, .3, 0]}>
      <mesh position={[.17, .008, .05]} rotation={[-Math.PI / 2, 0, 0]} scale={[.55, .28, 1]}><circleGeometry args={[1, 16]} /><meshBasicMaterial color="#171719" transparent opacity={.14} depthWrite={false} /></mesh>
      <mesh position={[0, .01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[.23, .2, 1]}><circleGeometry args={[1, 16]} /><meshBasicMaterial color="#171719" transparent opacity={.12} depthWrite={false} /></mesh>
      <mesh position={[0, .32, 0]}><cylinderGeometry args={[.11, .11, .42, 12]} /><meshStandardMaterial color="#dddcd5" roughness={1} flatShading /></mesh>
      <mesh position={[0, .61, 0]}><coneGeometry args={[.11, .16, 12]} /><meshStandardMaterial color="#a54c3d" roughness={1} flatShading /></mesh>
      <mesh position={[0, .1, 0]}><cylinderGeometry args={[.07, .095, .09, 8]} /><meshStandardMaterial color="#4c5155" roughness={1} /></mesh>
      <mesh position={[0, .39, .104]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.055, .055, .018, 12]} /><meshStandardMaterial color="#29353d" roughness={.8} /></mesh>
      {[-.017, .017].map(x => <mesh key={x} position={[x, .39, .118]}><boxGeometry args={[.012, .033, .008]} /><meshBasicMaterial color="#eee1c8" /></mesh>)}
      {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map(angle => <group key={angle} rotation={[0, angle, 0]}>
        <mesh position={[.12, .15, 0]} rotation={[0, 0, .55]}><boxGeometry args={[.035, .27, .045]} /><meshStandardMaterial color="#a54c3d" roughness={1} /></mesh>
        <mesh position={[.18, .02, 0]}><boxGeometry args={[.12, .035, .09]} /><meshStandardMaterial color="#686b6b" roughness={1} /></mesh>
      </group>)}
    </group>
    <group position={[1.25, 0, .15]}>
      <mesh position={[0, .39, 0]}><cylinderGeometry args={[.008, .008, .78, 6]} /><meshStandardMaterial color="#a5a5a0" /></mesh>
      <mesh position={[.17, .66, 0]}><boxGeometry args={[.34, .23, .008]} /><meshBasicMaterial color="#ecece7" /></mesh>
      <mesh position={[.17, .66, .005]}><planeGeometry args={[.24, .2]} /><meshBasicMaterial map={logo} color="#17212c" transparent alphaTest={.1} side={THREE.DoubleSide} /></mesh>
      <mesh position={[.17, .66, -.005]} rotation={[0, Math.PI, 0]}><planeGeometry args={[.24, .2]} /><meshBasicMaterial map={logo} color="#17212c" transparent alphaTest={.1} side={THREE.DoubleSide} /></mesh>
    </group>
  </group>;
}
