"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { X, Plus, SlidersHorizontal, GripVertical } from "lucide-react";

export type StripPhoto = { id: string; previewUrl: string };

type Props = {
  photos: StripPhoto[];
  max: number;
  disabled?: boolean;
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onAddMore: () => void;
};

export function SortablePhotoStrip({
  photos,
  max,
  disabled = false,
  onReorder,
  onRemove,
  onEdit,
  onAddMore,
}: Props) {
  const t = useTranslations("capture.strip");
  const sensors = useSensors(
    // A small movement threshold lets taps on the per-photo buttons still
    // register as clicks instead of immediately starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(photos, oldIndex, newIndex).map((p) => p.id));
  }

  const slotsLeft = max - photos.length;

  return (
    <div className="px-4 pt-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2.5">
            {photos.map((photo, i) => (
              <SortableTile
                key={photo.id}
                photo={photo}
                index={i}
                disabled={disabled}
                onRemove={() => onRemove(photo.id)}
                onEdit={() => onEdit(photo.id)}
              />
            ))}
            {slotsLeft > 0 && !disabled && (
              <button
                type="button"
                onClick={onAddMore}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted transition-colors hover:text-foreground"
                aria-label={t("addPhoto")}
              >
                <Plus size={22} />
                <span className="text-[11px]">
                  {photos.length}/{max}
                </span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>
      {photos.length > 1 && !disabled && (
        <p className="pt-2 text-[11px] text-muted">{t("reorderHint")}</p>
      )}
    </div>
  );
}

function SortableTile({
  photo,
  index,
  disabled,
  onRemove,
  onEdit,
}: {
  photo: StripPhoto;
  index: number;
  disabled: boolean;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const t = useTranslations("capture.strip");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  } as const;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square touch-none select-none ${
        isDragging ? "opacity-80 shadow-lg scale-[1.03]" : ""
      }`}
    >
      {/* The whole tile is the drag handle (with a visible grip affordance). */}
      <div
        {...attributes}
        {...listeners}
        className="h-full w-full overflow-hidden rounded-xl"
        aria-label={t("dragHandle", { n: index + 1 })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.previewUrl}
          alt={t("photoAlt", { n: index + 1 })}
          draggable={false}
          className="h-full w-full object-cover"
        />
      </div>

      {index === 0 && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          {t("cover")}
        </span>
      )}

      {!disabled && (
        <>
          <button
            type="button"
            onClick={onRemove}
            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm"
            aria-label={t("removePhoto", { n: index + 1 })}
          >
            <X size={13} />
          </button>

          <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white"
              aria-label={t("editPhoto", { n: index + 1 })}
            >
              <SlidersHorizontal size={12} />
              {t("edit")}
            </button>
            <span className="pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white/80">
              <GripVertical size={14} />
            </span>
          </div>
        </>
      )}
    </div>
  );
}
