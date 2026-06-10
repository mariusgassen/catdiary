"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { displayNameFor } from "@/lib/userDisplay";

export type CommentItem = {
  id: string;
  body: string;
  createdAt: string | Date;
  user: { id: string; displayName: string | null; username?: string | null; image?: string | null };
};

const COMMENT_DATE = new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" });

function Avatar({ user }: { user: { displayName: string | null; username?: string | null; image?: string | null } }) {
  const name = displayNameFor(user);
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt={name} className="w-6 h-6 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-accent text-[11px] font-semibold select-none shrink-0">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

/*
 * Comments rendered as margin notes on a lined notebook page: a red margin
 * rule separates the gutter (avatars) from the writing area, every line of
 * text sits on the page's ruling (line-height = --rule-h = 28px), and each
 * note is signed "— name · date" like an annotation left by another reader.
 */
export function CommentsSection({
  entryId,
  entryOwnerId,
  viewerId,
  initialComments,
}: {
  entryId: string;
  entryOwnerId: string;
  viewerId: string | null;
  initialComments: CommentItem[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cat-entries/${entryId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error();
      const data: { comment: CommentItem } = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setDraft("");
    } catch {
      setError("Could not add your note. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    const prev = comments;
    setComments((c) => c.filter((comment) => comment.id !== commentId));
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) setComments(prev);
  }

  return (
    <section id="comments" className="mx-3 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="ruled-page relative">
        {/* Heading sits on the first ruled line, right of the margin rule */}
        <h2 className="grid grid-cols-[2.75rem_1fr]">
          <span aria-hidden />
          <span className="pl-3 pr-4 text-xs font-semibold uppercase tracking-wide leading-[28px] text-muted">
            Margin notes{comments.length > 0 && ` · ${comments.length}`}
          </span>
        </h2>

        {comments.length === 0 ? (
          <p className="grid grid-cols-[2.75rem_1fr]">
            <span aria-hidden />
            <span className="pl-3 pr-4 text-sm italic leading-[28px] text-muted">
              No notes in the margins yet.
            </span>
          </p>
        ) : (
          <ul>
            {comments.map((comment) => {
              const canDelete = viewerId === comment.user.id || viewerId === entryOwnerId;
              return (
                <li key={comment.id} className="grid grid-cols-[2.75rem_1fr]">
                  <div className="flex items-start justify-center pt-[2px]">
                    <Avatar user={comment.user} />
                  </div>
                  <p className="break-words pl-3 pr-4 text-sm leading-[28px]">
                    <span className="italic text-foreground/90">{comment.body}</span>
                    <span className="whitespace-nowrap text-xs text-accent">
                      {" "}
                      —{" "}
                      <Link href={`/profile/${comment.user.id}`} className="font-medium hover:underline">
                        {displayNameFor(comment.user)}
                      </Link>
                      {" · "}
                      {COMMENT_DATE.format(new Date(comment.createdAt))}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="ml-1.5 inline-flex translate-y-[1px] text-muted hover:text-red-500 transition-colors"
                        aria-label="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {viewerId ? (
          <form onSubmit={handleSubmit} className="grid grid-cols-[2.75rem_1fr]">
            <span aria-hidden />
            <div className="flex items-start gap-2 pl-3 pr-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Scribble a note in the margin…"
                rows={1}
                maxLength={1000}
                className="min-h-[28px] flex-1 resize-none bg-transparent text-sm italic leading-[28px] outline-none placeholder:italic placeholder:text-muted/80"
              />
              <button
                type="submit"
                disabled={submitting || !draft.trim()}
                className="flex h-7 w-7 items-center justify-center self-start rounded-full text-accent transition-transform active:scale-95 hover:bg-accent-soft disabled:opacity-40"
                aria-label="Post note"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </form>
        ) : (
          <p className="grid grid-cols-[2.75rem_1fr]">
            <span aria-hidden />
            <span className="pl-3 pr-4 text-sm italic leading-[28px] text-muted">
              <Link href={`/sign-in?callbackUrl=/cat-entries/${entryId}`} className="not-italic text-accent hover:underline">
                Sign in
              </Link>{" "}
              to leave a note.
            </span>
          </p>
        )}
        {error && (
          <p className="grid grid-cols-[2.75rem_1fr]">
            <span aria-hidden />
            <span className="pl-3 pr-4 text-xs leading-[28px] text-red-500">{error}</span>
          </p>
        )}

        {/* one empty ruled line at the bottom of the page */}
        <div className="h-[28px]" aria-hidden />
      </div>
    </section>
  );
}
