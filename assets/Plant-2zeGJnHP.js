const t=`import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { leafGeometry, seeded } from "@/desk/geometry";
import { leafMaterials, mat } from "@/desk/scene/materials";
import { desk } from "@/desk/store";
import { sound } from "@/lib/sound";

/** Touch screens have no hover, so a name tag would only flash as the plant is tapped. */
const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

const BASE_LEAVES = 9;
const NEW_LEAVES = 6;
const SOIL_Y = 0.9;
const HOUR = 3_600_000;
/** Soil: parched when it's been left too long, damp brown when it's fine, dark just after a watering. */
const SOIL = { parched: new THREE.Color("#7A6650"), fine: new THREE.Color("#3A2E25"), wet: new THREE.Color("#1C1410") };
/** What each leaf green fades to when the plant's gone dry. */
const DRY_LEAVES = ["#8E7C45", "#9C8A4C", "#A69553", "#857340"].map((c) => new THREE.Color(c));
/** How far the leaves lean out, and how much they sag, when it's as thirsty as it gets. */
const DROOP = 0.55;
const SAG = 0.12;

/** A watering, from picking up the can to putting it down, in seconds. */
const WATER_TIME = 4.8;
/**
 * The movements in a watering, as fractions of it. Like a hand's, each one
 * flows into the next instead of stopping between: the can starts tipping
 * before it has quite arrived over the pot, and starts back as it rights itself.
 */
const STEP = {
  carry: [0, 0.34],
  tip: [0.26, 0.42],
  untip: [0.7, 0.8],
  back: [0.74, 1],
} as const;
/** How long the water runs, in seconds: from the can tipping far enough, to it tipping back. */
const POUR_SECONDS = (STEP.untip[0] - STEP.tip[0] - 0.09) * WATER_TIME;

/** The spout runs from low on the body up to its mouth; the can's own space has the spout along +x. */
const SPOUT = { from: new THREE.Vector2(0.22, 0.12), to: new THREE.Vector2(0.86, 0.7) };
const SPOUT_DIR = SPOUT.to.clone().sub(SPOUT.from);

/** The can is modelled small and drawn this much bigger. */
const CAN_SCALE = 1.35;
const CAN = {
  /** The height of the middle of its body, which it turns about. */
  pivot: 0.26 * CAN_SCALE,
  /** Waiting on the desk to the left of the pot (in the plant's space), in plain view. */
  rest: new THREE.Vector3(-1.32, 0, -0.12),
  restSpout: new THREE.Vector2(0.6, 0.8).normalize(),
  /** It pours from that side too, so the stream is seen side on. */
  side: new THREE.Vector2(-0.89, -0.45).normalize(),
  /** How far it tips to pour. */
  tip: 0.95,
};
/** The stream, as a tube cut into this many lengths, so it can run out of the spout and fall away. */
const STREAM = { segments: 28, sides: 8 };
const DROPS = 36;

type Shared = { waters: number; lastWatered: number | null };

/** How grown the plant is, 0 to 1, from everyone's watering: quick at first, slower later. */
const growthOf = (waters: number) => Math.min(1, Math.log10(1 + waters) / 2.5);
/** How many leaves it has grown beyond the ones it started with. */
const leavesOf = (waters: number) => Math.floor(NEW_LEAVES * growthOf(waters) + 1e-6);
/**
 * How thirsty it is, 0 to 1: happy for two hours after anyone waters it, then
 * drying out over the next ten. Never watered at all, it's bone dry.
 */
const thirstOf = (last: number | null) => (last ? THREE.MathUtils.clamp((Date.now() - last - 2 * HOUR) / (10 * HOUR), 0, 1) : 1);
/** "once", "twice", "3 times" */
const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : \`\${n.toLocaleString("en-AU")} times\`);

/** Eases in and out with no sudden change of speed at either end. */
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
/** 0 before the movement, 1 after it, easing between. */
const ease = (t: number, [a, b]: readonly [number, number]) => smoother(THREE.MathUtils.clamp((t - a) / (b - a), 0, 1));
/** The turn about y that points the can's spout (+x) along a direction on the desk. */
const yawFor = (dir: THREE.Vector2) => Math.atan2(-dir.y, dir.x);

/** A small enamel watering can, standing on y = 0, its spout along +x and its handle at the back. */
function WateringCan({ material }: { material: THREE.Material }) {
  const body = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0, 0],
          [0.25, 0],
          [0.268, 0.012],
          [0.276, 0.04],
          [0.27, 0.34],
          [0.255, 0.4],
          [0.215, 0.455],
          [0.15, 0.49],
          [0.07, 0.505],
          [0, 0.51],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        40
      ),
    []
  );
  const angle = Math.atan2(SPOUT_DIR.y, SPOUT_DIR.x);
  const mid = SPOUT.from.clone().add(SPOUT.to).multiplyScalar(0.5);
  return (
    <group>
      <mesh geometry={body} material={material} castShadow receiveShadow />
      <mesh material={material} position={[mid.x, mid.y, 0]} rotation-z={angle - Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.022, 0.042, SPOUT_DIR.length(), 14]} />
      </mesh>
      <mesh material={material} position={[SPOUT.to.x, SPOUT.to.y, 0]} rotation-z={angle - Math.PI / 2}>
        <cylinderGeometry args={[0.032, 0.024, 0.035, 14]} />
      </mesh>
      <mesh material={material} position={[-0.21, 0.27, 0]} rotation-z={Math.PI / 2} castShadow>
        <torusGeometry args={[0.19, 0.026, 10, 28, Math.PI]} />
      </mesh>
      <mesh material={material} position={[-0.04, 0.52, 0]}>
        <cylinderGeometry args={[0.085, 0.09, 0.05, 24]} />
      </mesh>
    </group>
  );
}

/**
 * Where the tape sits on the pot: between these heights, centred on the side
 * that faces the room (an angle about y, from +z), and how far round it goes.
 * The pot's wall runs from 0.47 across at its foot to 0.58 at its rim.
 */
const TAPE = { bottom: 0.71, top: 0.95, facing: -0.25, arc: 1.05 };
const potRadius = (y: number) => 0.47 + (0.11 * (y - 0.03)) / 0.97;

/**
 * A strip of masking tape stuck on the front of the pot, with "浇点水"
 * written on it in marker. It's what tells someone new to the desk that the
 * plant is theirs to look after, and where a real one would say it.
 */
function PlantTape() {
  const invalidate = useThree((s) => s.invalidate);
  const { canvas, texture, geometry } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 216;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    // A band of the pot's own cone, a hair proud of it, so the tape lies flat against the concrete.
    const geometry = new THREE.CylinderGeometry(
      potRadius(TAPE.top) + 0.006,
      potRadius(TAPE.bottom) + 0.006,
      TAPE.top - TAPE.bottom,
      16,
      1,
      true,
      TAPE.facing - TAPE.arc / 2,
      TAPE.arc
    );
    return { canvas, texture, geometry };
  }, []);

  useEffect(() => {
    const draw = () => {
      const g = canvas.getContext("2d")!;
      const { width: w, height: h } = canvas;
      g.clearRect(0, 0, w, h);
      g.save();
      // Stuck on by hand, so not quite level.
      g.translate(w / 2, h / 2);
      g.rotate(-0.045);
      const tw = w * 0.9;
      const th = h * 0.74;
      // Torn ends: a little zigzag at each side.
      g.beginPath();
      g.moveTo(-tw / 2, -th / 2);
      g.lineTo(tw / 2, -th / 2);
      for (let i = 1; i <= 6; i++) g.lineTo(tw / 2 + (i % 2 ? 7 : 0), -th / 2 + (th * i) / 6);
      g.lineTo(-tw / 2, th / 2);
      for (let i = 5; i >= 0; i--) g.lineTo(-tw / 2 - (i % 2 ? 7 : 0), -th / 2 + (th * i) / 6);
      g.closePath();
      g.fillStyle = "#EFE3C4";
      g.fill();
      // The faint crinkle of paper tape.
      g.fillStyle = "rgba(120,96,50,0.08)";
      for (let x = -tw / 2 + 18; x < tw / 2; x += 37) g.fillRect(x, -th / 2, 2, th);
      g.fillStyle = "#26262A";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "700 104px Caveat, cursive";
      g.fillText("浇点水", -26, 6);
      // A drop after the words.
      g.fillStyle = "#4F8FCC";
      g.beginPath();
      g.moveTo(178, -30);
      g.bezierCurveTo(156, 4, 159, 30, 178, 30);
      g.bezierCurveTo(197, 30, 200, 4, 178, -30);
      g.fill();
      g.restore();
      texture.needsUpdate = true;
      invalidate();
    };
    draw();
    // Caveat may still be on its way; write it again once it's here.
    document.fonts?.load("700 104px Caveat").then(draw, () => {});
  }, [canvas, texture, invalidate]);

  useEffect(
    () => () => {
      texture.dispose();
      geometry.dispose();
    },
    [texture, geometry]
  );

  return (
    <mesh geometry={geometry} position-y={(TAPE.top + TAPE.bottom) / 2}>
      <meshStandardMaterial map={texture} alphaTest={0.5} roughness={0.8} />
    </mesh>
  );
}

/**
 * A snake plant in a concrete pot, shared by everyone who visits, with its
 * watering can on the desk in front of it. A click on either picks the can up:
 * it's carried over the pot and tipped, and a stream of water runs onto the
 * soil, which darkens and shines. If the plant was thirsty its leaves lift
 * again; every so often a watering grows it a new leaf. Then the can goes back.
 */
export function Plant(props: JSX.IntrinsicElements["group"]) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  // What the plant shows. A watering's news is held back until the water has soaked in.
  const [shared, setShared] = useState<Shared | null>(null);
  const seen = useRef<Shared | null>(null);
  seen.current = shared;
  const [hovered, setHovered] = useState(false);
  const [thanks, setThanks] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/plant")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Shared | null) => alive && data && setShared(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const pot = useMemo(() => {
    const p = [
      [0, 0],
      [0.44, 0],
      [0.47, 0.03],
      [0.58, 1.0],
      [0.55, 1.02],
      [0.5, 0.95],
      [0, 0.95],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(p, 48);
  }, []);

  // The plant as it always was, then the leaves it grows: newer ones come up from the middle.
  const leaves = useMemo(() => {
    const rand = seeded(11);
    const first = Array.from({ length: BASE_LEAVES }, (_, i) => {
      const height = 1.3 + rand() * 1.1;
      return {
        geo: leafGeometry(height, 0.13 + rand() * 0.05, 0.25 + rand() * 0.35, (rand() - 0.5) * 1.2),
        rotY: (i / BASE_LEAVES) * Math.PI * 2 + rand() * 0.5,
        tilt: 0.06 + rand() * 0.12,
        x: (rand() - 0.5) * 0.35,
        z: (rand() - 0.5) * 0.35,
        material: i % leafMaterials.length,
      };
    });
    const grow = seeded(29);
    const later = Array.from({ length: NEW_LEAVES }, (_, i) => ({
      geo: leafGeometry(1.5 + grow() * 0.9, 0.12 + grow() * 0.04, 0.2 + grow() * 0.3, (grow() - 0.5) * 1.0),
      rotY: (i / NEW_LEAVES) * Math.PI * 2 + 0.4 + grow() * 0.4,
      tilt: 0.03 + grow() * 0.08,
      x: (grow() - 0.5) * 0.18,
      z: (grow() - 0.5) * 0.18,
      material: (i + 1) % leafMaterials.length,
    }));
    return [...first, ...later];
  }, []);

  // Where the can rests, where it pours from, and the stream it pours, all in the plant's space.
  const pour = useMemo(() => {
    const yawRest = yawFor(CAN.restSpout);
    // Turned the short way round from resting to pouring.
    let yaw = yawFor(new THREE.Vector2(-CAN.side.x, -CAN.side.y));
    while (yaw - yawRest > Math.PI) yaw -= Math.PI * 2;
    while (yaw - yawRest < -Math.PI) yaw += Math.PI * 2;
    // Where the spout's mouth ends up, from the can's middle, once it's turned and tipped.
    const turn = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationZ(-CAN.tip));
    const mouthFromPivot = new THREE.Vector3(SPOUT.to.x * CAN_SCALE, SPOUT.to.y * CAN_SCALE - CAN.pivot, 0).applyMatrix4(turn);
    const spout = new THREE.Vector3(SPOUT_DIR.x, SPOUT_DIR.y, 0).normalize().transformDirection(turn);
    // The mouth just inside the rim, well above the soil; the water lands near the middle.
    const mouth = new THREE.Vector3(CAN.side.x * 0.42, SOIL_Y + 0.85, CAN.side.y * 0.42);
    const land = new THREE.Vector3(CAN.side.x * 0.16, SOIL_Y + 0.005, CAN.side.y * 0.16);
    const curve = new THREE.QuadraticBezierCurve3(mouth, mouth.clone().addScaledVector(spout, 0.25), land);
    const stream = new THREE.TubeGeometry(curve, STREAM.segments, 0.03, STREAM.sides, false);
    // Thinner as it falls, as water does.
    const pos = stream.attributes.position as THREE.BufferAttribute;
    const centre = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let j = 0; j <= STREAM.segments; j++) {
      curve.getPointAt(j / STREAM.segments, centre);
      const k = THREE.MathUtils.lerp(1.2, 0.65, j / STREAM.segments);
      for (let i = 0; i <= STREAM.sides; i++) {
        const n = j * (STREAM.sides + 1) + i;
        v.fromBufferAttribute(pos, n).sub(centre).multiplyScalar(k).add(centre);
        pos.setXYZ(n, v.x, v.y, v.z);
      }
    }
    const rest = CAN.rest.clone().setY(CAN.pivot);
    const at = mouth.clone().sub(mouthFromPivot);
    // It arrives just above where it pours from, and settles onto it as it tips.
    const above = at.clone().setY(at.y + 0.18);
    // One smooth curve there and back: straight up off the desk, then over, coming down gently onto the pour.
    const away = rest.clone().sub(above).setY(0).multiplyScalar(0.3);
    const path = new THREE.CubicBezierCurve3(
      rest,
      rest.clone().setY(rest.y + 1.1),
      above.clone().add(away).setY(above.y + 0.45),
      above
    );
    // Nothing of it shows until someone pours.
    stream.setDrawRange(0, 0);
    return { yawRest, yaw, rest, at, path, land, stream };
  }, []);

  const m = useMemo(
    () => ({
      soil: mat.soil.clone(),
      leaves: leafMaterials.map((l) => l.clone()),
      can: new THREE.MeshStandardMaterial({ color: "#7A96B0", metalness: 0.2, roughness: 0.32 }),
      water: new THREE.MeshStandardMaterial({ color: "#9FD0EE", metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.85 }),
    }),
    []
  );
  const dropGeo = useMemo(() => new THREE.SphereGeometry(0.02, 8, 6), []);

  const leafRefs = useRef<(THREE.Group | null)[]>([]);
  const can = useRef<THREE.Group>(null);
  const canTip = useRef<THREE.Group>(null);
  const stream = useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const s = useRef({
    /** How far through a watering, 0 to 1, or -1 when the can's at rest; and when it began. */
    t: -1,
    startedAt: 0,
    clock: 0,
    flowing: false,
    /** How much of the stream has left the spout, and how much has fallen away, 0 to 1. */
    head: 0,
    tail: 1,
    soakAt: Infinity,
    soaked: false,
    perkAt: -Infinity,
    setDown: false,
    wetPeak: 0,
    wetAt: 0,
    sizes: leaves.map((_, i): number => (i < BASE_LEAVES ? 1 : 0)),
    droop: 0,
    spawn: 0,
    // On arrival the plant just appears as grown as it is; only watering is animated.
    settled: false,
    drops: Array.from({ length: DROPS }, () => ({ live: false, p: new THREE.Vector3(), v: new THREE.Vector3() })),
  });
  // The news from the server about this watering, until the water soaks in.
  const news = useRef<Shared | null | "failed">(null);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), m: new THREE.Matrix4(), hidden: new THREE.Matrix4().makeScale(0, 0, 0) }), []);

  // The water has soaked in: the plant takes it up, and says thanks.
  const soak = () => {
    const before = seen.current;
    const result = news.current;
    if (result === null) return; // still waiting to hear back; it'll be shown when it arrives
    const after: Shared =
      result === "failed" ? { waters: (before?.waters ?? 0) + 1, lastWatered: Date.now() } : result;
    setShared(after);
    const grew = leavesOf(after.waters) > leavesOf(before?.waters ?? 0);
    const wasThirsty = thirstOf(before?.lastWatered ?? null) > 0.3;
    setThanks(
      grew
        ? "长出新叶了，谢谢浇水"
        : wasThirsty
          ? "谢谢，它又精神了"
          : result === "failed"
            ? "谢谢浇水！"
            : \`Thanks! It's been watered \${times(after.waters)}\`
    );
    news.current = null;
    s.current.perkAt = s.current.clock;
    invalidate();
  };

  const water = () => {
    const st = s.current;
    if (st.t >= 0 || desk.get().focus !== null) return;
    // Timed from the click itself: the desk may have been asleep, and its first frame back shouldn't jump ahead.
    Object.assign(st, { t: 0, startedAt: performance.now(), soakAt: Infinity, soaked: false, setDown: false });
    news.current = null;
    invalidate();
    fetch("/api/plant", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: (Shared & { counted: boolean }) | null) => {
        news.current = data ? { waters: data.waters, lastWatered: data.lastWatered } : "failed";
      })
      .catch(() => {
        news.current = "failed";
      })
      .finally(() => {
        if (s.current.soaked) soak();
      });
  };

  useEffect(() => {
    if (!thanks) return;
    const id = window.setTimeout(() => setThanks(null), 3600);
    return () => window.clearTimeout(id);
  }, [thanks]);

  useFrame((frame, dt) => {
    const st = s.current;
    const step = Math.min(dt, 0.1);
    st.clock += step;
    let moving = false;

    // The can: lifted, carried over the pot, tipped to pour, then carried back and put down.
    if (st.t >= 0 && can.current && canTip.current) {
      st.t = Math.min(1, (performance.now() - st.startedAt) / (WATER_TIME * 1000));
      const t = st.t;
      // How far along the way over (0 at rest, 1 over the pot), and how far tipped.
      const out = ease(t, STEP.carry) - ease(t, STEP.back);
      const tipped = ease(t, STEP.tip) - ease(t, STEP.untip);
      pour.path.getPoint(out, can.current.position);
      can.current.position.y -= 0.18 * tipped;
      can.current.rotation.y = THREE.MathUtils.lerp(pour.yawRest, pour.yaw, out);
      // Carried, its spout rides up a little and it leans with the swing; pouring, the hand holds it nearly still.
      const carried = Math.sin(Math.PI * out) * (1 - tipped);
      canTip.current.rotation.z = 0.14 * carried - CAN.tip * tipped - 0.015 * tipped * Math.sin(st.clock * 4);
      canTip.current.rotation.x = 0.05 * carried;

      const flowing = tipped > 0.85;
      if (flowing && !st.flowing) {
        st.head = 0;
        st.tail = 0;
        st.soakAt = st.clock + 0.6;
        // Wetter from however damp it already is.
        st.wetPeak = wetness(st);
        sound.water(POUR_SECONDS);
      }
      st.flowing = flowing;
      if (st.clock >= st.soakAt && !st.soaked) {
        st.soaked = true;
        soak();
      }
      if (!st.setDown && t > 0.985) {
        st.setDown = true;
        sound.setDown();
      }
      if (t >= 1) {
        st.t = -1;
        can.current.position.copy(pour.rest);
        can.current.rotation.y = pour.yawRest;
        canTip.current.rotation.set(0, 0, 0);
      }
      frame.gl.shadowMap.needsUpdate = true;
      moving = true;
    }

    // The stream runs out of the spout down to the soil, and when the can tips back, falls away after it.
    if (stream.current) {
      if (st.flowing) st.head = Math.min(1, st.head + step / 0.22);
      else if (st.tail < 1) st.tail = Math.min(1, st.tail + step / 0.28);
      const from = Math.floor(st.tail * STREAM.segments);
      const to = Math.ceil(st.head * STREAM.segments);
      // Never hidden, only drawn as far as it has run: so its shader is built with the rest of the desk before the
      // first frame, instead of stopping everything the first time someone pours.
      stream.current.geometry.setDrawRange(from * STREAM.sides * 6, Math.max(0, to - from) * STREAM.sides * 6);
      if (to > from) moving = true;
    }

    // Where the water lands it splashes, and the soil darkens.
    const landing = st.head >= 1 && st.tail === 0;
    if (landing) {
      st.wetPeak = Math.min(1, st.wetPeak + step / 1.2);
      st.wetAt = performance.now();
      st.spawn += step * 26;
    }
    if (drops.current) {
      let any = false;
      st.drops.forEach((d, i) => {
        if (!d.live && st.spawn >= 1) {
          st.spawn -= 1;
          d.live = true;
          d.p.copy(pour.land);
          d.v.set((Math.random() - 0.5) * 0.9, 0.7 + Math.random() * 0.7, (Math.random() - 0.5) * 0.9);
        }
        if (d.live) {
          d.v.y -= 7 * step;
          d.p.addScaledVector(d.v, step);
          if (d.p.y < SOIL_Y) d.live = false;
        }
        if (d.live) {
          any = true;
          drops.current!.setMatrixAt(i, tmp.m.makeTranslation(d.p.x, d.p.y, d.p.z));
        } else drops.current!.setMatrixAt(i, tmp.hidden);
      });
      st.spawn = Math.min(st.spawn, 1);
      drops.current.instanceMatrix.needsUpdate = true;
      if (any) moving = true;
    }
    // Wet soil is darker and catches the light; it dries by the clock, so drying needs no frames of its own.
    const wet = wetness(st);
    m.soil.color.lerpColors(SOIL.fine, SOIL.parched, st.droop).lerp(SOIL.wet, wet);
    m.soil.roughness = THREE.MathUtils.lerp(1, 0.45, wet);

    // Leaves: as many as everyone's watering has grown, drooping if it's thirsty, and a shiver as a watering perks it up.
    const growth = shared ? growthOf(shared.waters) : 0;
    const extra = shared ? leavesOf(shared.waters) : 0;
    const thirst = shared ? thirstOf(shared.lastWatered) : 0;
    const snap = shared !== null && !st.settled;
    if (snap) st.settled = true;
    st.droop = snap ? thirst : THREE.MathUtils.damp(st.droop, thirst, 1.4, step);
    if (Math.abs(st.droop - thirst) > 1e-3) moving = true;
    const since = st.clock - st.perkAt;
    const shiver = since < 3 ? Math.exp(-2.2 * since) * Math.sin(10 * since) : 0;
    if (since < 3) moving = true;
    // Dry and yellowing when thirsty, greening up again as it drinks.
    m.leaves.forEach((l, i) => l.color.lerpColors(leafMaterials[i].color, DRY_LEAVES[i], st.droop * 0.9));
    leaves.forEach((leaf, i) => {
      const target = i < BASE_LEAVES || i - BASE_LEAVES < extra ? 1 + 0.15 * growth : 0;
      st.sizes[i] = snap ? target : THREE.MathUtils.damp(st.sizes[i], target, i < BASE_LEAVES ? 2.2 : 1.1, step);
      if (Math.abs(st.sizes[i] - target) > 1e-3) moving = true;
      const g = leafRefs.current[i];
      if (!g) return;
      const size = st.sizes[i];
      const sag = 1 - SAG * st.droop;
      g.scale.set(Math.max(0.001, Math.min(1, size * 1.4)), Math.max(0.001, size * sag), Math.max(0.001, Math.min(1, size * 1.4)));
      g.children[0].rotation.x = leaf.tilt + st.droop * DROOP * (0.7 + 0.6 * ((i * 0.37) % 1)) - 0.09 * shiver * Math.cos(i * 0.7);
    });

    if (moving) {
      frame.invalidate();
      frame.gl.shadowMap.needsUpdate = true;
    }
  });

  // The desk speaker can ask for this too, so it always gets the latest version.
  const waterNow = useRef(water);
  waterNow.current = water;
  useEffect(() => desk.onPoke("water", () => waterNow.current()), []);

  const cursor = (on: boolean) => {
    const d = desk.get();
    gl.domElement.style.cursor = on ? "pointer" : d.holding || d.focus === null ? "grab" : "";
  };
  const handlers = {
    onClick: (e: { stopPropagation(): void; delta: number }) => {
      e.stopPropagation();
      if (e.delta <= 6) water();
    },
    onPointerOver: (e: { stopPropagation(): void }) => {
      e.stopPropagation();
      setHovered(true);
      cursor(true);
    },
    onPointerOut: () => {
      setHovered(false);
      cursor(false);
    },
  };

  const thirsty = shared ? thirstOf(shared.lastWatered) > 0.3 : false;
  const label =
    thanks ??
    (thirsty ? "给植物浇水 · 它渴了" : shared?.waters ? \`Water the plant · watered \${times(shared.waters)}\` : "给植物浇水");

  return (
    <group {...props}>
      <group {...handlers}>
        <mesh geometry={pot} material={mat.concrete} castShadow receiveShadow />
        <mesh material={m.soil} position-y={SOIL_Y} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.52, 32]} />
        </mesh>
        <PlantTape />
        {leaves.map((l, i) => (
          <group
            key={i}
            ref={(el) => {
              leafRefs.current[i] = el;
            }}
            position={[l.x, 0.88, l.z]}
            rotation={[0, l.rotY, 0]}
            scale={i < BASE_LEAVES ? 1 : 0.001}
          >
            <mesh geometry={l.geo} material={m.leaves[l.material]} rotation-x={l.tilt} castShadow />
          </group>
        ))}
      </group>

      {/* The watering can, turning about the middle of its body. */}
      <group ref={can} position={pour.rest} rotation-y={pour.yawRest} {...handlers}>
        <group ref={canTip}>
          <group position-y={-CAN.pivot} scale={CAN_SCALE}>
            <WateringCan material={m.can} />
          </group>
        </group>
      </group>
      <mesh ref={stream} geometry={pour.stream} material={m.water} raycast={() => null} />
      <instancedMesh ref={drops} args={[dropGeo, m.water, DROPS]} frustumCulled={false} raycast={() => null} />

      {(canHover || thanks) && (
        <Html position={[0, 2.9, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div
            className={\`whitespace-nowrap rounded-full bg-fg px-3.5 py-1.5 text-[13px] font-medium text-bg shadow-lg transition-all duration-200 \${
              hovered || thanks ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }\`}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/** How wet the soil is, 0 to 1: as wet as the last watering left it, drying over 40 seconds. */
function wetness(st: { wetPeak: number; wetAt: number }) {
  return st.wetAt ? st.wetPeak * Math.max(0, 1 - (performance.now() - st.wetAt) / 40_000) : 0;
}
`;export{t as default};
