"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { EntryFrame } from "@/components/EntryFrame";
import {
  FRAME_STYLES,
  FRAME_COLOR_KEYS,
  FRAME_TILT_MIN,
  FRAME_TILT_MAX,
  MAX_FRAME_CAPTION,
  frameInk,
  frameHasCaption,
  type FrameStyle,
  type FrameColorKey,
} from "@/lib/frames";

type FramePickerProps = {
  value: FrameStyle;
  onChange: (frame: FrameStyle) => void;
  color: FrameColorKey;
  onColorChange: (color: FrameColorKey) => void;
  /** Hand-set tilt in degrees; null = the automatic, id-hashed tilt. */
  tilt: number | null;
  onTiltChange: (tilt: number | null) => void;
  /** Custom text for the selected frame's label field; "" = the auto default. */
  caption: string;
  onCaptionChange: (caption: string) => void;
  /** A sample photo to preview each frame on — the entry's cover. */
  sampleUrl?: string | null;
  name?: string | null;
  breed?: string | null;
  locationName?: string | null;
};

/**
 * The frame customizer: a horizontal strip of frame choices (each previewing
 * the chosen style + color on the user's cover photo), plus controls to recolor
 * the chrome, hand-set the tilt, and rename the frame's label field. Everything
 * here is presentation only, so it never blocks posting — it just deepens the
 * notebook feel.
 */
export function FramePicker({
  value,
  onChange,
  color,
  onColorChange,
  tilt,
  onTiltChange,
  caption,
  onCaptionChange,
  sampleUrl,
  name,
  breed,
  locationName,
}: FramePickerProps) {
  const t = useTranslations("card");
  const sample = sampleUrl ? [sampleUrl] : [];
  const hasCaption = frameHasCaption(value);

  function selectFrame(frame: FrameStyle) {
    // The caption means a different thing per frame (call number vs ticket line
    // vs greeting), so a custom one doesn't carry over when the style changes.
    if (frame !== value && caption) onCaptionChange("");
    onChange(frame);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wide text-muted">{t("chooseFrame")}</p>
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FRAME_STYLES.map((frame) => {
            const selected = frame === value;
            return (
              <button
                key={frame}
                type="button"
                onClick={() => selectFrame(frame)}
                aria-pressed={selected}
                className="flex w-[112px] shrink-0 flex-col items-center gap-1.5 outline-none"
              >
                <span
                  className={`relative block w-full rounded-lg border-2 bg-background p-2 transition-colors ${
                    selected ? "border-accent" : "border-transparent"
                  }`}
                >
                  {selected && (
                    <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <EntryFrame
                    frameStyle={frame}
                    photoUrls={sample}
                    name={name ?? null}
                    breed={breed ?? null}
                    locationName={locationName}
                    date={new Date()}
                    entryId={frame}
                    frameColor={color}
                    // Tilt + custom caption only preview on the selected style.
                    frameTilt={selected ? tilt : null}
                    frameCaption={selected ? caption : null}
                    preview
                  />
                </span>
                <span className={`text-[11px] font-medium ${selected ? "text-accent" : "text-muted"}`}>
                  {t(`frames.name.${frame}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chrome color */}
      <div>
        <p className="px-1 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{t("frameColorLabel")}</p>
        <div className="flex flex-wrap gap-2 px-1">
          {FRAME_COLOR_KEYS.map((key) => {
            const ink = frameInk(key);
            const selected = key === color;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onColorChange(key)}
                aria-pressed={selected}
                aria-label={t(`colors.${key}`)}
                title={t(`colors.${key}`)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                  selected ? "border-accent" : "border-border"
                }`}
                style={ink ? { backgroundColor: ink } : undefined}
              >
                {/* DEFAULT shows a small dash; chosen colors show a check when active. */}
                {ink ? (
                  selected && <Check size={14} strokeWidth={3} className="text-white" />
                ) : (
                  <span className="text-[10px] font-semibold uppercase text-muted">{selected ? "✓" : "—"}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tilt */}
      <div className="px-1">
        <div className="flex items-center justify-between pb-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("tiltLabel")}</p>
          <span className="text-xs tabular-nums text-muted">
            {tilt === null ? t("tiltAuto") : `${tilt > 0 ? "+" : ""}${tilt}°`}
          </span>
        </div>
        <input
          type="range"
          min={FRAME_TILT_MIN}
          max={FRAME_TILT_MAX}
          step={1}
          value={tilt ?? 0}
          onChange={(e) => onTiltChange(Number(e.target.value))}
          aria-label={t("tiltLabel")}
          className="w-full accent-accent"
        />
        {tilt !== null && (
          <button
            type="button"
            onClick={() => onTiltChange(null)}
            className="mt-0.5 text-[11px] font-medium text-accent hover:underline"
          >
            {t("tiltReset")}
          </button>
        )}
      </div>

      {/* Custom label — only for frames that have one */}
      {hasCaption && (
        <label className="block px-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            {t(`captionLabel.${value}`)}
          </span>
          <input
            type="text"
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder={t(`captionPlaceholder.${value}`)}
            maxLength={MAX_FRAME_CAPTION}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
          />
          <span className="mt-1 block text-[11px] leading-snug text-muted">{t(`captionHelp.${value}`)}</span>
        </label>
      )}
    </div>
  );
}
