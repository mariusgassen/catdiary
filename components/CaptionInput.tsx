"use client";

import { useRef, useState } from "react";
import { parseCaption } from "@/components/HashtagCaption";
import { displayNameFor } from "@/lib/userDisplay";

type UserSuggestion = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
  image: string | null;
};

export function CaptionInput({
  value,
  onChange,
  placeholder = "Add a caption… #orange @friend",
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const mentionStartRef = useRef<number>(-1);
  const fetchControllerRef = useRef<AbortController | null>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function detectMention(text: string, cursorPos: number) {
    const slice = text.slice(0, cursorPos);
    const match = slice.match(/@([\w.]*)$/);
    if (match) {
      mentionStartRef.current = cursorPos - match[0].length;
      return match[1];
    }
    mentionStartRef.current = -1;
    return null;
  }

  async function fetchSuggestions(q: string) {
    fetchControllerRef.current?.abort();
    const ctrl = new AbortController();
    fetchControllerRef.current = ctrl;
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
      if (res.ok) {
        const data = (await res.json()) as { users: UserSuggestion[] };
        setSuggestions(data.users.slice(0, 5));
      }
    } catch {
      // aborted or network error — ignore
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value;
    onChange(newVal);
    autoResize();
    const cursor = e.target.selectionStart ?? newVal.length;
    const q = detectMention(newVal, cursor);
    setMentionQuery(q);
    if (q !== null) void fetchSuggestions(q);
    else setSuggestions([]);
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
  }

  function insertMention(username: string) {
    const el = textareaRef.current;
    if (!el || mentionStartRef.current < 0) return;
    const before = value.slice(0, mentionStartRef.current);
    const after = value.slice(el.selectionStart ?? value.length);
    const inserted = `@${username} `;
    const next = before + inserted + after;
    onChange(next);
    setSuggestions([]);
    setMentionQuery(null);
    mentionStartRef.current = -1;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
      autoResize();
    });
  }

  const parts = parseCaption(value);

  return (
    <div className="relative">
      <div className="relative rounded-xl border border-border bg-surface overflow-hidden focus-within:ring-1 focus-within:ring-accent">
        {/* Mirror layer — shows styled text behind transparent textarea */}
        {value && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden"
          >
            {parts.map((part, i) =>
              part.type === "hashtag" || part.type === "mention" ? (
                <span key={i} className="text-accent font-medium">
                  {part.value}
                </span>
              ) : (
                <span key={i} className="text-foreground">
                  {part.value}
                </span>
              )
            )}
            {/* trailing space to prevent collapse */}
            &thinsp;
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          rows={rows}
          className="relative w-full resize-none bg-transparent px-3 py-3 text-sm leading-relaxed outline-none placeholder:text-muted overflow-hidden"
          style={{
            color: value ? "transparent" : undefined,
            caretColor: "var(--foreground)",
            minHeight: "96px",
          }}
        />
      </div>

      {/* @mention autocomplete dropdown */}
      {mentionQuery !== null && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
          {suggestions.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user.username ?? user.id);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent-soft transition-colors"
              >
                {(() => {
                  const src = user.avatarKey ? `/api/photos/${user.avatarKey}` : user.image;
                  if (src) {
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    );
                  }
                  return (
                    <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent text-xs font-semibold shrink-0">
                      {(displayNameFor(user)[0] ?? "?").toUpperCase()}
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{displayNameFor(user)}</p>
                  {user.username && (
                    <p className="text-xs text-muted truncate">@{user.username}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
