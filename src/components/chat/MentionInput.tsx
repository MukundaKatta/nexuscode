"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MentionSuggestion } from "@/types";
import { useNexusStore } from "@/store";
import { getAllFilePaths, getFileContent } from "@/lib/filesystem";
import { extractFunctions, getLanguageFromPath } from "@/lib/utils";
import { Icon, IconName } from "@/components/common/Icon";
import { cn } from "@/lib/utils";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
}: MentionInputProps) {
  const { addChatContext } = useNexusStore();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionType, setMentionType] = useState<string>("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const allFiles = getAllFilePaths();

  const buildSuggestions = useCallback(
    (type: string, query: string): MentionSuggestion[] => {
      const q = query.toLowerCase();
      const results: MentionSuggestion[] = [];

      if (type === "file" || type === "") {
        for (const path of allFiles) {
          if (path.toLowerCase().includes(q) || !q) {
            results.push({
              type: "file",
              label: path.split("/").pop() || path,
              path,
              detail: path,
            });
          }
        }
      }

      if (type === "function" || type === "") {
        for (const path of allFiles) {
          const content = getFileContent(path);
          if (!content) continue;
          const lang = getLanguageFromPath(path);
          const fns = extractFunctions(content, lang);
          for (const fn of fns) {
            if (fn.toLowerCase().includes(q) || !q) {
              results.push({
                type: "function",
                label: fn,
                path,
                detail: `${path}`,
              });
            }
          }
        }
      }

      if (type === "docs") {
        results.push({
          type: "docs",
          label: "Project README",
          detail: "Project documentation",
        });
        results.push({
          type: "docs",
          label: "API Reference",
          detail: "API documentation",
        });
      }

      return results.slice(0, 15);
    },
    [allFiles]
  );

  const handleChange = (newValue: string) => {
    onChange(newValue);

    // Check for @ mentions
    const cursorPos = inputRef.current?.selectionStart || newValue.length;
    const textUpToCursor = newValue.slice(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(file|function|docs)?:?(\S*)$/);

    if (mentionMatch) {
      const type = mentionMatch[1] || "";
      const query = mentionMatch[2] || "";
      setMentionType(type);
      setMentionQuery(query);
      setSuggestions(buildSuggestions(type, query));
      setShowSuggestions(true);
      setSelectedIdx(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: MentionSuggestion) => {
    // Replace the @mention text with the selected suggestion
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const textUpToCursor = value.slice(0, cursorPos);
    const mentionStart = textUpToCursor.lastIndexOf("@");
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursorPos);
    const mention = `@${suggestion.type}:${suggestion.path || suggestion.label}`;
    onChange(`${before}${mention} ${after}`);

    // Add to chat context
    if (suggestion.type === "file" && suggestion.path) {
      const content = getFileContent(suggestion.path) || "";
      addChatContext({
        type: "file",
        name: suggestion.label,
        path: suggestion.path,
        content,
      });
    } else if (suggestion.type === "function" && suggestion.path) {
      const content = getFileContent(suggestion.path) || "";
      addChatContext({
        type: "function",
        name: suggestion.label,
        path: suggestion.path,
        content,
      });
    }

    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        if (suggestions[selectedIdx]) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIdx]);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const iconForType: Record<string, IconName> = {
    file: "file",
    function: "code",
    docs: "info",
  };

  return (
    <div className="relative">
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-nexus-bg-lighter border border-nexus-border rounded-lg shadow-xl max-h-[240px] overflow-y-auto z-20">
          {suggestions.map((s, idx) => (
            <button
              key={`${s.type}-${s.label}-${idx}`}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left",
                idx === selectedIdx
                  ? "bg-nexus-accent/20 text-nexus-text"
                  : "text-nexus-text-muted hover:bg-nexus-bg"
              )}
              onClick={() => selectSuggestion(s)}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <Icon name={iconForType[s.type] || "file"} size={14} className="shrink-0 text-nexus-accent" />
              <span className="font-medium truncate">{s.label}</span>
              {s.detail && (
                <span className="ml-auto text-xxs text-nexus-text-subtle truncate max-w-[200px]">
                  {s.detail}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="w-full bg-transparent text-nexus-text text-sm outline-none resize-none placeholder:text-nexus-text-subtle min-h-[20px] max-h-[120px]"
        style={{ height: "auto" }}
        onInput={(e) => {
          const el = e.target as HTMLTextAreaElement;
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 120) + "px";
        }}
      />
    </div>
  );
}
