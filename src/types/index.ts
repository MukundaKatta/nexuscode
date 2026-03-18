export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  language?: string;
  isOpen?: boolean;
  isModified?: boolean;
  size?: number;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isModified: boolean;
  originalContent: string;
  cursorPosition?: { line: number; column: number };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  context?: ContextReference[];
  isStreaming?: boolean;
}

export interface ContextReference {
  type: "file" | "function" | "docs" | "search" | "selection";
  name: string;
  path?: string;
  content?: string;
  startLine?: number;
  endLine?: number;
}

export interface MentionSuggestion {
  type: "file" | "function" | "docs";
  label: string;
  path?: string;
  detail?: string;
}

export interface InlineEdit {
  filePath: string;
  startLine: number;
  endLine: number;
  originalCode: string;
  newCode: string;
  prompt: string;
  status: "pending" | "accepted" | "rejected";
}

export interface DiffHunk {
  filePath: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: DiffChange[];
}

export interface DiffChange {
  type: "add" | "remove" | "normal";
  content: string;
  lineNumber: number;
}

export interface UnifiedDiff {
  files: FileDiff[];
  summary: string;
}

export interface FileDiff {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  hunks: DiffHunk[];
  oldPath?: string;
}

export interface ComposerPlan {
  id: string;
  prompt: string;
  description: string;
  steps: ComposerStep[];
  status: "planning" | "executing" | "completed" | "failed";
  createdAt: number;
}

export interface ComposerStep {
  id: string;
  description: string;
  filePath: string;
  action: "create" | "modify" | "delete";
  content?: string;
  diff?: FileDiff;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface CodeReview {
  id: string;
  filePath: string;
  comments: ReviewComment[];
  summary: string;
  score: number;
  createdAt: number;
}

export interface ReviewComment {
  id: string;
  line: number;
  endLine?: number;
  severity: "info" | "warning" | "error" | "suggestion";
  message: string;
  suggestedFix?: string;
}

export interface SearchResult {
  path: string;
  name: string;
  content: string;
  score: number;
  lineNumber?: number;
  matchType: "semantic" | "text" | "filename";
  highlights?: Array<{ start: number; end: number }>;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
}

export interface GitFileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
}

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  isActive: boolean;
}

export interface EmbeddingRecord {
  id: string;
  file_path: string;
  chunk_content: string;
  chunk_index: number;
  embedding: number[];
  metadata: {
    language: string;
    functions?: string[];
    classes?: string[];
    imports?: string[];
  };
  created_at: string;
}

export interface ModelConfig {
  provider: "openai" | "anthropic";
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  contextWindow: number;
}

export interface NexusSettings {
  theme: "dark" | "light";
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  models: {
    chat: ModelConfig;
    inline: ModelConfig;
    embedding: ModelConfig;
  };
  contextSettings: {
    maxFilesInContext: number;
    maxTokensPerFile: number;
    autoIncludeImports: boolean;
    autoIncludeRelated: boolean;
  };
  keybindings: {
    inlineEdit: string;
    openChat: string;
    openComposer: string;
    openSearch: string;
    openTerminal: string;
  };
}

export interface ProjectInfo {
  name: string;
  path: string;
  language: string;
  framework?: string;
  totalFiles: number;
  indexedFiles: number;
  lastIndexed?: string;
}
