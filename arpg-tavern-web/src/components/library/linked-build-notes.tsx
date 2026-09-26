"use client";

import { useState, type ReactNode } from "react";

const tokenPattern = /!\[([^\]\r\n]{0,120})\]\((https?:\/\/[^\s<>"'`]+)\)|https?:\/\/[^\s<>"'`]+/gi;
const trailingPunctuation = /[.,;:!?]+$/;

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function tidyUrl(value: string) {
  let clean = value.replace(trailingPunctuation, "");
  while (
    clean.endsWith(")") &&
    (clean.match(/\)/g)?.length ?? 0) > (clean.match(/\(/g)?.length ?? 0)
  ) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

function renderNotes(text: string): ReactNode[] {
  const items: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index;
    const raw = match[0];
    if (start > cursor) items.push(text.slice(cursor, start));
    if (match[2] !== undefined) {
      const url = safeUrl(match[2]);
      if (url) {
        items.push(
          <a key={start} href={url} target="_blank" rel="noopener noreferrer" className="build-note-image-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={match[1] || "Immagine della build"} loading="lazy" referrerPolicy="no-referrer" />
          </a>,
        );
      } else {
        items.push(raw);
      }
    } else {
      const candidate = tidyUrl(raw);
      const url = safeUrl(candidate);
      if (url) {
        items.push(<a key={start} href={url} target="_blank" rel="noopener noreferrer">{candidate}</a>);
        items.push(raw.slice(candidate.length));
      } else {
        items.push(raw);
      }
    }
    cursor = start + raw.length;
  }
  if (cursor < text.length) items.push(text.slice(cursor));
  return items;
}

export function LinkedBuildNotes({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="build-notes-expandable">
      <button
        type="button"
        className="build-notes-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={expanded ? "build-notes-preview is-expanded" : "build-notes-preview"}>
          {expanded ? "Note complete" : text}
        </span>
        <span className="build-notes-chevron" aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && <div className="linked-build-notes">{renderNotes(text)}</div>}
    </div>
  );
}
