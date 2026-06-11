"use client";

import { useState } from "react";

type DevelopingPhotoProps = {
  src: string;
  alt: string;
  /** Layout classes for the frame (the snap/sizing wrapper). */
  frameClassName?: string;
  /** Visual classes for the image itself (object-fit, sizing). */
  imgClassName?: string;
  loading?: "lazy" | "eager";
  onClick?: () => void;
  onDoubleClick?: () => void;
};

/* Slow networks make a blank polaroid look broken. Instead, lean into the
   instant-film metaphor: until the bytes arrive the frame shows an
   "undeveloped" warm-grey emulsion with a faint chemical shimmer, then on
   load the colours slowly bloom in (opacity + a sepia→full-colour filter
   sweep), like a Polaroid developing in your hand. */
export function DevelopingPhoto({
  src,
  alt,
  frameClassName = "",
  imgClassName = "",
  loading,
  onClick,
  onDoubleClick,
}: DevelopingPhotoProps) {
  const [developed, setDeveloped] = useState(false);

  return (
    <span className={`developing-frame ${frameClassName}`} data-developed={developed ? "true" : "false"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setDeveloped(true)}
        // If the image is served from cache it may already be complete before
        // React attaches onLoad — develop it immediately in that case.
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0) setDeveloped(true);
        }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={`developing-img ${imgClassName}`}
      />
    </span>
  );
}
