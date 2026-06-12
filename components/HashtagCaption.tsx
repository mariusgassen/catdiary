import Link from "next/link";

type Part = { type: "text" | "hashtag" | "mention"; value: string };

function parseCaption(text: string): Part[] {
  return text
    .split(/(#[\wÀ-ɏ]+|@[\w.]+)/g)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("#")) return { type: "hashtag", value: part };
      if (part.startsWith("@")) return { type: "mention", value: part };
      return { type: "text", value: part };
    });
}

export function HashtagCaption({ text }: { text: string }) {
  return (
    <>
      {parseCaption(text).map((part, i) => {
        if (part.type === "hashtag") {
          return (
            <Link
              key={i}
              href={`/search?q=${encodeURIComponent(part.value)}`}
              className="text-accent font-medium hover:underline"
            >
              {part.value}
            </Link>
          );
        }
        if (part.type === "mention") {
          // part.value is "@username"; "/@username" routes through the
          // [handle] page, which redirects to the profile or 404s if the
          // handle doesn't exist.
          return (
            <Link
              key={i}
              href={`/${part.value}`}
              className="text-accent font-medium hover:underline"
            >
              {part.value}
            </Link>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </>
  );
}

export { parseCaption };
