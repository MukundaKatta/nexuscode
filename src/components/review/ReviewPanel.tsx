"use client";

import { useState } from "react";
import { useNexusStore } from "@/store";
import { Icon, IconName } from "@/components/common/Icon";
import { CodeReview, ReviewComment } from "@/types";
import { generateId, cn } from "@/lib/utils";

export function ReviewPanel() {
  const {
    isReviewOpen,
    toggleReview,
    codeReview,
    setCodeReview,
    activeFilePath,
    openFiles,
    settings,
    addNotification,
  } = useNexusStore();

  const [isReviewing, setIsReviewing] = useState(false);
  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  const handleReview = async () => {
    if (!activeFile) {
      addNotification("warning", "Open a file to review");
      return;
    }

    setIsReviewing(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: activeFile.path,
          content: activeFile.content,
          config: settings.models.chat,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCodeReview(data.review);
      } else {
        throw new Error("API unavailable");
      }
    } catch {
      // Generate local review
      const comments: ReviewComment[] = [];
      const lines = activeFile.content.split("\n");

      // Check for common patterns
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        if (line.includes("console.log") || line.includes("console.error")) {
          comments.push({
            id: generateId(),
            line: lineNum,
            severity: "warning",
            message: "Consider using a proper logging library instead of console methods for production code.",
            suggestedFix: line.replace(/console\.(log|error|warn)/, "logger.$1"),
          });
        }
        if (line.includes("any")) {
          comments.push({
            id: generateId(),
            line: lineNum,
            severity: "suggestion",
            message: "Avoid using 'any' type. Consider defining a proper interface or type.",
          });
        }
        if (line.includes("TODO") || line.includes("FIXME") || line.includes("HACK")) {
          comments.push({
            id: generateId(),
            line: lineNum,
            severity: "info",
            message: `Found a ${line.includes("TODO") ? "TODO" : line.includes("FIXME") ? "FIXME" : "HACK"} comment. Consider addressing this technical debt.`,
          });
        }
        if (line.length > 120) {
          comments.push({
            id: generateId(),
            line: lineNum,
            severity: "suggestion",
            message: "Line exceeds 120 characters. Consider breaking it into multiple lines for readability.",
          });
        }
        if (/catch\s*\{/.test(line) || /catch\s*\(\s*\)/.test(line)) {
          comments.push({
            id: generateId(),
            line: lineNum,
            severity: "warning",
            message: "Empty catch block swallows errors. Consider logging or re-throwing the error.",
          });
        }
        if (/password|secret|api_key|apikey/i.test(line) && /=\s*['"]/.test(line)) {
          comments.push({
            id: generateId(),
            line: lineNum,
            severity: "error",
            message: "Possible hardcoded secret detected. Use environment variables instead.",
          });
        }
      });

      // Overall assessment
      const score = Math.max(
        0,
        100 -
          comments.filter((c) => c.severity === "error").length * 15 -
          comments.filter((c) => c.severity === "warning").length * 5 -
          comments.filter((c) => c.severity === "suggestion").length * 2
      );

      const review: CodeReview = {
        id: generateId(),
        filePath: activeFile.path,
        comments: comments.slice(0, 20),
        summary: comments.length === 0
          ? "Code looks clean! No significant issues found."
          : `Found ${comments.length} items to review: ${comments.filter((c) => c.severity === "error").length} errors, ${comments.filter((c) => c.severity === "warning").length} warnings, ${comments.filter((c) => c.severity === "suggestion").length} suggestions.`,
        score,
        createdAt: Date.now(),
      };

      setCodeReview(review);
      addNotification("info", "Code review completed (local analysis)");
    } finally {
      setIsReviewing(false);
    }
  };

  if (!isReviewOpen) return null;

  const severityIcon: Record<string, IconName> = {
    error: "error",
    warning: "warning",
    info: "info",
    suggestion: "suggestion",
  };

  const severityColor: Record<string, string> = {
    error: "text-nexus-red",
    warning: "text-nexus-orange",
    info: "text-nexus-accent",
    suggestion: "text-nexus-green",
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={toggleReview} />
      <div className="relative w-[650px] max-h-[80vh] bg-nexus-bg-light border border-nexus-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-nexus-border">
          <div className="flex items-center gap-2">
            <Icon name="eye" size={18} className="text-nexus-accent" />
            <span className="text-sm font-semibold text-nexus-text">Code Review</span>
          </div>
          <button
            onClick={toggleReview}
            className="p-1 rounded hover:bg-nexus-bg-lighter text-nexus-text-subtle"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!codeReview ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icon name="eye" size={40} className="text-nexus-text-subtle mb-4 opacity-50" />
              <p className="text-sm text-nexus-text-muted mb-2">
                {activeFile
                  ? `Review ${activeFile.name}`
                  : "Open a file to review"}
              </p>
              <p className="text-xs text-nexus-text-subtle mb-6">
                AI will analyze your code for issues, security concerns, and improvements
              </p>
              <button
                onClick={handleReview}
                disabled={!activeFile || isReviewing}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium",
                  activeFile && !isReviewing
                    ? "bg-nexus-accent/20 text-nexus-accent hover:bg-nexus-accent/30"
                    : "bg-nexus-bg-lighter text-nexus-text-subtle cursor-not-allowed"
                )}
              >
                {isReviewing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-nexus-accent border-t-transparent rounded-full animate-spin" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" size={14} />
                    Start Review
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Score */}
              <div className="flex items-center gap-4 p-4 bg-nexus-bg rounded-lg border border-nexus-border/50">
                <div
                  className={cn(
                    "text-3xl font-bold",
                    codeReview.score >= 80
                      ? "text-nexus-green"
                      : codeReview.score >= 60
                      ? "text-nexus-orange"
                      : "text-nexus-red"
                  )}
                >
                  {codeReview.score}
                </div>
                <div>
                  <p className="text-sm text-nexus-text font-medium">
                    {codeReview.score >= 80
                      ? "Good Quality"
                      : codeReview.score >= 60
                      ? "Needs Improvement"
                      : "Significant Issues"}
                  </p>
                  <p className="text-xs text-nexus-text-muted">{codeReview.summary}</p>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                {codeReview.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-nexus-bg rounded-lg border border-nexus-border/50"
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        name={severityIcon[comment.severity]}
                        size={14}
                        className={cn("mt-0.5 shrink-0", severityColor[comment.severity])}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xxs font-mono text-nexus-text-subtle">
                            Line {comment.line}
                            {comment.endLine ? `-${comment.endLine}` : ""}
                          </span>
                          <span
                            className={cn(
                              "text-xxs px-1.5 py-0.5 rounded capitalize",
                              comment.severity === "error" && "bg-nexus-red/20 text-nexus-red",
                              comment.severity === "warning" && "bg-nexus-orange/20 text-nexus-orange",
                              comment.severity === "info" && "bg-nexus-accent/20 text-nexus-accent",
                              comment.severity === "suggestion" && "bg-nexus-green/20 text-nexus-green"
                            )}
                          >
                            {comment.severity}
                          </span>
                        </div>
                        <p className="text-sm text-nexus-text">{comment.message}</p>
                        {comment.suggestedFix && (
                          <pre className="mt-2 p-2 bg-nexus-bg-lighter rounded text-xs font-mono text-nexus-green overflow-x-auto">
                            {comment.suggestedFix}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {codeReview.comments.length === 0 && (
                <div className="flex flex-col items-center py-8 text-nexus-text-subtle">
                  <Icon name="check" size={32} className="text-nexus-green mb-2" />
                  <p className="text-sm">No issues found. Great code!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {codeReview && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-nexus-border bg-nexus-bg">
            <span className="text-xxs text-nexus-text-subtle">
              {codeReview.filePath} | {codeReview.comments.length} issues
            </span>
            <button
              onClick={() => { setCodeReview(null); handleReview(); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-nexus-bg-lighter text-nexus-text-muted hover:text-nexus-text rounded"
            >
              <Icon name="refresh" size={12} />
              Re-review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
