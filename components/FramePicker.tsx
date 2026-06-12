"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { EntryFrame } from "@/components/EntryFrame";
import { FRAME_STYLES, type FrameStyle } from "@/lib/frames";

type FramePickerProps = {
  value: FrameStyle;
  onChange: (frame: FrameStyle) => void;
  /** A sample photo to preview each frame on — the entry's cover. */
  sampleUrl?: string | null;
  name?: string | null;
  breed?: string | null;
  locationName?: string | null;
};

/**
 * A horizontal strip of frame choices, each previewing the chosen style on the
 * user's own cover photo. The frame is presentation only, so this never blocks
 * posting — it just deepens the notebook feel.
 */
export function FramePicker({ value, onChange, sampleUrl, name, breed, locationName }: FramePickerProps) {
  const t = useTranslations("card");
  const sample = sampleUrl ? [sampleUrl] : [];

  return (
    <div>
      <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wide text-muted">{t("chooseFrame")}</p>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FRAME_STYLES.map((frame) => {
          const selected = frame === value;
          return (
            <button
              key={frame}
              type="button"
              onClick={() => onChange(frame)}
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
  );
}
