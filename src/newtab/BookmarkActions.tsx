import { ArrowUpRight, Check, Clock3, X } from "lucide-react";
import type { Action, Bookmark } from "../types";
export function BookmarkActions({
  bookmark,
  busy,
  onAction,
  restore = false,
  dismissed = false,
}: {
  bookmark: Bookmark;
  busy: boolean;
  onAction: (a: Action) => Promise<void>;
  restore?: boolean;
  dismissed?: boolean;
}) {
  return (
    <div className="bookmark-actions">
      <button
        className="primary"
        disabled={busy}
        onClick={() => void onAction({ type: "open", id: bookmark.id })}
      >
        Read now <ArrowUpRight size={16} />
      </button>
      {!dismissed && (
        <label className="snooze">
          <Clock3 size={15} />
          <span className="sr-only">Remind later for {bookmark.title}</span>
          <select
            aria-label={`Remind later for ${bookmark.title}`}
            value=""
            disabled={busy}
            onChange={(e) =>
              void onAction({
                type: "snooze",
                id: bookmark.id,
                days: Number(e.target.value) as 1 | 3 | 7,
              })
            }
          >
            <option value="" disabled>
              Remind later
            </option>
            <option value="1">Tomorrow</option>
            <option value="3">In 3 days</option>
            <option value="7">In 1 week</option>
          </select>
        </label>
      )}
      <button
        className="dismiss"
        disabled={busy}
        onClick={() =>
          void onAction({
            type: restore ? "restore" : "dismiss",
            id: bookmark.id,
          })
        }
      >
        {restore ? <Check size={15} /> : <X size={15} />}{" "}
        {restore ? "Restore" : "Dismiss"}
      </button>
    </div>
  );
}
