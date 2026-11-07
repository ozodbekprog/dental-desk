"use client";

import { useState } from "react";

const LAYERS = [
  {
    id: "enamel",
    label: "Emal",
    dot: "#eafaf7",
    hint: "Tishning eng qattiq qatlami — 96% mineral, kariesga birinchi to'siq.",
  },
  {
    id: "dentin",
    label: "Dentin",
    dot: "#f0d8ae",
    hint: "Emal ostidagi elastik qatlam; sezuvchanlik shu yerdan nervga uzatiladi.",
  },
  {
    id: "pulp",
    label: "Pulpa",
    dot: "#e88b98",
    hint: "Nerv, qon tomirlari va biriktiruvchi to'qima — tishning ichki qismi.",
  },
  {
    id: "canal",
    label: "Kanal",
    dot: "#7fe0e3",
    hint: "Ildiz ichidagi kanal; davolashda tozalanadi va germetik yopiladi.",
  },
] as const;

type LayerId = (typeof LAYERS)[number]["id"];

const PATH = {
  outer:
    "M 118 232 C 115 176 128 130 156 108 C 176 92 198 84 218 88 C 236 92 254 104 268 116 C 280 100 300 90 320 88 C 340 86 362 92 382 108 C 410 130 424 176 421 232 C 419 270 410 300 397 322 C 390 334 388 348 392 364 C 400 400 408 442 404 484 C 400 532 382 568 358 578 C 336 588 316 564 305 524 C 297 492 291 462 286 442 C 281 462 275 492 267 524 C 256 564 236 588 214 578 C 190 568 172 532 168 484 C 164 442 172 400 180 364 C 184 348 182 334 175 322 C 162 300 120 270 118 232 Z",
  crown:
    "M 180 364 C 184 348 182 334 175 322 C 162 300 120 270 118 232 C 115 176 128 130 156 108 C 176 92 198 84 218 88 C 236 92 254 104 268 116 C 280 100 300 90 320 88 C 340 86 362 92 382 108 C 410 130 424 176 421 232 C 419 270 410 300 397 322 C 390 334 388 348 392 364",
  crownClosed:
    "M 180 364 C 184 348 182 334 175 322 C 162 300 120 270 118 232 C 115 176 128 130 156 108 C 176 92 198 84 218 88 C 236 92 254 104 268 116 C 280 100 300 90 320 88 C 340 86 362 92 382 108 C 410 130 424 176 421 232 C 419 270 410 300 397 322 C 390 334 388 348 392 364 Z",
  dentinCrown:
    "M 142 232 C 140 184 150 146 173 127 C 190 113 208 107 224 110 C 240 113 256 124 270 138 C 283 123 300 113 318 111 C 336 109 354 115 370 129 C 393 147 404 184 402 232 C 400 264 392 290 381 308 C 374 322 372 340 376 364 L 194 364 C 198 340 196 322 189 308 C 178 290 144 264 142 232 Z",
  dentin:
    "M 142 232 C 140 184 150 146 173 127 C 190 113 208 107 224 110 C 240 113 256 124 270 138 C 283 123 300 113 318 111 C 336 109 354 115 370 129 C 393 147 404 184 402 232 C 400 264 392 290 381 308 C 374 322 372 336 376 352 C 384 386 390 426 386 468 C 382 512 366 546 346 556 C 328 564 312 542 302 506 C 294 476 289 450 285 434 C 281 450 276 476 268 506 C 258 542 242 564 224 556 C 204 546 188 512 184 468 C 180 426 186 386 194 352 C 198 336 196 322 189 308 C 178 290 144 264 142 232 Z",
  pulp:
    "M 285 198 C 294 186 302 174 311 167 C 322 159 333 169 337 184 C 344 206 348 230 345 252 C 342 276 335 296 328 312 C 324 322 323 332 325 342 C 329 362 333 386 336 410 C 341 448 345 484 351 516 C 354 536 349 546 341 538 C 332 528 325 508 320 486 C 313 454 306 424 298 402 C 293 388 288 380 285 378 C 282 380 277 388 272 402 C 264 424 257 454 250 486 C 245 508 238 528 229 538 C 221 546 216 536 219 516 C 225 484 229 448 234 410 C 237 386 241 362 245 342 C 247 332 246 322 242 312 C 235 296 228 276 225 252 C 222 230 226 206 233 184 C 237 169 248 159 259 167 C 268 174 276 186 285 198 Z",
  canalLeft: "M 250 382 C 244 422 236 476 230 522",
  canalRight: "M 320 382 C 326 422 334 476 341 522",
};

export function ToothAnatomy({ className = "" }: { className?: string }) {
  const [active, setActive] = useState<LayerId>("enamel");
  const layer = LAYERS.find((item) => item.id === active) ?? LAYERS[0];
  const dim = (id: LayerId) => (active === id ? 1 : 0);

  return (
    <div
      className={`relative flex h-[510px] flex-col overflow-hidden rounded-[30px] border border-[#1b4348] bg-[radial-gradient(ellipse_at_50%_40%,#123a3f_0%,#0a262a_46%,#061619_100%)] shadow-[0_46px_110px_-50px_rgba(3,26,29,0.95)] sm:h-[600px] ${className}`}
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

      <div className="relative z-10 flex items-start justify-between gap-3 px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7fe0e3] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7fe0e3]" />
            </span>
            Anatomiya
          </span>
          <p className="dd-display mt-3 text-lg font-bold text-white">Molar kesimi</p>
          <p className="mt-0.5 text-[11px] text-white/50">Yuqori jag&apos; · 2 ildiz · 4 qatlam</p>
        </div>
        <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-semibold text-white/60">
          Interaktiv chizma
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <svg
          viewBox="104 62 352 528"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ta-enamel" x1="0.18" y1="0" x2="0.82" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.42" stopColor="#f0fbf9" />
              <stop offset="0.72" stopColor="#dcf0ed" />
              <stop offset="1" stopColor="#b7d8d5" />
            </linearGradient>
            <linearGradient id="ta-dentin" x1="0.16" y1="0" x2="0.86" y2="1">
              <stop offset="0" stopColor="#f8ebd3" />
              <stop offset="0.5" stopColor="#efdab9" />
              <stop offset="1" stopColor="#d9bc94" />
            </linearGradient>
            <linearGradient id="ta-cement" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#e9dcc8" />
              <stop offset="1" stopColor="#c2ac8d" />
            </linearGradient>
            <linearGradient id="ta-pulp" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0" stopColor="#f0a3ad" />
              <stop offset="0.45" stopColor="#d36e82" />
              <stop offset="1" stopColor="#a63d53" />
            </linearGradient>
            <linearGradient id="ta-rim" x1="0.1" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="0.45" stopColor="#c9f4ef" stopOpacity="0.5" />
              <stop offset="1" stopColor="#8fd9d6" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="ta-halo" cx="0.5" cy="0.46" r="0.5">
              <stop offset="0" stopColor="#2c8d92" stopOpacity="0.5" />
              <stop offset="0.55" stopColor="#1b666b" stopOpacity="0.22" />
              <stop offset="1" stopColor="#0a262a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ta-ground" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#6be0e1" stopOpacity="0.4" />
              <stop offset="1" stopColor="#6be0e1" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ta-sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <filter id="ta-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="ta-soft" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="12" />
            </filter>
            <filter id="ta-blur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" />
            </filter>

            <clipPath id="ta-clip">
              <path d={PATH.outer} />
            </clipPath>
          </defs>

          <ellipse cx="281" cy="330" rx="196" ry="238" fill="url(#ta-halo)" />
          <g fill="none" stroke="#4d9599" strokeOpacity="0.28">
            <circle cx="281" cy="330" r="176" strokeDasharray="2 9" />
            <circle cx="281" cy="330" r="214" strokeDasharray="1 14" strokeOpacity="0.18" />
          </g>
          <g stroke="#7fe0e3" strokeOpacity="0.35" strokeWidth="1.2">
            <path d="M 281 86 v 12 M 281 566 v 10 M 118 330 h 12 M 446 330 h 12" />
          </g>

          <ellipse cx="281" cy="584" rx="112" ry="15" fill="url(#ta-ground)" filter="url(#ta-blur)" />

          <path d={PATH.outer} fill="#042024" opacity="0.5" transform="translate(10 16)" filter="url(#ta-soft)" />

          <g>
            <path
              d={PATH.outer}
              fill="url(#ta-enamel)"
              className="cursor-pointer"
              onClick={() => setActive("enamel")}
              style={{ transition: "opacity .35s" }}
            />
            <g clipPath="url(#ta-clip)">
              <rect x="100" y="356" width="360" height="240" fill="url(#ta-cement)" opacity="0.72" />
              <path
                d="M 132 250 C 150 170 200 120 268 118 C 330 118 386 160 408 240 L 408 310 C 380 250 330 220 281 220 C 232 220 176 250 150 312 Z"
                fill="url(#ta-sheen)"
                opacity="0.3"
                filter="url(#ta-blur)"
              />
              <g stroke="#ffffff" strokeOpacity="0.42" strokeWidth="1.1" fill="none">
                <path d="M 176 150 C 196 200 204 250 196 300" />
                <path d="M 202 122 C 224 174 232 232 222 286" />
                <path d="M 388 152 C 366 202 358 252 366 300" />
                <path d="M 362 124 C 340 176 332 232 342 286" />
              </g>
              <ellipse
                cx="376"
                cy="430"
                rx="42"
                ry="120"
                fill="#8f6c48"
                opacity="0.2"
                filter="url(#ta-blur)"
              />
            </g>
            <path
              d={PATH.outer}
              fill="none"
              stroke="url(#ta-rim)"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path
              d={PATH.outer}
              fill="none"
              stroke="#073236"
              strokeOpacity="0.3"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />

            <path
              d={PATH.dentin}
              fill="url(#ta-dentin)"
              className="cursor-pointer"
              onClick={() => setActive("dentin")}
              style={{ transition: "opacity .35s" }}
            />
            <path
              d={PATH.dentin}
              fill="none"
              stroke="#a9865b"
              strokeOpacity="0.45"
              strokeWidth="1.2"
            />
            <g stroke="#b08c5d" strokeOpacity="0.22" fill="none">
              <path d="M 206 392 C 214 448 222 502 228 540" />
              <path d="M 354 392 C 346 448 338 502 334 540" />
              <path d="M 230 370 C 226 404 222 432 218 456" />
            </g>
            <g clipPath="url(#ta-clip)">
              <ellipse
                cx="220"
                cy="220"
                rx="58"
                ry="88"
                fill="#ffffff"
                opacity="0.3"
                filter="url(#ta-blur)"
                transform="rotate(-18 220 220)"
              />
            </g>

            <path
              d={PATH.pulp}
              fill="url(#ta-pulp)"
              className="cursor-pointer"
              onClick={() => setActive("pulp")}
              style={{ transition: "opacity .35s" }}
              filter="url(#ta-glow)"
            />
            <path
              d={PATH.pulp}
              fill="none"
              stroke="#8e3346"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
            <path
              d="M 285 206 C 276 236 278 280 287 316 C 292 338 295 360 296 380"
              fill="none"
              stroke="#ffd4d9"
              strokeOpacity="0.35"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <g
              className="pointer-events-none"
              style={{ opacity: dim("enamel"), transition: "opacity .35s" }}
            >
              <path
                d={`${PATH.crownClosed} ${PATH.dentinCrown}`}
                fillRule="evenodd"
                fill="#7fe0e3"
                fillOpacity="0.2"
              />
              <path
                d={PATH.crown}
                fill="none"
                stroke="#a9f2f2"
                strokeWidth="1.6"
                strokeOpacity="0.75"
                strokeLinejoin="round"
              />
            </g>
            <g
              className="pointer-events-none"
              style={{ opacity: dim("dentin"), transition: "opacity .35s" }}
            >
              <path
                d={PATH.dentin}
                fill="#7fe0e3"
                fillOpacity="0.09"
                stroke="#a9f2f2"
                strokeWidth="1.4"
                strokeOpacity="0.6"
                strokeLinejoin="round"
              />
            </g>
            <g
              className="pointer-events-none"
              style={{ opacity: dim("pulp"), transition: "opacity .35s" }}
            >
              <path d={PATH.pulp} fill="#ffd7dd" fillOpacity="0.26" filter="url(#ta-glow)" />
            </g>
            <g
              className="pointer-events-none"
              style={{ opacity: dim("canal"), transition: "opacity .35s" }}
              fill="none"
              stroke="#7fe0e3"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="1 6"
              filter="url(#ta-glow)"
            >
              <path d={PATH.canalLeft} />
              <path d={PATH.canalRight} />
            </g>
            <g
              className="pointer-events-none"
              style={{ opacity: dim("canal"), transition: "opacity .35s" }}
              fill="#baf7f7"
              filter="url(#ta-glow)"
            >
              <circle cx="230" cy="522" r="3" />
              <circle cx="341" cy="522" r="3" />
            </g>
          </g>

          <g fill="#bff5f4" opacity="0.7">
            <circle cx="138" cy="150" r="1.6" />
            <circle cx="428" cy="268" r="1.4" />
            <circle cx="416" cy="470" r="1.8" />
            <circle cx="154" cy="420" r="1.3" />
          </g>
        </svg>
      </div>

      <div className="relative z-10 border-t border-white/10 bg-[#061619]/70 px-4 pb-4 pt-3 backdrop-blur-sm sm:px-5">
        <div className="flex items-center gap-1 sm:gap-1.5" role="group" aria-label="Tish qatlamlari">
          {LAYERS.map((item) => {
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item.id)}
                aria-pressed={selected}
                className={`flex flex-1 items-center justify-center gap-1 rounded-full border px-1 py-2 text-[10px] font-semibold transition sm:gap-1.5 sm:px-2 sm:text-[11px] ${
                  selected
                    ? "border-[#7fe0e3]/60 bg-[#7fe0e3]/12 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/85"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full transition"
                  style={{
                    backgroundColor: item.dot,
                    boxShadow: selected ? `0 0 10px ${item.dot}` : "none",
                  }}
                />
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 min-h-[30px] text-[11px] leading-[1.45] text-white/50">
          <span className="font-semibold text-white/80">{layer.label}.</span> {layer.hint}
        </p>
      </div>
    </div>
  );
}
