"use client";

import { useNexusStore } from "@/store";
import { Icon, IconName } from "@/components/common/Icon";
import { getFileIcon, cn } from "@/lib/utils";

export function TabBar() {
  const { openFiles, activeFilePath, setActiveFile, closeFile } = useNexusStore();

  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center bg-nexus-bg border-b border-nexus-border overflow-x-auto scrollbar-none">
      {openFiles.map((file) => {
        const isActive = file.path === activeFilePath;
        const iconName = getFileIcon(file.name, false) as IconName;

        return (
          <div
            key={file.path}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer border-r border-nexus-border group min-w-0 shrink-0",
              isActive
                ? "bg-nexus-bg-light text-nexus-text border-t-2 border-t-nexus-accent"
                : "text-nexus-text-muted hover:bg-nexus-bg-lighter border-t-2 border-t-transparent"
            )}
            onClick={() => setActiveFile(file.path)}
          >
            <Icon name={iconName} size={14} className="shrink-0" />
            <span className="truncate max-w-[120px]">{file.name}</span>
            {file.isModified && (
              <span className="w-2 h-2 rounded-full bg-nexus-accent shrink-0" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.path);
              }}
              className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-nexus-bg"
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
