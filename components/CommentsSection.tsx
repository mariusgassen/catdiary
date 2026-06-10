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
    return <img src={user.image} alt={name} className="w-7 h-7 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center text-accent text-xs font-semibold select-none shrink-0">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

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
    <section id="comments" className="mx-3 rounded-xl border border-border bg-surface px-4 py-4 shadow-sm">
      <h2 className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Margin notes{comments.length > 0 && ` · ${comments.length}`}
      </h2>

      {comments.length === 0 ? (
        <p className="pb-3 text-sm text-muted">No notes in the margins yet.</p>
      ) : (
        <ul className="flex flex-col gap-3 pb-3">
          {comments.map((comment) => {
            const canDelete = viewerId === comment.user.id || viewerId === entryOwnerId;
            return (
              <li key={comment.id} className="flex items-start gap-2.5">
                <Avatar user={comment.user} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">
                    <Link href={`/profile/${comment.user.id}`} className="font-semibold text-foreground hover:underline">
                      {displayNameFor(comment.user)}
                    </Link>{" "}
                    · {COMMENT_DATE.format(new Date(comment.createdAt))}
                  </p>
                  <p className="break-words text-sm leading-relaxed text-foreground">{comment.body}</p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1 text-muted hover:text-red-500 transition-colors"
                    aria-label="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {viewerId ? (
        <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-dashed border-border pt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note in the margin…"
            rows={1}
            maxLength={1000}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={submitting || !draft.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm shadow-accent/30 transition-transform active:scale-95 disabled:opacity-40"
            aria-label="Post note"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      ) : (
        <p className="border-t border-dashed border-border pt-3 text-sm text-muted">
          <Link href={`/sign-in?callbackUrl=/cat-entries/${entryId}`} className="text-accent hover:underline">
            Sign in
          </Link>{" "}
          to leave a note.
        </p>
      )}
      {error && <p className="pt-2 text-sm text-red-500">{error}</p>}
    </section>
  );
}
