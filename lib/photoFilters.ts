// Photo adjustment + filter-preset definitions shared by the capture flow's
// editor. Everything here is expressed with CSS `filter` functions so the live
// preview (an <img> with a `filter` style) and the exported canvas (which sets
// `ctx.filter` to the same string) render identically — the only effect that
// can't be expressed as a filter function, the vignette, is drawn separately on
// both sides.

export type Adjustments = {
  brightness: number; // -50..50  → brightness(100+v %)
  contrast: number; // -50..50  → contrast(100+v %)
  saturation: number; // -100..100 → saturate(100+v %)
  warmth: number; // 0..100    → sepia(v %)
  hue: number; // -180..180 → hue-rotate(v deg)
  grayscale: number; // 0..100    → grayscale(v %)
  blur: number; // 0..8      → blur(v px)
  vignette: number; // 0..100    → radial darkening overlay (drawn separately)
};

export const NEUTRAL_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  hue: 0,
  grayscale: 0,
  blur: 0,
  vignette: 0,
};

export function isNeutral(a: Adjustments): boolean {
  return (
    a.brightness === 0 &&
    a.contrast === 0 &&
    a.saturation === 0 &&
    a.warmth === 0 &&
    a.hue === 0 &&
    a.grayscale === 0 &&
    a.blur === 0 &&
    a.vignette === 0
  );
}

/** Build the CSS `filter` value for the colour adjustments (vignette excluded). */
export function cssFilterString(a: Adjustments): string {
  const parts = [
    `brightness(${100 + a.brightness}%)`,
    `contrast(${100 + a.contrast}%)`,
    `saturate(${100 + a.saturation}%)`,
  ];
  if (a.warmth) parts.push(`sepia(${a.warmth}%)`);
  if (a.hue) parts.push(`hue-rotate(${a.hue}deg)`);
  if (a.grayscale) parts.push(`grayscale(${a.grayscale}%)`);
  if (a.blur) parts.push(`blur(${a.blur}px)`);
  return parts.join(" ");
}

/** Paint the vignette darkening on a square canvas context. */
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  size: number,
  strength: number,
): void {
  if (strength <= 0) return;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.32,
    size / 2,
    size / 2,
    size * 0.72,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${(strength / 100) * 0.62})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
}

/** CSS background for the live-preview vignette overlay (mirrors drawVignette). */
export function vignetteOverlayStyle(strength: number): string {
  const alpha = (strength / 100) * 0.62;
  return `radial-gradient(circle at center, rgba(0,0,0,0) 44%, rgba(0,0,0,${alpha}) 100%)`;
}

// ── Adjustment slider metadata (drives the "Adjust" tab) ──────────────────────

// `key` doubles as the translation key under `capture.editor.adjust.*`.
export type AdjustmentKey = keyof Adjustments;

export const ADJUSTMENT_CONTROLS: {
  key: AdjustmentKey;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "brightness", min: -50, max: 50, step: 1 },
  { key: "contrast", min: -50, max: 50, step: 1 },
  { key: "saturation", min: -100, max: 100, step: 1 },
  { key: "warmth", min: 0, max: 100, step: 1 },
  { key: "hue", min: -180, max: 180, step: 1 },
  { key: "grayscale", min: 0, max: 100, step: 1 },
  { key: "blur", min: 0, max: 8, step: 0.5 },
  { key: "vignette", min: 0, max: 100, step: 1 },
];

// ── Mood presets ──────────────────────────────────────────────────────────────

// `id` doubles as the translation key under `capture.editor.presets.<id>.{name,mood}`.
export type FilterPreset = {
  id: string;
  adjustments: Adjustments;
};

function preset(over: Partial<Adjustments>): Adjustments {
  return { ...NEUTRAL_ADJUSTMENTS, ...over };
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "natural", adjustments: NEUTRAL_ADJUSTMENTS },
  {
    id: "golden-hour",
    adjustments: preset({ brightness: 8, contrast: 6, saturation: 18, warmth: 28, hue: -6, vignette: 12 }),
  },
  {
    id: "alley-noir",
    adjustments: preset({ brightness: -2, contrast: 28, grayscale: 100, vignette: 36 }),
  },
  {
    id: "sunlit-sill",
    adjustments: preset({ brightness: 14, contrast: -6, saturation: 6, warmth: 18 }),
  },
  {
    id: "velvet-paw",
    adjustments: preset({ brightness: -2, contrast: 14, saturation: 26, warmth: 8, vignette: 18 }),
  },
  {
    id: "foggy-morning",
    adjustments: preset({ brightness: 6, contrast: -12, saturation: -30, hue: 8, blur: 0.6 }),
  },
  {
    id: "catnip-dream",
    adjustments: preset({ brightness: 4, contrast: 8, saturation: 42, hue: -18, vignette: 10 }),
  },
  {
    id: "vintage-tabby",
    adjustments: preset({ brightness: 2, contrast: -6, saturation: -10, warmth: 55, hue: -4, vignette: 30 }),
  },
  {
    id: "moonlit-prowl",
    adjustments: preset({ brightness: -8, contrast: 20, saturation: -10, hue: 170, vignette: 32 }),
  },
  {
    id: "cream-and-sugar",
    adjustments: preset({ brightness: 12, contrast: -4, saturation: -8, warmth: 14 }),
  },
];
