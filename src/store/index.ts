import { create } from "zustand";
import {
  FileNode,
  OpenFile,
  ChatMessage,
  ContextReference,
  InlineEdit,
  ComposerPlan,
  CodeReview,
  ReviewComment,
  GitStatus,
  GitCommit,
  NexusSettings,
  SearchResult,
  ModelConfig,
} from "@/types";
import { getLanguageFromPath, generateId } from "@/lib/utils";

interface NexusState {
  // File tree
  fileTree: FileNode[];
  setFileTree: (tree: FileNode[]) => void;
  toggleDirectory: (path: string) => void;

  // Open files / tabs
  openFiles: OpenFile[];
  activeFilePath: string | null;
  openFile: (path: string, name: string, content: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  saveFile: (path: string) => void;

  // Chat
  chatMessages: ChatMessage[];
  chatContext: ContextReference[];
  isChatOpen: boolean;
  isChatStreaming: boolean;
  addChatMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setChatStreaming: (streaming: boolean) => void;
  toggleChat: () => void;
  clearChat: () => void;
  addChatContext: (ctx: ContextReference) => void;
  removeChatContext: (name: string) => void;
  clearChatContext: () => void;

  // Inline edit
  inlineEdit: InlineEdit | null;
  setInlineEdit: (edit: InlineEdit | null) => void;
  isInlineEditOpen: boolean;
  setInlineEditOpen: (open: boolean) => void;

  // Composer
  composerPlan: ComposerPlan | null;
  isComposerOpen: boolean;
  setComposerPlan: (plan: ComposerPlan | null) => void;
  updateComposerStep: (stepId: string, status: ComposerPlan["steps"][0]["status"]) => void;
  toggleComposer: () => void;

  // Code review
  codeReview: CodeReview | null;
  isReviewOpen: boolean;
  setCodeReview: (review: CodeReview | null) => void;
  toggleReview: () => void;

  // Search
  searchResults: SearchResult[];
  searchQuery: string;
  isSearchOpen: boolean;
  setSearchResults: (results: SearchResult[]) => void;
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;

  // Git
  gitStatus: GitStatus | null;
  gitLog: GitCommit[];
  setGitStatus: (status: GitStatus) => void;
  setGitLog: (log: GitCommit[]) => void;

  // Terminal
  isTerminalOpen: boolean;
  toggleTerminal: () => void;

  // Settings
  settings: NexusSettings;
  isSettingsOpen: boolean;
  updateSettings: (settings: Partial<NexusSettings>) => void;
  toggleSettings: () => void;

  // UI state
  sidebarTab: "files" | "search" | "git" | "extensions";
  setSidebarTab: (tab: "files" | "search" | "git" | "extensions") => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Command palette
  isCommandPaletteOpen: boolean;
  toggleCommandPalette: () => void;

  // Notifications
  notifications: Array<{ id: string; type: "info" | "success" | "error" | "warning"; message: string }>;
  addNotification: (type: "info" | "success" | "error" | "warning", message: string) => void;
  removeNotification: (id: string) => void;
}

const defaultModelConfig: ModelConfig = {
  provider: "openai",
  model: "gpt-4o",
  apiKey: "",
  maxTokens: 4096,
  temperature: 0.7,
  contextWindow: 128000,
};

const defaultSettings: NexusSettings = {
  theme: "dark",
  fontSize: 14,
  fontFamily: "JetBrains Mono",
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  models: {
    chat: { ...defaultModelConfig },
    inline: { ...defaultModelConfig, temperature: 0.3 },
    embedding: {
      ...defaultModelConfig,
      model: "text-embedding-3-small",
    },
  },
  contextSettings: {
    maxFilesInContext: 10,
    maxTokensPerFile: 2000,
    autoIncludeImports: true,
    autoIncludeRelated: true,
  },
  keybindings: {
    inlineEdit: "Cmd+K",
    openChat: "Cmd+L",
    openComposer: "Cmd+Shift+I",
    openSearch: "Cmd+Shift+F",
    openTerminal: "Cmd+`",
  },
};

function toggleDirRecursive(nodes: FileNode[], path: string): FileNode[] {
  return nodes.map((node) => {
    if (node.path === path && node.type === "directory") {
      return { ...node, isOpen: !node.isOpen };
    }
    if (node.children) {
      return { ...node, children: toggleDirRecursive(node.children, path) };
    }
    return node;
  });
}

export const useNexusStore = create<NexusState>((set, get) => ({
  // File tree
  fileTree: [],
  setFileTree: (tree) => set({ fileTree: tree }),
  toggleDirectory: (path) =>
    set((state) => ({ fileTree: toggleDirRecursive(state.fileTree, path) })),

  // Open files
  openFiles: [],
  activeFilePath: null,
  openFile: (path, name, content) =>
    set((state) => {
      const existing = state.openFiles.find((f) => f.path === path);
      if (existing) {
        return { activeFilePath: path };
      }
      const file: OpenFile = {
        path,
        name,
        content,
        language: getLanguageFromPath(path),
        isModified: false,
        originalContent: content,
      };
      return {
        openFiles: [...state.openFiles, file],
        activeFilePath: path,
      };
    }),
  closeFile: (path) =>
    set((state) => {
      const newFiles = state.openFiles.filter((f) => f.path !== path);
      let newActive = state.activeFilePath;
      if (state.activeFilePath === path) {
        const idx = state.openFiles.findIndex((f) => f.path === path);
        newActive = newFiles[Math.min(idx, newFiles.length - 1)]?.path || null;
      }
      return { openFiles: newFiles, activeFilePath: newActive };
    }),
  setActiveFile: (path) => set({ activeFilePath: path }),
  updateFileContent: (path, content) =>
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === path
          ? { ...f, content, isModified: content !== f.originalContent }
          : f
      ),
    })),
  saveFile: (path) =>
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === path
          ? { ...f, isModified: false, originalContent: f.content }
          : f
      ),
    })),

  // Chat
  chatMessages: [],
  chatContext: [],
  isChatOpen: false,
  isChatStreaming: false,
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.chatMessages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
        messages[lastIdx] = { ...messages[lastIdx], content };
      }
      return { chatMessages: messages };
    }),
  setChatStreaming: (streaming) => set({ isChatStreaming: streaming }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  clearChat: () => set({ chatMessages: [], chatContext: [] }),
  addChatContext: (ctx) =>
    set((state) => {
      if (state.chatContext.find((c) => c.name === ctx.name)) return state;
      return { chatContext: [...state.chatContext, ctx] };
    }),
  removeChatContext: (name) =>
    set((state) => ({
      chatContext: state.chatContext.filter((c) => c.name !== name),
    })),
  clearChatContext: () => set({ chatContext: [] }),

  // Inline edit
  inlineEdit: null,
  setInlineEdit: (edit) => set({ inlineEdit: edit }),
  isInlineEditOpen: false,
  setInlineEditOpen: (open) => set({ isInlineEditOpen: open }),

  // Composer
  composerPlan: null,
  isComposerOpen: false,
  setComposerPlan: (plan) => set({ composerPlan: plan }),
  updateComposerStep: (stepId, status) =>
    set((state) => {
      if (!state.composerPlan) return state;
      const steps = state.composerPlan.steps.map((s) =>
        s.id === stepId ? { ...s, status } : s
      );
      return { composerPlan: { ...state.composerPlan, steps } };
    }),
  toggleComposer: () =>
    set((state) => ({ isComposerOpen: !state.isComposerOpen })),

  // Code review
  codeReview: null,
  isReviewOpen: false,
  setCodeReview: (review) => set({ codeReview: review }),
  toggleReview: () => set((state) => ({ isReviewOpen: !state.isReviewOpen })),

  // Search
  searchResults: [],
  searchQuery: "",
  isSearchOpen: false,
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  // Git
  gitStatus: null,
  gitLog: [],
  setGitStatus: (status) => set({ gitStatus: status }),
  setGitLog: (log) => set({ gitLog: log }),

  // Terminal
  isTerminalOpen: true,
  toggleTerminal: () =>
    set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),

  // Settings
  settings: defaultSettings,
  isSettingsOpen: false,
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings } as NexusSettings,
    })),
  toggleSettings: () =>
    set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  // UI
  sidebarTab: "files",
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  sidebarWidth: 260,
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  // Command palette
  isCommandPaletteOpen: false,
  toggleCommandPalette: () =>
    set((state) => ({
      isCommandPaletteOpen: !state.isCommandPaletteOpen,
    })),

  // Notifications
  notifications: [],
  addNotification: (type, message) =>
    set((state) => {
      const id = generateId();
      setTimeout(() => get().removeNotification(id), 5000);
      return {
        notifications: [...state.notifications, { id, type, message }],
      };
    }),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
