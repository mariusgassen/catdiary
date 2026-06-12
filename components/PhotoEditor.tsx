"use client";

import { useRef, useState } from "react";
import { X, Check, Sun, Contrast } from "lucide-react";

type Shot = { file: File; previewUrl: string };

type Props = {
  shot: Shot;
  onConfirm: (file: File, previewUrl: string) => void;
  onCancel: () => void;
};

export function PhotoEditor({ shot, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [brightness, setBrightness] = useState(0); // -50..+50
  const [contrast, setContrast] = useState(0);
  const [panX, setPanX] = useState(50); // 0..100
  const [panY, setPanY] = useState(50);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [applying, setApplying] = useState(false);

  const touchRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setImgLoaded(true);
  }

  async function applyEdits() {
    setApplying(true);
    try {
      const img = new Image();
      img.src = shot.previewUrl;
      await new Promise<void>((res) => { img.onload = () => res(); });

      const OUTPUT = 1200;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`;

      const { w, h } = naturalSize;
      let sx: number, sy: number, sSize: number;
      if (w >= h) {
        sSize = h;
        sx = (w - h) * (panX / 100);
        sy = 0;
      } else {
        sSize = w;
        sx = 0;
        sy = (h - w) * (panY / 100);
      }

      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);

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

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      startPanX: panX,
      startPanY: panY,
    };
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchRef.current || !containerRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.startX;
    const dy = t.clientY - touchRef.current.startY;
    const cW = containerRef.current.clientWidth;
    const { w, h } = naturalSize;
    if (w === 0 || h === 0) return;

    // With a square container and object-cover, compute the overflow in each axis.
    const scale = Math.max(cW / w, cW / h); // square container: cW === cH
    const dispW = w * scale;
    const dispH = h * scale;
    const overflowX = dispW - cW;
    const overflowY = dispH - cW;

    if (overflowX > 1) {
      setPanX(Math.max(0, Math.min(100, touchRef.current.startPanX - (dx / overflowX) * 100)));
    }
    if (overflowY > 1) {
      setPanY(Math.max(0, Math.min(100, touchRef.current.startPanY - (dy / overflowY) * 100)));
    }
  }

  function onTouchEnd() {
    touchRef.current = null;
  }

  const noEdits = brightness === 0 && contrast === 0;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <button onClick={onCancel} className="p-2 -m-2 text-white/80 hover:text-white" aria-label="Cancel">
          <X size={22} />
        </button>
        <span className="text-sm font-medium text-white/70">Edit photo</span>
        <button
          onClick={() => (noEdits ? onCancel() : void applyEdits())}
          disabled={applying || !imgLoaded}
          className="p-2 -m-2 text-white disabled:opacity-40"
          aria-label="Apply edits"
        >
          {noEdits ? (
            <span className="text-sm font-semibold">Skip</span>
          ) : (
            <Check size={22} />
          )}
        </button>
      </div>

      {/* Square crop area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-black">
        <div
          ref={containerRef}
          className="relative touch-none overflow-hidden"
          style={{ width: "100%", aspectRatio: "1 / 1", maxHeight: "100%" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shot.previewUrl}
            alt=""
            onLoad={handleLoad}
            draggable={false}
            className="w-full h-full object-cover select-none"
            style={{
              objectPosition: `${panX}% ${panY}%`,
              filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`,
            }}
          />
          {/* Crop corner indicators */}
          {imgLoaded && (
            <>
              {(["tl", "tr", "bl", "br"] as const).map((c) => (
                <div
                  key={c}
                  className={`pointer-events-none absolute w-7 h-7 border-white border-2 ${
                    c === "tl"
                      ? "top-2 left-2 border-r-0 border-b-0"
                      : c === "tr"
                        ? "top-2 right-2 border-l-0 border-b-0"
                        : c === "bl"
                          ? "bottom-2 left-2 border-r-0 border-t-0"
                          : "bottom-2 right-2 border-l-0 border-t-0"
                  }`}
                />
              ))}
              {(naturalSize.w !== naturalSize.h) && (
                <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
                  Drag to reposition
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sliders */}
      <div
        className="space-y-4 px-6 pt-4"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <label className="flex items-center gap-3">
          <Sun size={18} className="text-white/60 shrink-0" />
          <input
            type="range"
            min={-50}
            max={50}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="flex-1 accent-white"
          />
          <span className="w-8 text-right text-xs text-white/50 tabular-nums">
            {brightness > 0 ? `+${brightness}` : brightness}
          </span>
        </label>
        <label className="flex items-center gap-3">
          <Contrast size={18} className="text-white/60 shrink-0" />
          <input
            type="range"
            min={-50}
            max={50}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="flex-1 accent-white"
          />
          <span className="w-8 text-right text-xs text-white/50 tabular-nums">
            {contrast > 0 ? `+${contrast}` : contrast}
          </span>
        </label>
      </div>
    </div>
  );
}
