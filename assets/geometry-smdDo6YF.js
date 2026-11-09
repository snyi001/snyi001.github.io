const n=`import * as THREE from "three";

/** A rectangle with round corners, centred on the origin. */
export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/**
 * An upright panel (a phone, a tablet, a laptop lid): round corners seen from
 * the front, softly bevelled edges, \`t\` thick and centred on z = 0.
 * Outer size is exactly w × h.
 */
export function panelGeometry(w: number, h: number, t: number, r: number, bevel = Math.min(0.02, t / 3)) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel)), {
    depth: t - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 20,
  });
  geo.translate(0, 0, -(t - bevel * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * A flat slab lying on the desk (a laptop base, a desk top): round corners seen
 * from above, bevelled edges. Its top face sits at y = 0. The top face's UVs
 * run 0 to 1 across the slab, so a texture covers it exactly once.
 */
export function slabGeometry(w: number, d: number, h: number, r: number, bevel = Math.min(0.03, h / 3)) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, d - bevel * 2, Math.max(0.001, r - bevel)), {
    depth: h - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 20,
  });
  // Extruded along +z; stand it so the extrusion runs up the y axis.
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -(h - bevel), 0);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / d + 0.5);
  geo.computeVertexNormals();
  return geo;
}

/** A flat screen with round corners, UVs running 0 to 1 so a screenshot fits it. */
export function screenGeometry(w: number, h: number, r: number) {
  const geo = new THREE.ShapeGeometry(roundedRect(w, h, r), 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return geo;
}

/** A small seeded random generator, so the wood grain is the same on every visit. */
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Light oak, drawn rather than downloaded: long soft grain lines on a warm base. */
export function oakTexture() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext("2d")!;
  const rand = seeded(7);

  g.fillStyle = "#E3D9C7";
  g.fillRect(0, 0, c.width, c.height);

  // Broad, faint colour bands first, then the fine grain over them.
  for (let i = 0; i < 26; i++) {
    const y = rand() * c.height;
    const band = g.createLinearGradient(0, y - 60, 0, y + 60);
    const tone = rand() > 0.5 ? "255,245,225" : "150,115,75";
    band.addColorStop(0, \`rgba(\${tone},0)\`);
    band.addColorStop(0.5, \`rgba(\${tone},\${0.05 + rand() * 0.07})\`);
    band.addColorStop(1, \`rgba(\${tone},0)\`);
    g.fillStyle = band;
    g.fillRect(0, y - 60, c.width, 120);
  }
  for (let i = 0; i < 340; i++) {
    const y0 = rand() * c.height;
    const amp = 2 + rand() * 9;
    const freq = 0.0015 + rand() * 0.003;
    const phase = rand() * 10;
    g.strokeStyle = \`rgba(\${110 + rand() * 40},\${80 + rand() * 30},\${50 + rand() * 20},\${0.035 + rand() * 0.09})\`;
    g.lineWidth = 0.6 + rand() * 2.4;
    g.beginPath();
    for (let x = 0; x <= c.width; x += 12) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.3 + phase * 2) * amp * 0.25;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** One snake-plant leaf: a long ribbon, widest low down, folded slightly along its spine. */
export function leafGeometry(height: number, width: number, lean: number, twist: number) {
  const rows = 18;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const half = width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.85) * (t < 1 ? 1 : 0);
    const y = t * height;
    const z = lean * t * t;
    const a = twist * t;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    // left edge, spine (raised a touch, for the fold), right edge
    for (const [x, dz] of [
      [-half, 0],
      [0, half * 0.35],
      [half, 0],
    ]) {
      positions.push(x * cos - dz * sin, y, z + x * sin + dz * cos);
    }
  }
  for (let i = 0; i < rows; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    indices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * A soft shadow: a blurred dark rounded rectangle on a transparent canvas. The
 * blur sits inside the margin, so a plane \`1 + 2 × margin\` times the footprint
 * shows the whole falloff.
 */
export const SHADOW_MARGIN = 0.35;
let shadowTexture: THREE.CanvasTexture | null = null;
export function softShadowTexture() {
  if (shadowTexture) return shadowTexture;
  const size = 256;
  const inner = size / (1 + SHADOW_MARGIN * 2);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  // Used as an alpha map, so white is shadow and black is clear.
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  g.filter = \`blur(\${Math.round(inner * 0.14)}px)\`;
  g.fillStyle = "#FFF";
  const o = (size - inner) / 2;
  g.beginPath();
  g.roundRect(o, o, inner, inner, inner * 0.12);
  g.fill();
  shadowTexture = new THREE.CanvasTexture(c);
  return shadowTexture;
}
`;export{n as default};
