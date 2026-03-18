"use client";

import { useState, useCallback } from "react";
import { useNexusStore } from "@/store";
import { Icon } from "@/components/common/Icon";
import { searchFiles, getFileContent } from "@/lib/filesystem";
import { debounce, cn } from "@/lib/utils";

export function SearchPanel() {
  const { openFile, setSearchQuery, searchQuery } = useNexusStore();
  const [results, setResults] = useState<
    Array<{ path: string; matches: Array<{ line: number; content: string }> }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const performSearch = useCallback(
    debounce((q: string) => {
      if (!q.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }
      const found = searchFiles(q);
      setResults(found);
      setIsSearching(false);
    }, 300),
    []
  );

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    setIsSearching(true);
    performSearch(value);
  };

  const handleResultClick = (path: string) => {
    const content = getFileContent(path) || "";
    const name = path.split("/").pop() || path;
    openFile(path, name, content);
  };

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1 bg-nexus-bg rounded border border-nexus-border focus-within:border-nexus-accent">
          <Icon name="search" size={14} className="text-nexus-text-subtle ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent text-nexus-text text-sm py-1.5 px-2 outline-none placeholder:text-nexus-text-subtle"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={cn(
              "px-2 py-0.5 text-xxs rounded border",
              caseSensitive
                ? "border-nexus-accent text-nexus-accent"
                : "border-nexus-border text-nexus-text-subtle"
            )}
          >
            Aa
          </button>
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={cn(
              "px-2 py-0.5 text-xxs rounded border",
              useRegex
                ? "border-nexus-accent text-nexus-accent"
                : "border-nexus-border text-nexus-text-subtle"
            )}
          >
            .*
          </button>
        </div>
      </div>

      {searchQuery && (
        <div className="px-3 py-1 text-xxs text-nexus-text-subtle border-b border-nexus-border">
          {isSearching ? (
            "Searching..."
          ) : (
            <>{totalMatches} results in {results.length} files</>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {results.map((result) => (
          <div key={result.path} className="border-b border-nexus-border/50">
            <button
              onClick={() => handleResultClick(result.path)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-nexus-text hover:bg-nexus-bg-lighter"
            >
              <Icon name="file" size={12} className="text-nexus-text-muted shrink-0" />
              <span className="truncate font-medium">{result.path}</span>
              <span className="ml-auto text-nexus-text-subtle shrink-0">
                {result.matches.length}
              </span>
            </button>
            <div className="ml-6">
              {result.matches.slice(0, 5).map((match, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResultClick(result.path)}
                  className="w-full text-left px-2 py-0.5 text-xxs text-nexus-text-muted hover:bg-nexus-bg-lighter font-mono truncate"
                >
                  <span className="text-nexus-text-subtle mr-2">{match.line}</span>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: match.content
                        .trim()
                        .replace(
                          new RegExp(
                            `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                            "gi"
                          ),
                          '<mark class="bg-nexus-orange/30 text-nexus-orange">$1</mark>'
                        ),
                    }}
                  />
                </button>
              ))}
              {result.matches.length > 5 && (
                <div className="px-2 py-0.5 text-xxs text-nexus-text-subtle">
                  +{result.matches.length - 5} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
