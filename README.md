# NexusCode

**AI-Native Code Editor with Deep Codebase Understanding**

NexusCode is a web-based IDE powered by AI that provides intelligent code completion, inline editing, chat-driven development, code review, and an integrated terminal. Built with Monaco Editor and designed for modern AI-assisted software development.

## Features

- **Monaco Code Editor** -- Full-featured code editor with syntax highlighting and IntelliSense
- **AI Chat Panel** -- Conversational coding assistant with @-mention file references
- **Inline Edit Widget** -- AI-powered inline code modifications without leaving the editor
- **Composer Panel** -- Multi-file AI-driven code generation and refactoring
- **Code Review** -- AI-assisted code review with diff visualization
- **Integrated Terminal** -- Built-in terminal with xterm.js for running commands
- **File Tree & Search** -- Sidebar file explorer with fuzzy search (Fuse.js)
- **Git Integration** -- Built-in Git panel powered by isomorphic-git
- **Command Palette** -- Quick actions and navigation shortcuts
- **Resizable Panels** -- Customizable layout with draggable panel boundaries

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Code Editor:** Monaco Editor
- **AI:** OpenAI API, Vercel AI SDK
- **Terminal:** xterm.js
- **Git:** isomorphic-git
- **Search:** Fuse.js
- **Diff:** diff library
- **State Management:** Zustand
- **Backend:** Supabase
- **Styling:** Tailwind CSS
- **Markdown:** react-markdown, remark-gfm, rehype-highlight
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

### Installation

```bash
git clone <repository-url>
cd nexuscode
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── components/
│   ├── sidebar/          # File tree, search, git panels
│   ├── editor/           # Monaco editor, tabs, inline edit, status bar
│   ├── chat/             # AI chat panel with @-mentions
│   ├── terminal/         # Integrated terminal
│   ├── composer/         # Multi-file AI composer
│   ├── review/           # Code review panel
│   ├── settings/         # Settings panel
│   └── common/           # Command palette, notifications
└── lib/                  # Stores, utilities, Supabase client
```

