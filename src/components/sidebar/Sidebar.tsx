"use client";

import { useNexusStore } from "@/store";
import { Icon, IconName } from "@/components/common/Icon";
import { FileTree } from "./FileTree";
import { SearchPanel } from "./SearchPanel";
import { GitPanel } from "./GitPanel";
import { cn } from "@/lib/utils";

const tabs: Array<{ id: "files" | "search" | "git" | "extensions"; icon: IconName; label: string }> = [
  { id: "files", icon: "file", label: "Explorer" },
  { id: "search", icon: "search", label: "Search" },
  { id: "git", icon: "git-branch", label: "Source Control" },
  { id: "extensions", icon: "extensions", label: "Extensions" },
];

export function Sidebar() {
  const { sidebarTab, setSidebarTab, isSidebarCollapsed } = useNexusStore();

  return (
    <div className="flex h-full">
      {/* Activity bar */}
      <div className="w-12 bg-nexus-bg flex flex-col items-center py-2 border-r border-nexus-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            title={tab.label}
            className={cn(
              "w-12 h-10 flex items-center justify-center relative",
              sidebarTab === tab.id
                ? "text-nexus-text"
                : "text-nexus-text-subtle hover:text-nexus-text-muted"
            )}
          >
            {sidebarTab === tab.id && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-nexus-accent rounded-r" />
            )}
            <Icon name={tab.icon} size={20} />
          </button>
        ))}
      </div>

      {/* Panel content */}
      {!isSidebarCollapsed && (
        <div className="flex-1 bg-nexus-bg-light flex flex-col min-w-0 border-r border-nexus-border">
          <div className="flex items-center justify-between px-3 py-2 border-b border-nexus-border">
            <span className="text-xs font-medium text-nexus-text-muted uppercase tracking-wider">
              {tabs.find((t) => t.id === sidebarTab)?.label}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            {sidebarTab === "files" && <FileTree />}
            {sidebarTab === "search" && <SearchPanel />}
            {sidebarTab === "git" && <GitPanel />}
            {sidebarTab === "extensions" && (
              <div className="flex flex-col items-center justify-center h-full text-nexus-text-subtle p-4">
                <Icon name="extensions" size={32} className="mb-3 opacity-50" />
                <p className="text-sm text-center">Extensions marketplace coming soon</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
