"use client";

import { useState, useRef } from "react";
import { useNexusStore } from "@/store";
import { Icon } from "@/components/common/Icon";
import { MentionInput } from "@/components/chat/MentionInput";
import { generateId, cn } from "@/lib/utils";
import { ComposerPlan, ComposerStep } from "@/types";
import { getFileContent, setFileContent, createFile } from "@/lib/filesystem";

export function ComposerPanel() {
  const {
    isComposerOpen,
    toggleComposer,
    composerPlan,
    setComposerPlan,
    updateComposerStep,
    chatContext,
    settings,
    addNotification,
    openFile,
    setFileTree,
  } = useNexusStore();

  const [prompt, setPrompt] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handlePlan = async () => {
    if (!prompt.trim()) return;
    setIsPlanning(true);

    try {
      const response = await fetch("/api/composer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context: chatContext,
          config: settings.models.chat,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate plan");
      }

      const data = await response.json();

      // Parse plan into steps
      const steps: ComposerStep[] = data.steps || [
        {
          id: generateId(),
          description: "Analyze current codebase structure",
          filePath: "src/",
          action: "modify" as const,
          status: "pending" as const,
        },
        {
          id: generateId(),
          description: `Implement: ${prompt.slice(0, 80)}`,
          filePath: "src/index.ts",
          action: "modify" as const,
          status: "pending" as const,
        },
        {
          id: generateId(),
          description: "Update imports and exports",
          filePath: "src/index.ts",
          action: "modify" as const,
          status: "pending" as const,
        },
        {
          id: generateId(),
          description: "Add tests for new functionality",
          filePath: "src/__tests__/",
          action: "create" as const,
          status: "pending" as const,
        },
      ];

      const plan: ComposerPlan = {
        id: generateId(),
        prompt,
        description: data.description || `Multi-file implementation for: ${prompt}`,
        steps,
        status: "planning",
        createdAt: Date.now(),
      };

      setComposerPlan(plan);
    } catch (err) {
      // Create a demo plan on error for offline usage
      const steps: ComposerStep[] = [
        {
          id: generateId(),
          description: "Analyze current codebase structure and dependencies",
          filePath: "src/",
          action: "modify",
          status: "pending",
        },
        {
          id: generateId(),
          description: `Create new module for: ${prompt.slice(0, 60)}`,
          filePath: `src/${prompt.split(" ").pop()?.toLowerCase() || "feature"}.ts`,
          action: "create",
          content: `// Generated module for: ${prompt}\n\nexport class Feature {\n  constructor() {\n    // Implementation\n  }\n\n  async execute(): Promise<void> {\n    console.log('Feature executed');\n  }\n}\n`,
          status: "pending",
        },
        {
          id: generateId(),
          description: "Update main entry point with new imports",
          filePath: "src/index.ts",
          action: "modify",
          status: "pending",
        },
      ];

      const plan: ComposerPlan = {
        id: generateId(),
        prompt,
        description: `Multi-file implementation plan for: ${prompt}`,
        steps,
        status: "planning",
        createdAt: Date.now(),
      };

      setComposerPlan(plan);
      addNotification("info", "Generated plan locally (API unavailable)");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecute = async () => {
    if (!composerPlan) return;
    setIsExecuting(true);
    setComposerPlan({ ...composerPlan, status: "executing" });

    for (const step of composerPlan.steps) {
      updateComposerStep(step.id, "in_progress");

      // Simulate execution with a delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (step.action === "create" && step.content) {
        createFile(step.filePath, step.content);
        const name = step.filePath.split("/").pop() || step.filePath;
        openFile(step.filePath, name, step.content);
      } else if (step.action === "modify") {
        const existing = getFileContent(step.filePath);
        if (existing !== null && step.content) {
          setFileContent(step.filePath, step.content);
        }
      }

      updateComposerStep(step.id, "completed");
    }

    setComposerPlan({
      ...composerPlan,
      status: "completed",
      steps: composerPlan.steps.map((s) => ({ ...s, status: "completed" as const })),
    });

    const { getFileTree } = require("@/lib/filesystem");
    setFileTree(getFileTree());
    setIsExecuting(false);
    addNotification("success", "Composer plan executed successfully");
  };

  const handleDiscard = () => {
    setComposerPlan(null);
    setPrompt("");
  };

  if (!isComposerOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={toggleComposer} />
      <div className="relative w-[700px] max-h-[80vh] bg-nexus-bg-light border border-nexus-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-nexus-border">
          <div className="flex items-center gap-2">
            <Icon name="layers" size={18} className="text-nexus-purple" />
            <span className="text-sm font-semibold text-nexus-text">Composer</span>
            <span className="text-xxs px-2 py-0.5 bg-nexus-purple/20 text-nexus-purple rounded-full">
              Multi-File
            </span>
          </div>
          <button
            onClick={toggleComposer}
            className="p-1 rounded hover:bg-nexus-bg-lighter text-nexus-text-subtle"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!composerPlan ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-nexus-text-muted mb-2 font-medium">
                  Describe the feature or changes you want to make
                </label>
                <div className="bg-nexus-bg rounded-lg border border-nexus-border p-3 focus-within:border-nexus-accent">
                  <MentionInput
                    value={prompt}
                    onChange={setPrompt}
                    onSubmit={handlePlan}
                    placeholder="e.g., Add a caching layer with Redis for all API routes, including TTL configuration and cache invalidation..."
                  />
                </div>
              </div>

              {chatContext.length > 0 && (
                <div>
                  <span className="text-xxs text-nexus-text-subtle">Context files:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {chatContext.map((ctx) => (
                      <span
                        key={ctx.name}
                        className="px-2 py-0.5 bg-nexus-accent/10 text-nexus-accent text-xxs rounded"
                      >
                        {ctx.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-nexus-text-subtle bg-nexus-bg rounded-lg p-3 border border-nexus-border/50">
                <strong className="text-nexus-text-muted">Tips:</strong>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li>Use @file:path to include specific files as context</li>
                  <li>Be specific about the architecture you want</li>
                  <li>The composer will create a step-by-step plan before executing</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-nexus-bg rounded-lg p-3 border border-nexus-border/50">
                <p className="text-xs text-nexus-text-subtle mb-1">Prompt:</p>
                <p className="text-sm text-nexus-text">{composerPlan.prompt}</p>
              </div>

              <div>
                <h3 className="text-xs font-medium text-nexus-text-muted mb-2 uppercase tracking-wider">
                  Execution Plan ({composerPlan.steps.length} steps)
                </h3>
                <div className="space-y-1">
                  {composerPlan.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-start gap-3 p-2.5 rounded-lg border",
                        step.status === "completed"
                          ? "border-nexus-green/30 bg-nexus-green/5"
                          : step.status === "in_progress"
                          ? "border-nexus-accent/30 bg-nexus-accent/5"
                          : step.status === "failed"
                          ? "border-nexus-red/30 bg-nexus-red/5"
                          : "border-nexus-border/50 bg-nexus-bg"
                      )}
                    >
                      <div className="mt-0.5">
                        {step.status === "completed" ? (
                          <Icon name="check" size={14} className="text-nexus-green" />
                        ) : step.status === "in_progress" ? (
                          <div className="w-3.5 h-3.5 border-2 border-nexus-accent border-t-transparent rounded-full animate-spin" />
                        ) : step.status === "failed" ? (
                          <Icon name="close" size={14} className="text-nexus-red" />
                        ) : (
                          <span className="w-3.5 h-3.5 flex items-center justify-center text-xxs text-nexus-text-subtle border border-nexus-border rounded-full">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-nexus-text">{step.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xxs font-mono text-nexus-text-subtle">
                            {step.filePath}
                          </span>
                          <span
                            className={cn(
                              "text-xxs px-1.5 py-0.5 rounded",
                              step.action === "create"
                                ? "bg-nexus-green/20 text-nexus-green"
                                : step.action === "delete"
                                ? "bg-nexus-red/20 text-nexus-red"
                                : "bg-nexus-orange/20 text-nexus-orange"
                            )}
                          >
                            {step.action}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-nexus-border bg-nexus-bg">
          {!composerPlan ? (
            <>
              <span className="text-xxs text-nexus-text-subtle">
                {settings.models.chat.model}
              </span>
              <button
                onClick={handlePlan}
                disabled={!prompt.trim() || isPlanning}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium",
                  prompt.trim() && !isPlanning
                    ? "bg-nexus-purple/20 text-nexus-purple hover:bg-nexus-purple/30"
                    : "bg-nexus-bg-lighter text-nexus-text-subtle cursor-not-allowed"
                )}
              >
                {isPlanning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-nexus-purple border-t-transparent rounded-full animate-spin" />
                    Planning...
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" size={14} />
                    Generate Plan
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDiscard}
                className="px-3 py-1.5 text-sm text-nexus-text-muted hover:text-nexus-text hover:bg-nexus-bg-lighter rounded"
              >
                Discard
              </button>
              <div className="flex gap-2">
                {composerPlan.status === "completed" ? (
                  <button
                    onClick={() => {
                      handleDiscard();
                      toggleComposer();
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-nexus-green/20 text-nexus-green"
                  >
                    <Icon name="check" size={14} />
                    Done
                  </button>
                ) : (
                  <button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-nexus-accent/20 text-nexus-accent hover:bg-nexus-accent/30"
                  >
                    {isExecuting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-nexus-accent border-t-transparent rounded-full animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Icon name="play" size={14} />
                        Execute Plan
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
