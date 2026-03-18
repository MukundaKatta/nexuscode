"use client";

import { useState, useRef, useEffect } from "react";
import { useNexusStore } from "@/store";
import { Icon } from "@/components/common/Icon";
import { cn } from "@/lib/utils";

interface InlineEditWidgetProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function InlineEditWidget({ onSubmit, onCancel, isLoading }: InlineEditWidgetProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  return (
    <div className="flex items-center gap-2 mx-4 my-2 p-2 bg-nexus-bg-lighter border border-nexus-accent/50 rounded-lg shadow-lg animate-fade-in">
      <Icon name="sparkles" size={16} className="text-nexus-accent shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Describe the edit... (Enter to submit, Esc to cancel)"
        className="flex-1 bg-transparent text-nexus-text text-sm outline-none placeholder:text-nexus-text-subtle"
        disabled={isLoading}
      />
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-nexus-accent border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className={cn(
              "p-1 rounded",
              prompt.trim()
                ? "text-nexus-accent hover:bg-nexus-accent/20"
                : "text-nexus-text-subtle"
            )}
          >
            <Icon name="send" size={14} />
          </button>
          <button
            onClick={onCancel}
            className="p-1 rounded text-nexus-text-subtle hover:text-nexus-text hover:bg-nexus-bg"
          >
            <Icon name="close" size={14} />
          </button>
        </>
      )}
    </div>
  );
}

interface InlineEditDiffProps {
  originalCode: string;
  newCode: string;
  onAccept: () => void;
  onReject: () => void;
}

export function InlineEditDiff({ originalCode, newCode, onAccept, onReject }: InlineEditDiffProps) {
  const oldLines = originalCode.split("\n");
  const newLines = newCode.split("\n");

  return (
    <div className="mx-4 my-2 border border-nexus-border rounded-lg overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-3 py-1.5 bg-nexus-bg-lighter border-b border-nexus-border">
        <span className="text-xs text-nexus-text-muted">Suggested Edit</span>
        <div className="flex gap-1">
          <button
            onClick={onAccept}
            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-nexus-green/20 text-nexus-green rounded hover:bg-nexus-green/30"
          >
            <Icon name="check" size={12} /> Accept
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-nexus-red/20 text-nexus-red rounded hover:bg-nexus-red/30"
          >
            <Icon name="close" size={12} /> Reject
          </button>
        </div>
      </div>
      <div className="max-h-[300px] overflow-y-auto font-mono text-xs">
        {oldLines.map((line, i) => {
          const isRemoved = i < oldLines.length && (i >= newLines.length || oldLines[i] !== newLines[i]);
          return isRemoved ? (
            <div key={`old-${i}`} className="flex bg-nexus-red/10 text-nexus-red/80">
              <span className="w-8 text-right pr-2 text-nexus-text-subtle select-none shrink-0">{i + 1}</span>
              <span className="px-1 select-none shrink-0">-</span>
              <span className="flex-1 whitespace-pre">{line}</span>
            </div>
          ) : null;
        })}
        {newLines.map((line, i) => {
          const isAdded = i < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[i]);
          return isAdded ? (
            <div key={`new-${i}`} className="flex bg-nexus-green/10 text-nexus-green/80">
              <span className="w-8 text-right pr-2 text-nexus-text-subtle select-none shrink-0">{i + 1}</span>
              <span className="px-1 select-none shrink-0">+</span>
              <span className="flex-1 whitespace-pre">{line}</span>
            </div>
          ) : (
            <div key={`ctx-${i}`} className="flex text-nexus-text-muted">
              <span className="w-8 text-right pr-2 text-nexus-text-subtle select-none shrink-0">{i + 1}</span>
              <span className="px-1 select-none shrink-0"> </span>
              <span className="flex-1 whitespace-pre">{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
