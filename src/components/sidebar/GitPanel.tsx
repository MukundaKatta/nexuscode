"use client";

import { useState } from "react";
import { useNexusStore } from "@/store";
import { Icon } from "@/components/common/Icon";
import { getGitStatus, getGitLog, stageFile, unstageFile, commitChanges } from "@/lib/git";
import { cn } from "@/lib/utils";

export function GitPanel() {
  const { gitStatus, setGitStatus, gitLog, setGitLog, addNotification } = useNexusStore();
  const [commitMessage, setCommitMessage] = useState("");
  const [showLog, setShowLog] = useState(false);

  const status = gitStatus || getGitStatus();
  const log = gitLog.length > 0 ? gitLog : getGitLog();

  const handleStage = (path: string) => {
    stageFile(path);
    setGitStatus(getGitStatus());
  };

  const handleUnstage = (path: string) => {
    unstageFile(path);
    setGitStatus(getGitStatus());
  };

  const handleCommit = () => {
    if (!commitMessage.trim()) {
      addNotification("warning", "Please enter a commit message");
      return;
    }
    if (status.staged.length === 0) {
      addNotification("warning", "No staged changes to commit");
      return;
    }
    commitChanges(commitMessage);
    setCommitMessage("");
    setGitStatus(getGitStatus());
    setGitLog(getGitLog());
    addNotification("success", "Changes committed successfully");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-nexus-border">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="git-branch" size={14} className="text-nexus-accent" />
          <span className="text-sm text-nexus-text font-medium">{status.branch}</span>
          {status.ahead > 0 && (
            <span className="text-xxs px-1 bg-nexus-green/20 text-nexus-green rounded">
              {status.ahead} ahead
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowLog(false)}
            className={cn(
              "px-2 py-1 text-xs rounded",
              !showLog ? "bg-nexus-accent/20 text-nexus-accent" : "text-nexus-text-muted hover:bg-nexus-bg-lighter"
            )}
          >
            Changes
          </button>
          <button
            onClick={() => setShowLog(true)}
            className={cn(
              "px-2 py-1 text-xs rounded",
              showLog ? "bg-nexus-accent/20 text-nexus-accent" : "text-nexus-text-muted hover:bg-nexus-bg-lighter"
            )}
          >
            History
          </button>
        </div>
      </div>

      {!showLog ? (
        <div className="flex-1 overflow-y-auto">
          {/* Commit input */}
          <div className="p-3 border-b border-nexus-border">
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="w-full bg-nexus-bg border border-nexus-border rounded text-sm text-nexus-text p-2 outline-none focus:border-nexus-accent resize-none"
              rows={2}
            />
            <button
              onClick={handleCommit}
              className="w-full mt-2 px-3 py-1.5 bg-nexus-accent/20 text-nexus-accent text-sm rounded hover:bg-nexus-accent/30 transition-colors"
            >
              <Icon name="check" size={14} className="inline mr-1" />
              Commit ({status.staged.length} files)
            </button>
          </div>

          {/* Staged changes */}
          {status.staged.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xxs font-medium text-nexus-text-muted uppercase tracking-wider">
                Staged Changes ({status.staged.length})
              </div>
              {status.staged.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs hover:bg-nexus-bg-lighter group"
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    file.status === "added" ? "bg-nexus-green" :
                    file.status === "deleted" ? "bg-nexus-red" : "bg-nexus-orange"
                  )} />
                  <span className="truncate text-nexus-text-muted flex-1">{file.path}</span>
                  <button
                    onClick={() => handleUnstage(file.path)}
                    className="opacity-0 group-hover:opacity-100 p-0.5"
                  >
                    <Icon name="minus" size={12} className="text-nexus-text-subtle" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Unstaged changes */}
          {status.unstaged.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xxs font-medium text-nexus-text-muted uppercase tracking-wider">
                Changes ({status.unstaged.length})
              </div>
              {status.unstaged.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs hover:bg-nexus-bg-lighter group"
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    file.status === "modified" ? "bg-nexus-orange" : "bg-nexus-green"
                  )} />
                  <span className="truncate text-nexus-text-muted flex-1">{file.path}</span>
                  <button
                    onClick={() => handleStage(file.path)}
                    className="opacity-0 group-hover:opacity-100 p-0.5"
                  >
                    <Icon name="plus" size={12} className="text-nexus-text-subtle" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {status.staged.length === 0 && status.unstaged.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-nexus-text-subtle">
              <Icon name="check" size={24} className="mb-2" />
              <span className="text-sm">No changes</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {log.map((commit) => (
            <div
              key={commit.hash}
              className="px-3 py-2 border-b border-nexus-border/50 hover:bg-nexus-bg-lighter"
            >
              <div className="flex items-start gap-2">
                <span className="text-xxs font-mono text-nexus-accent mt-0.5 shrink-0">
                  {commit.hash}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-nexus-text truncate">{commit.message}</p>
                  <p className="text-xxs text-nexus-text-subtle mt-0.5">
                    {commit.author} - {new Date(commit.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
