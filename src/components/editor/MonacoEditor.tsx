"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import { useNexusStore } from "@/store";
import { setFileContent } from "@/lib/filesystem";
import { markFileModified } from "@/lib/git";
import { InlineEditWidget, InlineEditDiff } from "./InlineEditWidget";
import { generateInlineEdit } from "@/lib/ai";

export function MonacoEditor() {
  const {
    openFiles,
    activeFilePath,
    updateFileContent,
    saveFile,
    isInlineEditOpen,
    setInlineEditOpen,
    settings,
    addNotification,
    addChatContext,
  } = useNexusStore();

  const editorRef = useRef<any>(null);
  const [isInlineLoading, setIsInlineLoading] = useState(false);
  const [inlineDiff, setInlineDiff] = useState<{ original: string; modified: string } | null>(null);

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme("nexus-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6e7681", fontStyle: "italic" },
        { token: "keyword", foreground: "ff7b72" },
        { token: "string", foreground: "a5d6ff" },
        { token: "number", foreground: "79c0ff" },
        { token: "type", foreground: "ffa657" },
        { token: "function", foreground: "d2a8ff" },
        { token: "variable", foreground: "ffa657" },
        { token: "constant", foreground: "79c0ff" },
        { token: "operator", foreground: "ff7b72" },
      ],
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#e6edf3",
        "editor.lineHighlightBackground": "#161b2233",
        "editor.selectionBackground": "#264f78",
        "editor.inactiveSelectionBackground": "#264f7855",
        "editorLineNumber.foreground": "#484f58",
        "editorLineNumber.activeForeground": "#e6edf3",
        "editorCursor.foreground": "#58a6ff",
        "editor.findMatchBackground": "#9e6a03aa",
        "editor.findMatchHighlightBackground": "#f2cc6044",
        "editorBracketMatch.background": "#58a6ff33",
        "editorBracketMatch.border": "#58a6ff",
        "editorIndentGuide.background": "#21262d",
        "editorIndentGuide.activeBackground": "#30363d",
        "editorGutter.background": "#0d1117",
        "editorWidget.background": "#161b22",
        "editorWidget.border": "#30363d",
        "editorSuggestWidget.background": "#161b22",
        "editorSuggestWidget.border": "#30363d",
        "editorSuggestWidget.selectedBackground": "#264f78",
        "minimap.background": "#0d1117",
        "scrollbar.shadow": "#0008",
        "scrollbarSlider.background": "#484f5833",
        "scrollbarSlider.hoverBackground": "#484f5855",
        "scrollbarSlider.activeBackground": "#484f5877",
      },
    });

    monaco.editor.setTheme("nexus-dark");

    // Add Cmd+K for inline edit
    editor.addAction({
      id: "nexus-inline-edit",
      label: "NexusCode: Inline Edit",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      run: () => {
        setInlineEditOpen(true);
      },
    });

    // Add selection to context
    editor.addAction({
      id: "nexus-add-to-context",
      label: "NexusCode: Add Selection to Chat Context",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL],
      run: () => {
        const selection = editor.getSelection();
        const selectedText = editor.getModel()?.getValueInRange(selection) || "";
        if (selectedText && activeFilePath) {
          addChatContext({
            type: "selection",
            name: `Selection from ${activeFilePath}`,
            path: activeFilePath,
            content: selectedText,
            startLine: selection?.startLineNumber,
            endLine: selection?.endLineNumber,
          });
          addNotification("info", "Selection added to chat context");
        }
      },
    });
  };

  const handleEditorChange: OnChange = (value) => {
    if (activeFilePath && value !== undefined) {
      updateFileContent(activeFilePath, value);
      markFileModified(activeFilePath);
    }
  };

  const handleInlineEdit = async (prompt: string) => {
    if (!editorRef.current || !activeFile) return;

    const editor = editorRef.current;
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!model) return;

    let selectedText: string;
    let startLine: number;
    let endLine: number;

    if (selection && !selection.isEmpty()) {
      selectedText = model.getValueInRange(selection);
      startLine = selection.startLineNumber;
      endLine = selection.endLineNumber;
    } else {
      selectedText = model.getValue();
      startLine = 1;
      endLine = model.getLineCount();
    }

    setIsInlineLoading(true);
    try {
      const newCode = await generateInlineEdit(
        selectedText,
        prompt,
        activeFile.path,
        settings.models.inline
      );
      setInlineDiff({ original: selectedText, modified: newCode });
    } catch (err) {
      addNotification("error", `Inline edit failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsInlineLoading(false);
      setInlineEditOpen(false);
    }
  };

  const handleAcceptDiff = () => {
    if (!inlineDiff || !editorRef.current || !activeFile) return;

    const editor = editorRef.current;
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!model) return;

    if (selection && !selection.isEmpty()) {
      editor.executeEdits("nexus-inline-edit", [
        { range: selection, text: inlineDiff.modified },
      ]);
    } else {
      model.setValue(inlineDiff.modified);
    }

    setInlineDiff(null);
    addNotification("success", "Edit applied");
  };

  const handleRejectDiff = () => {
    setInlineDiff(null);
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-nexus-bg text-nexus-text-subtle">
        <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-nexus-accent to-nexus-purple bg-clip-text text-transparent">
          NexusCode
        </div>
        <p className="text-sm mb-6">AI-Native Code Editor</p>
        <div className="grid grid-cols-2 gap-3 text-xs max-w-md">
          {[
            ["Cmd+P", "Quick Open"],
            ["Cmd+K", "Inline AI Edit"],
            ["Cmd+L", "AI Chat"],
            ["Cmd+Shift+I", "Composer"],
            ["Cmd+Shift+F", "Search Files"],
            ["Cmd+`", "Toggle Terminal"],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-nexus-text-muted">
              <kbd className="px-1.5 py-0.5 bg-nexus-bg-lighter border border-nexus-border rounded text-xxs font-mono">
                {key}
              </kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-nexus-bg overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-1 text-xs text-nexus-text-subtle border-b border-nexus-border bg-nexus-bg">
        {activeFile.path.split("/").map((part, i, arr) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-nexus-text-subtle/50">/</span>}
            <span className={i === arr.length - 1 ? "text-nexus-text-muted" : ""}>
              {part}
            </span>
          </span>
        ))}
      </div>

      {/* Inline edit widget */}
      {isInlineEditOpen && (
        <InlineEditWidget
          onSubmit={handleInlineEdit}
          onCancel={() => setInlineEditOpen(false)}
          isLoading={isInlineLoading}
        />
      )}

      {/* Inline diff */}
      {inlineDiff && (
        <InlineEditDiff
          originalCode={inlineDiff.original}
          newCode={inlineDiff.modified}
          onAccept={handleAcceptDiff}
          onReject={handleRejectDiff}
        />
      )}

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={activeFile.language}
          value={activeFile.content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="nexus-dark"
          options={{
            fontSize: settings.fontSize,
            fontFamily: `"${settings.fontFamily}", monospace`,
            tabSize: settings.tabSize,
            wordWrap: settings.wordWrap ? "on" : "off",
            minimap: { enabled: settings.minimap },
            lineNumbers: settings.lineNumbers ? "on" : "off",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            scrollBeyondLastLine: false,
            padding: { top: 8 },
            suggest: { showIcons: true },
            quickSuggestions: true,
            formatOnPaste: true,
            renderWhitespace: "selection",
            occurrencesHighlight: "singleFile",
            folding: true,
            foldingHighlight: true,
            links: true,
            colorDecorators: true,
            accessibilitySupport: "off",
          }}
        />
      </div>
    </div>
  );
}
