import { SearchBox } from "./SearchBox";
import { Featured } from "./Featured";
import { Onboarding } from "./Onboarding";
import { Library } from "./Library";
import { Settings } from "./Settings";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Leaf,
  Library as LibraryIcon,
  Settings2,
  ShieldCheck,
  Sunrise,
  X,
} from "lucide-react";
import type {
  Action,
  Bookmark,
  Folder,
  Metadata,
  Preferences,
  State,
} from "../types";
import {
  applyAction,
  emptyDay,
  getDay,
  initialState,
  reconcile,
  selectDaily,
} from "../lib/engine";
import { dayKey } from "../lib/dates";
import { safeUrl } from "../lib/urls";
import { isExtension, readBookmarks, watchBookmarks } from "../lib/bookmarks";
import { readState, resetState, transaction, watchState } from "../lib/storage";

type Route = "home" | "library" | "settings";
type Notice = { text: string; undo?: { id: string; metadata: Metadata } };
export function App() {
  const [state, setState] = useState<State>(initialState),
    [bookmarks, setBookmarks] = useState<Bookmark[]>([]),
    [folders, setFolders] = useState<Folder[]>([]);
  const [route, setRoute] = useState<Route>("home"),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState<Notice | null>(null),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now);
  const loaded = useRef(false),
    list = useRef<Bookmark[]>([]),
    routeRef = useRef<Route>("home"),
    currentDay = useRef(dayKey(Date.now()));
  const report = useCallback(
    (e: unknown) =>
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      ),
    [],
  );
  const refresh = useCallback(
    async (visit = false) => {
      try {
        const data = await readBookmarks();
        list.current = data.bookmarks;
        setBookmarks(data.bookmarks);
        setFolders(data.folders);
        const time = Date.now();
        const next = await transaction((s) => {
          const updated = reconcile(s, data.bookmarks);
          return routeRef.current === "home"
            ? selectDaily(updated, data.bookmarks, time, visit)
            : updated;
        });
        setState(next);
        setNow(time);
        setReady(true);
        setError("");
      } catch (e) {
        setReady(true);
        report(e);
      }
    },
    [report],
  );
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      void refresh(true);
    }
    const unwatch = watchBookmarks(() => void refresh());
    const unstore = watchState(() => {
      void readState().then(setState).catch(report);
    });
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const timer = setInterval(() => {
      const time = Date.now();
      const key = dayKey(time);
      if (
        currentDay.current !== key &&
        document.visibilityState === "visible"
      ) {
        void refresh();
      }
      currentDay.current = key;
      setNow(time);
    }, 60_000);
    return () => {
      unwatch();
      unstore();
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [refresh, report]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 10_000);
    return () => clearTimeout(timer);
  }, [notice]);
  const day = getDay(state, now),
    featured = bookmarks.find((b) => b.id === day.activeId);
  async function mutate(
    update: (s: State) => State,
    choose = routeRef.current === "home",
  ) {
    setBusy(true);
    try {
      const time = Date.now();
      const next = await transaction((s) => {
        const updated = update(s);
        return choose ? selectDaily(updated, list.current, time) : updated;
      });
      setState(next);
      setNow(time);
      setError("");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function preferences(patch: Partial<Preferences>) {
    await mutate((s) => ({
      ...s,
      preferences: { ...s.preferences, ...patch },
    }));
  }
  async function action(action: Action) {
    if (busy) return;
    const bookmark = bookmarks.find((b) => b.id === action.id);
    if (!bookmark) return;
    if (action.type === "open") {
      const url = safeUrl(bookmark.url);
      if (!url) {
        setError("This bookmark does not have a safe web address.");
        return;
      }
      const opened = window.open(url, "_blank");
      if (!opened) {
        setError(
          "Chrome blocked the new tab. Allow pop-ups for Recall and try again.",
        );
        return;
      }
      opened.opener = null;
    }
    let undo: Metadata | undefined;
    setBusy(true);
    try {
      const time = Date.now();
      const next = await transaction((s) => {
        undo = s.metadata[action.id];
        const updated = applyAction(s, action, time);
        return routeRef.current === "home"
          ? selectDaily(updated, list.current, time)
          : updated;
      });
      setState(next);
      setNow(time);
      setNotice({
        text:
          action.type === "dismiss"
            ? "Dismissed. Your Chrome bookmark is safe."
            : action.type === "snooze"
              ? `We’ll remind you in ${action.days} ${action.days === 1 ? "day" : "days"}.`
              : action.type === "restore"
                ? "Restored to your revisit list."
                : "Opened in a new tab. Enjoy the discovery.",
        undo:
          action.type === "dismiss" && undo
            ? { id: action.id, metadata: undo }
            : undefined,
      });
      setError("");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function undoDismiss() {
    const undo = notice?.undo;
    if (!undo) return;
    await mutate((s) => {
      const next = structuredClone(s);
      if (
        !next.metadata[undo.id] ||
        next.metadata[undo.id].status !== "dismissed"
      )
        return next;
      next.metadata[undo.id] = undo.metadata;
      const d = next.days[dayKey(Date.now())];
      if (d && !d.activeId && d.shownIds.includes(undo.id))
        d.activeId = undo.id;
      return next;
    });
    setNotice(null);
  }
  const setDay = (patch: Partial<ReturnType<typeof emptyDay>>) =>
    mutate((s) => ({
      ...s,
      days: {
        ...s.days,
        [dayKey(Date.now())]: { ...getDay(s, Date.now()), ...patch },
      },
    }));
  function navigate(next: Route) {
    setRoute(next);
    routeRef.current = next;
    if (next === "home") void refresh();
    window.scrollTo(0, 0);
  }
  const timeOfDay =
    new Date(now).getHours() < 12
      ? "morning"
      : new Date(now).getHours() < 18
        ? "afternoon"
        : "evening";
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Recall home"
        >
          <span className="brand-mark">
            <Leaf size={19} />
          </span>
          recall<span className="brand-dot">.</span>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={
              route === "library" ? "nav-button selected" : "nav-button"
            }
            onClick={() => navigate("library")}
          >
            <LibraryIcon size={17} />
            <span>Library</span>
          </button>
          <button
            className={
              route === "settings" ? "icon-button selected" : "icon-button"
            }
            onClick={() => navigate("settings")}
            aria-label="Settings"
            title="Settings"
          >
            <Settings2 size={19} />
          </button>
        </nav>
      </header>
      {!isExtension() && (
        <div className="preview-label">
          Browser preview · Load the built extension to connect Chrome bookmarks
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => void refresh()}>Retry</button>
          <button aria-label="Close error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {route === "home" ? (
        <main className="home">
          <div className="greeting">
            <p className="eyebrow date">
              {new Date(now).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              <span />
              <span className="weather-icon">
                <Sunrise size={16} />
              </span>{" "}
              A little space to begin
            </p>
            <h1>
              Good {timeOfDay}
              <span>.</span>
            </h1>
            <p>Make room for a little rediscovery.</p>
          </div>
          <SearchBox onError={setError} />
          <section className="discovery" aria-label="Your daily rediscovery">
            <div className="section-heading">
              <span>
                <span className="tiny-dot" /> YOUR DAILY REDISCOVERY
              </span>
              <span>
                {day.shownIds.length
                  ? `${day.shownIds.length} of ${state.preferences.dailyCap} today`
                  : "At your own pace"}
              </span>
            </div>
            {!ready ? (
              <div className="calm-card" role="status">
                Gathering your saved ideas…
              </div>
            ) : day.paused ? (
              <div className="calm-card">
                <Leaf />
                <h2>A little quiet, just for today.</h2>
                <p>Your bookmarks will be here tomorrow.</p>
                <button
                  className="text-button"
                  onClick={() => void setDay({ paused: false })}
                >
                  Resume today <ArrowRight size={15} />
                </button>
              </div>
            ) : featured ? (
              <Featured
                bookmark={featured}
                compact={
                  day.collapsed || (state.preferences.compact && day.views > 1)
                }
                busy={busy}
                onAction={action}
                onCollapse={() => void setDay({ collapsed: true })}
              />
            ) : (
              <div className="calm-card">
                <Check size={25} />
                <h2>
                  {!bookmarks.length
                    ? "Good ideas start with a bookmark."
                    : day.shownIds.length >= state.preferences.dailyCap
                      ? "All caught up for today."
                      : "A little room for something new."}
                </h2>
                <p>
                  {!bookmarks.length
                    ? "Save a page in Chrome with ⌘D on Mac or Ctrl+D on Windows. We’ll help you find it again."
                    : day.shownIds.length >= state.preferences.dailyCap
                      ? "One small discovery is enough. Come back tomorrow."
                      : "No bookmarks are ready right now. Check your folders or let your reminders rest."}
                </p>
                <button
                  className="text-button"
                  onClick={() =>
                    navigate(bookmarks.length ? "library" : "settings")
                  }
                >
                  {bookmarks.length
                    ? "Explore your library"
                    : "View your preferences"}
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
            <div className="under-card">
              <span>
                <ShieldCheck size={13} /> Just your bookmarks. Just on this
                device.
              </span>
              {!day.paused && (
                <button onClick={() => void setDay({ paused: true })}>
                  Pause for today
                </button>
              )}
            </div>
          </section>
          <button className="browse-link" onClick={() => navigate("library")}>
            Explore your library <ArrowRight size={16} />
          </button>
        </main>
      ) : route === "library" ? (
        <Library
          bookmarks={bookmarks}
          folders={folders}
          state={state}
          now={now}
          busy={busy}
          action={action}
          back={() => navigate("home")}
        />
      ) : (
        <Settings
          state={state}
          folders={folders}
          busy={busy}
          onPreferences={preferences}
          paused={day.paused}
          onPause={(value) => void setDay({ paused: value })}
          back={() => navigate("home")}
          onReset={async () => {
            setBusy(true);
            try {
              setState(await resetState());
              setNotice({
                text: "Recall has been reset. Your Chrome bookmarks are untouched.",
              });
              navigate("home");
            } catch (e) {
              report(e);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      <footer className="footer">
        <span>
          <Leaf size={15} /> Good ideas deserve a second look.
        </span>
        <button onClick={() => navigate("library")}>
          <strong>{bookmarks.length.toLocaleString()}</strong> saved
          possibilities <ArrowUpRight size={14} />
        </button>
      </footer>
      {ready && !state.preferences.onboarded && !error && route === "home" && (
        <Onboarding
          folders={folders}
          preferences={state.preferences}
          onPreferences={preferences}
          busy={busy}
          count={bookmarks.length}
          onStart={() => void preferences({ onboarded: true })}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notice.text}</span>
          {notice.undo && (
            <button onClick={() => void undoDismiss()}>Undo</button>
          )}
          <button
            aria-label="Close notification"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
