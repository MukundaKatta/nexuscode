"use client";

import { useNexusStore } from "@/store";
import { Icon } from "@/components/common/Icon";

export function StatusBar() {
  const {
    activeFilePath,
    openFiles,
    gitStatus,
    settings,
    toggleTerminal,
    toggleChat,
    toggleSettings,
  } = useNexusStore();

  const activeFile = openFiles.find((f) => f.path === activeFilePath);
  const branch = gitStatus?.branch || "main";

  return (
    <div className="flex items-center justify-between h-6 px-3 bg-nexus-accent/10 border-t border-nexus-border text-xxs select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {}}
          className="flex items-center gap-1 text-nexus-text-muted hover:text-nexus-text"
        >
          <Icon name="git-branch" size={12} />
          <span>{branch}</span>
        </button>
        {gitStatus && (gitStatus.staged.length > 0 || gitStatus.unstaged.length > 0) && (
          <span className="text-nexus-orange">
            {gitStatus.staged.length + gitStatus.unstaged.length} changes
          </span>
        )}
        <button
          onClick={toggleTerminal}
          className="flex items-center gap-1 text-nexus-text-muted hover:text-nexus-text"
        >
          <Icon name="terminal" size={12} />
          Terminal
        </button>
      </div>
      <div className="flex items-center gap-3">
        {activeFile && (
          <>
            <span className="text-nexus-text-muted">
              {activeFile.language}
            </span>
            <span className="text-nexus-text-muted">
              UTF-8
            </span>
            <span className="text-nexus-text-muted">
              {activeFile.content.split("\n").length} lines
            </span>
          </>
        )}
        <button
          onClick={toggleChat}
          className="flex items-center gap-1 text-nexus-accent hover:text-nexus-accent-hover"
        >
          <Icon name="sparkles" size={12} />
          AI
        </button>
        <span className="text-nexus-text-subtle">
          {settings.models.chat.model}
        </span>
        <button
          onClick={toggleSettings}
          className="text-nexus-text-muted hover:text-nexus-text"
        >
          <Icon name="settings" size={12} />
        </button>
      </div>
    </div>
  );
}
