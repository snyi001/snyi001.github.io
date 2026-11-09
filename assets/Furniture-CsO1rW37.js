const e=`import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { oakTexture, slabGeometry } from "@/desk/geometry";
import { mat } from "@/desk/scene/materials";
import { DESK, offCamera } from "@/desk/scene/registry";
import { FRAME_PHOTO } from "@/desk/scene/framePhoto";


/** A light oak desk on slim white legs. Its top surface is at y = 0. */
export function Desk() {
  const top = useMemo(() => slabGeometry(DESK.w, DESK.d, DESK.top, 0.22, 0.06), []);
  const oak = useMemo(() => {
    const map = oakTexture();
    return new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0 });
  }, []);
  const legX = DESK.w / 2 - 0.7;
  const legZ = DESK.d / 2 - 0.55;

  return (
    <group>
      <mesh geometry={top} material={oak} receiveShadow castShadow />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={\`\${sx}\${sz}\`}
            material={mat.leg}
            position={[sx * legX, -DESK.top - DESK.legs / 2, sz * legZ]}
            castShadow
          >
            <boxGeometry args={[0.26, DESK.legs, 0.26]} />
          </mesh>
        ))
      )}
      {/* A rail under each end ties the legs together. */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} material={mat.leg} position={[sx * legX, -DESK.top - 0.35, 0]}>
          <boxGeometry args={[0.2, 0.5, legZ * 2]} />
        </mesh>
      ))}
    </group>
  );
}

/** While capturing stills to publish, VITE_HIDE_PHOTO=1 leaves the frame empty (development only). */
const HIDE_PHOTO = import.meta.env.DEV && import.meta.env.VITE_HIDE_PHOTO === "1";

/**
 * Unscrambles the framed photo (framePhoto.ts) straight into a picture the
 * graphics card can use. It never becomes a file or an address anyone could
 * open or save.
 */
async function framePhotoBitmap() {
  const raw = Uint8Array.from(atob(FRAME_PHOTO.data), (c) => c.charCodeAt(0));
  let seed = 0x5eed1e55;
  for (let i = 0; i < raw.length; i++) {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    raw[i] ^= ((t ^ (t >>> 14)) >>> 0) & 255;
  }
  return createImageBitmap(new Blob([raw], { type: "image/webp" }), { imageOrientation: "flipY" });
}

/**
 * A framed photo, leaning back on its stand. The photo is private, so it isn't
 * a file on the site: it's kept scrambled in the code (framePhoto.ts) and only
 * ever unscrambled onto the desk, small, the same on every screen.
 */
export function PhotoFrame(props: JSX.IntrinsicElements["group"]) {
  const T = 0.07;
  const BORDER = 0.075;
  const MAT = 0.11;
  const LEAN = 0.2;
  /** The photo's area in the frame stays about the same whatever its shape. */
  const PHOTO_AREA = 1.2;

  const invalidate = useThree((s) => s.invalidate);
  // The texture exists from the start (so its shader is built with the rest); the photo arrives in it a moment later.
  const texture = useMemo(() => {
    const t = new THREE.Texture();
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => {
    if (HIDE_PHOTO) return;
    let alive = true;
    framePhotoBitmap().then((bitmap) => {
      if (!alive) return bitmap.close();
      texture.image = bitmap;
      texture.needsUpdate = true;
      invalidate();
    }, () => {});
    return () => {
      alive = false;
      texture.dispose();
    };
  }, [texture, invalidate]);
  const { photoW, photoH, W, H } = useMemo(() => {
    const aspect = THREE.MathUtils.clamp(FRAME_PHOTO.width / FRAME_PHOTO.height, 0.6, 1.6);
    const photoW = Math.sqrt(PHOTO_AREA * aspect);
    const photoH = Math.sqrt(PHOTO_AREA / aspect);
    return { photoW, photoH, W: photoW + 2 * (BORDER + MAT), H: photoH + 2 * (BORDER + MAT) };
  }, []);
  const photo = useMemo(
    () => (HIDE_PHOTO ? mat.photoMat : new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0 })),
    [texture]
  );

  // The stand reaches from halfway up the back of the frame to the desk behind it.
  const legTop = H * 0.45;
  const legReach = legTop * 0.5;
  const legLength = Math.hypot(legTop, legReach);
  return (
    <group {...props}>
      <group rotation-x={-LEAN}>
        <group position-y={H / 2}>
          {/* The four sides of the frame, and the board behind. */}
          <mesh material={mat.frame} position-y={H / 2 - BORDER / 2} castShadow>
            <boxGeometry args={[W, BORDER, T]} />
          </mesh>
          <mesh material={mat.frame} position-y={-H / 2 + BORDER / 2} castShadow>
            <boxGeometry args={[W, BORDER, T]} />
          </mesh>
          <mesh material={mat.frame} position-x={-W / 2 + BORDER / 2} castShadow>
            <boxGeometry args={[BORDER, H, T]} />
          </mesh>
          <mesh material={mat.frame} position-x={W / 2 - BORDER / 2} castShadow>
            <boxGeometry args={[BORDER, H, T]} />
          </mesh>
          <mesh material={mat.frame} position-z={-T / 2 + 0.01} castShadow>
            <boxGeometry args={[W, H, 0.02]} />
          </mesh>
          {/* The white mount, the photo, and a sheet of glass over both. */}
          <mesh material={mat.photoMat} position-z={0.004}>
            <planeGeometry args={[W - 2 * BORDER, H - 2 * BORDER]} />
          </mesh>
          <mesh material={photo} position-z={0.007} ref={(m) => void (offCamera.photo = m)}>
            <planeGeometry args={[photoW, photoH]} />
          </mesh>
          <mesh material={mat.frameGlass} position-z={0.024}>
            <planeGeometry args={[W - 2 * BORDER, H - 2 * BORDER]} />
          </mesh>
        </group>
      </group>
      <mesh
        material={mat.frame}
        position={[0, legTop / 2, -legReach / 2 - Math.sin(LEAN) * legTop - T / 2]}
        rotation-x={Math.atan2(legReach, legTop)}
        castShadow
      >
        <boxGeometry args={[0.18, legLength, 0.03]} />
      </mesh>
    </group>
  );
}
`;export{e as default};
