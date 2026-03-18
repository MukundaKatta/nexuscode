"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useNexusStore } from "@/store";
import { Icon } from "@/components/common/Icon";
import { cn } from "@/lib/utils";

interface TerminalLine {
  id: number;
  type: "input" | "output" | "error" | "system";
  content: string;
}

const WELCOME_MESSAGE = [
  { id: 0, type: "system" as const, content: "NexusCode Terminal v1.0.0" },
  { id: 1, type: "system" as const, content: "Type 'help' for available commands.\n" },
];

const HELP_TEXT = `Available commands:
  help        Show this help message
  ls          List files in current directory
  cat <file>  Show file contents
  pwd         Print working directory
  clear       Clear terminal
  echo <msg>  Print message
  node -v     Show Node.js version
  npm run     List available scripts
  git status  Show git status
  git log     Show git history
  whoami      Show current user`;

export function TerminalPanel() {
  const { isTerminalOpen, toggleTerminal } = useNexusStore();
  const [lines, setLines] = useState<TerminalLine[]>(WELCOME_MESSAGE);
  const [currentInput, setCurrentInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [cwd] = useState("/project");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [lines]);

  useEffect(() => {
    if (isTerminalOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isTerminalOpen]);

  const addLine = useCallback(
    (type: TerminalLine["type"], content: string) => {
      const id = nextId.current++;
      setLines((prev) => [...prev, { id, type, content }]);
    },
    []
  );

  const executeCommand = useCallback(
    (cmd: string) => {
      const parts = cmd.trim().split(/\s+/);
      const command = parts[0]?.toLowerCase();
      const args = parts.slice(1);

      addLine("input", `${cwd} $ ${cmd}`);

      switch (command) {
        case "help":
          addLine("output", HELP_TEXT);
          break;
        case "ls": {
          const { getAllFilePaths } = require("@/lib/filesystem");
          const files = getAllFilePaths();
          const dirArg = args[0] || "";
          const filtered = dirArg
            ? files.filter((f: string) => f.startsWith(dirArg))
            : files;
          const entries = new Set<string>();
          for (const f of filtered) {
            const rel = dirArg ? f.slice(dirArg.length + 1) : f;
            const top = rel.split("/")[0];
            if (top) entries.add(top);
          }
          addLine("output", Array.from(entries).sort().join("  "));
          break;
        }
        case "cat": {
          if (!args[0]) {
            addLine("error", "cat: missing file operand");
            break;
          }
          const { getFileContent } = require("@/lib/filesystem");
          const content = getFileContent(args[0]);
          if (content !== null) {
            addLine("output", content);
          } else {
            addLine("error", `cat: ${args[0]}: No such file or directory`);
          }
          break;
        }
        case "pwd":
          addLine("output", cwd);
          break;
        case "clear":
          setLines([]);
          break;
        case "echo":
          addLine("output", args.join(" "));
          break;
        case "node":
          if (args[0] === "-v" || args[0] === "--version") {
            addLine("output", "v20.11.0");
          } else {
            addLine("output", "Usage: node [options] [script.js]");
          }
          break;
        case "npm":
          if (args[0] === "run") {
            addLine(
              "output",
              "Scripts available via `npm run`:\n  dev\n  build\n  start\n  test\n  lint"
            );
          } else if (args[0] === "-v" || args[0] === "--version") {
            addLine("output", "10.2.4");
          } else {
            addLine("output", "Usage: npm <command>");
          }
          break;
        case "git":
          if (args[0] === "status") {
            const { getGitStatus } = require("@/lib/git");
            const status = getGitStatus();
            let output = `On branch ${status.branch}\n`;
            if (status.staged.length > 0) {
              output += "\nChanges to be committed:\n";
              for (const f of status.staged) {
                output += `  ${f.status}: ${f.path}\n`;
              }
            }
            if (status.unstaged.length > 0) {
              output += "\nChanges not staged for commit:\n";
              for (const f of status.unstaged) {
                output += `  ${f.status}: ${f.path}\n`;
              }
            }
            if (status.staged.length === 0 && status.unstaged.length === 0) {
              output += "nothing to commit, working tree clean";
            }
            addLine("output", output);
          } else if (args[0] === "log") {
            const { getGitLog } = require("@/lib/git");
            const log = getGitLog(5);
            const output = log
              .map(
                (c: any) =>
                  `\x1b[33m${c.hash}\x1b[0m ${c.message} (${c.author}, ${new Date(c.date).toLocaleDateString()})`
              )
              .join("\n");
            addLine("output", output);
          } else {
            addLine("output", `git: '${args[0]}' is not a git command.`);
          }
          break;
        case "whoami":
          addLine("output", "developer");
          break;
        case "":
          break;
        default:
          addLine("error", `command not found: ${command}`);
      }
    },
    [addLine, cwd]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentInput.trim()) {
        setHistory((prev) => [...prev, currentInput]);
        setHistoryIdx(-1);
      }
      executeCommand(currentInput);
      setCurrentInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIdx = historyIdx < history.length - 1 ? historyIdx + 1 : historyIdx;
      setHistoryIdx(newIdx);
      if (newIdx >= 0) {
        setCurrentInput(history[history.length - 1 - newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIdx = historyIdx > 0 ? historyIdx - 1 : -1;
      setHistoryIdx(newIdx);
      setCurrentInput(newIdx >= 0 ? history[history.length - 1 - newIdx] : "");
    } else if (e.key === "c" && e.ctrlKey) {
      setCurrentInput("");
      addLine("input", `${cwd} $ ${currentInput}^C`);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  if (!isTerminalOpen) return null;

  return (
    <div className="flex flex-col bg-nexus-bg border-t border-nexus-border" style={{ height: "200px" }}>
      <div className="flex items-center justify-between px-3 py-1 border-b border-nexus-border bg-nexus-bg-light">
        <div className="flex items-center gap-2">
          <Icon name="terminal" size={14} className="text-nexus-text-muted" />
          <span className="text-xs text-nexus-text-muted">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLines([])}
            className="p-0.5 rounded hover:bg-nexus-bg-lighter text-nexus-text-subtle"
            title="Clear"
          >
            <Icon name="trash" size={12} />
          </button>
          <button
            onClick={toggleTerminal}
            className="p-0.5 rounded hover:bg-nexus-bg-lighter text-nexus-text-subtle"
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn(
              "whitespace-pre-wrap",
              line.type === "input" && "text-nexus-text",
              line.type === "output" && "text-nexus-text-muted",
              line.type === "error" && "text-nexus-red",
              line.type === "system" && "text-nexus-accent"
            )}
          >
            {line.content}
          </div>
        ))}
        <div className="flex items-center">
          <span className="text-nexus-green mr-1">{cwd} $</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-nexus-text outline-none caret-nexus-accent"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
