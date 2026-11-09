const n=`/**
 * The geometry of a page being turned. A sheet is held along the spine; lift
 * one of its outer corners and drag it, and the paper folds along a straight
 * crease: the part beyond the crease flips over, lying back across the rest of
 * the sheet with its other side up. The crease is the line halfway between
 * where the corner was and where it is now, square to the line between them.
 *
 * Everything here is in pixels from the top of the spine, x to the right.
 */
export type Point = { x: number; y: number };

export type Fold = {
  /** The part of the sheet still lying flat, in sheet coordinates. */
  flat: Point[];
  /** The part that has folded over, in sheet coordinates (before it's flipped). */
  folded: Point[];
  /** A point on the crease, and the direction across it towards the lifted corner. */
  at: Point;
  normal: Point;
  /** How far the corner has come, 0 to 1 of the way to lying flat on the other side. */
  amount: number;
};

/** Keeps \`p\` within \`r\` of \`c\`. */
function within(p: Point, c: Point, r: number): Point {
  const d = Math.hypot(p.x - c.x, p.y - c.y);
  return d <= r ? p : { x: c.x + ((p.x - c.x) * r) / d, y: c.y + ((p.y - c.y) * r) / d };
}

/** The part of a polygon on one side of a line (Sutherland–Hodgman, against a single edge). */
function cut(poly: Point[], at: Point, normal: Point, keep: 1 | -1) {
  const out: Point[] = [];
  const side = (p: Point) => keep * ((p.x - at.x) * normal.x + (p.y - at.y) * normal.y);
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const da = side(a);
    const db = side(b);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  });
  return out;
}

/**
 * Where the lifted corner is, \`t\` of the way through a turn (0 lying where it
 * started, 1 lying on the other side): it travels across in an arc, lifting
 * towards the middle of the page as a real corner does. \`side\` is 1 for a
 * sheet starting on the right of the spine, -1 on the left; \`corner\` is the
 * corner's height (0 for the top, \`h\` for the bottom); \`nudge\` is how far the
 * hand has moved it up or down.
 */
export function cornerAt(t: number, side: 1 | -1, corner: number, w: number, h: number, nudge = 0): Point {
  const lift = (corner === 0 ? 1 : -1) * 0.16 * h * Math.sin(Math.PI * t);
  const p = { x: side * w * (1 - 2 * t), y: corner + lift + nudge };
  // Held at the spine, the corner can get no further from the spine's near end than the page is wide,
  // nor from its far end than the page's diagonal.
  return within(within(p, { x: 0, y: corner }, w), { x: 0, y: h - corner }, Math.hypot(w, h));
}

/** The fold, for a sheet (\`side\` of the spine, \`w\` by \`h\`) whose \`corner\` has been lifted to \`p\`. */
export function fold(p: Point, side: 1 | -1, corner: number, w: number, h: number): Fold | null {
  const from = { x: side * w, y: corner };
  const length = Math.hypot(from.x - p.x, from.y - p.y);
  if (length < 0.5) return null;
  const normal = { x: (from.x - p.x) / length, y: (from.y - p.y) / length };
  const at = { x: (from.x + p.x) / 2, y: (from.y + p.y) / 2 };
  const left = side === 1 ? 0 : -w;
  const sheet = [
    { x: left, y: 0 },
    { x: left + w, y: 0 },
    { x: left + w, y: h },
    { x: left, y: h },
  ];
  return {
    flat: cut(sheet, at, normal, -1),
    folded: cut(sheet, at, normal, 1),
    at,
    normal,
    amount: Math.min(1, length / (2 * w)),
  };
}

/** A polygon as a CSS clip-path, moved by \`dx\`, optionally mirrored about x = 0 first. */
export function clipPath(points: Point[], dx = 0, mirror = false) {
  if (points.length < 3) return "polygon(0 0, 0 0, 0 0)";
  return \`polygon(\${points.map((p) => \`\${((mirror ? -p.x : p.x) + dx).toFixed(2)}px \${p.y.toFixed(2)}px\`).join(", ")})\`;
}
`;export{n as default};
