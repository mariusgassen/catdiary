"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  Check,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  Loader2,
  Sparkles,
  SlidersHorizontal,
  Crop,
} from "lucide-react";
import {
  ADJUSTMENT_CONTROLS,
  FILTER_PRESETS,
  NEUTRAL_ADJUSTMENTS,
  cssFilterString,
  drawVignette,
  isNeutral,
  vignetteOverlayStyle,
  type Adjustments,
} from "@/lib/photoFilters";

type Shot = { file: File; previewUrl: string };

type Props = {
  shot: Shot;
  onConfirm: (file: File, previewUrl: string) => void;
  onCancel: () => void;
};

type Tab = "filters" | "adjust" | "crop";

type Point = { x: number; y: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const OUTPUT = 1200;

export function PhotoEditor({ shot, onConfirm, onCancel }: Props) {
  const t = useTranslations("capture.editor");
  const containerRef = useRef<HTMLDivElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const [tab, setTab] = useState<Tab>("filters");
  const [adjustments, setAdjustments] = useState<Adjustments>(NEUTRAL_ADJUSTMENTS);
  const [activePreset, setActivePreset] = useState<string>("natural");

  // Crop / transform state. Pan is stored in units of the (square) viewport
  // side so it stays resolution-independent; it is converted to pixels on both
  // the live preview and the export canvas using the same maths.
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [flipH, setFlipH] = useState(1);
  const [flipV, setFlipV] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });

  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [containerW, setContainerW] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [applying, setApplying] = useState(false);

  // Decode the source once, honouring EXIF orientation so the preview <img>
  // (which orients automatically) and the export canvas (drawImage, which does
  // not) agree on dimensions.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bmp = await createImageBitmap(shot.file, { imageOrientation: "from-image" });
        if (cancelled) {
          bmp.close();
          return;
        }
        bitmapRef.current = bmp;
        setNatural({ w: bmp.width, h: bmp.height });
        setImgLoaded(true);
      } catch {
        // Fallback: measure via a plain Image (orientation may be off on some
        // EXIF photos, but the editor still works).
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          setImgLoaded(true);
        };
        img.src = shot.previewUrl;
      }
    })();
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [shot.file, shot.previewUrl]);

  // Track the square preview's pixel size so pan maths line up with the canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imgLoaded]);

  const baseScale =
    natural.w && natural.h ? Math.max(containerW / natural.w, containerW / natural.h) : 1;

  // Maximum pan (normalised) that still keeps the photo covering the square.
  const panBounds = useCallback(
    (z: number, rot: number): Point => {
      const S = containerW;
      const { w: iw, h: ih } = natural;
      if (!S || !iw || !ih) return { x: 0, y: 0 };
      const k = Math.max(S / iw, S / ih) * z;
      const isRot = rot % 180 !== 0;
      const hw = ((isRot ? ih : iw) * k) / 2;
      const hh = ((isRot ? iw : ih) * k) / 2;
      return { x: Math.max(0, (hw - S / 2) / S), y: Math.max(0, (hh - S / 2) / S) };
    },
    [containerW, natural],
  );

  const clampPan = useCallback(
    (p: Point, z: number, rot: number): Point => {
      const b = panBounds(z, rot);
      return {
        x: Math.max(-b.x, Math.min(b.x, p.x)),
        y: Math.max(-b.y, Math.min(b.y, p.y)),
      };
    },
    [panBounds],
  );

  function updateZoom(z: number) {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    setZoom(clamped);
    setPan((p) => clampPan(p, clamped, rotation));
  }

  function rotate(delta: number) {
    const next = (((rotation + delta) % 360) + 360) % 360;
    setRotation(next);
    setPan((p) => clampPan(p, zoom, next));
  }

  function applyPreset(id: string, adj: Adjustments) {
    setActivePreset(id);
    setAdjustments(adj);
  }

  function setAdjustment(key: keyof Adjustments, value: number) {
    setActivePreset("");
    setAdjustments((a) => ({ ...a, [key]: value }));
  }

  function resetAll() {
    setAdjustments(NEUTRAL_ADJUSTMENTS);
    setActivePreset("natural");
    setZoom(1);
    setRotation(0);
    setFlipH(1);
    setFlipV(1);
    setPan({ x: 0, y: 0 });
  }

  // ── Gesture handling (drag to pan, pinch to zoom) ───────────────────────────
  const pointers = useRef<Map<number, Point>>(new Map());
  const pinch = useRef<{ startDist: number; startZoom: number } | null>(null);

  function dist(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { startDist: dist(a, b), startZoom: zoom };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const ratio = dist(a, b) / pinch.current.startDist;
      updateZoom(pinch.current.startZoom * ratio);
      return;
    }

    const S = containerW || 1;
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    setPan((p) => clampPan({ x: p.x + dx / S, y: p.y + dy / S }, zoom, rotation));
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  // ── Shared transform (preview CSS string mirrors the canvas pipeline) ────────
  function transformFor(S: number): string {
    const k = baseScale * zoom;
    const Px = pan.x * S;
    const Py = pan.y * S;
    return [
      `translate(${S / 2 + Px}px, ${S / 2 + Py}px)`,
      `rotate(${rotation}deg)`,
      `scale(${flipH * k}, ${flipV * k})`,
      `translate(${-natural.w / 2}px, ${-natural.h / 2}px)`,
    ].join(" ");
  }

  async function applyEdits() {
    const bmp = bitmapRef.current;
    if (!bmp) {
      onCancel();
      return;
    }
    setApplying(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d")!;

      const k = Math.max(OUTPUT / natural.w, OUTPUT / natural.h) * zoom;
      ctx.save();
      ctx.filter = cssFilterString(adjustments);
      ctx.translate(OUTPUT / 2 + pan.x * OUTPUT, OUTPUT / 2 + pan.y * OUTPUT);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH * k, flipV * k);
      ctx.drawImage(bmp, -natural.w / 2, -natural.h / 2, natural.w, natural.h);
      ctx.restore();

      ctx.filter = "none";
      drawVignette(ctx, OUTPUT, adjustments.vignette);

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.92),
      );
      const newFile = new File([blob], shot.file.name, { type: "image/jpeg" });
      const newUrl = URL.createObjectURL(newFile);
      URL.revokeObjectURL(shot.previewUrl);
      onConfirm(newFile, newUrl);
    } catch {
      setApplying(false);
    }
  }

  const pristine =
    isNeutral(adjustments) &&
    zoom === 1 &&
    rotation === 0 &&
    flipH === 1 &&
    flipV === 1 &&
    pan.x === 0 &&
    pan.y === 0;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <button onClick={onCancel} className="p-2 -m-2 text-white/80 hover:text-white" aria-label={t("cancel")}>
          <X size={22} />
        </button>
        <button
          onClick={resetAll}
          disabled={pristine}
          className="text-xs font-medium text-white/60 disabled:opacity-30 hover:text-white"
        >
          {t("reset")}
        </button>
        <button
          onClick={() => (pristine ? onCancel() : void applyEdits())}
          disabled={applying || !imgLoaded}
          className="flex items-center gap-1.5 p-2 -m-2 text-sm font-semibold text-white disabled:opacity-40"
          aria-label={t("done")}
        >
          {applying ? <Loader2 size={20} className="animate-spin" /> : <Check size={22} />}
        </button>
      </div>

      {/* Square crop / preview area */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <div
          ref={containerRef}
          className="relative touch-none overflow-hidden bg-black"
          style={{ width: "100%", aspectRatio: "1 / 1", maxHeight: "100%" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgLoaded && containerW > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shot.previewUrl}
              alt=""
              draggable={false}
              className="absolute left-0 top-0 max-w-none select-none"
              style={{
                width: natural.w,
                height: natural.h,
                transformOrigin: "0 0",
                transform: transformFor(containerW),
                filter: cssFilterString(adjustments),
              }}
            />
          )}
          {/* Vignette preview overlay */}
          {adjustments.vignette > 0 && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: vignetteOverlayStyle(adjustments.vignette) }}
            />
          )}
          {/* Rule-of-thirds guides */}
          {imgLoaded && (
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute left-1/3 top-0 h-full w-px bg-white/40" />
              <div className="absolute left-2/3 top-0 h-full w-px bg-white/40" />
              <div className="absolute top-1/3 left-0 w-full h-px bg-white/40" />
              <div className="absolute top-2/3 left-0 w-full h-px bg-white/40" />
            </div>
          )}
          {!imgLoaded && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              role="status"
              aria-label={t("loading")}
            >
              <Loader2 size={28} className="animate-spin text-white/50" />
            </div>
          )}
        </div>
      </div>

      {/* Tool panels */}
      <div style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}>
        {tab === "filters" && (
          <div className="flex gap-3 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_PRESETS.map((p) => {
              const selected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id, p.adjustments)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={`block h-16 w-16 overflow-hidden rounded-xl ring-2 transition-all ${
                      selected ? "ring-white" : "ring-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ filter: cssFilterString(p.adjustments) }}
                    />
                  </span>
                  <span
                    className={`text-[11px] leading-tight ${selected ? "text-white" : "text-white/55"}`}
                  >
                    {t(`presets.${p.id}.name`)}
                  </span>
                  <span className="max-w-[72px] text-center text-[9px] leading-tight text-white/35">
                    {t(`presets.${p.id}.mood`)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "adjust" && (
          <div className="max-h-[34vh] space-y-3.5 overflow-y-auto px-6 py-4">
            {ADJUSTMENT_CONTROLS.map((c) => {
              const value = adjustments[c.key];
              return (
                <label key={c.key} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-white/60">{t(`adjust.${c.key}`)}</span>
                  <input
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={value}
                    onChange={(e) => setAdjustment(c.key, Number(e.target.value))}
                    className="flex-1 accent-white"
                  />
                  <span className="w-9 text-right text-xs text-white/45 tabular-nums">
                    {value > 0 && c.min < 0 ? `+${value}` : value}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {tab === "crop" && (
          <div className="space-y-4 px-6 py-4">
            <label className="flex items-center gap-3">
              <ZoomIn size={18} className="shrink-0 text-white/60" />
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => updateZoom(Number(e.target.value))}
                aria-label={t("zoom")}
                className="flex-1 accent-white"
              />
              <span className="w-10 text-right text-xs text-white/45 tabular-nums">
                {zoom.toFixed(1)}×
              </span>
            </label>
            <div className="flex items-center justify-center gap-3">
              <ToolButton label={t("rotateLeft")} onClick={() => rotate(-90)}>
                <RotateCcw size={20} />
              </ToolButton>
              <ToolButton label={t("rotateRight")} onClick={() => rotate(90)}>
                <RotateCw size={20} />
              </ToolButton>
              <ToolButton label={t("flipH")} onClick={() => setFlipH((v) => -v)} active={flipH === -1}>
                <FlipHorizontal size={20} />
              </ToolButton>
              <ToolButton label={t("flipV")} onClick={() => setFlipV((v) => -v)} active={flipV === -1}>
                <FlipVertical size={20} />
              </ToolButton>
            </div>
            <p className="text-center text-[11px] text-white/35">{t("frameHint")}</p>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-stretch justify-around border-t border-white/10 pt-2">
          <TabButton active={tab === "filters"} onClick={() => setTab("filters")} icon={<Sparkles size={18} />} label={t("tabs.filters")} />
          <TabButton active={tab === "adjust"} onClick={() => setTab("adjust")} icon={<SlidersHorizontal size={18} />} label={t("tabs.adjust")} />
          <TabButton active={tab === "crop"} onClick={() => setTab("crop")} icon={<Crop size={18} />} label={t("tabs.crop")} />
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
        active ? "border-white bg-white/15 text-white" : "border-white/20 text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${
        active ? "text-white" : "text-white/45"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
