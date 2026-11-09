const e=`import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { panelGeometry } from "@/desk/geometry";
import { desk } from "@/desk/store";
import { sound } from "@/lib/sound";
import { arrival } from "@/desk/scene/opening";

/** Touch screens have no hover, so a name tag would only flash as he's tapped. */
const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

/** Vinyl, as these figures are made: a soft satin sheen. */
const vinyl = (color: string, roughness = 0.45) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

const SKIN = "#EBCBA8";
const HAIR = "#7DD3C6";
const HAIR_DEEP = "#5EBDB0";
const COAT = "#3E9A57";

/** Where his coat opens: his chest with the long stitched scar, and the light green shirt under it. */
function chestTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  // The V of the open coat: skin above, the green shirt below.
  g.beginPath();
  g.moveTo(14, 0);
  g.lineTo(114, 0);
  g.lineTo(64, 128);
  g.closePath();
  g.clip();
  g.fillStyle = SKIN;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#8FD86A";
  g.fillRect(0, 74, 128, 54);
  // The scar from Mihawk's cut, stitched.
  g.strokeStyle = "#3A2A22";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(30, 8);
  g.lineTo(92, 64);
  g.stroke();
  g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const x = 30 + (62 * i) / 8;
    const y = 8 + (56 * i) / 8;
    g.beginPath();
    g.moveTo(x - 5, y + 5);
    g.lineTo(x + 5, y - 5);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A vinyl pop figure of Roronoa Zoro, as he is after the timeskip: spiky mint
 * hair, one eye closed over its scar, gold earrings, his green coat open at the
 * chest, the purple sash, his bandana round his arm and a sword at his hip.
 * About the height of the mug, as the real figure would be. A tap sets his head
 * bobbling.
 */
export function ZoroFigure({ arriveOrder, ...props }: JSX.IntrinsicElements["group"] & { arriveOrder?: number }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [hovered, setHovered] = useState(false);
  const head = useRef<THREE.Group>(null);
  const wobble = useRef({ angle: 0, speed: 0, tilt: 0, tiltSpeed: 0 });

  const m = useMemo(
    () => ({
      skin: vinyl(SKIN),
      hair: vinyl(HAIR, 0.5),
      hairDeep: vinyl(HAIR_DEEP, 0.5),
      coat: vinyl(COAT, 0.5),
      sash: vinyl("#8A4E8C", 0.55),
      boots: vinyl("#18181A", 0.25),
      eye: vinyl("#0E0E10", 0.12),
      scar: vinyl("#B5544B", 0.5),
      gold: vinyl("#D4A62A", 0.25),
      black: vinyl("#1B1B1D", 0.4),
      grip: vinyl("#2B211C", 0.5),
      chest: new THREE.MeshStandardMaterial({ map: chestTexture(), roughness: 0.5, transparent: true }),
    }),
    []
  );
  const geo = useMemo(
    () => ({
      head: panelGeometry(0.56, 0.44, 0.46, 0.15, 0.05),
      spike: new THREE.ConeGeometry(0.07, 0.21, 7),
      bang: new THREE.ConeGeometry(0.055, 0.16, 7),
      boot: panelGeometry(0.11, 0.1, 0.16, 0.04, 0.02),
    }),
    []
  );

  // Set down last in the opening, his head bobbles as he lands.
  const landed = useRef(arriveOrder === undefined);

  // The bobble: a spring that swings the head about its neck, and settles.
  useFrame((frame, dt) => {
    const w = wobble.current;
    if (!landed.current && arrival(arriveOrder!) >= 0.6) {
      landed.current = true;
      w.speed += 2.4;
      w.tiltSpeed += 1.1;
    }
    const step = Math.min(dt, 0.05);
    for (const [a, v] of [
      ["angle", "speed"],
      ["tilt", "tiltSpeed"],
    ] as const) {
      w[v] += (-90 * w[a] - 4.5 * w[v]) * step;
      w[a] += w[v] * step;
    }
    if (head.current) {
      head.current.rotation.z = w.angle;
      head.current.rotation.x = w.tilt;
    }
    if (Math.abs(w.angle) + Math.abs(w.speed) + Math.abs(w.tilt) + Math.abs(w.tiltSpeed) > 1e-3) frame.invalidate();
  });

  const bobble = () => {
    const w = wobble.current;
    w.speed += 3.2 * (Math.random() > 0.5 ? 1 : -1);
    w.tiltSpeed += 1.4;
    sound.shing();
    invalidate();
  };
  // The desk speaker can ask for this too, so it always gets the latest version.
  const bobbleNow = useRef(bobble);
  bobbleNow.current = bobble;
  useEffect(() => desk.onPoke("bobble", () => bobbleNow.current()), []);

  const cursor = (on: boolean) => {
    const d = desk.get();
    gl.domElement.style.cursor = on ? "pointer" : d.holding || d.focus === null ? "grab" : "";
  };

  // His hair, spike by spike: [x, y, z, lean sideways, lean back, deeper shade].
  const spikes: [number, number, number, number, number, boolean][] = [
    // Across the top, pointing up and out.
    [-0.22, 0.27, 0.06, 0.75, -0.2, false],
    [-0.13, 0.31, 0.12, 0.35, -0.35, false],
    [-0.02, 0.33, 0.14, 0.05, -0.4, false],
    [0.1, 0.32, 0.12, -0.3, -0.35, false],
    [0.21, 0.28, 0.07, -0.7, -0.2, false],
    [-0.16, 0.31, -0.06, 0.45, 0.15, true],
    [0.0, 0.34, -0.04, 0, 0.1, false],
    [0.15, 0.31, -0.07, -0.45, 0.15, true],
    [-0.08, 0.3, -0.18, 0.25, 0.55, true],
    [0.09, 0.3, -0.18, -0.25, 0.55, true],
    // Out over the ears.
    [-0.3, 0.16, 0.02, 1.25, 0, false],
    [0.3, 0.16, 0.02, -1.25, 0, false],
    [-0.29, 0.07, -0.08, 1.7, 0.2, true],
    [0.29, 0.07, -0.08, -1.7, 0.2, true],
  ];
  // Bangs falling over his forehead: [x, lean sideways].
  const bangs: [number, number][] = [
    [-0.18, 0.35],
    [-0.08, 0.12],
    [0.03, -0.08],
    [0.13, -0.25],
    [0.21, -0.45],
  ];

  return (
    <group {...props}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta <= 6) bobble();
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
        {/* Boots, and the dark trousers above them. */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh geometry={geo.boot} material={m.boots} position={[side * 0.075, 0.05, 0.02]} castShadow />
            <mesh material={m.black} position={[side * 0.072, 0.13, 0]}>
              <cylinderGeometry args={[0.048, 0.05, 0.08, 12]} />
            </mesh>
          </group>
        ))}

        {/* The coat: its skirt flaring to the knee, the body, and the V open at the chest. */}
        <mesh material={m.coat} position-y={0.29} scale={[1, 1, 0.78]} castShadow>
          <cylinderGeometry args={[0.15, 0.185, 0.26, 28]} />
        </mesh>
        <mesh material={m.coat} position-y={0.5} scale={[1, 1, 0.78]} castShadow>
          <cylinderGeometry args={[0.145, 0.15, 0.18, 28]} />
        </mesh>
        <mesh material={m.chest} position={[0, 0.52, 0.119]}>
          <planeGeometry args={[0.15, 0.15]} />
        </mesh>
        {/* The purple sash, and its end hanging at his side. */}
        <mesh material={m.sash} position-y={0.42} scale={[1, 1, 0.8]} castShadow>
          <cylinderGeometry args={[0.158, 0.162, 0.065, 28]} />
        </mesh>
        <mesh material={m.sash} position={[0.09, 0.32, 0.1]} rotation={[0.15, 0, -0.18]} castShadow>
          <boxGeometry args={[0.055, 0.17, 0.025]} />
        </mesh>
        <mesh material={m.sash} position={[0.08, 0.41, 0.125]} scale={[1, 0.8, 0.6]}>
          <sphereGeometry args={[0.04, 12, 10]} />
        </mesh>

        {/* Arms in wide coat sleeves, little fists, his bandana round the left arm. */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.17, 0.57, 0]} rotation-z={side * 0.42}>
            <mesh material={m.coat} position-y={-0.08} castShadow>
              <cylinderGeometry args={[0.045, 0.065, 0.17, 14]} />
            </mesh>
            <mesh material={m.skin} position-y={-0.2} castShadow>
              <sphereGeometry args={[0.048, 14, 12]} />
            </mesh>
            {side === 1 && (
              <mesh material={m.black} position-y={-0.04} rotation-x={Math.PI / 2}>
                <torusGeometry args={[0.05, 0.014, 8, 20]} />
              </mesh>
            )}
          </group>
        ))}

        {/* A sword at his hip, its grip up by his right hand with the gold guard. */}
        <group position={[-0.17, 0.42, 0.07]} rotation={[0.35, 0, 0.32]}>
          <mesh material={m.grip} position-y={0.06} castShadow>
            <cylinderGeometry args={[0.016, 0.016, 0.12, 10]} />
          </mesh>
          <mesh material={m.gold} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.038, 0.038, 0.012, 10]} />
          </mesh>
          <mesh material={m.black} position-y={-0.16} castShadow>
            <cylinderGeometry args={[0.018, 0.015, 0.3, 10]} />
          </mesh>
        </group>

        {/* The head, on its spring. */}
        <group ref={head} position-y={0.6}>
          <mesh geometry={geo.head} material={m.skin} position-y={0.22} castShadow />
          {/* A rounded crown of hair, the spikes standing out of it. */}
          <mesh material={m.hair} position={[0, 0.4, -0.03]} scale={[0.315, 0.17, 0.27]} castShadow>
            <sphereGeometry args={[1, 28, 18]} />
          </mesh>
          {spikes.map(([x, y, z, side, back, deep], i) => (
            <mesh
              key={i}
              geometry={geo.spike}
              material={deep ? m.hairDeep : m.hair}
              position={[x, y + 0.2, z]}
              rotation={[back, 0, side]}
              castShadow
            />
          ))}
          {bangs.map(([x, side], i) => (
            <mesh
              key={\`bang-\${i}\`}
              geometry={geo.bang}
              material={i % 2 ? m.hairDeep : m.hair}
              position={[x, 0.39, 0.235]}
              rotation={[Math.PI - 0.55, 0, side]}
              castShadow
            />
          ))}
          {/* His right eye open, round and black; his left closed, with the scar running through it. */}
          <mesh material={m.eye} position={[-0.11, 0.2, 0.231]} scale={[1, 1.08, 0.42]}>
            <sphereGeometry args={[0.058, 20, 14]} />
          </mesh>
          <mesh material={m.eye} position={[0.12, 0.215, 0.232]} rotation-z={Math.PI * 1.2}>
            <torusGeometry args={[0.05, 0.006, 6, 16, Math.PI * 0.6]} />
          </mesh>
          <mesh material={m.scar} position={[0.12, 0.21, 0.233]} rotation-z={-0.18}>
            <boxGeometry args={[0.012, 0.15, 0.004]} />
          </mesh>
          <mesh material={m.skin} position={[0.01, 0.15, 0.232]} scale={[0.8, 1, 0.5]}>
            <sphereGeometry args={[0.018, 10, 8]} />
          </mesh>
          {/* Ears, and three gold earrings in his left. */}
          {[-1, 1].map((side) => (
            <mesh key={side} material={m.skin} position={[side * 0.285, 0.19, 0.02]} scale={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.055, 12, 10]} />
            </mesh>
          ))}
          {[0.15, 0.115, 0.08].map((y) => (
            <mesh key={y} material={m.gold} position={[0.305, y, 0.03]} rotation-y={Math.PI / 2}>
              <torusGeometry args={[0.014, 0.005, 6, 14]} />
            </mesh>
          ))}
        </group>
      </group>

      {canHover && (
        <Html position={[0, 1.2, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div
            className={\`whitespace-nowrap rounded-full bg-fg px-3.5 py-1.5 text-[13px] font-medium text-bg shadow-lg transition-all duration-200 \${
              hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }\`}
          >
            Roronoa Zoro <span className="text-bg/60">· give him a tap</span>
          </div>
        </Html>
      )}
    </group>
  );
}
`;export{e as default};
