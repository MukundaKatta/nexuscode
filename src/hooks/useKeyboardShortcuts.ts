"use client";

import { useEffect } from "react";
import { useNexusStore } from "@/store";

export function useKeyboardShortcuts() {
  const {
    toggleChat,
    toggleComposer,
    toggleSearch,
    toggleTerminal,
    toggleCommandPalette,
    toggleSettings,
    toggleSidebar,
    setInlineEditOpen,
    activeFilePath,
    saveFile,
    openFiles,
    updateFileContent,
    addNotification,
  } = useNexusStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+K — inline edit
      if (isMod && e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        setInlineEditOpen(true);
        return;
      }

      // Cmd+L — toggle chat
      if (isMod && e.key === "l" && !e.shiftKey) {
        e.preventDefault();
        toggleChat();
        return;
      }

      // Cmd+Shift+I — composer
      if (isMod && e.shiftKey && e.key === "I") {
        e.preventDefault();
        toggleComposer();
        return;
      }

      // Cmd+Shift+F — search
      if (isMod && e.shiftKey && e.key === "F") {
        e.preventDefault();
        toggleSearch();
        return;
      }

      // Cmd+` — terminal
      if (isMod && e.key === "`") {
        e.preventDefault();
        toggleTerminal();
        return;
      }

      // Cmd+P — command palette
      if (isMod && e.key === "p" && !e.shiftKey) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Cmd+, — settings
      if (isMod && e.key === ",") {
        e.preventDefault();
        toggleSettings();
        return;
      }

      // Cmd+B — toggle sidebar
      if (isMod && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Cmd+S — save file
      if (isMod && e.key === "s") {
        e.preventDefault();
        if (activeFilePath) {
          const file = openFiles.find((f) => f.path === activeFilePath);
          if (file) {
            const { setFileContent } = require("@/lib/filesystem");
            setFileContent(file.path, file.content);
            saveFile(file.path);
            addNotification("success", `Saved ${file.name}`);
          }
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    toggleChat,
    toggleComposer,
    toggleSearch,
    toggleTerminal,
    toggleCommandPalette,
    toggleSettings,
    toggleSidebar,
    setInlineEditOpen,
    activeFilePath,
    saveFile,
    openFiles,
    updateFileContent,
    addNotification,
  ]);
}
