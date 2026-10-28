import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Search } from "lucide-react";
import type { Action, Bookmark, Folder, State } from "../types";
import { age } from "../lib/dates";
import { domain } from "../lib/urls";
import { included } from "../lib/engine";
import { BookmarkActions } from "./BookmarkActions";
type Filter = "All" | "To revisit" | "Opened" | "Snoozed" | "Dismissed";
export function Library({
  bookmarks,
  folders,
  state,
  now,
  busy,
  action,
  back,
}: {
  bookmarks: Bookmark[];
  folders: Folder[];
  state: State;
  now: number;
  busy: boolean;
  action: (a: Action) => Promise<void>;
  back: () => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState<Filter>("All"),
    [sort, setSort] = useState("newest"),
    [folder, setFolder] = useState("all"),
    [page, setPage] = useState(1);
  const status = (b: Bookmark): Filter => {
    const m = state.metadata[b.id];
    return m?.status === "dismissed"
      ? "Dismissed"
      : (m?.snoozedUntil ?? 0) > now
        ? "Snoozed"
        : m?.status === "opened"
          ? "Opened"
          : "To revisit";
  };
  const searched = bookmarks.filter(
    (b) =>
      (folder === "all" || b.folderIds.includes(folder)) &&
      `${b.title} ${b.url}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const filtered = searched
    .filter((b) => filter === "All" || status(b) === filter)
    .sort((a, b) =>
      sort === "newest" ? b.addedAt - a.addedAt : a.addedAt - b.addedAt,
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 30)),
    current = Math.min(page, pages);
  useEffect(() => setPage(1), [query, filter, folder, sort]);
  return (
    <main className="page-panel">
      <button className="back-link" onClick={back}>
        <ArrowLeft size={16} /> Back to your day
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL COLLECTION</p>
          <h1>
            The library<span>.</span>
          </h1>
          <p>Everything you saved. Something worth returning to.</p>
        </div>
        <span className="count-badge">{bookmarks.length} bookmarks</span>
      </div>
      <div className="library-tools">
        <label className="library-search">
          <Search size={18} />
          <input
            type="search"
            aria-label="Search bookmarks"
            placeholder="Find a title, website, or idea…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter by folder"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        >
          <option value="all">All folders</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {"— ".repeat(f.depth)}
              {f.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort bookmarks"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest saved</option>
          <option value="oldest">Oldest saved</option>
        </select>
      </div>
      <div className="filter-tabs" aria-label="Bookmark status">
        {(
          ["All", "To revisit", "Opened", "Snoozed", "Dismissed"] as Filter[]
        ).map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
            <span>
              {f === "All"
                ? searched.length
                : searched.filter((b) => status(b) === f).length}
            </span>
          </button>
        ))}
      </div>
      <div className="library-list">
        {filtered.slice((current - 1) * 30, current * 30).map((b) => (
          <article className="library-row" key={b.id}>
            <span className="site-tile" aria-hidden="true">
              {domain(b.url).slice(0, 1).toUpperCase()}
            </span>
            <div className="row-text">
              <h2>{b.title}</h2>
              <p>
                {domain(b.url)} <span>·</span> {age(b.addedAt, now)}
              </p>
              <p className="row-status">
                {status(b)}
                {status(b) === "Snoozed" &&
                  ` until ${new Date(state.metadata[b.id].snoozedUntil!).toLocaleDateString()}`}
                {!included(b, state) && " · Excluded folder"}
                <span className="folder-path">
                  {" "}
                  · {b.folder || "Bookmarks"}
                </span>
              </p>
            </div>
            <BookmarkActions
              bookmark={b}
              busy={busy}
              onAction={action}
              dismissed={status(b) === "Dismissed"}
              restore={
                status(b) === "Dismissed" ||
                status(b) === "Snoozed" ||
                status(b) === "Opened"
              }
            />
          </article>
        ))}
        {!filtered.length && (
          <div className="calm-card">
            <BookOpen />
            <h2>
              {bookmarks.length
                ? "Nothing here just yet."
                : "Your next discovery starts here."}
            </h2>
            <p>
              {bookmarks.length
                ? "Try a different search or filter."
                : "Save websites in Chrome with ⌘D or Ctrl+D. They’ll appear here automatically."}
            </p>
          </div>
        )}
      </div>
      <div className="pagination">
        <span>
          {filtered.length} bookmarks · Page {current} of {pages}
        </span>
        <button
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
          aria-label="Previous page"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
          aria-label="Next page"
        >
          <ArrowRight size={16} />
        </button>
      </div>
      <p className="fine-print">
        “Opened” means opened through Recall. We don’t track your browsing or
        assume you’ve finished reading.
      </p>
    </main>
  );
}
