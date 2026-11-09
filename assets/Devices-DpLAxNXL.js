const e=`import { useMemo, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { panelGeometry, roundedRect, slabGeometry } from "@/desk/geometry";
import { mat } from "@/desk/scene/materials";
import { Interactive, Screen } from "@/desk/scene/parts";
import { desk } from "@/desk/store";

/** Touch screens have no hover, so a name tag would only flash as the notebook is tapped. */
const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

/** A dark front with round corners, sitting just in front of a panel. */
function Glass({ w, h, r, z }: { w: number; h: number; r: number; z: number }) {
  const geo = useMemo(() => new THREE.ShapeGeometry(roundedRect(w, h, r), 20), [w, h, r]);
  return <mesh geometry={geo} material={mat.glass} position-z={z} />;
}

/** A phone on a small aluminium stand, running the Miami Motors catalog. */
export function Phone(props: JSX.IntrinsicElements["group"]) {
  const W = 0.74;
  const H = 1.52;
  const T = 0.07;
  const body = useMemo(() => panelGeometry(W, H, T, 0.12, 0.022), []);
  const stand = useMemo(() => slabGeometry(0.86, 0.95, 0.05, 0.14, 0.015), []);
  const back = useMemo(() => panelGeometry(0.56, 1.0, 0.04, 0.06, 0.01), []);
  const lean = 0.27;

  return (
    <group {...props}>
      <Interactive id="phone" labelAt={[0, 2.05, 0]}>
        <mesh geometry={stand} material={mat.aluminium} position={[0, 0.05, 0]} castShadow receiveShadow />
        {/* The lip the phone rests on. */}
        <mesh material={mat.aluminium} position={[0, 0.09, 0.3]} castShadow>
          <boxGeometry args={[0.7, 0.06, 0.06]} />
        </mesh>
        <group position={[0, 0.07, 0.24]} rotation-x={-lean}>
          <mesh geometry={back} material={mat.aluminiumSoft} position={[0, 0.55, -0.09]} castShadow />
          <mesh geometry={body} material={mat.graphite} position={[0, H / 2, 0]} castShadow />
          <group position={[0, H / 2, T / 2 + 0.002]}>
            <Glass w={W - 0.02} h={H - 0.02} r={0.11} z={0} />
            <Screen id="phone" src="/desk/phone.webp" position={[0, 0, 0.002]} />
          </group>
        </group>
      </Interactive>
    </group>
  );
}

/** A tablet on a counter stand, the way the yard's docket screen is set up. */
export function Tablet(props: JSX.IntrinsicElements["group"]) {
  const W = 2.36;
  const H = 1.62;
  const T = 0.055;
  const body = useMemo(() => panelGeometry(W, H, T, 0.13, 0.016), []);
  const base = useMemo(() => slabGeometry(1.1, 0.9, 0.06, 0.4, 0.02), []);
  const plate = useMemo(() => panelGeometry(0.9, 0.7, 0.05, 0.08, 0.012), []);
  const lean = 0.5;

  return (
    <group {...props}>
      <Interactive id="tablet" labelAt={[0, 2.35, 0]}>
        <mesh geometry={base} material={mat.aluminium} position={[0, 0.06, 0]} castShadow receiveShadow />
        {/* The arm, rising from the base to the back of the tablet. */}
        <mesh material={mat.aluminium} position={[0, 0.48, -0.16]} rotation-x={-0.32} castShadow>
          <boxGeometry args={[0.16, 0.92, 0.09]} />
        </mesh>
        <group position={[0, 1.02, 0.02]} rotation-x={-lean}>
          <mesh geometry={plate} material={mat.aluminiumSoft} position={[0, 0, -0.06]} />
          <mesh geometry={body} material={mat.graphite} castShadow />
          <group position-z={T / 2 + 0.002}>
            <Glass w={W - 0.02} h={H - 0.02} r={0.12} z={0} />
            <Screen id="tablet" src="/desk/tablet.webp" position={[0, 0, 0.002]} />
          </group>
        </group>
      </Interactive>
    </group>
  );
}

/** The desk diary: a black notebook with a pen on it. A click opens it, and anyone can write in it. */
export function Notebook(props: JSX.IntrinsicElements["group"]) {
  const book = useMemo(() => slabGeometry(1.5, 2.1, 0.12, 0.06, 0.02), []);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [hovered, setHovered] = useState(false);
  const cursor = (on: boolean) => {
    const d = desk.get();
    gl.domElement.style.cursor = on ? "pointer" : d.holding || d.focus === null ? "grab" : "";
  };
  return (
    <group
      {...props}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 6) return;
        desk.openDiary();
        invalidate();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        cursor(true);
      }}
      onPointerOut={() => {
        setHovered(false);
        cursor(false);
      }}
    >
      <mesh geometry={book} material={mat.printerTop} position-y={0.12} castShadow receiveShadow />
      <mesh material={mat.aluminium} position={[0.25, 0.155, 0.05]} rotation={[Math.PI / 2, 0, 0.35]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.5, 16]} />
      </mesh>
      {canHover && (
        <Html position={[0, 0.9, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div
            className={\`whitespace-nowrap rounded-full bg-fg px-3.5 py-1.5 text-[13px] font-medium text-bg shadow-lg transition-all duration-200 \${
              hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }\`}
          >
            Open my diary <span className="text-bg/60">· anyone can write in it</span>
          </div>
        </Html>
      )}
    </group>
  );
}
`;export{e as default};
