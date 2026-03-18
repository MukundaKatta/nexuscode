import { GitStatus, GitCommit, GitFileChange } from "@/types";

let gitHistory: GitCommit[] = [
  {
    hash: "a1b2c3d",
    message: "Initial commit: project setup with Express and TypeScript",
    author: "Developer",
    date: "2024-01-15T10:00:00Z",
    files: ["package.json", "tsconfig.json", "src/index.ts", "src/app.ts", "src/config.ts"],
  },
  {
    hash: "e4f5g6h",
    message: "Add authentication middleware and JWT token handling",
    author: "Developer",
    date: "2024-01-16T14:30:00Z",
    files: ["src/middleware/auth.ts", "src/services/auth.ts", "src/routes/auth.ts"],
  },
  {
    hash: "i7j8k9l",
    message: "Implement user CRUD operations and routes",
    author: "Developer",
    date: "2024-01-17T09:15:00Z",
    files: ["src/services/user.ts", "src/routes/users.ts"],
  },
  {
    hash: "m0n1o2p",
    message: "Add post routes and error handling middleware",
    author: "Developer",
    date: "2024-01-18T16:45:00Z",
    files: ["src/routes/posts.ts", "src/middleware/error.ts", "src/utils/logger.ts"],
  },
  {
    hash: "q3r4s5t",
    message: "Add database connection module",
    author: "Developer",
    date: "2024-01-19T11:20:00Z",
    files: ["src/database/index.ts"],
  },
];

let stagedFiles: Set<string> = new Set();
let modifiedFiles: Set<string> = new Set();

export function getGitStatus(): GitStatus {
  const staged: GitFileChange[] = Array.from(stagedFiles).map((path) => ({
    path,
    status: "modified" as const,
  }));

  const unstaged: GitFileChange[] = Array.from(modifiedFiles)
    .filter((p) => !stagedFiles.has(p))
    .map((path) => ({
      path,
      status: "modified" as const,
    }));

  return {
    branch: "main",
    ahead: 0,
    behind: 0,
    staged,
    unstaged,
    untracked: [],
  };
}

export function getGitLog(limit: number = 20): GitCommit[] {
  return gitHistory.slice(0, limit);
}

export function stageFile(path: string): void {
  stagedFiles.add(path);
}

export function unstageFile(path: string): void {
  stagedFiles.delete(path);
}

export function markFileModified(path: string): void {
  modifiedFiles.add(path);
}

export function commitChanges(message: string): GitCommit {
  const commit: GitCommit = {
    hash: Math.random().toString(36).slice(2, 9),
    message,
    author: "Developer",
    date: new Date().toISOString(),
    files: Array.from(stagedFiles),
  };

  gitHistory = [commit, ...gitHistory];
  stagedFiles.clear();
  for (const f of commit.files) {
    modifiedFiles.delete(f);
  }

  return commit;
}

export function getFileDiff(
  path: string,
  originalContent: string,
  newContent: string
): string {
  const oldLines = originalContent.split("\n");
  const newLines = newContent.split("\n");

  let diff = `--- a/${path}\n+++ b/${path}\n`;

  const maxLen = Math.max(oldLines.length, newLines.length);
  let hunkStart = -1;
  let hunkLines: string[] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine !== newLine) {
      if (hunkStart === -1) {
        hunkStart = Math.max(0, i - 3);
        for (let j = hunkStart; j < i; j++) {
          if (j < oldLines.length) {
            hunkLines.push(` ${oldLines[j]}`);
          }
        }
      }
      if (oldLine !== undefined) hunkLines.push(`-${oldLine}`);
      if (newLine !== undefined) hunkLines.push(`+${newLine}`);
    } else if (hunkStart !== -1) {
      hunkLines.push(` ${oldLine}`);
      if (hunkLines.filter((l) => l.startsWith("+") || l.startsWith("-")).length > 0) {
        const contextAfter = Math.min(i + 3, maxLen);
        if (i >= contextAfter - 1) {
          diff += `@@ -${hunkStart + 1},${hunkLines.filter((l) => !l.startsWith("+")).length} +${hunkStart + 1},${hunkLines.filter((l) => !l.startsWith("-")).length} @@\n`;
          diff += hunkLines.join("\n") + "\n";
          hunkStart = -1;
          hunkLines = [];
        }
      }
    }
  }

  if (hunkLines.length > 0) {
    diff += `@@ -${hunkStart + 1},${hunkLines.filter((l) => !l.startsWith("+")).length} +${hunkStart + 1},${hunkLines.filter((l) => !l.startsWith("-")).length} @@\n`;
    diff += hunkLines.join("\n") + "\n";
  }

  return diff;
}
