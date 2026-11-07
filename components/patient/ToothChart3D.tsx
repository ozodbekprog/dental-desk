"use client";

/* The r128 build is loaded from /app-assets and has no TypeScript types. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { ToothEntry } from "./types";
import {
  FDI_LOWER,
  FDI_UPPER,
  formatShortDate,
  procLabel,
  surfaceLabels,
  toothMark,
  toothName,
  type ToothMark,
} from "./toothData";

export type ToothComplaint = {
  text: string;
  at: string;
  authorName?: string;
};

type Props = {
  teeth: Record<string, ToothEntry[]>;
  complaints?: Record<string, ToothComplaint[]>;
  onSelect?: (fdi: string | null) => void;
};

type ThreeModule = any;

type SceneStore = {
  materials: Map<string, any>;
  groups: Map<string, any>;
};

const MARK_COLOR: Record<ToothMark, number> = {
  healthy: 0xe7dfcc,
  treated: 0x2f939b,
  complaint: 0xc8a15a,
  alert: 0xc0574b,
};

const MARK_LABEL: Record<ToothMark, string> = {
  healthy: "Sog'lom",
  treated: "Davolangan",
  complaint: "Shikoyat bor",
  alert: "Bir nechta shikoyat",
};

const MARK_DOT: Record<ToothMark, string> = {
  healthy: "bg-[#e7dfcc]",
  treated: "bg-[#2f939b]",
  complaint: "bg-[#c8a15a]",
  alert: "bg-[#c0574b]",
};

const EMPTY_COMPLAINTS: Record<string, ToothComplaint[]> = {};

const DIMS = {
  up: {
    w: [8.5, 6.5, 7.5, 7, 6.5, 10, 9, 8.5],
    d: [7, 6, 8, 9, 9, 11, 11, 10],
    h: [10.5, 9, 10, 8.5, 8.5, 7.5, 7, 7],
  },
  lo: {
    w: [5, 5.5, 7, 7, 7, 11, 10.5, 10],
    d: [6, 6.5, 7.5, 7.5, 8, 10.5, 10, 9.5],
    h: [9, 9.5, 11, 8.5, 8.5, 7.5, 7, 7],
  },
} as const;

function roundedShape(THREE: ThreeModule, w: number, d: number, r: number) {
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

/** A bevel-extruded rounded box, the basic tooth crown. */
function roundedBox(THREE: ThreeModule, w: number, h: number, d: number) {
  const r = Math.min(1.6, w * 0.24, h * 0.28, d * 0.24);
  const shape = roundedShape(THREE, w - 2 * r, d - 2 * r, r * 0.85);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1, h - 2 * r),
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelSegments: 3,
    curveSegments: 5,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -(h / 2 - r), 0);
  return geo;
}

function labelTexture(THREE: ThreeModule, fdi: string, mark: ToothMark): any {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 144;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const border =
      mark === "healthy"
        ? "#5d7a7f"
        : mark === "treated"
          ? "#4fb0b8"
          : mark === "complaint"
            ? "#d8b06a"
            : "#d9736a";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const x = 12;
    const y = 24;
    const w = 168;
    const h = 96;
    const r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = "rgba(13, 32, 36, 0.92)";
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = border;
    ctx.stroke();
    ctx.fillStyle = "#f2f7f7";
    ctx.font = "700 68px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fdi, 96, 74);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export function ToothChart3D({ teeth, complaints = EMPTY_COMPLAINTS, onSelect }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const storeRef = useRef<SceneStore | null>(null);
  const [libReady, setLibReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const complaintCount: Record<string, number> = {};
  for (const [fdi, list] of Object.entries(complaints)) complaintCount[fdi] = list.length;

  function select(fdi: string | null) {
    setSelected(fdi);
    onSelect?.(fdi);
  }

  // If the script was already evaluated on a previous page load.
  useEffect(() => {
    const existing = (window as unknown as { THREE?: ThreeModule }).THREE;
    if (existing) setLibReady(true);
  }, []);

  useEffect(() => {
    if (!libReady) return;
    const THREE = (window as unknown as { THREE?: ThreeModule }).THREE;
    const mount = mountRef.current;
    if (!THREE || !mount) {
      setFailed(true);
      return;
    }

    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFailed(true);
      return;
    }
    if (!renderer || !renderer.domElement) {
      setFailed(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x0d2024, 1);
    if ("outputEncoding" in renderer && THREE.sRGBEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.setAttribute("aria-label", "3D tish xaritasi");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d2024);
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);

    scene.add(new THREE.HemisphereLight(0xe8f4f5, 0x1b3438, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(60, 120, 110);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fd3da, 0.45);
    rim.position.set(-90, 40, -120);
    scene.add(rim);

    const root = new THREE.Group();
    root.position.y = 0;
    scene.add(root);

    const store: SceneStore = { materials: new Map(), groups: new Map() };
    const pickables: any[] = [];
    const labels: any[] = [];

    const buildJaw = (upper: boolean) => {
      const dims = upper ? DIMS.up : DIMS.lo;
      const plane = upper ? 11 : -11;
      const A = upper ? 27.2 : 24.6;
      const B = upper ? 23 : 20.4;
      const total = dims.w.reduce((sum, value) => sum + value, 0);
      let acc = 0;

      for (const side of [-1, 1]) {
        acc = 0;
        for (let i = 0; i < 8; i += 1) {
          const w = dims.w[i];
          const d = dims.d[i];
          const h = dims.h[i];
          const along = (acc + w / 2) / total;
          acc += w;
          const t = 0.035 + along * 0.93;
          const theta = (t * Math.PI) / 2;
          const px = A * Math.sin(theta);
          const pz = B * Math.cos(theta);
          let nx = Math.sin(theta) / A;
          let nz = Math.cos(theta) / B;
          const nl = Math.hypot(nx, nz) || 1;
          nx /= nl;
          nz /= nl;

          const fdi = String((upper ? (side > 0 ? 20 : 10) : side > 0 ? 30 : 40) + i + 1);
          const mark = toothMark(fdi, teeth, complaintCount);

          const material = new THREE.MeshPhongMaterial({
            color: MARK_COLOR[mark],
            shininess: 34,
            specular: 0x33484c,
            emissive: 0x000000,
          });
          const mesh = new THREE.Mesh(roundedBox(THREE, w, h, d), material);
          mesh.userData.fdi = fdi;
          pickables.push(mesh);

          const group = new THREE.Group();
          group.position.set(side * px, upper ? plane - h / 2 : -plane + h / 2, pz);
          group.rotation.y = Math.atan2(side * nx, nz);
          group.add(mesh);
          root.add(group);

          store.materials.set(fdi, material);
          store.groups.set(fdi, group);

          const texture = labelTexture(THREE, fdi, mark);
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
          );
          const out = d / 2 + 4.2;
          sprite.position.set(
            side * px + side * nx * out,
            upper ? plane + 7.2 : -plane - 7.2,
            pz + nz * out
          );
          const lw = 5.6;
          sprite.scale.set(lw, (lw * 144) / 192, 1);
          sprite.userData.fdi = fdi;
          labels.push(sprite);
          root.add(sprite);
        }
      }
    };

    buildJaw(true);
    buildJaw(false);

    storeRef.current = store;
    setSelected(null);
    setVersion((value) => value + 1);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      if (hits.length && hits[0].object?.userData?.fdi) {
        setSelected(String(hits[0].object.userData.fdi));
      }
    };
    renderer.domElement.addEventListener("click", onPick);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.06, (now - last) / 1000);
      last = now;
      root.rotation.y += delta * 0.11;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const fitCamera = () => {
      const width = mount.clientWidth || 320;
      const height = mount.clientHeight || 400;
      const aspect = Math.max(0.4, width / Math.max(1, height));
      renderer.setSize(width, height, false);
      camera.aspect = aspect;
      const fit = Math.max(1, 1.18 / aspect);
      camera.position.set(0, 46, 108 * fit);
      camera.lookAt(0, 0, 0);
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
      renderer.domElement.removeEventListener("click", onPick);
      storeRef.current = null;
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
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
    // Scene is rebuilt when the aggregated history changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libReady, teeth, complaints]);

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;
    for (const [fdi, material] of store.materials) {
      const active = fdi === selected;
      material.emissive.setHex(active ? 0x0c6a72 : 0x000000);
      material.emissiveIntensity = active ? 0.75 : 0;
      const group = store.groups.get(fdi);
      if (group) group.scale.setScalar(active ? 1.09 : 1);
    }
  }, [selected, version]);

  const selectedEntries = selected ? teeth[selected] || [] : [];
  const selectedComplaints = selected ? complaints[selected] || [] : [];
  const selectedMark = selected ? toothMark(selected, teeth, complaintCount) : "healthy";

  const legend = (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
      {(["healthy", "treated", "complaint", "alert"] as ToothMark[]).map((mark) => (
        <span key={mark} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${MARK_DOT[mark]}`} />
          {MARK_LABEL[mark]}
        </span>
      ))}
      <span className="ml-auto hidden sm:inline">Tishni bosing — tarixini ko'rish</span>
    </div>
  );

  const panel = (
    <aside className="dd-card flex min-h-[220px] flex-col p-4">
      {selected ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="dd-mono text-3xl font-bold leading-none text-accent">{selected}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{toothName(selected)}</p>
            </div>
            <button
              type="button"
              onClick={() => select(null)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:border-accent hover:text-accent"
              aria-label="Yopish"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${MARK_DOT[selectedMark]}`} />
            <span className="text-xs font-semibold text-muted">{MARK_LABEL[selectedMark]}</span>
            <span className="ml-auto text-xs text-muted">{selectedEntries.length} yozuv</span>
          </div>

          <div className="mt-3 grid flex-1 gap-2 overflow-y-auto pr-1">
            {selectedEntries.length ? (
              selectedEntries.map((entry, index) => (
                <div
                  key={`${entry.date}-${entry.proc}-${index}`}
                  className="rounded-xl border border-line bg-surface-2 p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{procLabel(entry.proc)}</span>
                    <span className="dd-mono text-xs text-muted">{formatShortDate(entry.date)}</span>
                  </div>
                  {entry.surfaces.length ? (
                    <p className="mt-1 text-xs text-muted">Yuzalar: {surfaceLabels(entry.surfaces)}</p>
                  ) : null}
                  {entry.canal ? (
                    <p className="mt-1 text-xs text-muted">Kanal: {entry.canal}</p>
                  ) : null}
                  {entry.note ? <p className="mt-1 text-xs text-ink-soft">{entry.note}</p> : null}
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-line bg-surface-2 px-3 py-4 text-xs text-muted">
                Bu tish bo&apos;yicha yozuv yo&apos;q.
              </p>
            )}

            {selectedComplaints.length ? (
              <div className="rounded-xl border border-gold/40 bg-gold/10 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-warn">Shikoyatlar</p>
                {selectedComplaints.map((complaint, index) => (
                  <div key={`${complaint.at}-${index}`} className="mt-1.5 text-xs text-ink-soft">
                    <span className="dd-mono mr-1 text-[11px] text-muted">
                      {formatShortDate(complaint.at)}
                    </span>
                    {complaint.text}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <p className="mt-3 border-t border-line pt-2 text-[11px] text-muted">
            Faqat ko&apos;rish. Tahrirlash faqat klinika shifokori uchun.
          </p>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3h6M12 3v3M7 21c0-4 2-6 5-6s5 2 5 6" />
            </svg>
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Tishni tanlang</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            3D xaritada kerakli tishni bosing — davolash tarixi, yuzalar va izohlar shu yerda
            chiqadi.
          </p>
        </div>
      )}
    </aside>
  );

  const fallback = (
    <div className="rounded-2xl border border-line bg-surface-2 p-3 sm:p-4">
      <p className="mb-3 rounded-lg bg-warn/10 px-3 py-2 text-xs font-medium text-warn">
        3D mavjud emas — 2D tish xaritasi ko&apos;rsatilmoqda.
      </p>
      {[
        { title: "Yuqori jag'", list: FDI_UPPER },
        { title: "Pastki jag'", list: FDI_LOWER },
      ].map((row) => (
        <div key={row.title} className="mb-3 last:mb-0">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            {row.title}
          </p>
          <div className="grid grid-cols-8 gap-1.5">
            {row.list.map((fdi) => {
              const mark = toothMark(fdi, teeth, complaintCount);
              return (
                <button
                  key={fdi}
                  type="button"
                  onClick={() => select(fdi)}
                  aria-pressed={selected === fdi}
                  title={toothName(fdi)}
                  className={`dd-mono rounded-lg border px-1 py-2 text-sm font-bold transition ${
                    selected === fdi
                      ? "border-accent bg-accent text-white"
                      : "border-line-strong bg-surface text-ink hover:border-accent"
                  }`}
                >
                  <span className={`mx-auto mb-1 block h-2 w-2 rounded-full ${MARK_DOT[mark]}`} />
                  {fdi}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <Script
        src="/app-assets/three.min.js"
        strategy="afterInteractive"
        onReady={() => setLibReady(true)}
        onError={() => setFailed(true)}
      />

      {failed ? (
        fallback
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div>
            <div className="relative h-[380px] overflow-hidden rounded-2xl border border-ink-soft/40 bg-[#0d2024] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-[480px]">
              <div ref={mountRef} className="absolute inset-0" />
              {!libReady ? (
                <div className="absolute inset-0 grid place-items-center text-sm text-white/60">
                  3D xarita yuklanmoqda…
                </div>
              ) : null}
              <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur">
                {libReady ? "Sekin aylanadi · tishni bosing" : ""}
              </p>
            </div>
            {legend}
          </div>
          {panel}
        </div>
      )}

      {failed ? (
        <div className="mt-4">{panel}</div>
      ) : null}
    </div>
  );
}
