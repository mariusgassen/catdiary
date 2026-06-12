"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { CornerDownRight, Loader2, Reply, Send, Trash2, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { displayNameFor } from "@/lib/userDisplay";
import { HashtagCaption } from "@/components/HashtagCaption";

type UserSuggestion = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
  image: string | null;
};

export type CommentItem = {
  id: string;
  body: string;
  parentId?: string | null;
  createdAt: string | Date;
  user: { id: string; displayName: string | null; username?: string | null; avatarKey?: string | null; image?: string | null };
};

export type CommentThread = CommentItem & { replies: CommentItem[] };

function Avatar({
  user,
  size = 6,
}: {
  user: { displayName: string | null; username?: string | null; avatarKey?: string | null; image?: string | null };
  size?: 5 | 6;
}) {
  const name = displayNameFor(user);
  const sizeClass = size === 5 ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-[11px]";
  const src = user.avatarKey ? `/api/photos/${user.avatarKey}` : (user.image ?? null);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${sizeClass} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-accent-soft flex items-center justify-center text-accent font-semibold select-none shrink-0`}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

/*
 * Comments rendered as margin notes on a lined notebook page: a red margin
 * rule separates the gutter (avatars) from the writing area, every line of
 * text sits on the page's ruling (line-height = --rule-h = 28px), and each
 * note is signed "— name · date" like an annotation left by another reader.
 *
 * Replies are tabulated margin notes: indented one tab stop under the note
 * they answer (max display depth 2 — replying to a reply joins the same
 * thread), kept in posting order within the thread.
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
  initialComments: CommentThread[];
}) {
  const t = useTranslations("comments");
  const locale = useLocale();
  const commentDate = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });

  const [threads, setThreads] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{ rootId: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  // @mention autocomplete
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const mentionStartRef = useRef<number>(-1);
  const fetchCtrlRef = useRef<AbortController | null>(null);

  function detectMention(text: string, cursor: number): string | null {
    const match = text.slice(0, cursor).match(/@([\w.]*)$/);
    if (match) {
      mentionStartRef.current = cursor - match[0].length;
      return match[1];
    }
    mentionStartRef.current = -1;
    return null;
  }

  async function fetchSuggestions(q: string) {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
      if (res.ok) {
        const data = (await res.json()) as { users: UserSuggestion[] };
        setSuggestions(data.users.slice(0, 5));
      }
    } catch {
      // aborted or network error
    }
  }

  function insertMention(username: string) {
    const el = draftRef.current;
    if (!el || mentionStartRef.current < 0) return;
    const before = draft.slice(0, mentionStartRef.current);
    const after = draft.slice(el.selectionStart ?? draft.length);
    const inserted = `@${username} `;
    setDraft(before + inserted + after);
    setSuggestions([]);
    setMentionQuery(null);
    mentionStartRef.current = -1;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const commentCount = threads.reduce((n, t) => n + 1 + t.replies.length, 0);

  function startReply(rootId: string, name: string) {
    setReplyTo({ rootId, name });
    draftRef.current?.focus();
  }

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
        body: JSON.stringify({ body, ...(replyTo ? { parentId: replyTo.rootId } : {}) }),
      });
      if (!res.ok) throw new Error();
      const data: { comment: CommentItem } = await res.json();
      if (data.comment.parentId) {
        setThreads((prev) =>
          prev.map((t) => (t.id === data.comment.parentId ? { ...t, replies: [...t.replies, data.comment] } : t)),
        );
      } else {
        setThreads((prev) => [...prev, { ...data.comment, replies: [] }]);
      }
      setDraft("");
      setReplyTo(null);
    } catch {
      setError(t("couldNotAdd"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    const prev = threads;
    setThreads((ts) =>
      ts
        .filter((t) => t.id !== commentId)
        .map((t) => ({ ...t, replies: t.replies.filter((r) => r.id !== commentId) })),
    );
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) setThreads(prev);
  }

  function noteSignature(comment: CommentItem) {
    const canDelete = viewerId === comment.user.id || viewerId === entryOwnerId;
    return (
      <>
        <span className="whitespace-nowrap text-xs text-accent">
          {" "}
          —{" "}
          <Link href={`/profile/${comment.user.id}`} className="font-medium hover:underline">
            {displayNameFor(comment.user)}
          </Link>
          {" · "}
          {commentDate.format(new Date(comment.createdAt))}
        </span>
        {viewerId && (
          <button
            onClick={() => startReply(comment.parentId ?? comment.id, displayNameFor(comment.user))}
            className="ml-1.5 inline-flex translate-y-[1px] text-muted hover:text-accent transition-colors"
            aria-label={t("replyTo", { name: displayNameFor(comment.user) })}
          >
            <Reply size={12} />
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => handleDelete(comment.id)}
            className="ml-1.5 inline-flex translate-y-[1px] text-muted hover:text-red-500 transition-colors"
            aria-label={t("deleteNote")}
          >
            <Trash2 size={12} />
          </button>
        )}
      </>
    );
  }

  return (
    <section id="comments" className="mx-3 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="ruled-page relative">
        {/* Heading sits on the first ruled line, right of the margin rule */}
        <h2 className="grid grid-cols-[2.75rem_1fr]">
          <span aria-hidden />
          <span className="pl-3 pr-4 text-xs font-semibold uppercase tracking-wide leading-[28px] text-muted">
            {t("heading")}{commentCount > 0 && ` · ${commentCount}`}
          </span>
        </h2>

        {threads.length === 0 ? (
          <p className="grid grid-cols-[2.75rem_1fr]">
            <span aria-hidden />
            <span className="pl-3 pr-4 text-sm italic leading-[28px] text-muted">
              {t("noNotes")}
            </span>
          </p>
        ) : (
          <ul>
            {threads.map((thread) => (
              <li key={thread.id}>
                <div className="grid grid-cols-[2.75rem_1fr]">
                  <div className="flex items-start justify-center pt-[2px]">
                    <Avatar user={thread.user} />
                  </div>
                  <p className="break-words pl-3 pr-4 text-sm leading-[28px]">
                    <span className="italic text-foreground/90">
                      <HashtagCaption text={thread.body} />
                    </span>
                    {noteSignature(thread)}
                  </p>
                </div>
                {thread.replies.length > 0 && (
                  <ul>
                    {thread.replies.map((reply) => (
                      <li key={reply.id} className="grid grid-cols-[2.75rem_1fr]">
                        <span aria-hidden />
                        <p className="break-words pl-8 pr-4 text-sm leading-[28px]">
                          <span className="mr-1.5 inline-flex translate-y-[2px] items-center gap-1 text-muted">
                            <CornerDownRight size={11} aria-hidden />
                            <Avatar user={reply.user} size={5} />
                          </span>
                          <span className="italic text-foreground/90">
                            <HashtagCaption text={reply.body} />
                          </span>
                          {noteSignature(reply)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        {viewerId ? (
          <form onSubmit={handleSubmit} className="grid grid-cols-[2.75rem_1fr]">
            <span aria-hidden />
            <div className="relative pl-3 pr-3">
              {replyTo && (
                <p className="flex items-center gap-1 text-xs leading-[28px] text-muted">
                  <CornerDownRight size={11} aria-hidden />
                  {t("replyingTo")} <span className="font-medium text-accent">{replyTo.name}</span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="ml-0.5 inline-flex text-muted hover:text-foreground transition-colors"
                    aria-label={t("cancelReply")}
                  >
                    <X size={12} />
                  </button>
                </p>
              )}
              <div className="flex items-start gap-2">
                <textarea
                  ref={draftRef}
                  value={draft}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraft(val);
                    const q = detectMention(val, e.target.selectionStart ?? val.length);
                    setMentionQuery(q);
                    if (q !== null) void fetchSuggestions(q);
                    else setSuggestions([]);
                  }}
                  onKeyUp={(e) => {
                    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                      const el = e.currentTarget;
                      const q = detectMention(el.value, el.selectionStart ?? el.value.length);
                      setMentionQuery(q);
                      if (q !== null) void fetchSuggestions(q);
                      else setSuggestions([]);
                    }
                    if (e.key === "Escape") {
                      setSuggestions([]);
                      setMentionQuery(null);
                    }
                  }}
                  placeholder={replyTo ? t("scribbleReply") : t("scribbleNote")}
                  rows={1}
                  maxLength={1000}
                  className="min-h-[28px] flex-1 resize-none bg-transparent text-sm italic leading-[28px] outline-none placeholder:italic placeholder:text-muted/80"
                />
                <button
                  type="submit"
                  disabled={submitting || !draft.trim()}
                  className="flex h-7 w-7 items-center justify-center self-start rounded-full text-accent transition-transform active:scale-95 hover:bg-accent-soft disabled:opacity-40"
                  aria-label={t("postNote")}
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>

              {/* @mention autocomplete — floats above the textarea */}
              {mentionQuery !== null && suggestions.length > 0 && (
                <ul className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                  {suggestions.map((user) => {
                    const src = user.avatarKey
                      ? `/api/photos/${user.avatarKey}`
                      : user.image ?? null;
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertMention(user.username ?? user.id);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent-soft"
                        >
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-semibold">
                              {(displayNameFor(user)[0] ?? "?").toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{displayNameFor(user)}</p>
                            {user.username && (
                              <p className="truncate text-xs text-muted">@{user.username}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </form>
        ) : (
          <p className="grid grid-cols-[2.75rem_1fr]">
            <span aria-hidden />
            <span className="pl-3 pr-4 text-sm italic leading-[28px] text-muted">
              <Link href={`/sign-in?callbackUrl=/cat-entries/${entryId}`} className="not-italic text-accent hover:underline">
                {t("signIn")}
              </Link>{" "}
              {t("toLeaveNote")}
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
