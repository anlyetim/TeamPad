# CHANGES.md - Editor Tools Subsystem Rewrite

## Summary

Complete rewrite of the editor/tools subsystem for TeamPad to achieve Photoshop-like behavior with proper tool isolation, modal animations, and multiplayer sync.

## Latest Fixes (Session 3)

| Fix | Description |
|-----|-------------|
| Selection rectangle direction | Fixed selection to work when drawing from any direction (not just top-left to bottom-right) |
| Rotate cursor | Added custom SVG rotate cursor when hovering over rotation handle |
| Note background color | Fixed to use `backgroundColor` property correctly in properties panel |
| Text/Properties sync | Text tool panel now syncs with selected text object - changes apply to both |
| Font selector | All font selectors now show fonts in their own font family |

## Previous Fixes (Session 2)

| Fix | Description |
|-----|-------------|
| Note color change | Fixed note disappearing when changing color - now preserves all data |
| Transform size persistence | Size now bakes into width/height on transform end, won't revert when moving |
| Shape type editing | Fixed shape type selector to update the selected object, not just settings |
| Delete key for notes | Enabled `useKeybindings()` hook for Delete/Backspace functionality |
| Font selector | Added 11 fonts with each displayed in its own font family |
| Properties panel | Added `font-medium` labels and improved styling |
| Chat message fix | Fixed type error in addChatMessage call |

## Files Created

| File | Purpose |
|------|---------|
| `lib/toolRegistry.ts` | Central tool registry for managing tool switching, event delegation, and preventing tool interference |
| `hooks/useKeybindings.ts` | Keybindings system with localStorage persistence, default shortcuts, and customization support |
| `components/tools/index.ts` | Tool exports and registration function |
| `components/tools/SelectionTool.ts` | Selection tool with marquee, transform handles, modifiers (Shift/Alt/Esc/Enter) |
| `components/tools/BrushTool.ts` | Brush tool for persistent strokes saved as path objects |
| `components/tools/EraserTool.ts` | Eraser with Whole (delete object) and Partial (mask paths) modes |
| `components/tools/TextTool.ts` | Text tool with point text (click) and area text (drag) |
| `components/tools/NoteTool.ts` | Note tool creating sticky notes with random pastel colors |
| `components/tools/ShapeTool.ts` | Shape tool for rectangle, ellipse, rounded_rectangle |
| `components/tools/ImageTool.ts` | Image tool for file import via picker |
| `components/editor/EditorModal.tsx` | Central modal for text/note editing with fly-to-center animation |

## Files Modified

| File | Changes |
|------|---------|
| `components/canvas.tsx` | Added imports for tool registry, EditorModal, keybindings; Added modal state |

## Files Backed Up

| Original | Backup |
|----------|--------|
| `lib/editorRuntime.ts` | `lib/editorRuntime.ts.bak` |
| `components/canvas.tsx` | `components/canvas.tsx.bak` |
| `components/TextEditorOverlay.tsx` | `components/TextEditorOverlay.tsx.bak` |
| `components/NoteEditorOverlay.tsx` | `components/NoteEditorOverlay.tsx.bak` |

## Directories Created

- `components/tools/`
- `components/editor/`

## Key Features Implemented

### 1. Tool Registry (`lib/toolRegistry.ts`)
- Central singleton managing all tools
- Tool switching with proper activate/deactivate lifecycle
- Event delegation preventing tool interference
- Context management for tool state

### 2. Keybindings System (`hooks/useKeybindings.ts`)
- Default bindings: V, B, E, T, N, S, I for tools
- Clipboard shortcuts: Ctrl+C/V/D/A/Z/Y
- Delete key support
- localStorage persistence
- Reset to defaults function

### 3. Independent Tool Modules
Each tool is self-contained with:
- `onMouseDown`, `onMouseMove`, `onMouseUp` handlers
- `onDoubleClick` for text/note editing
- `getCursor` for dynamic cursor
- `renderOverlay` for previews

### 4. Selection Tool Features
- Single-click and Shift+click multi-select
- Marquee rectangle selection
- 8 transform handles + rotation
- Move (body handle)
- Shift = maintain aspect ratio
- Alt = scale from center
- Esc = cancel transform
- Enter = commit transform

### 5. EditorModal (`components/editor/EditorModal.tsx`)
- Fly-to-center animation from object position
- Theme-consistent styling (dark/light mode)
- Text modal with formatting toolbar
- Note modal with color palette
- Enter commits, Esc cancels
- Animate back on close

---

## Test Checklist

### Build
- [ ] Run `npm run build` — should succeed with no errors

### Tool Functionality
1. [ ] **Selection Tool (V)**
   - Click object to select
   - Shift+click to multi-select
   - Drag on empty space for marquee selection
   - Drag handles to resize
   - Drag rotation handle to rotate
   - Shift while scaling to maintain aspect ratio

2. [ ] **Brush Tool (B)**
   - Draw strokes on canvas
   - Strokes persist after mouseup
   - Stroke appears as object in layers

3. [ ] **Eraser Tool (E)**
   - Whole mode: Click object to delete it
   - Partial mode: Draw over paths to mask them

4. [ ] **Text Tool (T)**
   - Click to place point text ("Text" default)
   - Drag to create area text
   - Double-click to edit via modal

5. [ ] **Note Tool (N)**
   - Click to place sticky note
   - Note has random pastel color
   - Double-click to edit via modal

6. [ ] **Shape Tool (S)**
   - Drag to draw rectangle
   - Shape persists after mouseup

7. [ ] **Image Tool (I)**
   - Click opens file picker
   - Image placed at click position

### Modal Animations
- [ ] Double-click text → Modal flies to center
- [ ] Double-click note → Modal zooms out to center
- [ ] Enter → Modal animates back, saves changes
- [ ] Esc → Modal animates back, discards changes

### Keyboard Shortcuts
- [ ] V switches to Selection
- [ ] B switches to Brush
- [ ] E switches to Eraser
- [ ] T switches to Text
- [ ] N switches to Note
- [ ] S switches to Shape
- [ ] I switches to Image
- [ ] Ctrl+Z undoes
- [ ] Ctrl+Y redoes
- [ ] Delete key removes selected objects

### Multiplayer Sync
- [ ] Open 2 browser windows on same session
- [ ] Create object in one → appears in other
- [ ] Move object → syncs
- [ ] Edit text/note → syncs on commit
- [ ] Delete object → syncs

### Offline Mode
- [ ] Delete works when offline
- [ ] Copy/paste works when offline
- [ ] Changes queue for sync when back online

---

## No Breaking Changes

- Auth system unchanged
- Routing unchanged
- Network transport unchanged
- Database unchanged
- Dashboard unchanged
- Existing multiplayer features preserved
