import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { isExtension } from "../lib/bookmarks";
export function SearchBox({ onError }: { onError: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  return (
    <form
      className="search-box"
      role="search"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!query.trim() || searching) return;
        if (!isExtension()) {
          onError(
            "Default search is available when Recall is loaded as a Chrome extension.",
          );
          return;
        }
        setSearching(true);
        try {
          await chrome.search.query({
            text: query.trim(),
            disposition: "CURRENT_TAB",
          });
        } catch {
          onError(
            "Search could not open. Try again or use Chrome’s address bar.",
          );
        } finally {
          setSearching(false);
        }
      }}
    >
      <Search size={20} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search with your default search engine"
        placeholder="Search with your default search engine"
        type="search"
      />
      <button aria-label="Search" disabled={!query.trim() || searching}>
        <ArrowRight size={19} />
      </button>
    </form>
  );
}
