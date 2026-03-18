"use client";

import { useState, useRef, useEffect } from "react";
import { useNexusStore } from "@/store";
import { Icon } from "@/components/common/Icon";
import { MentionInput } from "./MentionInput";
import { streamChat, parseMentions } from "@/lib/ai";
import { getFileContent } from "@/lib/filesystem";
import { generateId, cn } from "@/lib/utils";
import { ChatMessage } from "@/types";

export function ChatPanel() {
  const {
    chatMessages,
    chatContext,
    isChatOpen,
    isChatStreaming,
    addChatMessage,
    updateLastAssistantMessage,
    setChatStreaming,
    toggleChat,
    clearChat,
    addChatContext,
    removeChatContext,
    clearChatContext,
    settings,
    activeFilePath,
    openFiles,
    addNotification,
  } = useNexusStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-add active file to context
  useEffect(() => {
    if (activeFilePath && settings.contextSettings.autoIncludeRelated) {
      const file = openFiles.find((f) => f.path === activeFilePath);
      if (file && !chatContext.find((c) => c.path === file.path)) {
        addChatContext({
          type: "file",
          name: file.name,
          path: file.path,
          content: file.content,
        });
      }
    }
  }, [activeFilePath]);

  const handleSend = async () => {
    if (!input.trim() || isChatStreaming) return;

    const { cleanText, mentions } = parseMentions(input);

    // Resolve mentions
    for (const mention of mentions) {
      if (mention.type === "file") {
        const content = getFileContent(mention.value);
        if (content) {
          addChatContext({
            type: "file",
            name: mention.value.split("/").pop() || mention.value,
            path: mention.value,
            content,
          });
        }
      }
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: Date.now(),
      context: [...chatContext],
    };

    addChatMessage(userMessage);
    setInput("");

    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };
    addChatMessage(assistantMessage);
    setChatStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      let accumulated = "";
      await streamChat(
        [...chatMessages, userMessage],
        chatContext,
        settings.models.chat,
        (chunk) => {
          accumulated += chunk;
          updateLastAssistantMessage(accumulated);
        },
        abortController.signal
      );
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        const errMsg = `Chat error: ${err.message}`;
        updateLastAssistantMessage(
          `I encountered an error. Please check your API key in settings and try again.\n\nError: ${err.message}`
        );
        addNotification("error", errMsg);
      }
    } finally {
      setChatStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setChatStreaming(false);
  };

  if (!isChatOpen) return null;

  return (
    <div className="w-[400px] flex flex-col bg-nexus-bg-light border-l border-nexus-border h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-nexus-border">
        <div className="flex items-center gap-2">
          <Icon name="sparkles" size={16} className="text-nexus-accent" />
          <span className="text-sm font-medium text-nexus-text">AI Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-1 rounded hover:bg-nexus-bg-lighter text-nexus-text-subtle"
            title="Clear chat"
          >
            <Icon name="trash" size={14} />
          </button>
          <button
            onClick={toggleChat}
            className="p-1 rounded hover:bg-nexus-bg-lighter text-nexus-text-subtle"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      {/* Context chips */}
      {chatContext.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-nexus-border">
          {chatContext.map((ctx) => (
            <span
              key={ctx.name}
              className="flex items-center gap-1 px-2 py-0.5 bg-nexus-accent/10 text-nexus-accent text-xxs rounded-full"
            >
              <Icon name={ctx.type === "file" ? "file" : ctx.type === "function" ? "code" : "info"} size={10} />
              {ctx.name}
              <button
                onClick={() => removeChatContext(ctx.name)}
                className="ml-0.5 hover:text-nexus-text"
              >
                <Icon name="close" size={8} />
              </button>
            </span>
          ))}
          <button
            onClick={clearChatContext}
            className="text-xxs text-nexus-text-subtle hover:text-nexus-text"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nexus-text-subtle">
            <Icon name="bot" size={32} className="mb-3 opacity-50" />
            <p className="text-sm text-center mb-2">Ask me anything about your codebase</p>
            <p className="text-xs text-center text-nexus-text-subtle">
              Use @file:path or @function:name to add context
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "")}>
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                  msg.role === "user" ? "bg-nexus-accent/20" : "bg-nexus-purple/20"
                )}
              >
                <Icon
                  name={msg.role === "user" ? "user" : "bot"}
                  size={14}
                  className={msg.role === "user" ? "text-nexus-accent" : "text-nexus-purple"}
                />
              </div>
              <div
                className={cn(
                  "flex-1 text-sm text-nexus-text leading-relaxed",
                  msg.role === "user" ? "text-right" : ""
                )}
              >
                <div
                  className={cn(
                    "inline-block px-3 py-2 rounded-lg max-w-full",
                    msg.role === "user"
                      ? "bg-nexus-accent/15 text-nexus-text"
                      : "bg-nexus-bg-lighter text-nexus-text"
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content.split("```").map((part, i) => {
                      if (i % 2 === 1) {
                        const firstLine = part.indexOf("\n");
                        const lang = firstLine > 0 ? part.slice(0, firstLine).trim() : "";
                        const code = firstLine > 0 ? part.slice(firstLine + 1) : part;
                        return (
                          <pre
                            key={i}
                            className="my-2 p-2 bg-nexus-bg rounded text-xs font-mono overflow-x-auto"
                          >
                            {lang && (
                              <div className="text-xxs text-nexus-text-subtle mb-1">{lang}</div>
                            )}
                            <code>{code}</code>
                          </pre>
                        );
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </div>
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-nexus-accent animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-nexus-border p-3">
        <div className="flex items-end gap-2 bg-nexus-bg rounded-lg border border-nexus-border focus-within:border-nexus-accent p-2">
          <MentionInput
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            placeholder="Ask about your code... (@ to mention)"
            disabled={isChatStreaming}
          />
          {isChatStreaming ? (
            <button
              onClick={handleStop}
              className="p-1.5 rounded bg-nexus-red/20 text-nexus-red hover:bg-nexus-red/30 shrink-0"
            >
              <Icon name="close" size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={cn(
                "p-1.5 rounded shrink-0",
                input.trim()
                  ? "bg-nexus-accent/20 text-nexus-accent hover:bg-nexus-accent/30"
                  : "text-nexus-text-subtle"
              )}
            >
              <Icon name="send" size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-xxs text-nexus-text-subtle">
            {settings.models.chat.model} | @ to mention files
          </span>
          <span className="text-xxs text-nexus-text-subtle">
            Shift+Enter for newline
          </span>
        </div>
      </div>
    </div>
  );
}
