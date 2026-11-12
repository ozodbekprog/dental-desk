"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import {
  PROCEDURE_MAP,
  QUADRANTS,
  procedureLabel,
  toothLabel,
  toothTone,
} from "./treatments";

/**
 * 3D dental arch with real-proportion crowns, gum blocks and numbered FDI
 * labels. The geometry follows the clinic app's viewer so the chart looks the
 * same for every user. Three.js r128 is loaded on demand; without WebGL the
 * component degrades to a selectable 2D tooth grid.
 */

export type ToothMarks = Record<number, string[]>;

type Props = {
  marks?: ToothMarks;
  selected?: number[];
  onToggle?: (tooth: number) => void;
  interactive?: boolean;
  showGrid?: boolean;
  height?: number;
  className?: string;
};

type Tip = { tooth: number; x: number; y: number; width: number };

let threePromise: Promise<any> | null = null;

function loadThree(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  const scope = window as any;
  if (scope.THREE) return Promise.resolve(scope.THREE);
  if (!threePromise) {
    threePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/app-assets/three.min.js";
      script.async = true;
      script.onload = () =>
        scope.THREE ? resolve(scope.THREE) : reject(new Error("three missing"));
      script.onerror = () => reject(new Error("three failed"));
      document.head.appendChild(script);
    });
  }
  return threePromise;
}

const HEALTHY = "#f1ecdc";
const GUM_COLOR = 0xd98a96;
const HP = 8.8;
const GUM_H = 8;
const GAP = 0.45;

const DIM = {
  up: {
    w: [8.5, 6.5, 7.5, 7, 6.5, 10, 9, 8.5],
    d: [7, 6, 8, 9, 9, 11, 11, 10],
    h: [10.5, 9, 10, 8.5, 8.5, 7.5, 7, 7],
    r: [13, 13, 17, 14, 13, 12.5, 12, 11],
  },
  lo: {
    w: [5, 5.5, 7, 7, 7, 11, 10.5, 10],
    d: [6, 6.5, 7.5, 7.5, 8, 10.5, 10, 9.5],
    h: [9, 9.5, 11, 8.5, 8.5, 7.5, 7, 7],
    r: [12.5, 14, 16, 14, 14.5, 14, 13, 11],
  },
} as const;

/* crown profiles: [height fraction, width scale, depth scale, shade] */
const PROF: Record<string, number[][]> = {
  inc: [
    [0, 0.66, 0.8, 0.7],
    [0.16, 0.88, 0.98, 0.82],
    [0.42, 1, 1, 0.95],
    [0.72, 1, 0.82, 1],
    [0.9, 0.97, 0.55, 1],
    [1, 0.92, 0.32, 1],
  ],
  can: [
    [0, 0.64, 0.78, 0.7],
    [0.18, 0.92, 1, 0.82],
    [0.45, 1, 1, 0.95],
    [0.68, 0.86, 0.84, 1],
    [0.84, 0.58, 0.58, 1],
    [0.95, 0.26, 0.28, 1],
    [1, 0.04, 0.06, 1],
  ],
  pre: [
    [0, 0.68, 0.78, 0.7],
    [0.18, 0.92, 0.98, 0.82],
    [0.5, 1, 1, 0.95],
    [0.78, 0.96, 0.94, 1],
    [0.92, 0.86, 0.76, 1],
  ],
  mol: [
    [0, 0.68, 0.7, 0.7],
    [0.2, 0.94, 0.95, 0.82],
    [0.5, 1, 1, 0.95],
    [0.76, 0.98, 0.98, 1],
    [0.9, 0.92, 0.92, 1],
  ],
};

const LAB: Record<string, number> = { inc: 0.85, can: 0.5, pre: 0.15, mol: 0 };

export function ToothChart3D({
  marks = {},
  selected = [],
  onToggle,
  interactive = false,
  showGrid = false,
  height = 340,
  className = "",
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [tip, setTip] = useState<Tip | null>(null);

  const marksRef = useRef<ToothMarks>(marks);
  const selectedRef = useRef<number[]>(selected);
  const toggleRef = useRef<Props["onToggle"]>(onToggle);
  const interactiveRef = useRef<boolean>(interactive);
  const applyRef = useRef<(() => void) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);

  marksRef.current = marks;
  selectedRef.current = selected;
  toggleRef.current = onToggle;
  interactiveRef.current = interactive;

  useEffect(() => {
    applyRef.current?.();
  }, [marks, selected]);

  useEffect(() => {
    const hostNode = hostRef.current;
    if (!hostNode) return;
    const host: HTMLDivElement = hostNode;
    let disposed = false;
    let teardown = () => {};

    loadThree()
      .then((THREE) => {
        if (disposed) return;
        try {
          teardown = mount(THREE);
          setStatus("ready");
        } catch {
          setStatus("fallback");
        }
      })
      .catch(() => setStatus("fallback"));

    function mount(THREE: any) {
      let renderer: any;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        throw new Error("webgl unavailable");
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      if ("outputEncoding" in renderer && THREE.sRGBEncoding) {
        renderer.outputEncoding = THREE.sRGBEncoding;
      }

      const canvas = renderer.domElement as HTMLCanvasElement;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.touchAction = "pan-y";
      canvas.style.cursor = "grab";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "3D tish sxemasi");
      host.appendChild(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 1, 2000);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xc2ccd6, 0.7));
      const head = new THREE.DirectionalLight(0xffffff, 0.5);
      scene.add(head);
      const key = new THREE.DirectionalLight(0xfff4e6, 0.42);
      key.position.set(70, 120, 150);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xd8e6ff, 0.22);
      rim.position.set(-100, -30, -120);
      scene.add(rim);

      const S = { az: 0.5, el: 0.1, dist: 205, open: 0.34, ty: -6, tz: -4 };

      /* ---- loft: stack of superellipse rings -> smooth shaded mesh ---- */
      function loft(rings: any[], seg: number) {
        const R = rings.length;
        const pos: number[] = [];
        const col: number[] = [];
        const idx: number[] = [];
        const down = rings[R - 1].y < rings[0].y;
        for (let i = 0; i < R; i++) {
          const r = rings[i];
          const n = r.n || 2.3;
          const k = r.k == null ? 1 : r.k;
          for (let j = 0; j < seg; j++) {
            const a = (j / seg) * Math.PI * 2;
            const c = Math.cos(a);
            const s = Math.sin(a);
            pos.push(
              r.cx + r.rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
              r.y,
              r.cz + r.rz * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)
            );
            col.push(k, k, k);
          }
        }
        for (let i = 0; i < R - 1; i++) {
          for (let j = 0; j < seg; j++) {
            const a0 = i * seg + j;
            const b0 = i * seg + ((j + 1) % seg);
            const c0 = (i + 1) * seg + j;
            const d0 = (i + 1) * seg + ((j + 1) % seg);
            if (down) idx.push(a0, b0, c0, b0, d0, c0);
            else idx.push(a0, c0, b0, b0, c0, d0);
          }
        }
        const last = rings[R - 1];
        const ci = pos.length / 3;
        const kk = last.k == null ? 1 : last.k;
        pos.push(last.cx, last.y, last.cz);
        col.push(kk, kk, kk);
        for (let j = 0; j < seg; j++) {
          const p = (R - 1) * seg + j;
          const q = (R - 1) * seg + ((j + 1) % seg);
          if (down) idx.push(p, q, ci);
          else idx.push(p, ci, q);
        }
        const first = rings[0];
        const cf = pos.length / 3;
        const k0 = first.k == null ? 1 : first.k;
        pos.push(first.cx, first.y, first.cz);
        col.push(k0, k0, k0);
        for (let j = 0; j < seg; j++) {
          const p = j;
          const q = (j + 1) % seg;
          if (down) idx.push(p, cf, q);
          else idx.push(p, q, cf);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        return g;
      }

      const cuspGeo = new THREE.SphereGeometry(1, 18, 14);
      {
        const n = cuspGeo.attributes.position.count;
        cuspGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
      }

      function cuspSpecs(kind: string, upper: boolean, n: number): number[][] {
        if (kind === "pre")
          return [
            [0, 0.25, 0.25, 0.24, 0.16, 0.03],
            [0, -0.25, upper ? 0.24 : 0.15, 0.22, upper ? 0.15 : 0.1, upper ? 0 : -0.06],
          ];
        if (kind !== "mol") return [];
        if (!upper && n === 6)
          return [
            [-0.3, 0.26, 0.2, 0.22, 0.15, 0.02],
            [0, 0.3, 0.18, 0.2, 0.15, 0.02],
            [0.3, 0.26, 0.2, 0.22, 0.15, 0.02],
            [-0.2, -0.26, 0.22, 0.22, 0.15, 0.02],
            [0.2, -0.26, 0.22, 0.22, 0.15, 0.02],
          ];
        if (upper && n === 8)
          return [
            [-0.24, 0.24, 0.27, 0.24, 0.14, 0],
            [0.24, 0.24, 0.27, 0.24, 0.14, 0],
            [0, -0.24, 0.3, 0.26, 0.14, 0],
          ];
        return [
          [-0.25, 0.25, 0.26, 0.25, 0.15, 0.02],
          [0.25, 0.25, 0.26, 0.25, 0.15, 0.02],
          [-0.25, -0.25, 0.26, 0.25, 0.15, 0.02],
          [0.25, -0.25, 0.26, 0.25, 0.15, 0.02],
        ];
      }

      const toothList: any[] = [];
      const pickMeshes: any[] = [];
      const labelMap: Record<number, any> = {};
      const labelTextures: any[] = [];

      function buildTooth(upper: boolean, i: number) {
        const set = upper ? DIM.up : DIM.lo;
        const w = set.w[i];
        const D = set.d[i];
        const h = set.h[i];
        const n = i + 1;
        const kind = n <= 2 ? "inc" : n === 3 ? "can" : n <= 5 ? "pre" : "mol";
        const c0 = HP - h;
        const prof = PROF[kind];
        const lab = LAB[kind];
        const f = 0.94;
        const rings: any[] = [];
        const ps = prof[0];
        const mk = (y: number, ws: number, ds: number, k: number) => {
          rings.push({
            y,
            rx: (ws * w * f) / 2,
            rz: (ds * D * f) / 2,
            cx: 0,
            cz: (lab * (1 - ds) * D * f) / 2,
            n: kind === "mol" ? 2.7 : 2.3,
            k,
          });
        };
        mk(-3.2, ps[1], ps[2], ps[3]);
        prof.forEach((p) => {
          const y = c0 + p[0] * h;
          if (y > rings[rings.length - 1].y + 0.05) mk(y, p[1], p[2], p[3]);
        });
        const mat = new THREE.MeshPhongMaterial({
          color: 0xf1ecdc,
          shininess: 70,
          specular: 0x5a5a5a,
          vertexColors: true,
        });
        const body = new THREE.Group();
        const crown = new THREE.Mesh(loft(rings, 30), mat);
        body.add(crown);
        cuspSpecs(kind, upper, n).forEach((c) => {
          const m = new THREE.Mesh(cuspGeo, mat);
          m.scale.set(c[2] * w, c[4] * h, c[3] * D);
          m.position.set(c[0] * w, c0 + h * (0.86 + c[5]), c[1] * D);
          body.add(m);
        });
        body.rotation.z = upper ? Math.PI : 0;
        return { body, mat, w, D, cusp: cuspGeo };
      }

      /* arch centre line: quarter ellipse at the front, straight at the back */
      function makeArch(A: number, B: number, straight: number, flare: number) {
        const pts: any[] = [];
        let s = 0;
        let prev: any = null;
        const N = 400;
        for (let i = 0; i <= N; i++) {
          const th = (i / N) * (Math.PI / 2);
          const x = A * Math.sin(th);
          const z = B * Math.cos(th);
          const nx = Math.sin(th) / A;
          const nz = Math.cos(th) / B;
          const l = Math.hypot(nx, nz);
          if (prev) s += Math.hypot(x - prev.x, z - prev.z);
          prev = { x, z };
          pts.push({ x, z, nx: nx / l, nz: nz / l, s });
        }
        const M = Math.ceil(straight / 0.5);
        const nl = Math.hypot(1, flare);
        for (let i = 1; i <= M; i++) {
          const dz = i * 0.5;
          const x = A + flare * dz;
          const z = -dz;
          s += Math.hypot(x - prev.x, z - prev.z);
          prev = { x, z };
          pts.push({ x, z, nx: 1 / nl, nz: flare / nl, s });
        }
        return pts;
      }

      function atArc(pts: any[], s: number) {
        let lo = 0;
        let hi = pts.length - 1;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          if (pts[m].s < s) lo = m + 1;
          else hi = m;
        }
        return pts[lo];
      }

      const jaws = { upper: new THREE.Group(), lower: new THREE.Group() };
      const lowerPivot = new THREE.Group();
      lowerPivot.position.set(0, 0, -44);
      jaws.lower.position.set(0, 0, 44);
      lowerPivot.add(jaws.lower);
      scene.add(jaws.upper);
      scene.add(lowerPivot);

      function makeLabel(fdi: number) {
        const cv = document.createElement("canvas");
        cv.width = 192;
        cv.height = 128;
        const tex = new THREE.CanvasTexture(cv);
        tex.minFilter = THREE.LinearFilter;
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthTest: false,
            depthWrite: false,
          })
        );
        sp.scale.set(7.6, 5.07, 1);
        sp.renderOrder = 30;
        sp.userData = { fdi, cv, tex };
        labelTextures.push(tex);
        return sp;
      }

      function drawLabel(fdi: number) {
        const sp = labelMap[fdi];
        if (!sp) return;
        const c = sp.userData.cv.getContext("2d");
        if (!c) return;
        const tone = toothTone(marksRef.current[fdi] || []);
        const on = selectedRef.current.includes(fdi);
        c.clearRect(0, 0, 192, 128);
        const x = 12;
        const y = 20;
        const w = 168;
        const h = 88;
        const r = 22;
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
        c.globalAlpha = 0.97;
        c.fillStyle = on ? "#0c6a72" : "#ffffff";
        c.fill();
        c.globalAlpha = 1;
        c.lineWidth = on ? 6 : 4;
        c.strokeStyle = on ? "#0c6a72" : tone || "#b9b3a5";
        c.stroke();
        c.fillStyle = on ? "#ffffff" : "#213b3f";
        c.font = "600 48px 'IBM Plex Mono', ui-monospace, monospace";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(String(fdi), x + w / 2, y + h / 2 + 1);
        sp.userData.tex.needsUpdate = true;
      }

      function buildJaw(upper: boolean) {
        const jaw = upper ? jaws.upper : jaws.lower;
        const set = upper ? DIM.up : DIM.lo;
        const plane = upper ? HP + GAP : -(HP + GAP);
        const A = upper ? 27.5 : 24.5;
        const B = upper ? 23 : 20.5;
        const straight = 36;
        const flare = upper ? 0.09 : 0.04;
        const arch = makeArch(A, B, straight, flare);
        const centers: number[] = [];
        let off = 0;
        for (let i = 0; i < 8; i++) {
          centers[i] = off + set.w[i] / 2;
          off += set.w[i];
        }
        const total = off;

        [-1, 1].forEach((side) => {
          for (let i = 0; i < 8; i++) {
            const q = upper ? (side > 0 ? 2 : 1) : side > 0 ? 3 : 4;
            const fdi = q * 10 + i + 1;
            const pt = atArc(arch, centers[i]);
            const nx = side * pt.nx;
            const nz = pt.nz;
            const tooth = buildTooth(upper, i);
            const group = new THREE.Group();
            group.add(tooth.body);
            group.position.set(side * pt.x, plane, pt.z);
            group.rotation.y = Math.atan2(nx, nz);
            group.userData.fdi = fdi;
            jaw.add(group);

            pickMeshes.push(tooth.body);

            const label = makeLabel(fdi);
            const out = set.d[i] / 2 + 3.2 + 0.03 * centers[i];
            label.position.set(
              side * pt.x + nx * out,
              plane + (upper ? 1 : -1) * (GUM_H + 5),
              pt.z + nz * out
            );
            label.userData.fdi = fdi;
            label.userData.nrm = new THREE.Vector3(nx, 0, nz);
            jaw.add(label);
            labelMap[fdi] = label;
            pickMeshes.push(label);

            toothList.push({ fdi, mat: tooth.mat, body: tooth.body, label });
          }
        });

        /* gum block: horseshoe band around the arch */
        const Lg = total + 3;
        const outer: number[][] = [];
        const inner: number[][] = [];
        const sample: any[] = [];
        for (let k = 0; k < arch.length; k += 3) {
          if (arch[k].s > Lg) break;
          sample.push(arch[k]);
        }
        const path: any[] = [];
        for (let k = sample.length - 1; k >= 1; k--) {
          path.push({
            x: -sample[k].x,
            z: sample[k].z,
            nx: -sample[k].nx,
            nz: sample[k].nz,
            s: sample[k].s,
          });
        }
        sample.forEach((p) => path.push(p));
        path.forEach((p) => {
          const wo = 4.6 + 0.05 * p.s;
          const wi = 5.2 + 0.09 * p.s;
          outer.push([p.x + p.nx * wo, -(p.z + p.nz * wo)]);
          inner.push([p.x - p.nx * wi, -(p.z - p.nz * wi)]);
        });
        const shape = new THREE.Shape();
        shape.moveTo(outer[0][0], outer[0][1]);
        for (let k = 1; k < outer.length; k++) shape.lineTo(outer[k][0], outer[k][1]);
        for (let k = inner.length - 1; k >= 0; k--) shape.lineTo(inner[k][0], inner[k][1]);
        shape.closePath();
        const Hg = GUM_H;
        const bt = 1.2;
        const gg = new THREE.ExtrudeGeometry(shape, {
          depth: Hg,
          bevelEnabled: true,
          bevelThickness: bt,
          bevelSize: bt,
          bevelSegments: 4,
          steps: 1,
          curveSegments: 1,
        });
        gg.rotateX(-Math.PI / 2);
        gg.translate(0, upper ? bt : -(Hg + bt), 0);
        const gm = new THREE.MeshPhongMaterial({
          color: GUM_COLOR,
          shininess: 22,
          specular: 0x222222,
          side: THREE.DoubleSide,
        });
        const gum = new THREE.Mesh(gg, gm);
        gum.position.y = plane;
        gum.renderOrder = 2;
        jaw.add(gum);
      }
      buildJaw(true);
      buildJaw(false);


      let hoverTooth = 0;

      let frame = 0;
      const render = () => {
        frame = 0;
        renderer.render(scene, camera);
      };
      const invalidate = () => {
        if (!frame) frame = requestAnimationFrame(render);
      };

      function apply() {
        for (const tooth of toothList) {
          const tone = toothTone(marksRef.current[tooth.fdi] || []);
          const mat = tooth.mat;
          if (tone) {
            mat.color.copy(new THREE.Color(HEALTHY)).lerp(new THREE.Color(tone), 0.9);
          } else {
            mat.color.set(HEALTHY);
          }
          const on = selectedRef.current.includes(tooth.fdi);
          mat.emissive.set(0x0c6a72);
          mat.emissiveIntensity = on ? 0.55 : hoverTooth === tooth.fdi ? 0.28 : 0;
          tooth.body.scale.setScalar(on ? 1.06 : 1);
          drawLabel(tooth.fdi);
        }
        invalidate();
      }
      applyRef.current = apply;

      let labelsOn = true;
      const camDir = new THREE.Vector3();
      function updateLabels() {
        camDir
          .set(Math.sin(S.az) * Math.cos(S.el), 0, Math.cos(S.az) * Math.cos(S.el));
        const flat = camDir.length();
        if (flat > 1e-6) camDir.divideScalar(flat);
        for (const fdi of Object.keys(labelMap)) {
          const sp = labelMap[Number(fdi)];
          const facing = sp.userData.nrm ? camDir.dot(sp.userData.nrm) > 0.32 : true;
          sp.visible = labelsOn && facing;
        }
      }

      function orient() {
        const fit = Math.max(0.72, Math.min(1.25, 1.62 / camera.aspect));
        const d = S.dist * fit;
        camera.position.set(
          d * Math.sin(S.az) * Math.cos(S.el),
          S.ty + d * Math.sin(S.el),
          S.tz + d * Math.cos(S.az) * Math.cos(S.el)
        );
        camera.up.set(0, 1, 0);
        camera.lookAt(0, S.ty, S.tz);
        head.position.copy(camera.position);
        lowerPivot.rotation.x = S.open;
        updateLabels();
        invalidate();
      }

      resetRef.current = () => {
        S.az = 0.5;
        S.el = 0.1;
        S.dist = 205;
        S.open = 0.34;
        S.ty = -6;
        S.tz = -4;
        orient();
      };

      function resize() {
        const w = host.clientWidth || 320;
        const h = host.clientHeight || 320;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        labelsOn = w >= 460;
        orient();
      }
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();

      apply();
      orient();
      invalidate();

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const allMeshes: any[] = [];
      pickMeshes.forEach((obj) => {
        if (obj.isSprite) allMeshes.push(obj);
        else obj.traverse((child: any) => {
          if (child.isMesh) allMeshes.push(child);
        });
      });

      function pick(clientX: number, clientY: number) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(allMeshes, false);
        for (const hit of hits) {
          let obj: any = hit.object;
          let tooth = obj.userData?.fdi as number | undefined;
          while (!tooth && obj.parent) {
            obj = obj.parent;
            tooth = obj.userData?.fdi;
          }
          if (tooth) {
            return {
              tooth,
              x: clientX - rect.left,
              y: clientY - rect.top,
              width: rect.width,
            };
          }
        }
        return null;
      }

      const ptrs: Record<number, { x: number; y: number }> = {};
      let moved = 0;
      let pinch = 0;

      function onDown(e: PointerEvent) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* optional */
        }
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        moved = 0;
        if (Object.keys(ptrs).length === 2) {
          const k = Object.values(ptrs);
          pinch = Math.hypot(k[0].x - k[1].x, k[0].y - k[1].y);
        }
        canvas.style.cursor = "grabbing";
      }

      function onMove(e: PointerEvent) {
        const p = ptrs[e.pointerId];
        if (!p) {
          const hit = pick(e.clientX, e.clientY);
          const next = hit ? hit.tooth : 0;
          if (next !== hoverTooth) {
            hoverTooth = next;
            apply();
            invalidate();
          }
          setTip(hit && next ? hit : null);
          canvas.style.cursor = next
            ? interactiveRef.current
              ? "pointer"
              : "grab"
            : "grab";
          return;
        }
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        p.x = e.clientX;
        p.y = e.clientY;
        if (Object.keys(ptrs).length === 1) {
          moved += Math.abs(dx) + Math.abs(dy);
          S.az -= dx * 0.008;
          S.el = Math.max(-1.5, Math.min(1.5, S.el + dy * 0.008));
          orient();
          invalidate();
        } else if (Object.keys(ptrs).length === 2) {
          const k = Object.values(ptrs);
          const nd = Math.hypot(k[0].x - k[1].x, k[0].y - k[1].y);
          if (pinch > 0 && nd > 0) {
            S.dist = Math.max(70, Math.min(280, (S.dist * pinch) / nd));
            orient();
            invalidate();
          }
          pinch = nd;
          moved += 10;
        }
      }

      function onUp(e: PointerEvent) {
        const had = !!ptrs[e.pointerId];
        delete ptrs[e.pointerId];
        canvas.style.cursor = "grab";
        if (had && Object.keys(ptrs).length === 0 && moved < 7 && e.type === "pointerup") {
          const hit = pick(e.clientX, e.clientY);
          if (hit && interactiveRef.current) toggleRef.current?.(hit.tooth);
        }
        if (Object.keys(ptrs).length < 2) pinch = 0;
      }

      function onLeave(e: PointerEvent) {
        if (e.pointerType !== "mouse") return;
        if (hoverTooth) {
          hoverTooth = 0;
          apply();
          invalidate();
        }
        setTip(null);
      }

      function onWheel(e: WheelEvent) {
        e.preventDefault();
        S.dist = Math.max(70, Math.min(280, S.dist * Math.exp(e.deltaY * 0.0012)));
        orient();
        invalidate();
        setTip(null);
      }

      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("wheel", onWheel, { passive: false });

      return () => {
        observer.disconnect();
        if (frame) cancelAnimationFrame(frame);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        canvas.removeEventListener("pointerleave", onLeave);
        canvas.removeEventListener("wheel", onWheel);
        applyRef.current = null;
        resetRef.current = null;
        labelTextures.forEach((tex) => tex.dispose?.());
        scene.traverse((obj: any) => {
          if (obj.geometry && obj.geometry !== cuspGeo && obj.geometry.dispose) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose?.());
            else obj.material.dispose?.();
          }
        });
        cuspGeo.dispose?.();
        renderer.dispose();
        if (canvas.parentNode === host) host.removeChild(canvas);
      };
    }

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  const tipProcs = tip ? marks[tip.tooth] || [] : [];

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-line bg-surface-2"
        style={{ height }}
      >
        <div ref={hostRef} className={status === "fallback" ? "hidden" : "absolute inset-0"} />
        {status === "loading" ? (
          <div className="absolute inset-0 animate-pulse bg-surface-2" />
        ) : null}
        {status === "fallback" ? (
          <div className="absolute inset-0 overflow-auto p-3">
            <p className="mb-2 text-center text-[11px] font-semibold text-muted">
              3D ko&apos;rinish bu qurilmada ochilmadi — 2D tish sxemasi
            </p>
            <ToothNumberGrid
              marks={marks}
              selected={selected}
              onToggle={interactive ? onToggle : undefined}
            />
          </div>
        ) : null}

        {tip && status === "ready" ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[220px] -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 shadow-lg"
            style={{
              left: Math.min(Math.max(tip.x, 110), Math.max(tip.width - 110, 110)),
              top: Math.max(tip.y - 10, 8),
            }}
          >
            <p className="text-xs font-bold text-ink">{toothLabel(tip.tooth)}</p>
            {tipProcs.length ? (
              <ul className="mt-1 space-y-0.5">
                {tipProcs.map((key) => (
                  <li key={key} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                    <i
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: PROCEDURE_MAP[key]?.color || "#587076" }}
                    />
                    {procedureLabel(key)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-[11px] text-muted">Sog&apos;lom</p>
            )}
          </div>
        ) : null}

        {status === "ready" ? (
          <>
            <button
              type="button"
              onClick={() => resetRef.current?.()}
              className="absolute right-2.5 top-2.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted backdrop-blur transition hover:text-accent"
              title="Ko'rinishni tiklash"
            >
              ↺ 3D
            </button>
          </>
        ) : null}
      </div>

      {showGrid && status === "ready" ? (
        <div className="mt-3">
          <ToothNumberGrid marks={marks} selected={selected} onToggle={onToggle} />
        </div>
      ) : null}
    </div>
  );
}

export function ToothNumberGrid({
  marks = {},
  selected = [],
  onToggle,
}: {
  marks?: ToothMarks;
  selected?: number[];
  onToggle?: (tooth: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      {QUADRANTS.map((quadrant) => (
        <div key={quadrant.key} className="flex items-center gap-1.5">
          <span className="hidden w-[74px] shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted sm:block">
            {quadrant.short}
          </span>
          <div className="flex min-w-0 flex-1 gap-1">
            {quadrant.teeth.map((fdi) => {
              const tone = toothTone(marks[fdi] || []);
              const isSelected = selected.includes(fdi);
              return (
                <button
                  key={fdi}
                  type="button"
                  onClick={() => onToggle?.(fdi)}
                  disabled={!onToggle}
                  title={toothLabel(fdi)}
                  aria-pressed={isSelected}
                  className={`h-7 min-w-0 flex-1 rounded-md border text-[11px] font-bold transition ${
                    isSelected
                      ? "border-accent text-white ring-2 ring-accent/30"
                      : tone
                        ? "border-transparent text-white"
                        : "border-line bg-surface text-ink-soft hover:border-accent/50"
                  }`}
                  style={
                    isSelected
                      ? { background: tone || "#0c6a72" }
                      : tone
                        ? { background: tone }
                        : undefined
                  }
                >
                  {fdi}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
