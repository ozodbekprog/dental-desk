"use client";

/* The r128 build is loaded from /app-assets and has no TypeScript types. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type SceneApi = {
  rotate: (delta: number) => void;
  reset: () => void;
};

type ToothInfo = {
  fdi: string;
  name: string;
  quadrant: string;
  tone: "ok" | "accent" | "gold";
  note: string;
};

const DIMS = {
  up: {
    w: [6.5, 5.4, 5.9, 5.6, 5.4, 7.7, 7.4, 6.8],
    d: [5.8, 5.2, 5.9, 6.7, 6.8, 8.3, 8.1, 7.6],
    h: [9, 8, 8.6, 7.4, 7.2, 6.6, 6.2, 6],
  },
  lo: {
    w: [4.5, 4.9, 5.6, 5.8, 5.9, 8.1, 7.7, 7.2],
    d: [5.6, 6, 6.6, 7, 7.2, 8.8, 8.4, 7.8],
    h: [8, 8.2, 8.8, 7.2, 7, 6.4, 6, 5.8],
  },
} as const;

const TOOTH_GAP = 0.55;
const ARCH_A = 43;
const ARCH_B = 33;

const TOOTH_NAMES = [
  "Markaziy kesuvchi",
  "Yon kesuvchi",
  "Qoziq tish",
  "Birinchi premolyar",
  "Ikkinchi premolyar",
  "Birinchi molar",
  "Ikkinchi molar",
  "Uchinchi molar",
];

const QUADRANTS: Record<string, string> = {
  "1": "Yuqori o'ng",
  "2": "Yuqori chap",
  "3": "Pastki chap",
  "4": "Pastki o'ng",
};

const DEMO_TOOTH: Record<string, { tone: ToothInfo["tone"]; note: string }> = {
  "16": { tone: "accent", note: "Kompozit plomba · 23-oktabr 2026" },
  "26": { tone: "accent", note: "Kanal davolash · 2-sentabr 2026" },
  "36": { tone: "gold", note: "Shikoyat: sezuvchanlik · 7-noyabr 2026" },
  "46": { tone: "accent", note: "Koronka · 18-iyun 2026" },
};

const TONE_COLOR: Record<ToothInfo["tone"], number> = {
  ok: 0x000000,
  accent: 0x0a4c51,
  gold: 0x4a3414,
};

const TONE_DOT: Record<ToothInfo["tone"], string> = {
  ok: "bg-[#d7eee1]",
  accent: "bg-[#58c9cd]",
  gold: "bg-[#d8b06a]",
};

const TONE_LABEL: Record<ToothInfo["tone"], string> = {
  ok: "Sog'lom",
  accent: "Davolangan",
  gold: "Kuzatuvda",
};

function toothInfo(fdi: string): ToothInfo {
  const quadrant = QUADRANTS[fdi[0]] || "Og'iz bo'shlig'i";
  const index = Number(fdi[1]) - 1;
  const demo = DEMO_TOOTH[fdi];
  return {
    fdi,
    quadrant,
    name: TOOTH_NAMES[index] || "Tish",
    tone: demo?.tone || "ok",
    note: demo?.note || "Tarixda yozuv yo'q · sog'lom",
  };
}

function roundedShape(THREE: any, w: number, d: number, r: number) {
  const shape = new THREE.Shape();
  const x = Math.max(0.5, w / 2);
  const y = Math.max(0.5, d / 2);
  const rad = Math.min(r, x - 0.1, y - 0.1);
  shape.moveTo(-x + rad, -y);
  shape.lineTo(x - rad, -y);
  shape.quadraticCurveTo(x, -y, x, -y + rad);
  shape.lineTo(x, y - rad);
  shape.quadraticCurveTo(x, y, x - rad, y);
  shape.lineTo(-x + rad, y);
  shape.quadraticCurveTo(-x, y, -x, y - rad);
  shape.lineTo(-x, -y + rad);
  shape.quadraticCurveTo(-x, -y, -x + rad, -y);
  return shape;
}

function roundedBox(THREE: any, w: number, h: number, d: number, upper?: boolean) {
  const r = Math.min(1.5, w * 0.24, h * 0.26, d * 0.24);
  const shape = roundedShape(THREE, w - 2 * r, d - 2 * r, r * 0.9);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1, h - 2 * r),
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelSegments: 4,
    curveSegments: 6,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -(h / 2 - r), 0);

  if (upper !== undefined) {
    const position = geo.attributes.position;
    const halfW = w / 2;
    const halfH = h / 2;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const taper = upper
        ? 1.0 - 0.11 * ((y + halfH) / h)
        : 0.89 + 0.11 * ((y + halfH) / h);
      const px = x / halfW;
      const py = y / halfH;
      const bulge = Math.max(0, 1 - px * px) * Math.max(0, 1 - py * py) * 0.7;
      position.setX(i, x * taper);
      position.setY(i, y);
      position.setZ(i, z * taper + Math.sign(z || 1) * bulge);
    }
    position.needsUpdate = true;
    geo.computeVertexNormals();
  }

  return geo;
}

export function SmileScene3D({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const existing = (window as unknown as { THREE?: any }).THREE;
    if (existing) setReady(true);
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (!ready) return;
    const THREE = (window as unknown as { THREE?: any }).THREE;
    const mount = mountRef.current;
    if (!THREE || !mount) {
      setFailed(true);
      return;
    }

    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    if (!renderer?.domElement) {
      setFailed(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    if ("outputEncoding" in renderer && THREE.sRGBEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    if ("toneMapping" in renderer && THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
    }
    renderer.shadowMap.enabled = true;
    if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "pan-y";
    canvas.style.cursor = "grab";
    canvas.setAttribute("aria-label", "3D og'iz bo'shlig'i — interaktiv namuna");
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
    camera.position.set(0, 42, 150);
    camera.lookAt(0, -3, 0);

    scene.add(new THREE.HemisphereLight(0xeaf7f8, 0x15282b, 0.3));

    const key = new THREE.DirectionalLight(0xfff3e2, 0.92);
    key.position.set(-52, 96, 88);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -78;
    key.shadow.camera.right = 78;
    key.shadow.camera.top = 70;
    key.shadow.camera.bottom = -70;
    key.shadow.camera.near = 20;
    key.shadow.camera.far = 320;
    key.shadow.bias = -0.0009;
    key.shadow.radius = 3;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x8fd3da, 0.22);
    fill.position.set(76, 26, 54);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x53cbd2, 0.95);
    rim.position.set(4, 34, -112);
    scene.add(rim);

    const glint = new THREE.PointLight(0xffffff, 1.05, 320, 2);
    glint.position.set(-30, 34, 74);
    scene.add(glint);

    const root = new THREE.Group();
    root.rotation.set(0.02, -0.4, 0);
    root.position.y = -3;
    scene.add(root);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(53, 53.24, 128),
      new THREE.MeshBasicMaterial({
        color: 0xc8a15a,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      })
    );
    halo.position.set(0, -1, -30);
    scene.add(halo);

    const halo2 = new THREE.Mesh(
      new THREE.RingGeometry(62, 62.16, 128),
      new THREE.MeshBasicMaterial({
        color: 0x39c4c9,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
      })
    );
    halo2.position.set(0, -1, -34);
    scene.add(halo2);

    const gumMaterial = new THREE.MeshStandardMaterial({
      color: 0x431a22,
      roughness: 0.8,
      metalness: 0,
    });

    const envCanvas = document.createElement("canvas");
    envCanvas.width = 512;
    envCanvas.height = 256;
    const envCtx = envCanvas.getContext("2d");
    if (envCtx) {
      const sky = envCtx.createLinearGradient(0, 0, 0, 256);
      sky.addColorStop(0, "#f4fbfb");
      sky.addColorStop(0.38, "#b9d6d8");
      sky.addColorStop(0.62, "#3c5e62");
      sky.addColorStop(1, "#08181b");
      envCtx.fillStyle = sky;
      envCtx.fillRect(0, 0, 512, 256);
      const shine = envCtx.createRadialGradient(150, 66, 4, 150, 66, 96);
      shine.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      shine.addColorStop(1, "rgba(255, 255, 255, 0)");
      envCtx.fillStyle = shine;
      envCtx.fillRect(0, 0, 512, 256);
      const glow = envCtx.createRadialGradient(386, 92, 6, 386, 92, 80);
      glow.addColorStop(0, "rgba(127, 224, 227, 0.7)");
      glow.addColorStop(1, "rgba(127, 224, 227, 0)");
      envCtx.fillStyle = glow;
      envCtx.fillRect(0, 0, 512, 256);
    }
    const envTexture = new THREE.CanvasTexture(envCanvas);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;

    const pickables: any[] = [];
    const teeth: { fdi: string; mesh: any; material: any; baseEmissive: number }[] = [];
    const cleanups: (() => void)[] = [];

    const buildJaw = (upper: boolean) => {
      const dims = upper ? DIMS.up : DIMS.lo;
      const plane = upper ? 6.9 : -6.9;
      const A = ARCH_A;
      const B = ARCH_B;
      const total = dims.w.reduce((sum, value) => sum + value, 0) + TOOTH_GAP * 8;

      for (const side of [-1, 1]) {
        let acc = TOOTH_GAP / 2;
        for (let i = 0; i < 8; i += 1) {
          const w = dims.w[i];
          const d = dims.d[i];
          const h = dims.h[i];
          const along = (acc + w / 2) / total;
          acc += w + TOOTH_GAP;
          const theta = (0.045 + along * 0.91) * (Math.PI / 2);
          const px = A * Math.sin(theta);
          const pz = B * Math.cos(theta);
          let nx = Math.sin(theta) / A;
          let nz = Math.cos(theta) / B;
          const nl = Math.hypot(nx, nz) || 1;
          nx /= nl;
          nz /= nl;

          const fdi = String((upper ? (side > 0 ? 20 : 10) : side > 0 ? 30 : 40) + i + 1);
          const info = toothInfo(fdi);
          const baseColor =
            info.tone === "accent" ? 0xe6f0e9 : info.tone === "gold" ? 0xeadcc3 : 0xece4d4;
          const baseEmissive = TONE_COLOR[info.tone];

          const material = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.34,
            metalness: 0.02,
            emissive: baseEmissive,
            emissiveIntensity: 0.35,
            envMap: envTexture,
            envMapIntensity: 0.65,
          });
          const mesh = new THREE.Mesh(roundedBox(THREE, w, h, d, upper), material);
          mesh.userData.fdi = fdi;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          pickables.push(mesh);

          const group = new THREE.Group();
          group.position.set(side * px, plane, pz);
          group.rotation.y = Math.atan2(side * nx, nz);
          group.rotation.x = upper ? 0.045 : -0.045;
          group.add(mesh);

          if (i === 2) {
            const tip = new THREE.Mesh(new THREE.ConeGeometry(w * 0.22, 1.5, 16), material);
            tip.rotation.z = upper ? Math.PI : 0;
            tip.position.set(0, upper ? -h / 2 - 0.2 : h / 2 + 0.2, 0);
            tip.castShadow = true;
            group.add(tip);
          }

          const collar = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), gumMaterial);
          collar.scale.set(w * 0.85, 2.2, d * 0.62);
          collar.position.set(0, upper ? h / 2 - 0.5 : -h / 2 + 0.5, -d * 0.3);
          collar.castShadow = true;
          collar.receiveShadow = true;
          group.add(collar);

          if (i >= 3) {
            const cuspGeo = roundedBox(THREE, Math.max(2.2, w * 0.32), 1.6, d * 0.5);
            for (const offset of [-w * 0.2, w * 0.2]) {
              const cusp = new THREE.Mesh(cuspGeo, material);
              cusp.position.set(offset, upper ? -h / 2 : h / 2, 0);
              cusp.castShadow = true;
              group.add(cusp);
            }
          }

          if (i >= 3) {
            const cuspGeo = roundedBox(THREE, Math.max(2.4, w * 0.34), 2, d * 0.56);
            for (const offset of [-w * 0.23, w * 0.23]) {
              const cusp = new THREE.Mesh(cuspGeo, material);
              cusp.position.set(offset, upper ? -h / 2 : h / 2, 0);
              cusp.castShadow = true;
              group.add(cusp);
            }
          }

          root.add(group);
          teeth.push({ fdi, mesh, material, baseEmissive });
        }
      }
    };

    buildJaw(true);
    buildJaw(false);

    // Real soft shadow catcher under the jaws.
    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 170),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.set(0, -22, 2);
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);

    const contactCanvas = document.createElement("canvas");
    contactCanvas.width = 256;
    contactCanvas.height = 128;
    const contactCtx = contactCanvas.getContext("2d");
    if (contactCtx) {
      const gradient = contactCtx.createRadialGradient(128, 64, 4, 128, 64, 118);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.55)");
      gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.2)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      contactCtx.fillStyle = gradient;
      contactCtx.fillRect(0, 0, 256, 128);
    }
    const contactTexture = new THREE.CanvasTexture(contactCanvas);
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(112, 44),
      new THREE.MeshBasicMaterial({
        map: contactTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.95,
      })
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.set(0, -17, 3);
    scene.add(contact);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered: any = null;
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;
    let lastInteraction = performance.now();
    let targetYaw = -0.4;
    let targetPitch = 0.02;

    const setPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      return true;
    };

    const pick = () => {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      return hits.length ? hits[0].object : null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!setPointer(event)) return;
      dragging = true;
      moved = false;
      downX = event.clientX;
      downY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      lastInteraction = performance.now();
      canvas.style.cursor = "grabbing";
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* pointer capture is best-effort */
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!setPointer(event)) return;
      if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        if (Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) > 5) moved = true;
        targetYaw = Math.max(-0.68, Math.min(0.72, targetYaw + dx * 0.0045));
        targetPitch = Math.max(-0.14, Math.min(0.24, targetPitch + dy * 0.0028));
        lastInteraction = performance.now();
        return;
      }
      const hit = pick();
      if (hovered !== hit) hovered = hit;
      canvas.style.cursor = hit ? "pointer" : "grab";
    };

    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = hovered ? "pointer" : "grab";
      lastInteraction = performance.now();
      if (!moved && setPointer(event)) {
        const hit = pick();
        const fdi = hit?.userData?.fdi ? String(hit.userData.fdi) : null;
        setSelected(fdi);
      }
    };

    const onPointerLeave = () => {
      if (!dragging) {
        hovered = null;
        canvas.style.cursor = "grab";
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", onPointerLeave);
    cleanups.push(() => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    });

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    apiRef.current = {
      rotate: (delta: number) => {
        targetYaw = Math.max(-0.68, Math.min(0.72, targetYaw + delta));
        lastInteraction = performance.now();
      },
      reset: () => {
        targetYaw = -0.4;
        targetPitch = 0.02;
        lastInteraction = performance.now();
        setSelected(null);
      },
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.06, (now - last) / 1000);
      last = now;
      const elapsed = now * 0.001;
      const idle = now - lastInteraction > 2600;
      const sway = !reducedMotion && idle && !dragging ? Math.sin(elapsed * 0.42) * 0.055 : 0;
      root.rotation.y += (targetYaw + sway - root.rotation.y) * 0.075;
      root.rotation.x += (targetPitch - root.rotation.x) * 0.075;

      glint.position.x = Math.sin(elapsed * 0.55) * 58;
      glint.position.y = 30 + Math.cos(elapsed * 0.4) * 14;
      glint.position.z = 78 + Math.sin(elapsed * 0.3) * 8;

      for (const tooth of teeth) {
        const isSelected = tooth.fdi === selectedRef.current;
        const isHovered = tooth.mesh === hovered;
        const targetScale = isSelected ? 1.075 : isHovered ? 1.035 : 1;
        const current = tooth.mesh.scale.x;
        const next = current + (targetScale - current) * Math.min(1, delta * 12);
        tooth.mesh.scale.setScalar(next);
        const emissive = isSelected ? 0x0c4c52 : isHovered ? 0x072b2f : tooth.baseEmissive;
        tooth.material.emissive.setHex(emissive);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const fitCamera = () => {
      const width = mount.clientWidth || 360;
      const height = mount.clientHeight || 420;
      const aspect = Math.max(0.55, width / Math.max(1, height));
      renderer.setSize(width, height, false);
      camera.aspect = aspect;
      const fit = Math.max(1, 1.28 / aspect);
      camera.position.set(0, 42, 150 * fit);
      camera.lookAt(0, -3, 0);
      camera.updateProjectionMatrix();
    };
    fitCamera();
    raf = requestAnimationFrame(tick);

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitCamera) : null;
    observer?.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      for (const cleanup of cleanups) cleanup();
      apiRef.current = null;
      scene.traverse((obj: any) => {
        if (obj.geometry?.dispose) obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) {
          if (!material) continue;
          if (material.map?.dispose) material.map.dispose();
          if (material.dispose) material.dispose();
        }
      });
      renderer.dispose?.();
      renderer.forceContextLoss?.();
      envTexture.dispose?.();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [ready]);

  const info = selected ? toothInfo(selected) : null;

  return (
    <div
      className={`relative overflow-hidden rounded-[30px] border border-[#1b4348] bg-[radial-gradient(ellipse_at_50%_38%,#123a3f_0%,#0a262a_46%,#061619_100%)] shadow-[0_46px_110px_-50px_rgba(3,26,29,0.95)] ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: "radial-gradient(rgba(177, 230, 232, 0.5) 0.6px, transparent 0.6px)",
          backgroundSize: "16px 16px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(57,196,201,0.22),transparent_70%)]"
        aria-hidden="true"
      />

      <Script
        src="/app-assets/three.min.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />

      <div className="relative h-[390px] sm:h-[430px]">
        <div ref={mountRef} className="absolute inset-0" />

        {!ready && !failed ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-3">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#2a5b60] border-t-[#7fe0e3]" />
              <p className="text-xs font-medium text-white/55">3D model yuklanmoqda…</p>
            </div>
          </div>
        ) : null}

        {failed ? (
          <div className="absolute inset-0 grid place-items-center px-8 text-center">
            <div>
              <p className="dd-mono text-4xl font-bold text-[#7fe0e3]">32</p>
              <p className="mt-2 text-sm font-semibold text-white">3D ko&apos;rinish mavjud emas</p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Brauzeringizda WebGL o&apos;chirilgan. Bemor kabinetida 2D tish xaritasi ochiladi.
              </p>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-5 sm:p-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7fe0e3] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7fe0e3]" />
              </span>
              3D ko&apos;rinish
            </span>
            <p className="dd-display mt-3 text-lg font-bold text-white">Og&apos;iz bo&apos;shlig&apos;i</p>
            <p className="mt-0.5 text-[11px] text-white/50">Yuqori va pastki jag&apos; · 32 tish</p>
          </div>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-semibold text-white/60">
            Interaktiv namuna
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 sm:p-6">
          <p className="pointer-events-none text-[11px] text-white/45">
            Tortib aylantiring · tishni bosing
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => apiRef.current?.rotate(-0.3)}
              aria-label="Modelni chapga aylantirish"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/25 text-white/75 transition hover:border-[#7fe0e3]/60 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => apiRef.current?.rotate(0.3)}
              aria-label="Modelni o'ngga aylantirish"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/25 text-white/75 transition hover:border-[#7fe0e3]/60 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {info ? (
          <div className="absolute bottom-[74px] left-4 right-4 sm:left-6 sm:right-auto sm:w-[280px]">
            <div className="rounded-2xl border border-white/15 bg-[#0a2226]/95 p-4 shadow-[0_18px_44px_-20px_rgba(0,0,0,0.8)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="dd-mono text-2xl font-bold leading-none text-[#8fe6e8]">{info.fdi}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{info.name}</p>
                  <p className="text-[11px] text-white/50">{info.quadrant}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Tanlovni yopish"
                  className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 text-white/60 transition hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex items-start gap-2 border-t border-white/10 pt-2.5">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[info.tone]}`} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                    {TONE_LABEL[info.tone]}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/70">{info.note}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
