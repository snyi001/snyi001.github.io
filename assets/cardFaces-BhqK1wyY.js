const n=`import { CONTACT } from "@/content/contact";
import { BRAND_PATHS } from "@/content/brandIcons";

/**
 * The two faces of my business card, a metal one in Space Black: brushed
 * titanium with everything laser-etched in silver. Drawn on canvases. Everything is laid
 * out on a 1024-wide card (the shape of a real one, 85 by 55 mm) and drawn
 * a quarter bigger than that, so it stays crisp held up close.
 */
export const FACE = { w: 1024, h: 663 };
export const FACE_SCALE = 1.25;

/** Etched silver, and the quieter grey of the smaller print. */
const SILVER = "#E3E3E8";
const GREY = "#8E8E93";
const link = (label: string) => CONTACT.links.find((l) => l.label === label)!.href;

/**
 * The lines on the back: what each opens, and where it sits, in two columns of
 * three, so a tap on any line on the card itself reaches me that way.
 */
export const TILES = [
  { label: "邮箱", value: CONTACT.email, href: \`mailto:\${CONTACT.email}\`, icon: "mail" },
  { label: "Instagram", value: \`@\${CONTACT.instagram.handle}\`, href: CONTACT.instagram.href, icon: "instagram" },
  { label: "WhatsApp", value: "Chat with me", href: link("WhatsApp"), icon: "whatsapp" },
  { label: "领英", value: "in/sabaamiri", href: link("领英"), icon: "linkedin" },
  { label: "GitHub", value: "naerae100", href: link("GitHub"), icon: "github" },
  { label: "网站", value: "snyi001.github.io", href: "https://snyi001.github.io", icon: "globe" },
].map((t, i) => ({ ...t, x: i < 3 ? 64 : 548, y: 232 + (i % 3) * 124, w: 420, h: 112 }));

export type Tile = (typeof TILES)[number];

/** The tile under a point on the back of the card, given as the texture's u and v (0 to 1), if any. */
export function tileAt(u: number, v: number): Tile | null {
  const x = u * FACE.w;
  const y = (1 - v) * FACE.h;
  return TILES.find((t) => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) ?? null;
}

const font = (weight: number, size: number) => \`\${weight} \${size}px Inter, system-ui, sans-serif\`;

/** A rounded rectangle, drawn by hand: older Safari has no roundRect. */
function rounded(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Line icons (from Lucide) as paths on a 24 by 24 grid, drawn as strokes. */
const LINE_ICONS: Record<string, (g: CanvasRenderingContext2D) => void> = {
  mail(g) {
    rounded(g, 2, 4, 20, 16, 2);
    g.stroke();
    g.stroke(new Path2D("m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"));
  },
  phone(g) {
    g.stroke(
      new Path2D(
        "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      )
    );
  },
  globe(g) {
    g.beginPath();
    g.arc(12, 12, 10, 0, Math.PI * 2);
    g.stroke();
    g.stroke(new Path2D("M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"));
    g.stroke(new Path2D("M2 12h20"));
  },
  pin(g) {
    g.stroke(new Path2D("M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"));
    g.beginPath();
    g.arc(12, 10, 3, 0, Math.PI * 2);
    g.stroke();
  },
};

/** An icon \`size\` across, its top left at x, y, in \`color\`: thin lines, like the system's own symbols. */
function icon(g: CanvasRenderingContext2D, name: string, x: number, y: number, size: number, color: string) {
  g.save();
  g.translate(x, y);
  g.scale(size / 24, size / 24);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 1.6;
  g.lineCap = "round";
  g.lineJoin = "round";
  if (name === "whatsapp" || name === "github" || name === "instagram") g.fill(new Path2D(BRAND_PATHS[name]));
  else if (name === "linkedin") {
    rounded(g, 2.5, 2.5, 19, 19, 4);
    g.stroke();
    g.font = font(700, 11);
    g.textAlign = "center";
    g.fillText("in", 12, 16);
  } else LINE_ICONS[name]?.(g);
  g.restore();
}

/** My photo, loaded once for both faces. */
let photo: Promise<HTMLImageElement | null> | null = null;
export function loadPhoto() {
  photo ??= new Promise((done) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = "/about/xueying.webp";
  });
  return photo;
}

/** Brushed titanium in Space Black: dark, finely grained side to side, with a soft band of sheen across it. */
function metal(g: CanvasRenderingContext2D) {
  const { w, h } = FACE;
  const base = g.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, "#353538");
  base.addColorStop(1, "#1B1B1E");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // The grain of the brushing: the same every time.
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < h; y += 1) {
    g.fillStyle = \`rgba(255,255,255,\${(rand() * 0.035).toFixed(3)})\`;
    g.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
    g.fillRect(rand() * w, rand() * h, 40 + rand() * 220, 1);
  }
  const sheen = g.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.42, "rgba(255,255,255,0.04)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.09)");
  sheen.addColorStop(0.58, "rgba(255,255,255,0.04)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sheen;
  g.fillRect(0, 0, w, h);
}

/** Words etched into the metal: a shadow along the top of the cut, a glint along the bottom, then the silver. */
function etched(g: CanvasRenderingContext2D, text: string, x: number, y: number, color = SILVER, maxWidth?: number) {
  g.fillStyle = "rgba(0,0,0,0.6)";
  g.fillText(text, x, y - 1.2, maxWidth);
  g.fillStyle = "rgba(255,255,255,0.14)";
  g.fillText(text, x, y + 1.2, maxWidth);
  g.fillStyle = color;
  g.fillText(text, x, y, maxWidth);
}

/** My photo in a circle, ringed in \`ring\`. The picture is already round, so it's cut just inside its edge. */
function portrait(g: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, r: number, ring: string) {
  if (!img) return;
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  const size = r * 2.1;
  g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  g.restore();
  g.strokeStyle = ring;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, r + 4, 0, Math.PI * 2);
  g.stroke();
}

/** The front: my photo and that I'm open to work along the top, my name etched along the bottom. */
export function drawFront(g: CanvasRenderingContext2D, img: HTMLImageElement | null) {
  const { w, h } = FACE;
  g.save();
  g.scale(FACE_SCALE, FACE_SCALE);
  metal(g);
  portrait(g, img, 118, 130, 52, "rgba(255,255,255,0.28)");
  // Open to work, top right, with the green dot.
  g.font = font(500, 24);
  g.textAlign = "right";
  etched(g, "在找工作", w - 64, 140);
  const lw = g.measureText("在找工作").width;
  g.fillStyle = "#30D158";
  g.beginPath();
  g.arc(w - 64 - lw - 18, 132, 6.5, 0, Math.PI * 2);
  g.fill();
  g.textAlign = "left";
  g.font = font(600, 62);
  etched(g, "sn0wying", 62, h - 118);
  g.font = font(400, 28);
  etched(g, "Localisation & security · Shenzhen", 65, h - 70, GREY);
  g.font = font(500, 22);
  g.textAlign = "right";
  etched(g, "snyi001.github.io", w - 64, h - 70, GREY);
  g.restore();
}

/** The back: every way to reach me, etched as a quiet list, each line a link when the card's in your hand. */
export function drawBack(g: CanvasRenderingContext2D, img: HTMLImageElement | null) {
  const { w } = FACE;
  g.save();
  g.scale(FACE_SCALE, FACE_SCALE);
  metal(g);
  portrait(g, img, 92, 114, 30, "rgba(255,255,255,0.28)");
  g.font = font(600, 36);
  etched(g, "sn0wying", 140, 110);
  g.font = font(400, 23);
  etched(g, "Localisation & security · Shenzhen", 141, 142, GREY);
  g.textAlign = "right";
  g.font = font(500, 21);
  etched(g, "点一行就能找到我", w - 64, 110, GREY);
  g.textAlign = "left";

  // Fine etched rules between the rows.
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.fillRect(64, 200, w - 128, 1.5);
  for (let r = 1; r < 3; r++) {
    g.fillRect(64, 232 + r * 124 - 12, 420, 1);
    g.fillRect(548, 232 + r * 124 - 12, 412, 1);
  }
  for (const t of TILES) {
    icon(g, t.icon, t.x, t.y + 24, 34, "#C7C7CC");
    g.font = font(500, 22);
    etched(g, t.label, t.x + 54, t.y + 34, GREY);
    g.font = font(500, 29);
    etched(g, t.value, t.x + 54, t.y + 72, SILVER, t.w - 62);
  }
  g.restore();
}
`;export{n as default};
