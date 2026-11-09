const t=`import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { easing } from "maath";
import { mat } from "@/desk/scene/materials";
import { desk } from "@/desk/store";
import { sound } from "@/lib/sound";

/** Touch screens have no hover, so a name tag would only flash as the mug is tapped. */
const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

const SIPS = 4;
/** How high the coffee stands in the mug, from a dreg at the bottom to the brim. */
const LEVEL = { empty: 0.11, full: 0.76 };
const SIP_TIME = 2.3;
const POUR_TIME = 2.2;
/** How long it steams after a refill, a sip, or when the page first opens. */
const STEAM = { refill: 14, sip: 6, start: 10 };
const PUFFS = 7;

const levelFor = (sips: number) => LEVEL.empty + ((LEVEL.full - LEVEL.empty) * sips) / SIPS;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** A soft round puff, drawn once, for the steam. */
function puffTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * A mug of coffee you can drink. A click lifts it towards you for a sip; four
 * sips empty it, and the next click pours a fresh cup. It steams while it's hot.
 */
export function Mug(props: JSX.IntrinsicElements["group"]) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const [sips, setSips] = useState(SIPS);
  const [hovered, setHovered] = useState(false);

  const body = useMemo(() => {
    const p = [
      [0, 0],
      [0.38, 0],
      [0.415, 0.025],
      [0.425, 0.9],
      [0.41, 0.93],
      [0.39, 0.9],
      [0.38, 0.08],
      [0, 0.08],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(p, 56);
  }, []);
  const steam = useMemo(
    () => ({
      // A soft warm grey, so it reads against the white room by day as well as in the lamplight.
      material: new THREE.SpriteMaterial({ map: puffTexture(), color: "#B9B2AA", depthWrite: false, opacity: 0 }),
      seeds: Array.from({ length: PUFFS }, (_, i) => ({ offset: i / PUFFS, sway: 0.6 + Math.random() * 0.8, phase: Math.random() * 6 })),
    }),
    []
  );

  const group = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const surface = useRef<THREE.Mesh>(null);
  const stream = useRef<THREE.Mesh>(null);
  const puffs = useRef<(THREE.Sprite | null)[]>([]);
  const toYou = useMemo(() => new THREE.Vector3(), []);
  const s = useRef({
    action: null as null | "sip" | "pour",
    t: 0,
    level: LEVEL.full,
    from: LEVEL.full,
    to: LEVEL.full,
    hot: STEAM.start,
    clock: 0,
    steam: 0,
  });

  const busy = () => s.current.action !== null;

  const act = () => {
    const st = s.current;
    if (busy() || desk.get().focus !== null) return;
    st.t = 0;
    st.from = st.level;
    if (sips > 0) {
      st.action = "sip";
      st.to = levelFor(sips - 1);
      setSips(sips - 1);
      window.setTimeout(() => sound.sip(), 450);
    } else {
      st.action = "pour";
      st.to = LEVEL.full;
      setSips(SIPS);
      sound.pour(POUR_TIME);
    }
    // The desk only redraws when asked; this starts the animation.
    invalidate();
  };

  useFrame((frame, dt) => {
    const st = s.current;
    const step = Math.min(dt, 0.1);
    st.clock += step;
    st.hot = Math.max(0, st.hot - step);

    if (st.action) {
      st.t = Math.min(1, st.t + step / (st.action === "sip" ? SIP_TIME : POUR_TIME));
      if (st.action === "sip") {
        // Lifted off the desk and brought a third of the way to you, tipped as you drink, then put back.
        const t = st.t;
        const near = t < 0.3 ? smooth(t / 0.3) : t < 0.66 ? 1 : smooth(1 - (t - 0.66) / 0.34);
        const tip = smooth(THREE.MathUtils.clamp((t - 0.24) / 0.12, 0, 1)) * smooth(THREE.MathUtils.clamp((0.7 - t) / 0.1, 0, 1));
        st.level = THREE.MathUtils.lerp(st.from, st.to, smooth(THREE.MathUtils.clamp((t - 0.36) / 0.24, 0, 1)));
        if (lift.current && group.current) {
          group.current.updateWorldMatrix(true, false);
          toYou.copy(camera.position);
          group.current.worldToLocal(toYou);
          lift.current.position.copy(toYou).multiplyScalar(0.33 * near);
          lift.current.position.y += 1.2 * near;
          // Tip the rim towards you, about the axis across your line of sight.
          toYou.y = 0;
          toYou.normalize();
          lift.current.rotation.set(toYou.z * 0.75 * tip, 0, -toYou.x * 0.75 * tip);
        }
        frame.gl.shadowMap.needsUpdate = true;
      } else {
        st.level = THREE.MathUtils.lerp(st.from, st.to, smooth(THREE.MathUtils.clamp((st.t - 0.12) / 0.8, 0, 1)));
      }
      if (st.t >= 1) {
        st.hot = Math.max(st.hot, st.action === "pour" ? STEAM.refill : STEAM.sip);
        st.action = null;
        lift.current?.position.set(0, 0, 0);
        lift.current?.rotation.set(0, 0, 0);
      }
    }

    if (surface.current) {
      surface.current.position.y = st.level;
      surface.current.visible = st.level > LEVEL.empty + 0.001 || st.action === "pour";
    }
    if (stream.current) {
      const pouring = st.action === "pour" && st.t < 0.85;
      stream.current.visible = pouring;
      const top = 2.6;
      stream.current.scale.y = top - st.level;
      stream.current.position.y = (top + st.level) / 2;
    }

    // Steam rises while the coffee's hot and there's coffee to steam.
    const wantSteam = st.hot > 0 && st.level > LEVEL.empty + 0.05 && !st.action ? Math.min(1, st.hot / 3) : 0;
    easing.damp(st, "steam", wantSteam, 0.5, step);
    steam.material.opacity = 0.9 * st.steam;
    puffs.current.forEach((p, i) => {
      if (!p) return;
      const seed = steam.seeds[i];
      const k = (st.clock * 0.28 + seed.offset) % 1;
      p.position.set(Math.sin(st.clock * seed.sway + seed.phase) * 0.12 * k, st.level + 0.1 + k * 1.3, Math.cos(st.clock * seed.sway + seed.phase) * 0.08 * k);
      const size = 0.25 + k * 0.55;
      p.scale.set(size, size, 1);
      p.material.opacity = steam.material.opacity * Math.sin(Math.PI * k);
    });

    if (st.action || st.steam > 0.002) frame.invalidate();
  });

  // The desk speaker can ask for this too, so it always gets the latest version.
  const sipNow = useRef(act);
  sipNow.current = act;
  useEffect(() => desk.onPoke("sip", () => sipNow.current()), []);

  const cursor = (on: boolean) => {
    const d = desk.get();
    gl.domElement.style.cursor = on ? "pointer" : d.holding || d.focus === null ? "grab" : "";
  };

  return (
    <group ref={group} {...props}>
      <group
        ref={lift}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta <= 6) act();
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
        <mesh geometry={body} material={mat.ceramic} castShadow receiveShadow />
        <mesh ref={surface} material={mat.coffee} position-y={LEVEL.full} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.39, 48]} />
        </mesh>
        <mesh material={mat.ceramic} position={[0.42, 0.5, 0]} rotation-z={-Math.PI / 2} castShadow>
          <torusGeometry args={[0.2, 0.045, 16, 32, Math.PI]} />
        </mesh>
        {steam.seeds.map((_, i) => (
          <sprite
            key={i}
            ref={(el) => {
              puffs.current[i] = el;
              if (el) el.material = steam.material.clone();
            }}
            raycast={() => null}
          />
        ))}
      </group>
      {/* The fresh coffee, poured from above. */}
      <mesh ref={stream} material={mat.coffee} visible={false} raycast={() => null}>
        <cylinderGeometry args={[0.045, 0.06, 1, 12, 1, true]} />
      </mesh>

      {canHover && (
        <Html position={[0, 1.55, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div
            className={\`whitespace-nowrap rounded-full bg-fg px-3.5 py-1.5 text-[13px] font-medium text-bg shadow-lg transition-all duration-200 \${
              hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }\`}
          >
            {sips > 0 ? "喝一口" : "再倒一杯"}
          </div>
        </Html>
      )}
    </group>
  );
}
`;export{t as default};
