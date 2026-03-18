"use client";

import { useNexusStore } from "@/store";
import { Icon, IconName } from "./Icon";
import { cn } from "@/lib/utils";

export function Notifications() {
  const { notifications, removeNotification } = useNexusStore();

  if (notifications.length === 0) return null;

  const iconMap: Record<string, IconName> = {
    info: "info",
    success: "check",
    error: "error",
    warning: "warning",
  };

  const colorMap: Record<string, string> = {
    info: "text-nexus-accent",
    success: "text-nexus-green",
    error: "text-nexus-red",
    warning: "text-nexus-orange",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-center gap-2 px-3 py-2 bg-nexus-bg-light border border-nexus-border rounded-lg shadow-lg animate-slide-up"
        >
          <Icon name={iconMap[n.type]} size={16} className={cn(colorMap[n.type])} />
          <span className="text-sm text-nexus-text flex-1">{n.message}</span>
          <button
            onClick={() => removeNotification(n.id)}
            className="text-nexus-text-subtle hover:text-nexus-text"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
