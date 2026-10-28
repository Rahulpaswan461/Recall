import type { Bookmark, Folder } from "../types";
import { safeUrl } from "./urls";
export function flattenTree(nodes: chrome.bookmarks.BookmarkTreeNode[]): {
  bookmarks: Bookmark[];
  folders: Folder[];
} {
  const bookmarks: Bookmark[] = [],
    folders: Folder[] = [];
  function walk(node: chrome.bookmarks.BookmarkTreeNode, parents: Folder[]) {
    if (node.url) {
      const url = safeUrl(node.url);
      if (url)
        bookmarks.push({
          id: node.id,
          title: node.title.trim() || new URL(url).hostname,
          url,
          addedAt: node.dateAdded ?? 0,
          folderIds: parents.map((f) => f.id),
          folder: parents.map((f) => f.title).join(" / "),
        });
      return;
    }
    let path = parents;
    if (node.id !== "0") {
      const folder = {
        id: node.id,
        title: node.title || "Untitled folder",
        depth: parents.length,
        parentIds: parents.map((f) => f.id),
      };
      folders.push(folder);
      path = [...parents, folder];
    }
    node.children?.forEach((child) => walk(child, path));
  }
  nodes.forEach((n) => walk(n, []));
  return { bookmarks, folders };
}
export const isExtension = () =>
  typeof chrome !== "undefined" &&
  !!chrome.bookmarks &&
  !!chrome.storage?.local;
export async function readBookmarks() {
  return isExtension()
    ? flattenTree(await chrome.bookmarks.getTree())
    : { bookmarks: [], folders: [] };
}
export function watchBookmarks(callback: () => void): () => void {
  if (!isExtension()) return () => {};
  let timer: ReturnType<typeof setTimeout>;
  const changed = () => {
    clearTimeout(timer);
    timer = setTimeout(callback, 150);
  };
  const events = [
    chrome.bookmarks.onCreated,
    chrome.bookmarks.onRemoved,
    chrome.bookmarks.onChanged,
    chrome.bookmarks.onMoved,
    chrome.bookmarks.onImportEnded,
    chrome.bookmarks.onChildrenReordered,
  ];
  events.forEach((event) => event.addListener(changed));
  return () => {
    clearTimeout(timer);
    events.forEach((event) => event.removeListener(changed));
  };
}
