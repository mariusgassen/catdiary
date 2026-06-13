"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import exifr from "exifr";
import {
  X,
  RotateCcw,
  Camera,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  History,
  CalendarDays,
} from "lucide-react";
import { toLocalDateTimeInput } from "@/lib/localDateTime";
import { LocationPicker, reverseGeocode, type PickedLocation } from "@/components/LocationPicker";
import { MAX_PHOTOS_PER_ENTRY } from "@/lib/photo-urls";
import {
  asFrameStyle,
  asFrameColor,
  asFramePaper,
  clampTilt,
  DEFAULT_FRAME_STYLE,
  DEFAULT_FRAME_COLOR,
  DEFAULT_FRAME_PAPER,
  type FrameStyle,
  type FrameColorKey,
} from "@/lib/frames";
import { CaptionInput } from "@/components/CaptionInput";
import { FramePicker } from "@/components/FramePicker";
import { PhotoEditor } from "@/components/PhotoEditor";
import { SortablePhotoStrip } from "@/components/SortablePhotoStrip";
import { DraftsSheet } from "@/components/DraftsSheet";
import {
  deleteDraft,
  getDraft,
  listDraftMetas,
  newDraftId,
  saveDraft,
  type CaptureDraftMeta,
} from "@/lib/captureDrafts";

type Step = "camera" | "details";
type Facing = "environment" | "user";

type Shot = { id: string; file: File; previewUrl: string };

function makeShot(file: File): Shot {
  return { id: newDraftId(), file, previewUrl: URL.createObjectURL(file) };
}

// `zoom` isn't in the standard MediaTrack typings yet. When the camera reports
// a zoom capability we drive it natively (true optical/sensor zoom); otherwise
// we fall back to digital zoom (CSS scale on the preview + a centre crop on
// capture).
type ZoomRange = { min: number; max: number; step: number };

const DIGITAL_ZOOM_MAX = 4;

// ── Main capture flow ─────────────────────────────────────────────────────────

export function CaptureFlow() {
  const t = useTranslations("capture");
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("camera");
  const [facing, setFacing] = useState<Facing>("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Pinch / slider zoom. `zoomRange` comes from the camera when it supports
  // native zoom; otherwise it's null and we apply digital zoom on top.
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const [shots, setShots] = useState<Shot[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showGallerySheet, setShowGallerySheet] = useState(false);

  const [caption, setCaption] = useState("");
  const [catName, setCatName] = useState("");
  const [breed, setBreed] = useState("");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>(DEFAULT_FRAME_STYLE);
  const [frameColor, setFrameColor] = useState<FrameColorKey>(DEFAULT_FRAME_COLOR);
  const [framePaper, setFramePaper] = useState<FrameColorKey>(DEFAULT_FRAME_PAPER);
  const [frameTilt, setFrameTilt] = useState<number | null>(null);
  const [frameCaption, setFrameCaption] = useState("");
  const [frameLabel, setFrameLabel] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  // Optionally file this sighting under one of the user's existing cats.
  const [catId, setCatId] = useState("");
  const [myCats, setMyCats] = useState<{ id: string; name: string }[]>([]);

  // The date the cat was spotted. null = "now" (a fresh sighting); set from a
  // picked photo's EXIF date, or edited by hand for older photos.
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);

  // Location defaults, in priority order: the photo's EXIF GPS data, then the
  // device's location, then whatever place the user searches for — or nothing
  // at all if they switch geo data off for this entry.
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [geoDisabled, setGeoDisabled] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Tracks whether EXIF GPS was already found so device-location doesn't overwrite it.
  const exifFoundLocationRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Persistent drafts (IndexedDB) ───────────────────────────────────────────
  // Each capture session is one draft; leaving the dialogue keeps it, and any
  // number of drafts can be resumed later from the Drafts sheet.
  const [currentDraftId, setCurrentDraftId] = useState<string>(() => newDraftId());
  const [draftMetas, setDraftMetas] = useState<CaptureDraftMeta[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);

  const refreshDrafts = useCallback(async () => {
    setDraftMetas(await listDraftMetas());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshDrafts();
  }, [refreshDrafts]);

  // Debounced auto-save of the in-progress draft (text, location and photos).
  useEffect(() => {
    if (submitting) return;
    const id = currentDraftId;
    const hasContent =
      shots.length > 0 || caption.trim() || catName.trim() || breed.trim();
    const timer = setTimeout(() => {
      if (!hasContent) {
        void deleteDraft(id).then(refreshDrafts);
        return;
      }
      void saveDraft({
        id,
        updatedAt: Date.now(),
        caption,
        catName,
        breed,
        frameStyle,
        frameColor,
        framePaper,
        frameTilt,
        frameCaption,
        frameLabel,
        capturedAt: capturedAt ? capturedAt.getTime() : null,
        location: location ? { name: location.name, lat: location.lat, lng: location.lng } : null,
        geoDisabled,
        photos: shots.map((s) => ({ name: s.file.name, type: s.file.type, blob: s.file })),
      }).then(refreshDrafts);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption, catName, breed, frameStyle, frameColor, framePaper, frameTilt, frameCaption, frameLabel, capturedAt, location, geoDisabled, shots, submitting, currentDraftId]);

  const slotsLeft = MAX_PHOTOS_PER_ENTRY - shots.length;

  function addShots(files: File[]) {
    setShots((prev) => {
      const room = MAX_PHOTOS_PER_ENTRY - prev.length;
      const next = files.slice(0, room).map(makeShot);
      return [...prev, ...next];
    });
  }

  function removeShot(id: string) {
    setShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  }

  function reorderShots(ids: string[]) {
    setShots((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      return ids.map((id) => byId.get(id)).filter((s): s is Shot => !!s);
    });
  }

  function replaceShot(id: string, file: File, previewUrl: string) {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, file, previewUrl } : s)));
  }

  const startCamera = useCallback(async (f: Facing) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraReady(false);
    setCameraError(null);
    setZoom(1);
    setZoomRange(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: f, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0] ?? null;
      videoTrackRef.current = track;
      // `zoom` isn't in the standard MediaTrackCapabilities type yet.
      const caps = track?.getCapabilities?.() as
        | (MediaTrackCapabilities & { zoom?: ZoomRange })
        | undefined;
      const zoomCap = caps?.zoom;
      if (zoomCap && zoomCap.max > zoomCap.min) {
        setZoomRange({ min: zoomCap.min, max: zoomCap.max, step: zoomCap.step || 0.1 });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(t("camera.unavailable"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Min/max for the current zoom mode: the camera's reported range when native
  // zoom is available, otherwise a fixed digital range.
  const zoomMin = zoomRange?.min ?? 1;
  const zoomMax = zoomRange?.max ?? DIGITAL_ZOOM_MAX;
  const zoomStep = zoomRange?.step ?? 0.1;
  const isDigitalZoom = !zoomRange;

  const applyZoom = useCallback(
    (next: number) => {
      const clamped = Math.min(zoomMax, Math.max(zoomMin, next));
      setZoom(clamped);
      const track = videoTrackRef.current;
      if (zoomRange && track) {
        // Native zoom isn't in the standard constraint typings.
        void track
          .applyConstraints({ advanced: [{ zoom: clamped }] } as unknown as MediaTrackConstraints)
          .catch(() => {});
      }
    },
    [zoomMin, zoomMax, zoomRange],
  );

  // Pinch-to-zoom on the viewfinder (two-pointer distance ratio), mirroring the
  // photo editor's gesture handling.
  function viewfinderPointerDown(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { startDist: Math.hypot(a.x - b.x, a.y - b.y), startZoom: zoom };
    }
  }

  function viewfinderPointerMove(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / pinchRef.current.startDist;
      applyZoom(pinchRef.current.startZoom * ratio);
    }
  }

  function viewfinderPointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (step === "camera") startCamera(facing);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, facing]);

  // Load the user's own cats once, so the details step can offer to file this
  // sighting under one of them.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/cats")
      .then((res) => (res.ok ? res.json() : { cats: [] }))
      .then((data: { cats: { id: string; name: string | null; displayName: string | null }[] }) => {
        if (!cancelled) setMyCats(data.cats.map((c) => ({ id: c.id, name: c.displayName ?? c.name ?? "🐱" })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Default to the device's location when entering the details step, unless a
  // location is already known (photo EXIF) or the user turned geo data off.
  useEffect(() => {
    if (step !== "details" || location || geoDisabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (exifFoundLocationRef.current) {
          setIsLocating(false);
          return;
        }
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        if (!exifFoundLocationRef.current) {
          setLocation({ name, lat: latitude, lng: longitude });
        }
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { timeout: 10000, maximumAge: 60000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || slotsLeft <= 0) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    // Native zoom already shows in the frame; for digital zoom we crop a
    // smaller centred region of the frame to match what the preview shows.
    const srcSize = size / (isDigitalZoom ? zoom : 1);
    const ox = (video.videoWidth - srcSize) / 2;
    const oy = (video.videoHeight - srcSize) / 2;
    ctx.drawImage(video, ox, oy, srcSize, srcSize, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        // Stay in the camera so more shots can be taken; "Next" moves on.
        addShots([new File([blob], "cat.jpg", { type: "image/jpeg" })]);
      },
      "image/jpeg",
      0.92
    );
  }

  async function handleGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same files later
    if (files.length === 0) return;
    addShots(files);
    setStep("details");

    // Date the photo was actually taken (EXIF) — the first picked photo with a
    // valid capture date wins, so logging an old gallery photo back-dates the
    // entry instead of stamping it "now". Don't override a date already set.
    if (!capturedAt) {
      for (const file of files) {
        const meta = await exifr
          .parse(file, ["DateTimeOriginal", "CreateDate", "DateTimeDigitized"])
          .catch(() => null);
        const taken = meta?.DateTimeOriginal ?? meta?.CreateDate ?? meta?.DateTimeDigitized;
        if (taken instanceof Date && !Number.isNaN(taken.getTime())) {
          setCapturedAt(taken);
          break;
        }
      }
    }

    // Prefer the location where a photo was actually taken (EXIF GPS) — the
    // first picked photo that carries GPS data wins.
    if (location || geoDisabled) return;
    for (const file of files) {
      const gps = await exifr.gps(file).catch(() => null);
      if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
        exifFoundLocationRef.current = true;
        setLocation({ name: "Where the photo was taken", lat: gps.latitude, lng: gps.longitude });
        const name = await reverseGeocode(gps.latitude, gps.longitude);
        setLocation({ name, lat: gps.latitude, lng: gps.longitude });
        break;
      }
    }
  }

  async function resumeDraft(id: string) {
    const draft = await getDraft(id);
    if (!draft) {
      void refreshDrafts();
      return;
    }
    shots.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    const restored = draft.photos.map((p) => makeShot(new File([p.blob], p.name, { type: p.type })));
    setCurrentDraftId(draft.id);
    exifFoundLocationRef.current = !!draft.location;
    setShots(restored);
    setCaption(draft.caption);
    setCatName(draft.catName);
    setBreed(draft.breed);
    setFrameStyle(asFrameStyle(draft.frameStyle));
    setFrameColor(asFrameColor(draft.frameColor));
    setFramePaper(asFramePaper(draft.framePaper));
    setFrameTilt(clampTilt(draft.frameTilt));
    setFrameCaption(draft.frameCaption ?? "");
    setFrameLabel(draft.frameLabel ?? "");
    setCapturedAt(draft.capturedAt ? new Date(draft.capturedAt) : null);
    setShowOptional(!!(draft.catName || draft.breed));
    setLocation(draft.location);
    setGeoDisabled(draft.geoDisabled);
    setSubmitError(null);
    setShowDrafts(false);
    setStep("details");
  }

  async function discardDraft(id: string) {
    await deleteDraft(id);
    await refreshDrafts();
  }

  async function handlePost() {
    if (shots.length === 0 || (!location && !geoDisabled)) return;
    setSubmitting(true);
    setUploadedCount(0);
    setSubmitError(null);
    try {
      // Upload one at a time: keeps display order and memory use predictable.
      const photos: { photoKey: string; thumbKey?: string }[] = [];
      for (const shot of shots) {
        const fd = new FormData();
        fd.append("file", shot.file);
        const upload = await fetch("/api/upload-url", { method: "POST", body: fd });
        if (!upload.ok) throw new Error(t("details.errorUpload"));
        const { key, thumbKey } = await upload.json();
        photos.push({ photoKey: key, thumbKey });
        setUploadedCount(photos.length);
      }

      const create = await fetch("/api/cat-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos,
          name: catName.trim() || undefined,
          breed: breed.trim() || undefined,
          notes: caption.trim() || undefined,
          catId: catId || undefined,
          frameStyle,
          frameColor,
          framePaper,
          frameTilt,
          frameCaption: frameCaption.trim() || null,
          frameLabel: frameLabel.trim() || null,
          locationName: location?.name ?? null,
          latitude: location?.lat ?? null,
          longitude: location?.lng ?? null,
          createdAt: capturedAt ? capturedAt.toISOString() : undefined,
        }),
      });
      if (!create.ok) throw new Error(t("details.errorSave"));

      shots.forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
      await deleteDraft(currentDraftId);
      router.push("/feed");
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("details.errorGeneric"));
      setSubmitting(false);
    }
  }

  const otherDrafts = draftMetas.filter((m) => m.id !== currentDraftId);
  const otherDraftCount = otherDrafts.length;

  // ── Camera step ─────────────────────────────────────────────────────────────
  if (step === "camera") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black">
        <canvas ref={canvasRef} className="hidden" />

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 pb-3 z-10"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
        >
          <button
            onClick={() => router.back()}
            className="p-2 -m-2 text-white/80 hover:text-white"
            aria-label={t("camera.close")}
          >
            <X size={24} />
          </button>
          {otherDraftCount > 0 && (
            <button
              onClick={() => {
                void refreshDrafts();
                setShowDrafts(true);
              }}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/20 hover:bg-white/25"
            >
              <History size={17} />
              {t("camera.draftsChip", { count: otherDraftCount })}
            </button>
          )}
          <button
            onClick={() => {
              const next: Facing = facing === "environment" ? "user" : "environment";
              setFacing(next);
            }}
            className="p-2 -m-2 text-white/80 hover:text-white"
            aria-label={t("camera.flip")}
          >
            <RotateCcw size={22} />
          </button>
        </div>

        {/* Viewfinder */}
        <div
          className="flex-1 relative flex items-center justify-center overflow-hidden"
          style={{ touchAction: "none" }}
          onPointerDown={viewfinderPointerDown}
          onPointerMove={viewfinderPointerMove}
          onPointerUp={viewfinderPointerUp}
          onPointerCancel={viewfinderPointerUp}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setCameraReady(true)}
            className="w-full h-full object-cover"
            // Digital zoom scales the preview; native zoom is handled by the camera.
            style={isDigitalZoom && zoom > 1 ? { transform: `scale(${zoom})` } : undefined}
          />
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-white/60" />
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Camera size={40} className="text-white/40" />
              <p className="text-white/70 text-sm">{cameraError}</p>
            </div>
          )}

          {/* Zoom control — pinch the viewfinder or drag the slider */}
          {cameraReady && !cameraError && (
            <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-10">
              <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
                {zoom.toFixed(1)}×
              </span>
              <input
                type="range"
                min={zoomMin}
                max={zoomMax}
                step={zoomStep}
                value={zoom}
                onChange={(e) => applyZoom(Number(e.target.value))}
                aria-label={t("camera.zoom")}
                className="zoom-slider w-full max-w-xs"
              />
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div
          className="flex items-center justify-around px-8 py-6"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {/* Gallery */}
          <button
            onClick={() => setShowGallerySheet(true)}
            className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-colors"
            aria-label={t("camera.chooseFromGallery")}
          >
            <div className="w-12 h-12 rounded-2xl border-2 border-white/30 flex items-center justify-center">
              <ImageIcon size={20} />
            </div>
            <span className="text-xs">{t("camera.gallery")}</span>
          </button>

          {/* Capture */}
          <button
            onClick={capturePhoto}
            disabled={!cameraReady || !!cameraError || slotsLeft <= 0}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            aria-label={t("camera.capture")}
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>

          {/* Shots taken so far → details step */}
          {shots.length > 0 ? (
            <button
              onClick={() => setStep("details")}
              className="flex w-16 flex-col items-center gap-1.5 text-white/90 hover:text-white transition-colors"
              aria-label={t("camera.continue", { count: shots.length })}
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shots[shots.length - 1].previewUrl}
                  alt=""
                  className="w-12 h-12 rounded-2xl border-2 border-white/70 object-cover"
                />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-black">
                  {shots.length}
                </span>
              </div>
              <span className="flex items-center text-xs">
                {t("camera.next")} <ChevronRight size={12} />
              </span>
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleGalleryFiles}
        />

        {/* Gallery action sheet */}
        {showGallerySheet && (
          <div className="absolute inset-0 z-20 flex flex-col justify-end">
            {/* Backdrop */}
            <button
              className="flex-1 bg-black/50"
              aria-label={t("camera.dismiss")}
              onClick={() => setShowGallerySheet(false)}
            />
            <div
              className="rounded-t-2xl bg-[#1c1c1e] pb-[env(safe-area-inset-bottom,16px)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto my-2 h-1 w-10 rounded-full bg-white/20" />
              <p className="px-5 pb-2 pt-1 text-xs font-medium text-white/40 uppercase tracking-wide">
                {t("camera.addPhotos")}
              </p>
              <button
                onClick={() => {
                  setShowGallerySheet(false);
                  galleryInputRef.current?.click();
                }}
                className="flex w-full items-center gap-4 px-5 py-4 text-white active:bg-white/10 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2c2c2e]">
                  <ImageIcon size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{t("camera.photoLibrary")}</p>
                  <p className="text-xs text-white/50">{t("camera.chooseFromPhotos")}</p>
                </div>
              </button>
              <button
                onClick={() => setShowGallerySheet(false)}
                className="mx-4 mb-2 mt-2 w-[calc(100%-2rem)] rounded-xl bg-[#2c2c2e] py-4 text-sm font-semibold text-white active:bg-white/10 transition-colors"
              >
                {t("camera.cancel")}
              </button>
            </div>
          </div>
        )}

        {showDrafts && (
          <DraftsSheet
            drafts={otherDrafts}
            onResume={(id) => void resumeDraft(id)}
            onDelete={(id) => void discardDraft(id)}
            onClose={() => setShowDrafts(false)}
          />
        )}
      </div>
    );
  }

  // ── Details step ────────────────────────────────────────────────────────────

  const editingShot = editingId ? shots.find((s) => s.id === editingId) : null;
  if (editingShot) {
    return (
      <PhotoEditor
        shot={editingShot}
        onConfirm={(file, previewUrl) => {
          replaceShot(editingShot.id, file, previewUrl);
          setEditingId(null);
        }}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10"
           style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}>
        <button
          onClick={() => setStep("camera")}
          className="p-1.5 -m-1.5 text-muted hover:text-foreground transition-colors"
          aria-label={t("details.back")}
        >
          <ChevronLeft size={22} />
        </button>
        <span className="font-semibold text-sm">{t("details.newPost")}</span>
        <button
          onClick={handlePost}
          disabled={shots.length === 0 || (!location && !geoDisabled) || submitting}
          className="flex items-center gap-1.5 text-sm font-bold text-accent disabled:opacity-40 transition-opacity"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {shots.length > 1 && (
                <span className="tabular-nums">
                  {Math.min(uploadedCount + 1, shots.length)}/{shots.length}
                </span>
              )}
            </>
          ) : (
            t("details.post")
          )}
        </button>
      </div>

      <div>
        {/* Photo strip — up to MAX_PHOTOS_PER_ENTRY shots; drag to reorder */}
        <SortablePhotoStrip
          photos={shots}
          max={MAX_PHOTOS_PER_ENTRY}
          disabled={submitting}
          onReorder={reorderShots}
          onRemove={removeShot}
          onEdit={(id) => setEditingId(id)}
          onAddMore={() => setStep("camera")}
        />

        {/* Frame — how the photos are presented in the journal */}
        {shots.length > 0 && (
          <div className="px-4 pt-4">
            <FramePicker
              value={frameStyle}
              onChange={setFrameStyle}
              color={frameColor}
              onColorChange={setFrameColor}
              paper={framePaper}
              onPaperChange={setFramePaper}
              tilt={frameTilt}
              onTiltChange={setFrameTilt}
              caption={frameCaption}
              onCaptionChange={setFrameCaption}
              label={frameLabel}
              onLabelChange={setFrameLabel}
              sampleUrl={shots[0]?.previewUrl}
              name={catName.trim() || null}
              breed={breed.trim() || null}
              locationName={location?.name ?? null}
            />
          </div>
        )}

        {/* Caption */}
        <div className="px-4 pt-4">
          <CaptionInput value={caption} onChange={setCaption} />
        </div>

        {/* Location */}
        <div className="px-4 pt-3">
          <LocationPicker
            location={location}
            setLocation={setLocation}
            geoDisabled={geoDisabled}
            setGeoDisabled={setGeoDisabled}
            isLocating={isLocating}
            setIsLocating={setIsLocating}
          />
        </div>

        {/* Date the cat was spotted — prefilled from photo EXIF when available */}
        <div className="px-4 pt-3">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
            <CalendarDays size={16} className="shrink-0 text-muted" aria-hidden />
            <span className="text-muted">{t("details.dateLabel")}</span>
            <input
              type="datetime-local"
              value={toLocalDateTimeInput(capturedAt ?? new Date())}
              max={toLocalDateTimeInput(new Date())}
              onChange={(e) => {
                const v = e.target.value ? new Date(e.target.value) : null;
                setCapturedAt(v && !Number.isNaN(v.getTime()) ? v : null);
              }}
              className="ml-auto bg-transparent text-right outline-none"
            />
          </label>
        </div>

        {/* Optional fields */}
        <div className="px-4 pt-3">
          <button
            onClick={() => setShowOptional((v) => !v)}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            {showOptional ? t("details.hideOptional") : t("details.addOptional")}
          </button>
          {showOptional && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder={t("details.catNamePlaceholder")}
                maxLength={120}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
              />
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder={t("details.breedPlaceholder")}
                maxLength={120}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
              />
              {myCats.length > 0 && (
                <select
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">{t("details.catNone")}</option>
                  {myCats.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {submitError && (
          <p className="px-4 pt-3 text-sm text-red-500">{submitError}</p>
        )}

        {!location && !geoDisabled && !isLocating && (
          <p className="px-4 pt-2 text-xs text-muted">
            {t("details.locationHint")}
          </p>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
