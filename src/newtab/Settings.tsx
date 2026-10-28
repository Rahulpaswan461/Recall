import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Folder, Preferences, State } from "../types";
import { FolderPicker } from "./FolderPicker";
export function Settings({
  state,
  folders,
  busy,
  onPreferences,
  paused,
  onPause,
  back,
  onReset,
}: {
  state: State;
  folders: Folder[];
  busy: boolean;
  onPreferences: (p: Partial<Preferences>) => Promise<void>;
  paused: boolean;
  onPause: (value: boolean) => void;
  back: () => void;
  onReset: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <main className="page-panel settings-panel">
      <button className="back-link" onClick={back}>
        <ArrowLeft size={16} /> Back to your day
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A RHYTHM THAT FITS YOU</p>
          <h1>
            Make it yours<span>.</span>
          </h1>
          <p>A little more discovery. A little less distraction.</p>
        </div>
      </div>
      <section className="settings-section">
        <h2>Your daily rhythm</h2>
        <div className="setting-row">
          <div>
            <h3>Bookmarks per day</h3>
            <p>A maximum, never a to-do list.</p>
          </div>
          <div className="segments">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                aria-pressed={state.preferences.dailyCap === n}
                className={state.preferences.dailyCap === n ? "active" : ""}
                disabled={busy}
                onClick={() => void onPreferences({ dailyCap: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <Toggle
          title="Compact after first display"
          description="A smaller reminder on your next new tab."
          checked={state.preferences.compact}
          disabled={busy}
          change={(value) => void onPreferences({ compact: value })}
        />
        <Toggle
          title="Pause for today"
          description="A quiet new tab until tomorrow."
          checked={paused}
          disabled={busy}
          change={onPause}
        />
        <div className="setting-row">
          <div>
            <h3>After opening a bookmark</h3>
            <p>Give it time before it can appear again.</p>
          </div>
          <select
            aria-label="Time before opened bookmarks return"
            value={state.preferences.openedCooldownDays}
            disabled={busy}
            onChange={(e) =>
              void onPreferences({ openedCooldownDays: Number(e.target.value) })
            }
          >
            <option value="7">At least 7 days</option>
            <option value="30">At least 30 days</option>
            <option value="90">At least 90 days</option>
          </select>
        </div>
      </section>
      <section className="settings-section">
        <h2>Where to rediscover</h2>
        <p className="muted">
          Only selected folders contribute to your daily reminder. Your library
          always shows all bookmarks.
        </p>
        <FolderPicker
          folders={folders}
          preferences={state.preferences}
          onPreferences={onPreferences}
          disabled={busy}
        />
      </section>
      <section className="settings-section privacy">
        <ShieldCheck size={24} />
        <div>
          <h2>Private by nature.</h2>
          <p>
            Bookmarks and feedback stay on this device. No accounts, servers,
            tracking, or data uploads. Recall requests only bookmarks, local
            storage, and search access. Your search goes through Chrome’s
            default search provider.
          </p>
          <p>
            A day follows your device’s local calendar. Changing time zones may
            change when your next daily reminder appears.
          </p>
        </div>
      </section>
      <section className="settings-section reset-section">
        <div>
          <h2>A fresh start</h2>
          <p>
            Reset Recall preferences and feedback. Original Chrome bookmarks
            will remain untouched.
          </p>
        </div>
        {confirm ? (
          <div className="confirm-reset" role="alert">
            <p>
              Reset all Recall statuses, snoozes, preferences, and daily
              history?
            </p>
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => void onReset()}
            >
              Yes, reset Recall
            </button>
            <button disabled={busy} onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="danger-button" onClick={() => setConfirm(true)}>
            Reset Recall
          </button>
        )}
      </section>
    </main>
  );
}
function Toggle({
  title,
  description,
  checked,
  disabled,
  change,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  change: (v: boolean) => void;
}) {
  return (
    <label className="setting-row toggle-row">
      <span>
        <strong>{title}</strong>
        <span className="setting-description">{description}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => change(e.target.checked)}
        aria-label={title}
      />
    </label>
  );
}
