const e=`import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { sound } from "@/lib/sound";
import { easing } from "maath";
import { slabGeometry } from "@/desk/geometry";
import { mat } from "@/desk/scene/materials";
import { desk, useDesk, type PrintJob } from "@/desk/store";

const BODY = { w: 1.27, d: 1.3, h: 1.2 };
const SLOT_Z = 0.36;
const PAPER_W = 0.8;
/** Paper per line of text, and the blank paper around the text. */
const LINE = 0.052;
const MARGIN_TOP = 0.16;
const MARGIN_BOTTOM = 0.26;
const ROWS = 90;
/** Seconds to print a whole receipt. */
const PRINT_TIME = 2.6;

const IDLE_JOB: PrintJob = {
  id: 0,
  lines: ["XUEYING STUDIO", "DOCKET", "", "谢谢光临。"],
};

const paperLength = (job: PrintJob) => MARGIN_TOP + job.lines.length * LINE + MARGIN_BOTTOM;

/**
 * The path a receipt takes out of the printer, worked out once: straight up
 * out of the slot, curling forward over the front, hanging down, then lying
 * flat on the desk. \`at(s)\` is the point s units of paper from the slot.
 */
function paperPath() {
  const ds = 0.005;
  const max = 4;
  const ys: number[] = [];
  const zs: number[] = [];
  let y = BODY.h;
  let z = SLOT_Z;
  let angle = 0; // 0 is straight up, π/2 forward along the desk, π straight down
  for (let s = 0; s <= max; s += ds) {
    ys.push(y);
    zs.push(z);
    const onDesk = y <= 0.004;
    let curve = 0;
    if (onDesk) angle = Math.PI / 2;
    else if (s > 0.16 && angle < 2.25) curve = 1 / 0.2;
    else if (angle >= 2.25 && angle < Math.PI) curve = 1 / 0.55;
    angle = Math.min(Math.PI, angle + curve * ds);
    y = Math.max(0.004, y + Math.cos(angle) * ds);
    z += Math.sin(angle) * ds;
  }
  return (s: number) => {
    const i = Math.min(ys.length - 1, Math.max(0, Math.round(s / ds)));
    return [ys[i], zs[i]] as const;
  };
}

function receiptTexture(job: PrintJob) {
  const pxPerUnit = 640;
  const c = document.createElement("canvas");
  c.width = Math.round(PAPER_W * pxPerUnit);
  c.height = Math.round(paperLength(job) * pxPerUnit);
  const g = c.getContext("2d")!;
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#2A2A2A";
  g.textBaseline = "top";
  job.lines.forEach((line, i) => {
    const y = MARGIN_TOP * pxPerUnit + i * LINE * pxPerUnit;
    const bold = i === 0 || /^TOTAL/.test(line);
    g.font = \`\${bold ? 700 : 500} 22px ui-monospace, Menlo, monospace\`;
    if (line.startsWith("--")) {
      g.fillStyle = "#B5B5B5";
      g.fillText("-".repeat(34), 26, y);
      g.fillStyle = "#2A2A2A";
    } else if (line.includes("\\t")) {
      const [left, right] = line.split("\\t");
      g.fillText(left, 26, y);
      g.textAlign = "right";
      g.fillText(right, c.width - 26, y);
      g.textAlign = "left";
    } else {
      g.textAlign = i < 2 ? "center" : "left";
      g.fillText(line, i < 2 ? c.width / 2 : 26, y);
      g.textAlign = "left";
    }
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * A receipt in hand fits between the "回到桌子" button at the top and the
 * receipt controls at the bottom (taller on a phone, where they wrap), in pixels.
 */
const HOLD = { top: 72, bottom: { narrow: 150, wide: 104 }, fill: 0.94, width: 0.86 };
/** A receipt bows a little along its length, more in the hand than lying on the desk. */
const CURL = { held: 0.05, down: 0.02 };
/** Folded in half, back to back, with the print on the outside. */
const FOLD_ANGLE = THREE.MathUtils.degToRad(170);
/** Receipts that have been looked at are kept in a little pile on the desk, in front of the printer. */
const PILE = { max: 3, spot: new THREE.Matrix4().makeTranslation(0.62, 0.008, 1.55).multiply(new THREE.Matrix4().makeRotationY(-0.28)) };
const FLAT = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

const smooth = (t: number) => t * t * (3 - 2 * t);
/** A steady "random" number in [-1, 1] for each receipt, so each one lies a little differently. */
const jitter = (id: number, salt: number) => {
  const x = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

/** A strip of paper: two vertices across, ROWS along. */
function stripGeometry() {
  const geo = new THREE.BufferGeometry();
  const index: number[] = [];
  for (let i = 0; i < ROWS; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((ROWS + 1) * 2 * 3), 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((ROWS + 1) * 2 * 2), 2));
  geo.setIndex(index);
  return geo;
}

/** The printed side, and the plain back of the thermal paper. */
function paperMaterials() {
  const front = mat.paper.clone();
  front.side = THREE.FrontSide;
  front.shadowSide = THREE.DoubleSide;
  const back = mat.paper.clone();
  back.side = THREE.BackSide;
  back.color.set("#F1F0EC");
  return { front, back };
}

/** The canvas cursor: a hand over something to click, otherwise whatever the desk wants there. */
/** Touch screens have no hover, so a name tag would only flash as a receipt is tapped. */
const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

const pointAt = (el: HTMLElement, on: boolean) => {
  const d = desk.get();
  el.style.cursor = on ? "pointer" : d.holding || d.focus === null ? "grab" : "";
};

type Turn = { yaw: number; pitch: number; toYaw: number; toPitch: number };

/**
 * A thermal receipt printer, like the one at the yard's counter. When the
 * docket demo on the tablet is paid, the receipt really comes out of it. Torn
 * off, it can be held up, turned over and folded; put down, it joins a small
 * pile on the desk, where any of them can be picked up again.
 */
export function Printer(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const body = useMemo(() => slabGeometry(BODY.w, BODY.d, BODY.h, 0.14, 0.05), []);
  const path = useMemo(paperPath, []);
  const job = useDesk((s) => s.printJob) ?? IDLE_JOB;

  // The receipts torn off so far, oldest first, and which one is in hand.
  const [pile, setPile] = useState<PrintJob[]>([]);
  const [heldId, setHeldId] = useState<number | null>(null);
  const turn = useRef<Turn>({ yaw: 0, pitch: 0, toYaw: 0, toPitch: 0 });

  // Everyone's latest receipts lie on the desk from the start; ones printed here join them on top.
  const shared = useDesk((s) => s.dockets?.latest);
  const count = useDesk((s) => s.dockets?.count ?? 0);
  useEffect(() => desk.loadDockets(), []);
  useEffect(() => {
    if (!shared) return;
    setPile((p) => {
      const ids = new Set(p.map((r) => r.id));
      // The one still hanging from this printer stays there until it's torn off.
      const fresh = shared.filter((r) => !ids.has(r.id) && r.id !== desk.get().printJob?.id);
      return [...fresh, ...p].sort((a, b) => a.id - b.id).slice(-PILE.max);
    });
  }, [shared]);

  const take = (receipt: PrintJob) => {
    // The one in hand goes on top of the pile when it's put down; the oldest beyond the limit goes.
    setPile((p) => [...p.filter((r) => r.id !== receipt.id), receipt].slice(-PILE.max));
    setHeldId(receipt.id);
    Object.assign(turn.current, { yaw: 0, pitch: 0, toYaw: 0, toPitch: 0 });
    desk.pickUp();
  };

  // With a receipt in hand, dragging turns it over.
  useEffect(() => {
    const el = gl.domElement;
    const t = turn.current;
    let drag: { id: number; x: number; y: number; yaw: number; pitch: number } | null = null;
    const down = (e: PointerEvent) => {
      if (!desk.get().holding) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: t.toYaw, pitch: t.toPitch };
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return;
      t.toYaw = drag.yaw + (e.clientX - drag.x) * 0.012;
      t.toPitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * 0.008, -0.9, 0.9);
      invalidate();
    };
    const up = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return;
      drag = null;
      pointAt(el, false);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl, invalidate]);

  useFrame((_, dt) => {
    const t = turn.current;
    const step = Math.min(dt, 0.1);
    easing.damp(t, "yaw", t.toYaw, 0.08, step);
    easing.damp(t, "pitch", t.toPitch, 0.08, step);
  });

  return (
    <group ref={group} {...props}>
      <mesh geometry={body} material={mat.printer} position-y={BODY.h} castShadow receiveShadow />
      {/* The paper slot across the top, and the power light on the front. */}
      <mesh material={mat.rubber} position={[0, BODY.h + 0.001, SLOT_Z]}>
        <boxGeometry args={[PAPER_W + 0.14, 0.004, 0.05]} />
      </mesh>
      <mesh material={mat.printerTop} position={[0, BODY.h + 0.001, -0.15]}>
        <boxGeometry args={[BODY.w - 0.2, 0.002, 0.82]} />
      </mesh>
      {/* The lid line that runs round the body, and the feed button and power light on the front. */}
      <mesh material={mat.rubber} position-y={BODY.h * 0.72}>
        <boxGeometry args={[BODY.w + 0.004, 0.012, BODY.d + 0.004]} />
      </mesh>
      <mesh material={mat.printerTop} position={[-0.38, 0.95, BODY.d / 2 + 0.004]}>
        <boxGeometry args={[0.22, 0.09, 0.012]} />
      </mesh>
      <mesh material={mat.led} position={[0.42, 0.95, BODY.d / 2 + 0.003]}>
        <circleGeometry args={[0.022, 16]} />
      </mesh>

      <PrinterPaper job={job} path={path} torn={pile.some((r) => r.id === job.id)} onTear={() => take(job)} />
      {pile.map((r, i) => (
        <LooseReceipt
          key={r.id}
          job={r}
          slot={i}
          path={path}
          held={heldId === r.id}
          printed={i === pile.length - 1 && count > 0 ? count : null}
          group={group}
          turn={turn}
          onPick={() => take(r)}
        />
      ))}
    </group>
  );
}

/** The paper coming out of the printer: printing, then hanging there until it's torn off. */
function PrinterPaper({
  job,
  path,
  torn,
  onTear,
}: {
  job: PrintJob;
  path: ReturnType<typeof paperPath>;
  torn: boolean;
  onTear: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const paper = useMemo(stripGeometry, []);
  const { front, back } = useMemo(paperMaterials, []);
  const state = useRef({ length: 0.3, target: 0.3, total: paperLength(IDLE_JOB), drawn: -1, wait: 0, buzz: false });

  useEffect(() => {
    front.map?.dispose();
    front.map = receiptTexture(job);
    front.needsUpdate = true;
    const s = state.current;
    s.total = paperLength(job);
    // A new job starts from nothing and prints all of it; the idle stub just peeks out.
    if (job.id === 0) {
      s.length = 0.3;
      s.target = 0.3;
    } else {
      // Give the camera time to step back before the paper starts moving.
      s.length = 0;
      s.target = s.total;
      s.wait = 1.1;
      s.buzz = true;
    }
    s.drawn = -1;
  }, [job, front]);

  useFrame((frame, dt) => {
    const s = state.current;
    const step = Math.min(dt, 0.1);
    if (s.wait > 0 || s.length < s.target) frame.invalidate();
    if (s.wait > 0) s.wait -= step;
    else if (s.length < s.target) {
      // The motor starts as the paper does.
      if (s.buzz) {
        s.buzz = false;
        sound.printer(PRINT_TIME);
      }
      s.length = Math.min(s.target, s.length + (s.total / PRINT_TIME) * step);
      if (s.length >= s.target && job.id !== 0 && desk.get().printJob?.id === job.id) desk.set({ paperOut: true });
    }
    if (Math.abs(s.drawn - s.length) < 1e-4) return;
    s.drawn = s.length;

    const pos = paper.attributes.position as THREE.BufferAttribute;
    const uv = paper.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i <= ROWS; i++) {
      const along = (s.length * i) / ROWS;
      const [y, z] = path(along);
      // Printed upside down, as counter printers are set up: the end of the receipt comes out first,
      // so once it curls over and hangs down the front, it reads the right way up.
      const v = (s.length - along) / s.total;
      pos.setXYZ(i * 2, -PAPER_W / 2, y, z);
      pos.setXYZ(i * 2 + 1, PAPER_W / 2, y, z);
      uv.setXY(i * 2, 0, v);
      uv.setXY(i * 2 + 1, 1, v);
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    paper.computeVertexNormals();
    paper.computeBoundingSphere();
    // The paper's shadow grows with it.
    frame.gl.shadowMap.needsUpdate = true;
  });

  // Torn off, it's gone from the printer (and mustn't catch clicks meant for the pile).
  if (torn) return null;
  return (
    <group
      // Once it has printed, a click tears the receipt off, from the printer or from anywhere on the desk.
      onClick={(e) => {
        e.stopPropagation();
        const d = desk.get();
        if (e.delta > 6 || !d.paperOut || (d.focus !== null && d.focus !== "tablet")) return;
        desk.set({ paperOut: false });
        sound.tear();
        onTear();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        pointAt(gl.domElement, desk.get().paperOut);
      }}
      onPointerOut={() => pointAt(gl.domElement, false)}
    >
      <mesh geometry={paper} material={front} castShadow />
      <mesh geometry={paper} material={back} />
    </group>
  );
}

/**
 * A receipt that has been torn off. It leaves the printer for your hand, and
 * goes down on the pile when you're done. Click it on the pile to pick it up again.
 */
function LooseReceipt({
  job,
  slot,
  path,
  held,
  printed,
  group,
  turn,
  onPick,
}: {
  job: PrintJob;
  slot: number;
  path: ReturnType<typeof paperPath>;
  held: boolean;
  /** On the receipt on top of the pile, how many dockets everyone has printed, for its name tag. */
  printed: number | null;
  group: RefObject<THREE.Group>;
  turn: RefObject<Turn>;
  onPick: () => void;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const [hovered, setHovered] = useState(false);
  const paper = useMemo(stripGeometry, []);
  const { front, back } = useMemo(paperMaterials, []);
  const total = paperLength(job);

  useEffect(() => {
    front.map = receiptTexture(job);
    front.needsUpdate = true;
    return () => {
      front.map?.dispose();
      front.dispose();
      back.dispose();
      paper.dispose();
    };
  }, [job, front, back, paper]);

  // Where it lies on the pile: the higher the slot, the nearer the top, each one a little askew.
  const pileSpot = useMemo(
    () =>
      PILE.spot
        .clone()
        .multiply(new THREE.Matrix4().makeTranslation(jitter(job.id, 1) * 0.08, slot * 0.004, jitter(job.id, 2) * 0.1))
        .multiply(new THREE.Matrix4().makeRotationY(jitter(job.id, 3) * 0.22))
        .multiply(FLAT),
    [job.id, slot]
  );

  const state = useRef({
    // 1 while it still hangs where it was printed; 0 once it has left the printer.
    printer: 1,
    // 1 in hand, 0 on the pile.
    hand: 0,
    fold: 0,
    drawn: "",
    hold: new THREE.Matrix4(),
  });
  const v = useMemo(
    () => ({ step: new THREE.Matrix4(), turn: new THREE.Matrix4(), inverse: new THREE.Matrix4(), shape: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3() }),
    []
  );

  useFrame((frame, dt) => {
    const s = state.current;
    const d = desk.get();
    const t = turn.current!;
    const step = Math.min(dt, 0.1);
    // In hand once the camera has reached the printer; until then it stays where it is.
    const inHand = held && d.holding && d.printing;
    const there = inHand && d.arrived;
    if (!(inHand && !d.arrived)) easing.damp(s, "printer", 0, 0.3, step);
    easing.damp(s, "hand", there ? 1 : 0, s.hand < 0.5 && there ? 0.3 : 0.35, step);
    if (inHand) easing.damp(s, "fold", d.folded ? 1 : 0, 0.22, step);

    const moving = s.printer > 1e-3 && !(inHand && !d.arrived) || Math.abs(s.hand - (there ? 1 : 0)) > 1e-3 || (inHand && Math.abs(s.fold - (d.folded ? 1 : 0)) > 1e-3);
    if (moving || (there && (Math.abs(t.yaw - t.toYaw) > 1e-4 || Math.abs(t.pitch - t.toPitch) > 1e-4))) frame.invalidate();

    const key = [s.printer, s.hand, s.fold, there ? t.yaw : 0, there ? t.pitch : 0, slot, size.width, size.height].map((n) => n.toFixed(4)).join();
    if (key === s.drawn || !group.current) return;
    s.drawn = key;

    // Held up in front of the camera, sized and centred in the part of the screen the buttons leave free,
    // and only the part you can actually see. Once it's put down, it falls from wherever it was last held.
    if (there) {
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const unitsPerPx = (2 * tan) / size.height; // at a distance of one unit
      const visible = Math.min(size.height, window.innerHeight);
      const bottom = size.width < 640 ? HOLD.bottom.narrow : HOLD.bottom.wide;
      const room = Math.max(160, visible - HOLD.top - bottom);
      const dist = Math.max(
        (total + 0.12) / (room * HOLD.fill * unitsPerPx),
        (PAPER_W + 0.1) / (size.width * HOLD.width * unitsPerPx)
      );
      const lift = (size.height / 2 - (HOLD.top + room / 2)) * unitsPerPx * dist;
      // Twist it about its own length, then tilt it towards you: how you'd turn a real receipt over.
      v.turn.makeRotationX(t.pitch).multiply(v.step.makeRotationY(t.yaw));
      s.hold
        .copy(camera.matrixWorld)
        .multiply(v.step.makeTranslation(0, lift, -dist))
        .multiply(v.turn);
      group.current.updateWorldMatrix(true, false);
      v.inverse.copy(group.current.matrixWorld).invert();
      s.hold.premultiply(v.inverse);
    }

    const printer = smooth(s.printer);
    const hand = smooth(s.hand);
    const curl = THREE.MathUtils.lerp(CURL.down, CURL.held, hand);
    const fold = s.fold * THREE.MathUtils.lerp(Math.PI, FOLD_ANGLE, hand);
    const half = total / 2;
    const pos = paper.attributes.position as THREE.BufferAttribute;
    const uv = paper.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i <= ROWS; i++) {
      const along = (total * i) / ROWS;
      const vCoord = (total - along) / total;
      uv.setXY(i * 2, 0, vCoord);
      uv.setXY(i * 2 + 1, 1, vCoord);
      // The receipt's own shape: upright, bowed a little, the bottom half folded behind the top.
      let ly = half - along;
      let lz = curl * ((along - half) / half) ** 2;
      if (along > half && fold > 0) {
        const r = along - half;
        const z0 = lz;
        ly = -r * Math.cos(fold) - z0 * Math.sin(fold);
        lz = -r * Math.sin(fold) + z0 * Math.cos(fold) - 0.004 * s.fold;
      }
      ly -= (s.fold * half) / 2;
      const [py, pz] = path(along);
      for (const side of [0, 1]) {
        const x = side ? PAPER_W / 2 : -PAPER_W / 2;
        v.shape.set(x, ly, lz);
        // On the pile, or still hanging from the printer, and from there into the hand.
        v.a.copy(v.shape).applyMatrix4(pileSpot).lerp(v.b.set(x, py, pz), printer);
        v.a.lerp(v.b.copy(v.shape).applyMatrix4(s.hold), hand);
        pos.setXYZ(i * 2 + side, v.a.x, v.a.y, v.a.z);
      }
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    paper.computeVertexNormals();
    paper.computeBoundingSphere();
    // The paper's shadow moves with it.
    frame.gl.shadowMap.needsUpdate = true;
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        const d = desk.get();
        const inHand = held && d.holding;
        if (e.delta <= 6 && !inHand && (d.focus === null || d.focus === "tablet")) onPick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        pointAt(gl.domElement, !(held && desk.get().holding));
      }}
      onPointerOut={() => {
        setHovered(false);
        pointAt(gl.domElement, false);
      }}
    >
      <mesh geometry={paper} material={front} castShadow />
      <mesh geometry={paper} material={back} />
      {canHover && printed !== null && !held && (
        <Html position={[0.62, 0.5, 1.55]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div
            className={\`whitespace-nowrap rounded-full bg-fg px-3.5 py-1.5 text-[13px] font-medium text-bg shadow-lg transition-all duration-200 \${
              hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }\`}
          >
            Latest docket <span className="text-bg/60">· {printed.toLocaleString("en-AU")} printed · tap to read</span>
          </div>
        </Html>
      )}
    </group>
  );
}
`;export{e as default};
