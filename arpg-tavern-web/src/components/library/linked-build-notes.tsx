import type { ReactNode } from "react";

const urlPattern = /https?:\/\/[^\s<>"'`]+/gi;
const trailingPunctuation = /[.,;:!?]+$/;

function validHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function LinkedBuildNotes({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(urlPattern)) {
    const start = match.index;
    const raw = match[0];
    if (start > cursor) parts.push(text.slice(cursor, start));

    let candidate = raw.replace(trailingPunctuation, "");
    while (candidate.endsWith(")") &&
      (candidate.match(/\)/g)?.length ?? 0) > (candidate.match(/\(/g)?.length ?? 0)) {
      candidate = candidate.slice(0, -1);
    }
    const url = validHttpUrl(candidate);
    if (url) {
      parts.push(
        <a key={start} href={url} target="_blank" rel="noopener noreferrer">
          {candidate}
        </a>,
      );
      parts.push(raw.slice(candidate.length));
    } else {
      parts.push(raw);
    }
    cursor = start + raw.length;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return <p className="linked-build-notes">{parts}</p>;
}
