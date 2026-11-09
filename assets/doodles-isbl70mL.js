const t=`import { seeded } from "@/desk/geometry";

/**
 * The four sticky notes on the laptop: things I'd actually stick there. Each
 * one draws itself while you hold it. Everything is in pixels on a 512 px
 * square note, drawn as if by hand: strokes wobble a little, words are written
 * out left to right, and a few things move (a ball into a net) or fade (a slash).
 */
export const NOTE_PX = 512;
const INK = "#2B3346";
const RED = "#C2410C";

type P = [number, number];
type Timing = {
  /** When it's drawn, as a stretch of the note's animation (0 to 1). */
  at: [number, number];
  /** When it fades away again, if it does. */
  fade?: [number, number];
  /** Where it's moved to, by the animation's time, if it moves. */
  move?: (t: number) => P;
  /** How far it's turned (radians, clockwise) about a point, by the animation's time, if it turns. */
  spin?: (t: number) => [number, number, number];
};
type Mark =
  | (Timing & { kind: "line"; points: P[]; color?: string; width?: number; arrow?: boolean; fill?: string; alpha?: number })
  | (Timing & {
      kind: "words";
      text: string;
      x: number;
      y: number;
      size?: number;
      color?: string;
      align?: "left" | "center";
      turn?: number;
      weight?: number;
    });

export type Note = { color: string; marks: Mark[]; title?: string; /** How long it takes to draw itself, if not the usual. */ seconds?: number };

/** Points round a circle (or part of one). */
const arc = (cx: number, cy: number, r: number, from = 0, to = Math.PI * 2, steps = 28): P[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
/** Points along a quadratic curve. */
const curve = (a: P, c: P, b: P, steps = 20): P[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  });
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const BLOOD = "#991B1B";
const SKIN = "#F5D6B8";
/** Points round an ellipse. */
const oval = (cx: number, cy: number, rx: number, ry: number, steps = 32): P[] =>
  arc(0, 0, 1, 0, Math.PI * 2, steps).map(([x, y]) => [cx + x * rx, cy + y * ry]);

// 1. Today: the day's tasks, in the order the day goes, each ticked off as it's done.
const tasks = ["从现实里醒过来。", "练，然后再练。", "比别人多做一点。", "越过那条线。", "接受疼。"];
const today: Mark[] = tasks.flatMap((text, i): Mark[] => {
  const a = 0.04 + i * 0.19;
  const y = 182 + i * 64;
  return [
    { kind: "line", at: [a, a + 0.03], points: [[40, y - 30], [70, y - 30], [70, y], [40, y], [40, y - 29]], width: 4 },
    { kind: "words", at: [a + 0.03, a + 0.13], text, x: 88, y, size: 40 },
    { kind: "line", at: [a + 0.14, a + 0.17], points: [[44, y - 16], [53, y - 6], [76, y - 38]], width: 5 },
  ];
});

// 2. For anyone who'd like to work with me, whether it's a job or a project: my card's on the desk.
const hiring: Mark[] = [
  { kind: "words", at: [0, 0.2], text: "在招人吗？", x: 40, y: 132, size: 80, weight: 700 },
  { kind: "words", at: [0.22, 0.4], text: "有项目想聊？", x: 42, y: 206, size: 52, weight: 700 },
  { kind: "words", at: [0.44, 0.6], text: "拿走我的名片", x: 44, y: 276, size: 46 },
  { kind: "line", at: [0.64, 0.88], points: curve([330, 300], [470, 420], [230, 456], 26), arrow: true, width: 6 },
  { kind: "words", at: [0.88, 1], text: "就在这张桌上", x: 40, y: 474, size: 30, color: RED },
];

// 3. A ball curls into the net and "SIUUU!". Underneath, Zoro faces Mihawk with his arms open, and takes the cut.
const flight = curve([74, 214], [150, 6], [384, 104], 30);
const along = (t: number): P => {
  const k = seg(t, 0.17, 0.28);
  const eased = k * k * (3 - 2 * k);
  const i = Math.min(flight.length - 1, Math.floor(eased * (flight.length - 1)));
  return [flight[i][0] - flight[0][0], flight[i][1] - flight[0][1]];
};
const goal: P[] = [[312, 156], [312, 52], [474, 52], [474, 156]];
const siuuu: Mark[] = [
  { kind: "line", at: [0.01, 0.07], points: goal, width: 6 },
  ...[352, 392, 432].map((x, i): Mark => ({ kind: "line", at: [0.07 + i * 0.014, 0.09 + i * 0.014], points: [[x, 52], [x, 156]], width: 2, alpha: 0.45 })),
  ...[86, 121].map((y, i): Mark => ({ kind: "line", at: [0.11 + i * 0.014, 0.13 + i * 0.014], points: [[312, y], [474, y]], width: 2, alpha: 0.45 })),
  // The ball, and the curl it leaves in the air.
  { kind: "line", at: [0.13, 0.17], points: arc(74, 214, 17), fill: "#FFFFFF", move: along },
  { kind: "line", at: [0.15, 0.17], points: arc(74, 214, 6.5, -Math.PI / 2, (Math.PI * 3) / 2, 5), width: 3, fill: INK, move: along },
  { kind: "line", at: [0.17, 0.28], points: flight, width: 2.5, alpha: 0.35 },
  // It hits the net.
  { kind: "line", at: [0.28, 0.3], points: [[410, 78], [428, 64]], width: 3 },
  { kind: "line", at: [0.29, 0.31], points: [[416, 108], [438, 110]], width: 3 },
  { kind: "line", at: [0.3, 0.32], points: [[404, 132], [420, 146]], width: 3 },
  { kind: "words", at: [0.32, 0.42], text: "SIUUU!", x: 36, y: 268, size: 74, weight: 700, turn: -0.06 },
];

/** Zoro from behind: green hair under his black bandana, white shirt, green haramaki, arms thrown wide. */
const zoro: Mark[] = [
  { kind: "line", at: [0.44, 0.46], points: arc(150, 302, 19), fill: "#5FAE6E", width: 4 },
  { kind: "line", at: [0.46, 0.47], points: [[132, 299], [168, 299]], width: 8, color: "#1D1D1F" },
  { kind: "line", at: [0.47, 0.475], points: [[160, 301], [177, 320]], width: 5, color: "#1D1D1F" },
  { kind: "line", at: [0.475, 0.48], points: [[165, 301], [186, 313]], width: 5, color: "#1D1D1F" },
  { kind: "line", at: [0.48, 0.5], points: [[131, 324], [169, 324], [174, 384], [126, 384], [131, 324]], fill: "#FFFFFF", width: 4 },
  { kind: "line", at: [0.5, 0.51], points: [[126, 384], [174, 384], [174, 408], [126, 408], [126, 384]], fill: "#3E9B4F", width: 4 },
  ...[138, 150, 162].map((x): Mark => ({ kind: "line", at: [0.51, 0.515], points: [[x, 387], [x, 405]], width: 2, color: "#2C7A3B" })),
  { kind: "line", at: [0.515, 0.53], points: [[137, 408], [118, 496]], width: 10 },
  { kind: "line", at: [0.515, 0.53], points: [[163, 408], [182, 496]], width: 10 },
  // Arms wide open: he won't turn his back.
  { kind: "line", at: [0.53, 0.56], points: [[132, 332], [54, 322]], width: 9 },
  { kind: "line", at: [0.53, 0.56], points: [[168, 332], [246, 322]], width: 9 },
];

/** Drops of blood thrown from the cut: where each leaves it, how it's flung, and its size. */
const SPRAY: { from: P; v: P; r: number }[] = [
  { from: [134, 334], v: [-62, -52], r: 4 },
  { from: [142, 342], v: [-92, -18], r: 3 },
  { from: [146, 346], v: [-28, -84], r: 3 },
  { from: [150, 350], v: [40, -72], r: 4.5 },
  { from: [158, 360], v: [82, -40], r: 3.5 },
  { from: [160, 364], v: [18, -92], r: 3.5 },
  { from: [164, 368], v: [102, -8], r: 3 },
  { from: [170, 376], v: [62, 18], r: 4 },
];

/** Mihawk: wide hat with its feather, long dark coat, and Yoru raised, which comes over in one cut. */
const SHOULDER: P = [400, 342];
const raised = (55 * Math.PI) / 180;
const reach = (k: number, side = 0): P => [
  SHOULDER[0] + Math.cos(raised) * k + Math.sin(raised) * side,
  SHOULDER[1] - Math.sin(raised) * k + Math.cos(raised) * side,
];
const swing = (t: number): [number, number, number] => {
  // A held breath, then the whole cut in a fraction of a second.
  const k = seg(t, 0.8, 0.84);
  return [-2.53 * k * k, SHOULDER[0], SHOULDER[1]];
};
const mihawk: Mark[] = [
  { kind: "line", at: [0.57, 0.59], points: curve([334, 302], [382, 290], [430, 302]), width: 6 },
  { kind: "line", at: [0.59, 0.6], points: [[356, 298], [366, 272], [398, 272], [408, 298]], fill: "#1D1D1F", width: 4 },
  { kind: "line", at: [0.6, 0.61], points: curve([400, 278], [424, 254], [446, 262]), width: 3 },
  { kind: "line", at: [0.61, 0.62], points: arc(382, 318, 15), fill: "#F5D6B8", width: 4 },
  { kind: "line", at: [0.62, 0.625], points: [[374, 325], [382, 323], [390, 325]], width: 2.5 },
  { kind: "line", at: [0.625, 0.65], points: [[362, 336], [402, 336], [432, 488], [332, 488], [362, 336]], fill: "#3B2A33", width: 4 },
  { kind: "line", at: [0.65, 0.655], points: [[382, 338], [382, 486]], width: 3, color: "#B4434F" },
  { kind: "line", at: [0.655, 0.665], points: [[370, 488], [366, 502]], width: 8 },
  { kind: "line", at: [0.655, 0.665], points: [[394, 488], [398, 502]], width: 8 },
  // His arm and Yoru: a long black blade on a cross-shaped guard. They turn together at the shoulder.
  { kind: "line", at: [0.67, 0.68], points: [SHOULDER, reach(30)], width: 8, spin: swing },
  { kind: "line", at: [0.68, 0.69], points: [reach(22), reach(38)], width: 7, spin: swing },
  { kind: "line", at: [0.685, 0.695], points: [reach(36, -17), reach(36, 17)], width: 6, spin: swing },
  { kind: "line", at: [0.69, 0.72], points: [reach(40, -5), reach(150, -1), reach(162, 0), reach(150, 1), reach(40, 5), reach(40, -5)], width: 3, fill: "#1D1D1F", spin: swing },
  // The swing leaves a trail over his head, and the cut flashes across Zoro's chest.
  { kind: "line", at: [0.81, 0.84], points: arc(SHOULDER[0], SHOULDER[1], 150, -raised, -Math.PI - 0.35, 24), width: 2, alpha: 0.35, fade: [0.88, 0.95] },
  // The cut: a flash from shoulder to hip, and the shock of it.
  { kind: "line", at: [0.84, 0.855], points: curve([100, 316], [146, 350], [202, 410]), width: 14, color: "#FFFFFF", alpha: 0.95, fade: [0.93, 0.99] },
  { kind: "line", at: [0.84, 0.855], points: curve([100, 316], [146, 350], [202, 410]), width: 3, fade: [0.93, 0.99] },
  { kind: "line", at: [0.855, 0.87], points: [[84, 300], [70, 290]], width: 3, fade: [0.93, 0.99] },
  { kind: "line", at: [0.86, 0.875], points: [[214, 420], [228, 432]], width: 3, fade: [0.93, 0.99] },
  { kind: "line", at: [0.865, 0.88], points: [[220, 398], [238, 396]], width: 3, fade: [0.93, 0.99] },
  // The wound stays, the blood flies from it and runs down his shirt, and he doesn't move.
  { kind: "line", at: [0.85, 0.865], points: curve([128, 330], [150, 352], [172, 380]), width: 5, color: BLOOD },
  ...SPRAY.map(
    ({ from, v, r }): Mark => ({
      kind: "line",
      at: [0.855, 0.86],
      points: oval(from[0], from[1], r, r, 10),
      fill: BLOOD,
      width: 1.5,
      color: BLOOD,
      move: (t) => {
        const k = seg(t, 0.86, 0.95);
        return [v[0] * k, v[1] * k + 150 * k * k];
      },
      fade: [0.94, 0.98],
    })
  ),
  { kind: "line", at: [0.88, 0.95], points: [[140, 343], [139, 378]], width: 3, color: BLOOD },
  { kind: "line", at: [0.89, 0.96], points: [[156, 357], [157, 383]], width: 3, color: BLOOD },
  { kind: "line", at: [0.9, 0.97], points: [[166, 370], [166, 400]], width: 2.5, color: BLOOD },
  ...[[112, 494], [190, 492], [204, 500], [98, 500]].map(
    ([x, y], i): Mark => ({ kind: "line", at: [0.93 + i * 0.01, 0.94 + i * 0.01], points: oval(x, y, 5, 2, 8), fill: BLOOD, width: 1, color: BLOOD })
  ),
  { kind: "line", at: [0.94, 0.99], points: oval(150, 500, 34, 5), fill: BLOOD, width: 1.5, color: BLOOD, alpha: 0.75 },
];

const idols: Mark[] = [...siuuu, ...zoro, ...mihawk];

// 4. Nothing happened. Zoro standing after taking all of Luffy's pain: upright, eyes closed, bloodied, swords at his hip.
/** One of his swords, worn at the left hip: the scabbard angled back, the grip forward and up. */
function worn(from: P, to: P, grip: string, at: number): Mark[] {
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const end: P = [from[0] - ((to[0] - from[0]) / d) * 34, from[1] - ((to[1] - from[1]) / d) * 34];
  return [
    { kind: "line", at: [at, at + 0.03], points: [from, to], width: 6 },
    { kind: "line", at: [at + 0.03, at + 0.04], points: [from, end], width: 11 },
    { kind: "line", at: [at + 0.03, at + 0.04], points: [from, end], width: 6, color: grip },
  ];
}
const standing: Mark[] = [
  // Legs and boots, the green haramaki, the white shirt.
  { kind: "line", at: [0.03, 0.06], points: [[388, 304], [381, 438]], width: 16 },
  { kind: "line", at: [0.04, 0.07], points: [[412, 304], [419, 438]], width: 16 },
  { kind: "line", at: [0.07, 0.08], points: [[368, 444], [390, 444]], width: 9 },
  { kind: "line", at: [0.07, 0.08], points: [[410, 444], [432, 444]], width: 9 },
  { kind: "line", at: [0.08, 0.11], points: [[376, 276], [424, 276], [426, 306], [374, 306], [376, 276]], fill: "#3E9B4F", width: 4 },
  ...[388, 400, 412].map((x): Mark => ({ kind: "line", at: [0.11, 0.115], points: [[x, 280], [x, 303]], width: 2, color: "#2C7A3B" })),
  { kind: "line", at: [0.11, 0.16], points: [[364, 190], [436, 190], [425, 276], [375, 276], [364, 190]], fill: "#FFFFFF", width: 4 },
  // Arms hanging loose.
  { kind: "line", at: [0.16, 0.2], points: [[366, 196], [351, 242], [348, 292]], width: 11 },
  { kind: "line", at: [0.17, 0.21], points: [[434, 196], [449, 242], [452, 292]], width: 11 },
  { kind: "line", at: [0.21, 0.22], points: oval(348, 298, 7, 7, 12), fill: SKIN, width: 3 },
  { kind: "line", at: [0.21, 0.22], points: oval(452, 298, 7, 7, 12), fill: SKIN, width: 3 },
  // His head: green hair, eyes closed, three gold earrings.
  { kind: "line", at: [0.22, 0.23], points: [[400, 176], [400, 190]], width: 11 },
  { kind: "line", at: [0.23, 0.27], points: oval(400, 152, 25, 26), fill: SKIN, width: 4 },
  {
    kind: "line",
    at: [0.27, 0.3],
    points: [[375, 150], [377, 130], [385, 136], [391, 120], [400, 132], [408, 118], [415, 132], [423, 125], [425, 150], [414, 139], [400, 141], [386, 139], [375, 150]],
    fill: "#4E9A5C",
    width: 3,
  },
  { kind: "line", at: [0.3, 0.31], points: [[386, 156], [395, 157]], width: 3 },
  { kind: "line", at: [0.31, 0.32], points: [[405, 157], [414, 156]], width: 3 },
  { kind: "line", at: [0.32, 0.33], points: [[396, 168], [404, 168]], width: 2.5 },
  ...[156, 163, 170].map((y, i): Mark => ({ kind: "line", at: [0.33 + i * 0.006, 0.336 + i * 0.006], points: oval(427, y, 3, 3, 8), fill: "#E3B23C", width: 1.5 })),
  // Three swords at his left hip, hanging back along his side: white grip, red grip, black grip.
  ...worn([430, 296], [466, 414], "#F8FAFC", 0.35),
  ...worn([436, 292], [476, 404], "#B91C1C", 0.38),
  ...worn([424, 300], [456, 420], "#1D1D1F", 0.41),
  // What it cost him, and the pool he's standing in.
  { kind: "line", at: [0.45, 0.47], points: [[376, 202], [390, 236]], width: 4, color: BLOOD },
  { kind: "line", at: [0.46, 0.48], points: [[410, 214], [418, 250]], width: 4, color: BLOOD },
  { kind: "line", at: [0.47, 0.49], points: [[390, 250], [402, 268]], width: 3, color: BLOOD },
  { kind: "line", at: [0.48, 0.5], points: [[350, 250], [348, 266]], width: 3, color: BLOOD },
  { kind: "line", at: [0.5, 0.58], points: oval(400, 452, 70, 11), fill: BLOOD, width: 2, color: BLOOD, alpha: 0.75 },
];
const nothing: Mark[] = [
  ...standing,
  { kind: "words", at: [0.6, 0.72], text: "什么都没", x: 34, y: 196, size: 78, weight: 700 },
  { kind: "words", at: [0.74, 0.88], text: "发生。", x: 34, y: 272, size: 78, weight: 700 },
  { kind: "words", at: [0.9, 0.98], text: "—— 罗罗诺亚·索隆", x: 38, y: 340, size: 32, color: "#5B6475" },
];

/** In the order they're stuck on the laptop: left top, left bottom, right top, right bottom. */
export const NOTES: Note[] = [
  { title: "今天", color: "#FDE68A", marks: today, seconds: 4.5 },
  { color: "#FBCFE8", marks: hiring },
  // Sky blue, like the sky over the Baratie, so Zoro's green shows.
  { color: "#BFDBFE", marks: idols, seconds: 6 },
  { color: "#BBF7D0", marks: nothing, seconds: 5.5 },
];

/** A line, wobbled a little as a hand would draw it: the same wobble every time. */
const wobbled = new WeakMap<P[], P[]>();
function wobble(points: P[]) {
  let out = wobbled.get(points);
  if (out) return out;
  const rand = seeded(points.length * 7919 + Math.round(points[0][0] * 13 + points[0][1]));
  out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 14));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      out.push([ax + (bx - ax) * t + (rand() - 0.5) * 2.2, ay + (by - ay) * t + (rand() - 0.5) * 2.2]);
    }
  }
  out.push(points[points.length - 1]);
  wobbled.set(points, out);
  return out;
}

/** How much of a mark is showing as it fades out, 1 to 0. */
const shown = (mark: Mark, t: number) => (mark.fade ? 1 - seg(t, mark.fade[0], mark.fade[1]) : 1);

/** Draws as much of a line as \`t\` (0 to 1) of it, with an arrowhead once it's all there. */
function drawLine(g: CanvasRenderingContext2D, mark: Extract<Mark, { kind: "line" }>, t: number, now: number) {
  const pts = wobble(mark.points);
  const [ox, oy] = mark.move ? mark.move(now) : [0, 0];
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const goal = lengths[lengths.length - 1] * t;
  g.save();
  g.globalAlpha = (mark.alpha ?? 1) * shown(mark, now);
  g.translate(ox, oy);
  if (mark.spin) {
    const [angle, px, py] = mark.spin(now);
    g.translate(px, py);
    g.rotate(angle);
    g.translate(-px, -py);
  }
  g.strokeStyle = mark.color ?? INK;
  g.lineWidth = mark.width ?? 5;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (lengths[i] <= goal) g.lineTo(pts[i][0], pts[i][1]);
    else {
      const k = (goal - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
      g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k);
      break;
    }
  }
  // A closed shape is filled once it's all drawn.
  if (mark.fill && t >= 1) {
    g.fillStyle = mark.fill;
    g.fill();
  }
  g.stroke();
  if (mark.arrow && t >= 1) {
    const [x, y] = mark.points[mark.points.length - 1];
    const [px, py] = mark.points[mark.points.length - 2];
    const a = Math.atan2(y - py, x - px);
    g.beginPath();
    g.moveTo(x - Math.cos(a - 0.5) * 18, y - Math.sin(a - 0.5) * 18);
    g.lineTo(x, y);
    g.lineTo(x - Math.cos(a + 0.5) * 18, y - Math.sin(a + 0.5) * 18);
    g.stroke();
  }
  g.restore();
}

/** Writes as much of some words as \`t\` of them, left to right. */
function drawWords(g: CanvasRenderingContext2D, mark: Extract<Mark, { kind: "words" }>, t: number, now: number) {
  g.save();
  g.globalAlpha = shown(mark, now);
  g.font = \`\${mark.weight ?? 600} \${mark.size ?? 30}px Caveat, cursive\`;
  g.fillStyle = mark.color ?? INK;
  g.translate(mark.x, mark.y);
  if (mark.turn) g.rotate(mark.turn);
  const width = g.measureText(mark.text).width;
  const left = mark.align === "center" ? -width / 2 : 0;
  const size = mark.size ?? 30;
  // Written out left to right. Handwriting leans past its measured width (a "?" curls over), so the
  // reveal reaches a little further than the text, and once it's all written nothing's held back.
  if (t < 1) {
    g.beginPath();
    g.rect(left - size * 0.3, -size * 1.3, (width + size * 0.6) * t, size * 1.8);
    g.clip();
  }
  g.fillText(mark.text, left, 0);
  g.restore();
}

/** Draws a note: its paper, its title if it has one, and its drawing as far as \`t\` through (1 for all of it). */
export function drawNote(g: CanvasRenderingContext2D, note: Note, t: number) {
  const s = NOTE_PX;
  g.fillStyle = note.color;
  g.fillRect(0, 0, s, s);
  // The sticky strip along the top is a touch darker, as it is on the real thing.
  g.fillStyle = "rgba(0,0,0,0.035)";
  g.fillRect(0, 0, s, 64);
  g.textBaseline = "alphabetic";
  if (note.title) {
    g.fillStyle = INK;
    g.font = "700 50px Caveat, cursive";
    g.fillText(note.title, 34, 100, s - 68);
  }
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const mark of note.marks) {
    const local = seg(t, mark.at[0], mark.at[1]);
    if (local <= 0) continue;
    if (mark.kind === "line") drawLine(g, mark, local, t);
    else drawWords(g, mark, local, t);
  }
}
`;export{t as default};
