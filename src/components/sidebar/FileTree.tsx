"use client";

import { useState } from "react";
import { FileNode } from "@/types";
import { useNexusStore } from "@/store";
import { Icon, IconName } from "@/components/common/Icon";
import { getFileContent, createFile, deleteFile, renameFile } from "@/lib/filesystem";
import { getFileIcon, cn } from "@/lib/utils";

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const { openFile, activeFilePath, toggleDirectory, addNotification, setFileTree } = useNexusStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [showMenu, setShowMenu] = useState(false);

  const isActive = node.type === "file" && node.path === activeFilePath;
  const iconName: IconName =
    node.type === "directory"
      ? node.isOpen
        ? "folder-open"
        : "folder"
      : (getFileIcon(node.name, false) as IconName);

  const handleClick = () => {
    if (node.type === "directory") {
      toggleDirectory(node.path);
    } else {
      const content = getFileContent(node.path) || node.content || "";
      openFile(node.path, node.name, content);
    }
  };

  const handleRename = () => {
    if (newName && newName !== node.name) {
      const parentPath = node.path.split("/").slice(0, -1).join("/");
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      renameFile(node.path, newPath);
      const { getFileTree } = require("@/lib/filesystem");
      setFileTree(getFileTree());
      addNotification("success", `Renamed to ${newName}`);
    }
    setIsRenaming(false);
  };

  const handleDelete = () => {
    deleteFile(node.path);
    const { getFileTree } = require("@/lib/filesystem");
    setFileTree(getFileTree());
    addNotification("info", `Deleted ${node.name}`);
    setShowMenu(false);
  };

  const handleNewFile = () => {
    const name = "untitled.ts";
    const path = node.type === "directory" ? `${node.path}/${name}` : `${node.path.split("/").slice(0, -1).join("/")}/${name}`;
    createFile(path, "");
    const { getFileTree } = require("@/lib/filesystem");
    setFileTree(getFileTree());
    setShowMenu(false);
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-[3px] cursor-pointer text-sm group hover:bg-nexus-bg-lighter",
          isActive && "bg-nexus-accent/15 text-nexus-accent"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(!showMenu);
        }}
      >
        {node.type === "directory" && (
          <Icon
            name={node.isOpen ? "chevron-down" : "chevron-right"}
            size={12}
            className="text-nexus-text-subtle shrink-0"
          />
        )}
        <Icon
          name={iconName}
          size={14}
          className={cn(
            "shrink-0",
            node.type === "directory" ? "text-nexus-accent" : "text-nexus-text-muted"
          )}
        />
        {isRenaming ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            className="flex-1 bg-nexus-bg-lighter text-nexus-text text-sm px-1 py-0 outline-none border border-nexus-accent rounded"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate text-nexus-text-muted group-hover:text-nexus-text">
            {node.name}
          </span>
        )}
        <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-0.5">
          {node.type === "directory" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNewFile();
              }}
              className="p-0.5 hover:bg-nexus-bg rounded"
            >
              <Icon name="plus" size={12} className="text-nexus-text-subtle" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-0.5 hover:bg-nexus-bg rounded"
          >
            <Icon name="more" size={12} className="text-nexus-text-subtle" />
          </button>
        </div>
      </div>
      {showMenu && (
        <div className="ml-8 mb-1 bg-nexus-bg-lighter border border-nexus-border rounded shadow-lg py-1 text-xs">
          <button
            className="w-full px-3 py-1 text-left hover:bg-nexus-accent/20 text-nexus-text-muted"
            onClick={() => { setIsRenaming(true); setShowMenu(false); }}
          >
            Rename
          </button>
          <button
            className="w-full px-3 py-1 text-left hover:bg-nexus-red/20 text-nexus-red"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
      {node.type === "directory" && node.isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { fileTree } = useNexusStore();

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {fileTree.map((node) => (
        <FileTreeNode key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
}
