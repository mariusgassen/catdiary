"use client";

import { PawPrint, Eye, Sparkles, ScanSearch, Shield, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { REACTION_KINDS, type ReactionBreakdown, type ReactionKind } from "@/lib/reactions";

// Icon for each themed stamp. Labels live in i18n (`card.reactions.label.*`) so
// they translate; the icon is the shared visual across the picker, the footer
// button and the owner's breakdown.
export const REACTION_ICON: Record<ReactionKind, LucideIcon> = {
  PAW: PawPrint, // plain "I saw this" paw
  SPOTTED: Eye, // "spotted!"
  HANDSOME: Sparkles, // "handsome devil"
  SAME_CAT: ScanSearch, // "same cat?" — a re-identification signal, not applause
  SAFE: Shield, // "be safe"
};

/**
 * The owner-only per-stamp breakdown for an entry. Reactions are observational,
 * not a scoreboard, so this is shown to the entry owner alone and never ranks
 * anything — it's just "who left what" on your own page.
 */
export function ReactionSummary({ breakdown }: { breakdown: ReactionBreakdown }) {
  const t = useTranslations("card");
  const counts = new Map(breakdown.map((b) => [b.kind, b.count]));
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) return null;

  // Stable display order (the catalog order), skipping stamps no one left.
  const shown = REACTION_KINDS.filter((k) => (counts.get(k) ?? 0) > 0);

  return (
    <section className="mx-3 rounded-xl border border-dashed border-border bg-surface px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {t("reactions.summaryTitle")}
      </h2>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {shown.map((kind) => {
          const Icon = REACTION_ICON[kind];
          return (
            <li key={kind} className="flex items-center gap-1.5 text-sm text-foreground">
              <Icon size={16} strokeWidth={1.75} className="text-accent" />
              <span className="font-semibold">{counts.get(kind)}</span>
              <span className="text-muted">{t(`reactions.label.${kind}`)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
