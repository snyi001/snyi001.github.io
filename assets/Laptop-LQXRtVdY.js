const e=`import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { panelGeometry, roundedRect, slabGeometry } from "@/desk/geometry";
import { mat } from "@/desk/scene/materials";
import { Interactive, Screen } from "@/desk/scene/parts";
import { StickyNotes } from "@/desk/scene/StickyNotes";

const W = 3.04;
const D = 2.12;
const BASE_H = 0.1;
const LID_H = 2.06;
const LID_T = 0.04;
/** How far the lid leans back from upright. */
const LID_TILT = 0.3;

/** Key widths per row, in key units; every row adds up to 14.5. */
const ROWS: { z: number; depth: number; keys: number[] }[] = [
  { z: -0.79, depth: 0.08, keys: Array(14).fill(14.5 / 14) },
  { z: -0.655, depth: 0.165, keys: [...Array(13).fill(1), 1.5] },
  { z: -0.47, depth: 0.165, keys: [1.5, ...Array(12).fill(1), 1] },
  { z: -0.285, depth: 0.165, keys: [1.8, ...Array(11).fill(1), 1.7] },
  { z: -0.1, depth: 0.165, keys: [2.3, ...Array(10).fill(1), 2.2] },
  { z: 0.085, depth: 0.165, keys: [1, 1, 1, 1.25, 5, 1.25, 1, 1, 1, 1] },
];
const KEY_UNIT = 2.62 / 14.5;
const KEY_GAP = 0.02;

function Keyboard() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const keys = useMemo(() => {
    const list: { x: number; z: number; w: number; d: number }[] = [];
    for (const row of ROWS) {
      let x = -(14.5 * KEY_UNIT) / 2;
      for (const units of row.keys) {
        const w = units * KEY_UNIT;
        list.push({ x: x + w / 2, z: row.z, w: w - KEY_GAP, d: row.depth });
        x += w;
      }
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    keys.forEach((k, i) => {
      m.compose(new THREE.Vector3(k.x, 0.006, k.z), new THREE.Quaternion(), new THREE.Vector3(k.w, 0.012, k.d));
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [keys]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, keys.length]} material={mat.key}>
      <boxGeometry />
    </instancedMesh>
  );
}

/** A thin aluminium laptop, lid open, showing the websites I've built. */
export function Laptop(props: JSX.IntrinsicElements["group"]) {
  const base = useMemo(() => slabGeometry(W, D, BASE_H, 0.16, 0.03), []);
  const lid = useMemo(() => panelGeometry(W, LID_H, LID_T, 0.16, 0.014), []);
  const bezel = useMemo(() => new THREE.ShapeGeometry(roundedRect(W - 0.03, LID_H - 0.03, 0.145), 16), []);
  const well = useMemo(() => new THREE.ShapeGeometry(roundedRect(2.7, 1.08, 0.04), 8), []);
  const pad = useMemo(() => new THREE.ShapeGeometry(roundedRect(1.28, 0.74, 0.05), 12), []);

  return (
    <group {...props}>
      <Interactive id="laptop" labelAt={[0, 2.5, -1]}>
        <mesh geometry={base} material={mat.aluminium} position={[0, BASE_H, 0]} castShadow receiveShadow />
        {/* The keyboard sits in a shallow darker well; the trackpad in front of it. */}
        <mesh geometry={well} material={mat.well} rotation-x={-Math.PI / 2} position={[0, BASE_H + 0.002, -0.35]} />
        <group position={[0, BASE_H, 0]}>
          <Keyboard />
        </group>
        <mesh geometry={pad} material={mat.trackpad} rotation-x={-Math.PI / 2} position={[0, BASE_H + 0.002, 0.6]} />

        {/* The lid, hinged at the back edge. */}
        <group position={[0, BASE_H + 0.01, -D / 2 + 0.03]} rotation-x={-LID_TILT}>
          <mesh geometry={lid} material={mat.aluminium} position={[0, LID_H / 2, 0]} castShadow />
          <mesh geometry={bezel} material={mat.glass} position={[0, LID_H / 2, LID_T / 2 + 0.002]} />
          <Screen id="laptop" src="/desk/laptop.webp" position={[0, 0.2 + 1.79 / 2, LID_T / 2 + 0.004]} />
          {/* Four sticky notes, stuck either side of the screen. */}
          <StickyNotes lidThickness={LID_T} />
        </group>
      </Interactive>
    </group>
  );
}
`;export{e as default};
