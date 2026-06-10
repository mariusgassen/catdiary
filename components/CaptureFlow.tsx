"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import exifr from "exifr";
import {
  X,
  RotateCcw,
  Camera,
  ImageIcon,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { parseCaption } from "@/components/HashtagCaption";
import { LocationPicker, reverseGeocode, type PickedLocation } from "@/components/LocationPicker";

type Step = "camera" | "details";
type Facing = "environment" | "user";

// ── Caption textarea with live hashtag highlighting ──────────────────────────

function CaptionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  const parts = parseCaption(value);

  return (
    <div className="relative rounded-xl border border-border bg-surface overflow-hidden focus-within:ring-1 focus-within:ring-accent">
      {/* Mirror layer — shows styled text behind transparent textarea */}
      {value && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden"
        >
          {parts.map((part, i) =>
            part.type === "hashtag" || part.type === "mention" ? (
              <span key={i} className="text-accent font-medium">
                {part.value}
              </span>
            ) : (
              <span key={i} className="text-foreground">
                {part.value}
              </span>
            )
          )}
          {/* trailing space to prevent collapse */}
          &thinsp;
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          autoResize();
        }}
        placeholder="Add a caption… #orange #kitten"
        rows={4}
        className="relative w-full resize-none bg-transparent px-3 py-3 text-sm leading-relaxed outline-none placeholder:text-muted overflow-hidden"
        style={{
          color: value ? "transparent" : undefined,
          caretColor: "var(--foreground)",
          minHeight: "96px",
        }}
      />
    </div>
  );
}

// ── Main capture flow ─────────────────────────────────────────────────────────

export function CaptureFlow() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("camera");
  const [facing, setFacing] = useState<Facing>("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [caption, setCaption] = useState("");
  const [catName, setCatName] = useState("");
  const [breed, setBreed] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  // Location defaults, in priority order: the photo's EXIF GPS data, then the
  // device's location, then whatever place the user searches for — or nothing
  // at all if they switch geo data off for this entry.
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [geoDisabled, setGeoDisabled] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const startCamera = useCallback(async (f: Facing) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraReady(false);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: f, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera unavailable — pick a photo from your gallery instead.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (step === "camera") startCamera(facing);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, facing]);

  // Default to the device's location when entering the details step, unless a
  // location is already known (photo EXIF) or the user turned geo data off.
  useEffect(() => {
    if (step !== "details" || location || geoDisabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        setLocation({ name, lat: latitude, lng: longitude });
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
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const ox = (video.videoWidth - size) / 2;
    const oy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, ox, oy, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "cat.jpg", { type: "image/jpeg" });
        setCapturedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        setStep("details");
      },
      "image/jpeg",
      0.92
    );
  }

  async function handleGalleryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Prefer the location where the photo was actually taken (EXIF GPS).
    const gps = await exifr.gps(file).catch(() => null);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      setLocation({ name: "Where the photo was taken", lat: gps.latitude, lng: gps.longitude });
      setStep("details");
      const name = await reverseGeocode(gps.latitude, gps.longitude);
      setLocation({ name, lat: gps.latitude, lng: gps.longitude });
    } else {
      setStep("details");
    }
  }

  async function handlePost() {
    if (!capturedFile || (!location && !geoDisabled)) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.append("file", capturedFile);
      const upload = await fetch("/api/upload-url", { method: "POST", body: fd });
      if (!upload.ok) throw new Error("Photo upload failed");
      const { key, thumbKey } = await upload.json();

      const create = await fetch("/api/cat-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoKey: key,
          thumbKey,
          name: catName.trim() || undefined,
          breed: breed.trim() || undefined,
          notes: caption.trim() || undefined,
          locationName: location?.name ?? null,
          latitude: location?.lat ?? null,
          longitude: location?.lng ?? null,
        }),
      });
      if (!create.ok) throw new Error("Could not save the entry");

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      router.push("/feed");
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  // ── Camera step ─────────────────────────────────────────────────────────────
  if (step === "camera") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black">
        <canvas ref={canvasRef} className="hidden" />

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-3 z-10">
          <button
            onClick={() => router.back()}
            className="p-2 -m-2 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <button
            onClick={() => {
              const next: Facing = facing === "environment" ? "user" : "environment";
              setFacing(next);
            }}
            className="p-2 -m-2 text-white/80 hover:text-white"
            aria-label="Flip camera"
          >
            <RotateCcw size={22} />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setCameraReady(true)}
            className="w-full h-full object-cover"
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
        </div>

        {/* Bottom controls */}
        <div
          className="flex items-center justify-around px-8 py-6"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {/* Gallery */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-colors"
            aria-label="Choose from gallery"
          >
            <div className="w-12 h-12 rounded-2xl border-2 border-white/30 flex items-center justify-center">
              <ImageIcon size={20} />
            </div>
            <span className="text-xs">Gallery</span>
          </button>

          {/* Capture */}
          <button
            onClick={capturePhoto}
            disabled={!cameraReady || !!cameraError}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            aria-label="Capture photo"
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>

          {/* Spacer */}
          <div className="w-16" />
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleGalleryFile}
        />
      </div>
    );
  }

  // ── Details step ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10"
           style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}>
        <button
          onClick={() => setStep("camera")}
          className="p-1.5 -m-1.5 text-muted hover:text-foreground transition-colors"
          aria-label="Back to camera"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="font-semibold text-sm">New post</span>
        <button
          onClick={handlePost}
          disabled={(!location && !geoDisabled) || submitting}
          className="text-sm font-bold text-accent disabled:opacity-40 transition-opacity"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : "Post"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Preview + caption side by side (Instagram-style top row) */}
        <div className="flex gap-3 px-4 pt-4">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview"
              className="w-20 h-20 rounded-xl object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <CaptionInput value={caption} onChange={setCaption} />
          </div>
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

        {/* Optional fields */}
        <div className="px-4 pt-3">
          <button
            onClick={() => setShowOptional((v) => !v)}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            {showOptional ? "Hide optional fields ↑" : "Add cat name & breed ↓"}
          </button>
          {showOptional && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Cat name (optional)"
                maxLength={120}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
              />
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="Breed / color (optional)"
                maxLength={120}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
              />
            </div>
          )}
        </div>

        {submitError && (
          <p className="px-4 pt-3 text-sm text-red-500">{submitError}</p>
        )}

        {!location && !geoDisabled && !isLocating && (
          <p className="px-4 pt-2 text-xs text-muted">
            Pick a location — search, use your position, or switch location off.
          </p>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
