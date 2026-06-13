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
  MAX_FRAME_LABEL,
  frameInk,
  framePaperSwatch,
  frameHasCaption,
  frameHasLabel,
  type FrameStyle,
  type FrameColorKey,
} from "@/lib/frames";

type FramePickerProps = {
  value: FrameStyle;
  onChange: (frame: FrameStyle) => void;
  color: FrameColorKey;
  onColorChange: (color: FrameColorKey) => void;
  /** Paper-tint preset; DEFAULT = the frame's own card stock. */
  paper: FrameColorKey;
  onPaperChange: (paper: FrameColorKey) => void;
  /** Hand-set tilt in degrees; null = the automatic, id-hashed tilt. */
  tilt: number | null;
  onTiltChange: (tilt: number | null) => void;
  /** Custom text for the selected frame's value field; "" = the auto default. */
  caption: string;
  onCaptionChange: (caption: string) => void;
  /** Custom header label (index card only); "" = the default ("Call no."). */
  label: string;
  onLabelChange: (label: string) => void;
  /** A sample photo to preview each frame on — the entry's cover. */
  sampleUrl?: string | null;
  name?: string | null;
  breed?: string | null;
  locationName?: string | null;
};

/**
 * The frame customizer: a large live preview of the selected frame, a strip of
 * frame choices, and controls to recolor the chrome, tint the paper, hand-set
 * the tilt, and rename the frame's label/value text. Everything here is
 * presentation only, so it never blocks posting — it just deepens the notebook
 * feel.
 */
export function FramePicker({
  value,
  onChange,
  color,
  onColorChange,
  paper,
  onPaperChange,
  tilt,
  onTiltChange,
  caption,
  onCaptionChange,
  label,
  onLabelChange,
  sampleUrl,
  name,
  breed,
  locationName,
}: FramePickerProps) {
  const t = useTranslations("card");
  const sample = sampleUrl ? [sampleUrl] : [];
  const hasCaption = frameHasCaption(value);
  const hasLabel = frameHasLabel(value);

  function selectFrame(frame: FrameStyle) {
    if (frame === value) return;
    // The label/value text means a different thing per frame (call number vs
    // ticket line vs greeting), so a custom one doesn't carry to another style.
    if (caption) onCaptionChange("");
    if (label) onLabelChange("");
    onChange(frame);
  }

  return (
    <div className="space-y-4">
      {/* Live preview of the selected frame, with all customizations applied */}
      <div>
        <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wide text-muted">{t("framePreviewLabel")}</p>
        <div className="flex justify-center rounded-xl border border-border bg-background py-5">
          <div className="w-full max-w-[260px]">
            <EntryFrame
              frameStyle={value}
              photoUrls={sample}
              name={name ?? null}
              breed={breed ?? null}
              locationName={locationName}
              date={new Date()}
              entryId="frame-preview"
              frameColor={color}
              framePaper={paper}
              frameTilt={tilt}
              frameCaption={caption}
              frameLabel={label}
            />
          </div>
        </div>
      </div>

      {/* Choose the frame style */}
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
                className="flex w-[96px] shrink-0 flex-col items-center gap-1.5 outline-none"
              >
                <span
                  className={`relative block w-full rounded-lg border-2 bg-background p-1.5 transition-colors ${
                    selected ? "border-accent" : "border-transparent"
                  }`}
                >
                  {selected && (
                    <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  {/* Uniform square tile so the strip stays tidy across styles. */}
                  <span className="flex aspect-square items-center justify-center overflow-hidden">
                    <EntryFrame
                      frameStyle={frame}
                      photoUrls={sample}
                      name={name ?? null}
                      breed={breed ?? null}
                      locationName={locationName}
                      date={new Date()}
                      entryId={frame}
                      frameColor={color}
                      framePaper={paper}
                      preview
                    />
                  </span>
                </span>
                <span className={`text-[11px] font-medium ${selected ? "text-accent" : "text-muted"}`}>
                  {t(`frames.name.${frame}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chrome (border) color */}
      <ColorSwatches
        title={t("frameColorLabel")}
        selected={color}
        onSelect={onColorChange}
        swatch={(key) => frameInk(key)}
        ariaFor={(key) => t(`colors.${key}`)}
      />

      {/* Paper tint */}
      <ColorSwatches
        title={t("framePaperLabel")}
        selected={paper}
        onSelect={onPaperChange}
        swatch={(key) => framePaperSwatch(key)}
        ariaFor={(key) => t(`colors.${key}`)}
      />

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

      {/* Custom header label — index card only */}
      {hasLabel && (
        <label className="block px-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">{t("frameLabelTitle")}</span>
          <input
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={t("frameLabelPlaceholder")}
            maxLength={MAX_FRAME_LABEL}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
          />
          <span className="mt-1 block text-[11px] leading-snug text-muted">{t("frameLabelHelp")}</span>
        </label>
      )}

      {/* Custom value text — frames that carry a label/banner */}
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

type ColorSwatchesProps = {
  title: string;
  selected: FrameColorKey;
  onSelect: (key: FrameColorKey) => void;
  /** The fill color to show for a key, or null for the DEFAULT (no fill). */
  swatch: (key: FrameColorKey) => string | null;
  ariaFor: (key: FrameColorKey) => string;
};

/** A row of round color choices (shared by the chrome-color and paper pickers). */
function ColorSwatches({ title, selected, onSelect, swatch, ariaFor }: ColorSwatchesProps) {
  return (
    <div>
      <p className="px-1 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-wrap gap-2 px-1">
        {FRAME_COLOR_KEYS.map((key) => {
          const fill = swatch(key);
          const isSelected = key === selected;
          // A check reads clearly on a strong chrome ink but is invisible on the
          // pale paper wash, so paper swatches show a ring + dash instead.
          const strong = fill && fill.startsWith("#");
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
              aria-label={ariaFor(key)}
              title={ariaFor(key)}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                isSelected ? "border-accent" : "border-border"
              }`}
              style={fill ? { backgroundColor: fill } : undefined}
            >
              {fill ? (
                isSelected &&
                (strong ? (
                  <Check size={14} strokeWidth={3} className="text-white" />
                ) : (
                  <Check size={14} strokeWidth={3} className="text-foreground" />
                ))
              ) : (
                <span className="text-[10px] font-semibold uppercase text-muted">{isSelected ? "✓" : "—"}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
