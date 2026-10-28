import type { Folder, Preferences } from "../types";
export function FolderPicker({
  folders,
  preferences,
  onPreferences,
  disabled = false,
}: {
  folders: Folder[];
  preferences: Preferences;
  onPreferences: (p: Partial<Preferences>) => Promise<void>;
  disabled?: boolean;
}) {
  return (
    <div className="folder-picker">
      {!folders.length ? (
        <p className="muted">
          Your bookmark folders will appear here when available.
        </p>
      ) : (
        folders.map((folder) => {
          const blocked = folder.parentIds.some((id) =>
            preferences.excludedFolderIds.includes(id),
          );
          return (
            <label
              key={folder.id}
              style={{ paddingLeft: 12 + folder.depth * 18 }}
            >
              <input
                type="checkbox"
                disabled={disabled || blocked}
                checked={
                  !blocked && !preferences.excludedFolderIds.includes(folder.id)
                }
                onChange={(e) =>
                  void onPreferences({
                    excludedFolderIds: e.target.checked
                      ? preferences.excludedFolderIds.filter(
                          (id) => id !== folder.id,
                        )
                      : [...preferences.excludedFolderIds, folder.id],
                  })
                }
              />
              <span>{folder.title}</span>
              {blocked && <small>Parent excluded</small>}
            </label>
          );
        })
      )}
    </div>
  );
}
