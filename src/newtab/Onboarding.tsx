import { useEffect, useRef } from "react";
import { ArrowRight, BookOpen, Leaf, ShieldCheck } from "lucide-react";
import type { Folder, Preferences } from "../types";
import { FolderPicker } from "./FolderPicker";
export function Onboarding({
  folders,
  preferences,
  onPreferences,
  busy,
  count,
  onStart,
}: {
  folders: Folder[];
  preferences: Preferences;
  onPreferences: (p: Partial<Preferences>) => Promise<void>;
  busy: boolean;
  count: number;
  onStart: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="onboarding"
      aria-labelledby="welcome-title"
      onCancel={(e) => {
        e.preventDefault();
        onStart();
      }}
    >
      <span className="welcome-icon">
        <Leaf size={28} />
      </span>
      <p className="eyebrow">WELCOME TO RECALL</p>
      <h2 id="welcome-title">You saved it for a reason.</h2>
      <p className="intro">
        A quieter new tab. A second chance for the ideas you didn’t want to
        lose.
      </p>
      <div className="onboarding-points">
        <p>
          <BookOpen size={18} />
          <span>
            Recall replaces your Chrome New Tab page and suggests a little from
            your local Chrome bookmarks.
          </span>
        </p>
        <p>
          <ShieldCheck size={18} />
          <span>
            Your feedback stays on this device. Dismissing in Recall never
            deletes the original bookmark.
          </span>
        </p>
      </div>
      <details>
        <summary>
          Choose bookmark folders <span>{count} saved links</span>
        </summary>
        <FolderPicker
          folders={folders}
          preferences={preferences}
          onPreferences={onPreferences}
          disabled={busy}
        />
      </details>
      <p className="fine-print">
        Chrome may ask you to confirm bookmark access and your new-tab change
        when installing.
      </p>
      <button className="primary welcome-cta" disabled={busy} onClick={onStart}>
        Start rediscovering <ArrowRight size={17} />
      </button>
      <button className="skip" disabled={busy} onClick={onStart}>
        {count ? "Continue with these folders" : "Start with an empty library"}
      </button>
    </dialog>
  );
}
