# 🎨 TeamPad

<div align="center">

**A modern, real-time collaborative canvas editor built for teams**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[🚀 Live Demo](https://teampad.vercel.app) • [📖 Documentation](#-features) • [🐛 Report Bug](https://github.com/anlyetim/TeamPad/issues) • [💡 Request Feature](https://github.com/anlyetim/TeamPad/issues)

</div>

---

## ✨ Features

### 🎯 **Canvas & Drawing Tools**

- **🖊️ Brush Tool** - Smooth, bezier-interpolated strokes with customizable size, hardness, opacity, and color
- **✏️ Eraser Tool** - Two modes: Whole (delete objects) and Partial (erase portions of paths)
- **📝 Text Tool** - Point text and area text with rich formatting options
- **📋 Note Tool** - Sticky notes with pastel colors and background styles (blank/lined/grid)
- **🔷 Shape Tool** - Create rectangles, ellipses, circles, rounded rectangles, and more
- **🖼️ Image Tool** - Import and place images on the canvas
- **🎯 Selection Tool** - Transform objects with 8 resize handles and rotation, marquee selection, multi-select

### 👥 **Real-Time Collaboration**

- **⚡ Instant Local Feedback** - All tools work instantly with 60fps rendering, no lag
- **🌐 Real-Time Sync** - Objects sync after ~1s, cursors update at 30fps
- **👤 Presence System** - See all collaborators' cursors with nicknames and roles
- **👑 Manager Role** - Project managers (owners) have special privileges and yellow cursors
- **💬 Chat System** - Built-in chat panel for team communication
- **📊 Participants Panel** - View all connected users, kick participants (manager only)

### 🏗️ **Canvas Architecture**

- **🎨 Local-First Design** - Tools act locally first, sync to server with debounce
- **⚙️ Tool-Agnostic Canvas** - Centralized tool registry with isolated tool handlers
- **🎭 Two-State Rendering** - Persistent objects + interaction state for instant feedback
- **🔄 Continuous 60fps Loop** - Imperative `requestAnimationFrame` rendering, no delays

### 📚 **Project Management**

- **📁 Project Dashboard** - Create, manage, and organize multiple projects
- **💾 Auto-Save** - Automatic project saving with visual indicators
- **📤 Export Options** - Export projects in various formats
- **🔍 Project Search** - Find projects quickly with search functionality

### 🎛️ **Advanced Features**

- **📑 Layer System** - Organize objects in layers with visibility and opacity controls
- **⏪ History & Undo/Redo** - Full history tracking with unlimited undo/redo
- **🎨 Theme Support** - Dark and light modes with smooth transitions
- **⌨️ Customizable Keybindings** - Configure keyboard shortcuts to your preference
- **🌍 Internationalization** - Multi-language support
- **📐 Grid & Guides** - Visual aids with customizable grid types (dots, lines, cross)
- **🔍 Zoom & Pan** - Smooth zoom and pan controls for navigation
- **🎯 Transform Handles** - Precise object manipulation with visual handles

### 🌐 **Online & Offline Support**

- **📶 Offline-First** - Works completely offline, syncs when online
- **🔄 Smart Sync** - Automatic state synchronization when connection is restored
- **💾 Local Storage** - Projects persist locally using browser storage

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/anlyetim/TeamPad.git

# Navigate to the project directory
cd TeamPad

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase configuration

# Run the development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Anonymous Authentication
4. Copy your Firebase config to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## 🎮 Usage

### Creating a Project

1. Click **"New Project"** from the dashboard
2. Configure canvas settings (size, background, infinite canvas)
3. Start drawing!

### Joining a Collaboration

1. Get the project code from the manager
2. Click **"Join Project"** and enter the code
3. Enter your nickname
4. Start collaborating in real-time!

### Drawing Tools

- **`V`** - Selection Tool
- **`B`** - Brush Tool
- **`E`** - Eraser Tool
- **`T`** - Text Tool
- **`N`** - Note Tool
- **`S`** - Shape Tool
- **`I`** - Image Tool

### Keyboard Shortcuts

- **`Ctrl/Cmd + Z`** - Undo
- **`Ctrl/Cmd + Y`** - Redo
- **`Ctrl/Cmd + C`** - Copy
- **`Ctrl/Cmd + V`** - Paste
- **`Ctrl/Cmd + D`** - Duplicate
- **`Ctrl/Cmd + A`** - Select All
- **`Delete`** - Delete Selection
- **`Esc`** - Cancel Transform
- **`Enter`** - Commit Transform

### Managing Layers

1. Open the **Layers Panel** from the right sidebar
2. Create new layers or reorder existing ones
3. Toggle visibility and adjust opacity
4. Lock layers to prevent accidental edits

---

## 🏗️ Architecture

### Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Backend**: [Firebase](https://firebase.google.com/) (Firestore + Auth)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

### Project Structure

```
TeamPad/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── canvas.tsx        # Main canvas component
│   ├── tools/            # Tool handlers
│   │   ├── BrushTool.ts
│   │   ├── EraserTool.ts
│   │   ├── SelectionTool.ts
│   │   └── ...
│   ├── editor/           # Editor modals
│   │   └── EditorModal.tsx
│   └── ui/               # UI components
├── lib/                  # Core libraries
│   ├── editorRuntime.ts  # Editor state manager
│   ├── toolRegistry.ts   # Tool registry system
│   ├── collaboration.ts  # Collaboration manager
│   ├── store.ts          # Zustand store
│   └── types.ts          # TypeScript types
├── hooks/                # Custom React hooks
│   ├── useKeybindings.ts
│   └── useKeyboardShortcuts.ts
└── public/               # Static assets
```

### Core Concepts

#### **Tool Registry System**
Centralized tool management with isolated tool handlers. Each tool implements a consistent interface and manages its own interaction state.

#### **Editor Runtime**
Single authoritative state manager for canvas objects. Handles object CRUD operations, history tracking, and layer management.

#### **Local-First Architecture**
All tools act locally first for instant feedback. Changes sync to the server with debounce (~1s for objects, 30fps for cursors).

#### **Two-State Rendering**
- **Persistent Objects**: Finalized objects rendered from store
- **Interaction State**: Temporary live previews rendered in `renderOverlay`

---

## 📖 API Reference

### Tool Handler Interface

```typescript
interface ToolHandler {
  name: ToolType
  cursor: string
  onActivate?: (ctx: ToolContext) => void
  onDeactivate?: (ctx: ToolContext) => void
  onMouseDown?: (e: MouseEvent, point: Point, ctx: ToolContext) => void
  onMouseMove?: (e: MouseEvent, point: Point, ctx: ToolContext) => void
  onMouseUp?: (e: MouseEvent, point: Point, ctx: ToolContext) => void
  onDoubleClick?: (e: MouseEvent, point: Point, ctx: ToolContext) => void
  getCursor?: (point: Point, ctx: ToolContext) => string
  renderOverlay?: (ctx: CanvasRenderingContext2D, toolCtx: ToolContext) => void
}
```

### Canvas Object Types

```typescript
type CanvasObject = {
  id: string
  name: string
  type: 'path' | 'text' | 'shape' | 'note' | 'image'
  layerId: string
  transform: Transform
  data: PathData | TextData | ShapeData | NoteData | ImageData
}
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write clean, maintainable code
- Add comments for complex logic
- Update documentation as needed
- Test your changes thoroughly

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible UI components
- [Firebase](https://firebase.google.com/) - Backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Zustand](https://zustand-demo.pmnd.rs/) - Lightweight state management
- [Lucide](https://lucide.dev/) - Beautiful icon library

---

## 📞 Support

- **🌐 Website**: [teampad.vercel.app](https://teampad.vercel.app)
- **🐛 Issues**: [GitHub Issues](https://github.com/anlyetim/TeamPad/issues)
- **📧 Email**: [Your Email]

---

<div align="center">

**Made with ❤️ by [anlyetim](https://github.com/anlyetim)**

⭐ Star this repo if you find it helpful!

</div>
