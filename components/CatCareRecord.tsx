"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Globe, Loader2, Lock, Plus, Trash2 } from "lucide-react";

type Vaccination = { id: string; name: string; givenAt: string | Date; dueAt: string | Date | null; notes: string | null };
type WeightLogEntry = { id: string; weightKg: number; measuredAt: string | Date; notes: string | null };

export type CatCareRecordData = {
  microchipId: string | null;
  neutered: boolean | null;
  birthday: string | Date | null;
  vetNotes: string | null;
  allergies: string | null;
  carePublic: boolean;
  vaccinations: Vaccination[];
  weightEntries: WeightLogEntry[];
};

function hasScalarDetails(record: CatCareRecordData) {
  return Boolean(record.microchipId || record.neutered !== null || record.birthday || record.vetNotes || record.allergies);
}

const fieldInputClass =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent";

/**
 * A cat's care record: microchip/neuter/birthday/vet notes/allergies plus a
 * vaccination history and weight log. Always rendered for the owner (with
 * add/delete controls); the page only passes a `record` to non-owners once
 * it has already confirmed the record is visible (`carePublic` + can-view),
 * so this component never re-checks visibility itself.
 */
export function CatCareRecord({ catId, record, isOwner }: { catId: string; record: CatCareRecordData; isOwner: boolean }) {
  const t = useTranslations("cats");
  const locale = useLocale();
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

  const [vaccinations, setVaccinations] = useState(record.vaccinations);
  const [weightEntries, setWeightEntries] = useState(record.weightEntries);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [addingVaccination, setAddingVaccination] = useState(false);
  const [vaccName, setVaccName] = useState("");
  const [vaccGivenAt, setVaccGivenAt] = useState("");
  const [vaccDueAt, setVaccDueAt] = useState("");
  const [vaccBusy, setVaccBusy] = useState(false);

  const [addingWeight, setAddingWeight] = useState(false);
  const [weightValue, setWeightValue] = useState("");
  const [weightMeasuredAt, setWeightMeasuredAt] = useState("");
  const [weightBusy, setWeightBusy] = useState(false);

  if (!isOwner && !hasScalarDetails(record) && vaccinations.length === 0 && weightEntries.length === 0) {
    return null;
  }

  async function submitVaccination(event: FormEvent) {
    event.preventDefault();
    if (!vaccName.trim() || !vaccGivenAt) return;
    setVaccBusy(true);
    try {
      const res = await fetch(`/api/cats/${catId}/vaccinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: vaccName.trim(), givenAt: vaccGivenAt, dueAt: vaccDueAt || null }),
      });
      if (!res.ok) return;
      const { vaccination } = (await res.json()) as { vaccination: Vaccination };
      setVaccinations((prev) => [vaccination, ...prev].sort((a, b) => +new Date(b.givenAt) - +new Date(a.givenAt)));
      setVaccName("");
      setVaccGivenAt("");
      setVaccDueAt("");
      setAddingVaccination(false);
    } finally {
      setVaccBusy(false);
    }
  }

  async function removeVaccination(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/cats/${catId}/vaccinations/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setVaccinations((prev) => prev.filter((v) => v.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function submitWeight(event: FormEvent) {
    event.preventDefault();
    const kg = Number(weightValue);
    if (!Number.isFinite(kg) || kg <= 0 || !weightMeasuredAt) return;
    setWeightBusy(true);
    try {
      const res = await fetch(`/api/cats/${catId}/weight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: kg, measuredAt: weightMeasuredAt }),
      });
      if (!res.ok) return;
      const { weightEntry } = (await res.json()) as { weightEntry: WeightLogEntry };
      setWeightEntries((prev) => [weightEntry, ...prev].sort((a, b) => +new Date(b.measuredAt) - +new Date(a.measuredAt)));
      setWeightValue("");
      setWeightMeasuredAt("");
      setAddingWeight(false);
    } finally {
      setWeightBusy(false);
    }
  }

  async function removeWeightEntry(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/cats/${catId}/weight/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setWeightEntries((prev) => prev.filter((w) => w.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  const scalarRows: { label: string; value: string }[] = [];
  if (record.microchipId || isOwner) {
    scalarRows.push({ label: t("careMicrochip"), value: record.microchipId ?? t("careNotSet") });
  }
  if (record.neutered !== null || isOwner) {
    scalarRows.push({
      label: t("neuteredLabel"),
      value: record.neutered === null ? t("careNotSet") : record.neutered ? t("neuteredYes") : t("neuteredNo"),
    });
  }
  if (record.birthday || isOwner) {
    scalarRows.push({
      label: t("birthdayLabel"),
      value: record.birthday ? dateFmt.format(new Date(record.birthday)) : t("careNotSet"),
    });
  }
  if (record.allergies || isOwner) {
    scalarRows.push({ label: t("allergiesLabel"), value: record.allergies ?? t("careNotSet") });
  }

  const todayValue = new Date().toISOString().slice(0, 10);

  return (
    <section className="mx-3 flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("careHeading")}</h2>
        {isOwner && (
          <span className="flex items-center gap-1 text-xs text-muted">
            {record.carePublic ? <Globe size={12} aria-hidden /> : <Lock size={12} aria-hidden />}
            {record.carePublic ? t("carePublicBadge") : t("carePrivateBadge")}
          </span>
        )}
      </div>

      {scalarRows.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {scalarRows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-xs text-muted">{row.label}</dt>
              <dd className="truncate font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {record.vetNotes && (
        <div>
          <p className="text-xs text-muted">{t("vetNotesLabel")}</p>
          <p className="whitespace-pre-wrap text-sm">{record.vetNotes}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-dashed border-border pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("vaccinationsHeading")}</h3>
          {isOwner && (
            <button
              type="button"
              onClick={() => setAddingVaccination((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-accent"
            >
              <Plus size={13} aria-hidden />
              {t("addVaccination")}
            </button>
          )}
        </div>
        {vaccinations.length === 0 && !addingVaccination && <p className="text-xs text-muted">{t("noVaccinations")}</p>}
        {vaccinations.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {vaccinations.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{v.name}</span>{" "}
                  <span className="text-xs text-muted">{dateFmt.format(new Date(v.givenAt))}</span>
                  {v.dueAt && <span className="ml-1 text-xs text-muted">{t("dueOn", { date: dateFmt.format(new Date(v.dueAt)) })}</span>}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => removeVaccination(v.id)}
                    disabled={busyId === v.id}
                    aria-label={t("removeVaccination")}
                    className="shrink-0 text-muted transition-colors hover:text-red-600 disabled:opacity-50"
                  >
                    {busyId === v.id ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Trash2 size={13} aria-hidden />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {addingVaccination && (
          <form onSubmit={submitVaccination} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2.5">
            <input
              placeholder={t("vaccinationNamePlaceholder")}
              value={vaccName}
              onChange={(e) => setVaccName(e.target.value)}
              maxLength={120}
              className={fieldInputClass}
            />
            <div className="flex gap-2">
              <label className="flex-1 text-xs text-muted">
                {t("givenAtLabel")}
                <input
                  type="date"
                  value={vaccGivenAt}
                  onChange={(e) => setVaccGivenAt(e.target.value)}
                  max={todayValue}
                  className={`mt-0.5 w-full ${fieldInputClass}`}
                />
              </label>
              <label className="flex-1 text-xs text-muted">
                {t("dueAtLabel")}
                <input
                  type="date"
                  value={vaccDueAt}
                  onChange={(e) => setVaccDueAt(e.target.value)}
                  className={`mt-0.5 w-full ${fieldInputClass}`}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAddingVaccination(false)} className="px-2 py-1 text-xs text-muted">
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={vaccBusy || !vaccName.trim() || !vaccGivenAt}
                className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {vaccBusy && <Loader2 size={12} className="animate-spin" aria-hidden />}
                {t("save")}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-dashed border-border pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("weightHeading")}</h3>
          {isOwner && (
            <button
              type="button"
              onClick={() => setAddingWeight((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-accent"
            >
              <Plus size={13} aria-hidden />
              {t("addWeight")}
            </button>
          )}
        </div>
        {weightEntries.length === 0 && !addingWeight && <p className="text-xs text-muted">{t("noWeightEntries")}</p>}
        {weightEntries.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {weightEntries.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{t("weightKg", { kg: w.weightKg })}</span>{" "}
                  <span className="text-xs text-muted">{dateFmt.format(new Date(w.measuredAt))}</span>
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => removeWeightEntry(w.id)}
                    disabled={busyId === w.id}
                    aria-label={t("removeWeightEntry")}
                    className="shrink-0 text-muted transition-colors hover:text-red-600 disabled:opacity-50"
                  >
                    {busyId === w.id ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Trash2 size={13} aria-hidden />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {addingWeight && (
          <form onSubmit={submitWeight} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2.5">
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder={t("weightPlaceholder")}
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                className={`flex-1 ${fieldInputClass}`}
              />
              <input
                type="date"
                value={weightMeasuredAt}
                onChange={(e) => setWeightMeasuredAt(e.target.value)}
                max={todayValue}
                className={`flex-1 ${fieldInputClass}`}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAddingWeight(false)} className="px-2 py-1 text-xs text-muted">
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={weightBusy || !weightValue || !weightMeasuredAt}
                className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {weightBusy && <Loader2 size={12} className="animate-spin" aria-hidden />}
                {t("save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
