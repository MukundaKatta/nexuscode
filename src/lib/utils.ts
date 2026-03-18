import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescriptreact",
    js: "javascript",
    jsx: "javascriptreact",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    ps1: "powershell",
    dockerfile: "dockerfile",
    toml: "toml",
    ini: "ini",
    env: "plaintext",
    txt: "plaintext",
    graphql: "graphql",
    gql: "graphql",
    vue: "vue",
    svelte: "svelte",
    dart: "dart",
    lua: "lua",
    r: "r",
    scala: "scala",
    zig: "zig",
    prisma: "prisma",
  };
  return languageMap[ext] || "plaintext";
}

export function getFileIcon(name: string, isDirectory: boolean): string {
  if (isDirectory) return "folder";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, string> = {
    ts: "typescript",
    tsx: "react",
    js: "javascript",
    jsx: "react",
    py: "python",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "sass",
    html: "html",
    svg: "image",
    png: "image",
    jpg: "image",
    gif: "image",
    rs: "rust",
    go: "go",
    yaml: "yaml",
    yml: "yaml",
    toml: "config",
    env: "config",
    lock: "lock",
    gitignore: "git",
  };
  return iconMap[ext] || "file";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  const lines = text.split("\n");
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (const line of lines) {
    const lineTokens = estimateTokenCount(line);
    if (currentSize + lineTokens > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n"));
      const overlapLines = Math.floor(currentChunk.length * (overlap / chunkSize));
      currentChunk = currentChunk.slice(-overlapLines);
      currentSize = estimateTokenCount(currentChunk.join("\n"));
    }
    currentChunk.push(line);
    currentSize += lineTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
  }

  return chunks;
}

export function extractFunctions(content: string, language: string): string[] {
  const functions: string[] = [];
  const patterns: Record<string, RegExp[]> = {
    typescript: [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
      /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(/g,
    ],
    javascript: [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
    ],
    python: [/def\s+(\w+)\s*\(/g, /class\s+(\w+)/g],
    rust: [/fn\s+(\w+)/g, /struct\s+(\w+)/g, /impl\s+(\w+)/g],
    go: [/func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/g],
  };

  const langPatterns =
    patterns[language] || patterns[language.replace("react", "")] || [];
  for (const pattern of langPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1] && !functions.includes(match[1])) {
        functions.push(match[1]);
      }
    }
  }

  return functions;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getRelativePath(fullPath: string, basePath: string): string {
  if (fullPath.startsWith(basePath)) {
    return fullPath.slice(basePath.length).replace(/^\//, "");
  }
  return fullPath;
}

export function sortFileTree(nodes: import("@/types").FileNode[]): import("@/types").FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type === "directory" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "directory") return 1;
    return a.name.localeCompare(b.name);
  });
}
