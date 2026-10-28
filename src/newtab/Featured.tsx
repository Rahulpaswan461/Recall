import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, Clock3 } from "lucide-react";
import type { Action, Bookmark } from "../types";
import { age } from "../lib/dates";
import { domain } from "../lib/urls";
import { BookmarkActions } from "./BookmarkActions";
export function Featured({
  bookmark,
  compact,
  busy,
  onAction,
  onCollapse,
}: {
  bookmark: Bookmark;
  compact: boolean;
  busy: boolean;
  onAction: (a: Action) => Promise<void>;
  onCollapse: () => void;
}) {
  const [showFull, setShowFull] = useState(false);
  useEffect(() => setShowFull(false), [bookmark.id]);
  return (
    <article
      className={`featured-card ${compact && !showFull ? "compact" : ""}`}
    >
      <div className="card-topline">
        <span>
          <BookOpen size={14} /> SAVED FOR A MOMENT LIKE THIS
        </span>
        <button
          className="icon-button"
          aria-label={
            compact && !showFull ? "Expand reminder" : "Collapse reminder"
          }
          onClick={() => {
            if (compact && !showFull) setShowFull(true);
            else {
              setShowFull(false);
              onCollapse();
            }
          }}
        >
          <ChevronDown
            className={compact && !showFull ? "rotate" : ""}
            size={17}
          />
        </button>
      </div>
      <div className="feature-content">
        <div className="bookmark-art" aria-hidden="true">
          <div className="art-orbit" />
          <BookOpen size={43} strokeWidth={1} />
          <span>A SECOND LOOK</span>
        </div>
        <div className="feature-text">
          <p className="domain">
            <span className="domain-symbol">
              {domain(bookmark.url).slice(0, 1).toUpperCase()}
            </span>
            {domain(bookmark.url)}
          </p>
          <h2>{bookmark.title}</h2>
          <p className="saved-age">
            <Clock3 size={13} />
            {age(bookmark.addedAt)}
            <span>·</span> From your bookmarks
          </p>
        </div>
      </div>
      <BookmarkActions bookmark={bookmark} busy={busy} onAction={onAction} />
    </article>
  );
}
