"use client";

import { useState } from "react";
import { useNexusStore } from "@/store";
import { Icon } from "@/components/common/Icon";
import { cn } from "@/lib/utils";
import { NexusSettings } from "@/types";

type SettingsTab = "editor" | "models" | "context" | "keybindings";

export function SettingsPanel() {
  const { isSettingsOpen, toggleSettings, settings, updateSettings } = useNexusStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("editor");

  if (!isSettingsOpen) return null;

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "editor", label: "Editor" },
    { id: "models", label: "AI Models" },
    { id: "context", label: "Context" },
    { id: "keybindings", label: "Keybindings" },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={toggleSettings} />
      <div className="relative w-[700px] max-h-[80vh] bg-nexus-bg-light border border-nexus-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-nexus-border">
          <div className="flex items-center gap-2">
            <Icon name="settings" size={18} className="text-nexus-text-muted" />
            <span className="text-sm font-semibold text-nexus-text">Settings</span>
          </div>
          <button
            onClick={toggleSettings}
            className="p-1 rounded hover:bg-nexus-bg-lighter text-nexus-text-subtle"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tabs */}
          <div className="w-40 border-r border-nexus-border bg-nexus-bg py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full px-4 py-2 text-sm text-left",
                  activeTab === tab.id
                    ? "text-nexus-text bg-nexus-accent/10 border-r-2 border-nexus-accent"
                    : "text-nexus-text-muted hover:text-nexus-text hover:bg-nexus-bg-lighter"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {activeTab === "editor" && (
              <>
                <SettingsSection title="Appearance">
                  <SettingsRow label="Font Size" description="Editor font size in pixels">
                    <input
                      type="number"
                      value={settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                      min={10}
                      max={24}
                      className="w-20 bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none focus:border-nexus-accent"
                    />
                  </SettingsRow>
                  <SettingsRow label="Font Family" description="Editor font family">
                    <select
                      value={settings.fontFamily}
                      onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                      className="bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none focus:border-nexus-accent"
                    >
                      <option>JetBrains Mono</option>
                      <option>Fira Code</option>
                      <option>SF Mono</option>
                      <option>Monaco</option>
                      <option>Menlo</option>
                      <option>Consolas</option>
                    </select>
                  </SettingsRow>
                  <SettingsRow label="Tab Size" description="Number of spaces per tab">
                    <select
                      value={settings.tabSize}
                      onChange={(e) => updateSettings({ tabSize: Number(e.target.value) })}
                      className="bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none focus:border-nexus-accent"
                    >
                      <option>2</option>
                      <option>4</option>
                      <option>8</option>
                    </select>
                  </SettingsRow>
                </SettingsSection>

                <SettingsSection title="Features">
                  <SettingsToggle
                    label="Word Wrap"
                    description="Wrap long lines"
                    value={settings.wordWrap}
                    onChange={(v) => updateSettings({ wordWrap: v })}
                  />
                  <SettingsToggle
                    label="Minimap"
                    description="Show code minimap"
                    value={settings.minimap}
                    onChange={(v) => updateSettings({ minimap: v })}
                  />
                  <SettingsToggle
                    label="Line Numbers"
                    description="Show line numbers"
                    value={settings.lineNumbers}
                    onChange={(v) => updateSettings({ lineNumbers: v })}
                  />
                </SettingsSection>
              </>
            )}

            {activeTab === "models" && (
              <>
                <SettingsSection title="Chat Model">
                  <SettingsRow label="Provider">
                    <select
                      value={settings.models.chat.provider}
                      onChange={(e) =>
                        updateSettings({
                          models: {
                            ...settings.models,
                            chat: { ...settings.models.chat, provider: e.target.value as "openai" | "anthropic" },
                          },
                        })
                      }
                      className="bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                  </SettingsRow>
                  <SettingsRow label="Model">
                    <select
                      value={settings.models.chat.model}
                      onChange={(e) =>
                        updateSettings({
                          models: {
                            ...settings.models,
                            chat: { ...settings.models.chat, model: e.target.value },
                          },
                        })
                      }
                      className="bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none"
                    >
                      {settings.models.chat.provider === "openai" ? (
                        <>
                          <option>gpt-4o</option>
                          <option>gpt-4o-mini</option>
                          <option>gpt-4-turbo</option>
                          <option>o1</option>
                          <option>o1-mini</option>
                        </>
                      ) : (
                        <>
                          <option>claude-sonnet-4-20250514</option>
                          <option>claude-3-5-haiku-20241022</option>
                          <option>claude-opus-4-20250514</option>
                        </>
                      )}
                    </select>
                  </SettingsRow>
                  <SettingsRow label="API Key">
                    <input
                      type="password"
                      value={settings.models.chat.apiKey}
                      onChange={(e) =>
                        updateSettings({
                          models: {
                            ...settings.models,
                            chat: { ...settings.models.chat, apiKey: e.target.value },
                          },
                        })
                      }
                      placeholder="sk-..."
                      className="w-64 bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none focus:border-nexus-accent"
                    />
                  </SettingsRow>
                  <SettingsRow label="Temperature">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.models.chat.temperature}
                      onChange={(e) =>
                        updateSettings({
                          models: {
                            ...settings.models,
                            chat: { ...settings.models.chat, temperature: Number(e.target.value) },
                          },
                        })
                      }
                      className="w-32"
                    />
                    <span className="text-xs text-nexus-text-muted ml-2">
                      {settings.models.chat.temperature}
                    </span>
                  </SettingsRow>
                  <SettingsRow label="Max Tokens">
                    <input
                      type="number"
                      value={settings.models.chat.maxTokens}
                      onChange={(e) =>
                        updateSettings({
                          models: {
                            ...settings.models,
                            chat: { ...settings.models.chat, maxTokens: Number(e.target.value) },
                          },
                        })
                      }
                      className="w-24 bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none"
                    />
                  </SettingsRow>
                  <SettingsRow label="Context Window">
                    <select
                      value={settings.models.chat.contextWindow}
                      onChange={(e) =>
                        updateSettings({
                          models: {
                            ...settings.models,
                            chat: { ...settings.models.chat, contextWindow: Number(e.target.value) },
                          },
                        })
                      }
                      className="bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none"
                    >
                      <option value={4096}>4K</option>
                      <option value={8192}>8K</option>
                      <option value={16384}>16K</option>
                      <option value={32768}>32K</option>
                      <option value={128000}>128K</option>
                      <option value={200000}>200K</option>
                      <option value={1000000}>1M</option>
                    </select>
                  </SettingsRow>
                </SettingsSection>

                <SettingsSection title="Inline Edit Model">
                  <SettingsRow label="Model">
                    <select
                      value={settings.models.inline.model}
                      onChange={(e) =>
                        updateSettings({
                          models: {
                            ...settings.models,
                            inline: { ...settings.models.inline, model: e.target.value },
                          },
                        })
                      }
                      className="bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none"
                    >
                      <option>gpt-4o</option>
                      <option>gpt-4o-mini</option>
                    </select>
                  </SettingsRow>
                </SettingsSection>
              </>
            )}

            {activeTab === "context" && (
              <SettingsSection title="Context Management">
                <SettingsRow label="Max Files in Context" description="Maximum number of files to include automatically">
                  <input
                    type="number"
                    value={settings.contextSettings.maxFilesInContext}
                    onChange={(e) =>
                      updateSettings({
                        contextSettings: {
                          ...settings.contextSettings,
                          maxFilesInContext: Number(e.target.value),
                        },
                      })
                    }
                    min={1}
                    max={50}
                    className="w-20 bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none"
                  />
                </SettingsRow>
                <SettingsRow label="Max Tokens per File" description="Truncate file content after this many tokens">
                  <input
                    type="number"
                    value={settings.contextSettings.maxTokensPerFile}
                    onChange={(e) =>
                      updateSettings({
                        contextSettings: {
                          ...settings.contextSettings,
                          maxTokensPerFile: Number(e.target.value),
                        },
                      })
                    }
                    min={100}
                    max={10000}
                    step={100}
                    className="w-24 bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-sm text-nexus-text outline-none"
                  />
                </SettingsRow>
                <SettingsToggle
                  label="Auto-include Imports"
                  description="Automatically add imported files to context"
                  value={settings.contextSettings.autoIncludeImports}
                  onChange={(v) =>
                    updateSettings({
                      contextSettings: { ...settings.contextSettings, autoIncludeImports: v },
                    })
                  }
                />
                <SettingsToggle
                  label="Auto-include Related Files"
                  description="Add currently open file to chat context"
                  value={settings.contextSettings.autoIncludeRelated}
                  onChange={(v) =>
                    updateSettings({
                      contextSettings: { ...settings.contextSettings, autoIncludeRelated: v },
                    })
                  }
                />
              </SettingsSection>
            )}

            {activeTab === "keybindings" && (
              <SettingsSection title="Keyboard Shortcuts">
                {Object.entries(settings.keybindings).map(([key, value]) => (
                  <SettingsRow
                    key={key}
                    label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  >
                    <kbd className="px-2 py-1 bg-nexus-bg border border-nexus-border rounded text-xs font-mono text-nexus-text-muted">
                      {value}
                    </kbd>
                  </SettingsRow>
                ))}
              </SettingsSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-nexus-text-muted uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <div className="text-sm text-nexus-text">{label}</div>
        {description && (
          <div className="text-xxs text-nexus-text-subtle">{description}</div>
        )}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function SettingsToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <SettingsRow label={label} description={description}>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-9 h-5 rounded-full transition-colors relative",
          value ? "bg-nexus-accent" : "bg-nexus-border"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
            value ? "left-[18px]" : "left-0.5"
          )}
        />
      </button>
    </SettingsRow>
  );
}
