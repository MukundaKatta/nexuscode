"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNexusStore } from "@/store";
import { Icon } from "./Icon";
import { getAllFilePaths, getFileContent } from "@/lib/filesystem";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const {
    isCommandPaletteOpen,
    toggleCommandPalette,
    toggleChat,
    toggleComposer,
    toggleSearch,
    toggleTerminal,
    toggleSettings,
    toggleReview,
    toggleSidebar,
    openFile,
    setInlineEditOpen,
  } = useNexusStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<"commands" | "files">("commands");
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: "chat", label: "Open AI Chat", category: "AI", shortcut: "Cmd+L", action: toggleChat },
    { id: "inline", label: "Inline Edit (Cmd+K)", category: "AI", shortcut: "Cmd+K", action: () => setInlineEditOpen(true) },
    { id: "composer", label: "Open Composer", category: "AI", shortcut: "Cmd+Shift+I", action: toggleComposer },
    { id: "review", label: "Code Review", category: "AI", action: toggleReview },
    { id: "search", label: "Search in Files", category: "Search", shortcut: "Cmd+Shift+F", action: toggleSearch },
    { id: "terminal", label: "Toggle Terminal", category: "View", shortcut: "Cmd+`", action: toggleTerminal },
    { id: "sidebar", label: "Toggle Sidebar", category: "View", shortcut: "Cmd+B", action: toggleSidebar },
    { id: "settings", label: "Open Settings", category: "Settings", shortcut: "Cmd+,", action: toggleSettings },
    { id: "files", label: "Go to File...", category: "Navigation", shortcut: "Type >", action: () => setMode("files") },
  ];

  const filePaths = getAllFilePaths();

  const getFilteredItems = useCallback(() => {
    if (mode === "files") {
      const q = query.toLowerCase().replace(/^>\s*/, "");
      if (!q) return filePaths.map((p) => ({ id: p, label: p, category: "File", action: () => {} }));
      return filePaths
        .filter((p) => p.toLowerCase().includes(q))
        .map((p) => ({ id: p, label: p, category: "File", action: () => {} }));
    }
    if (!query) return commands;
    const q = query.toLowerCase();
    if (q.startsWith(">")) {
      setMode("files");
      return filePaths
        .filter((p) => p.toLowerCase().includes(q.slice(1).trim()))
        .map((p) => ({ id: p, label: p, category: "File", action: () => {} }));
    }
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [query, mode, commands, filePaths]);

  const filteredItems = getFilteredItems();

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setMode("commands");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeItem = (item: (typeof filteredItems)[0]) => {
    toggleCommandPalette();
    if (mode === "files" || item.category === "File") {
      const content = getFileContent(item.id) || "";
      const name = item.id.split("/").pop() || item.id;
      openFile(item.id, name, content);
    } else {
      (item as Command).action();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      executeItem(filteredItems[selectedIndex]);
    } else if (e.key === "Escape") {
      toggleCommandPalette();
    } else if (e.key === "Backspace" && query === "" && mode === "files") {
      setMode("commands");
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={toggleCommandPalette}
      />
      <div className="relative w-[600px] max-h-[400px] bg-nexus-bg-light border border-nexus-border rounded-lg shadow-2xl overflow-hidden animate-slide-down">
        <div className="flex items-center px-4 py-3 border-b border-nexus-border">
          <Icon name="search" size={16} className="text-nexus-text-muted mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "files" ? "Search files..." : "Type a command or > to search files..."}
            className="flex-1 bg-transparent text-nexus-text text-sm outline-none placeholder:text-nexus-text-subtle"
          />
          {mode === "files" && (
            <span className="text-xxs px-1.5 py-0.5 bg-nexus-bg-lighter rounded text-nexus-text-muted">
              FILES
            </span>
          )}
        </div>
        <div className="max-h-[340px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-nexus-text-muted text-sm">
              No results found
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between px-4 py-2 cursor-pointer text-sm",
                  idx === selectedIndex
                    ? "bg-nexus-accent/20 text-nexus-text"
                    : "text-nexus-text-muted hover:bg-nexus-bg-lighter"
                )}
                onClick={() => executeItem(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={mode === "files" || item.category === "File" ? "file" : "command"}
                    size={14}
                    className="opacity-60"
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xxs text-nexus-text-subtle">
                    {item.category}
                  </span>
                  {"shortcut" in item && (item as Command).shortcut && (
                    <span className="text-xxs px-1.5 py-0.5 bg-nexus-bg rounded text-nexus-text-subtle">
                      {(item as Command).shortcut}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
