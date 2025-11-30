// hooks/useKeyboardShortcuts.ts - Handles global keyboard shortcuts for clipboard and selection operations.

import { useEffect } from 'react'
import { useHaloboardStore } from '@/lib/store'
import { getCollaborationManager } from '@/lib/collaboration'

export function useKeyboardShortcuts() {
  const {
    selectedIds,
    objects,
    setSelectedIds,
    setClipboard,
    clipboard,
    addObject,
    copy,
    paste,
    duplicate,
    undo,
    redo,
    setActiveTool
  } = useHaloboardStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Tool shortcuts (single keys, no modifiers)
      if (!cmdOrCtrl && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            e.preventDefault()
            setActiveTool('select')
            break
          case 'b':
            e.preventDefault()
            setActiveTool('brush')
            break
          case 'e':
            e.preventDefault()
            setActiveTool('eraser')
            break
          case 't':
            e.preventDefault()
            setActiveTool('text')
            break
          case 'n':
            e.preventDefault()
            setActiveTool('note')
            break
          case 's':
            e.preventDefault()
            setActiveTool('shape')
            break
          case 'i':
            e.preventDefault()
            setActiveTool('image')
            break
        }
        return
      }

      // Edit shortcuts (with Ctrl/Cmd)
      if (cmdOrCtrl) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault()
            if (selectedIds.length > 0) {
              const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id))
              setClipboard(selectedObjects)
            }
            break
          case 'v':
            e.preventDefault()
            if (clipboard.length > 0) {
              const pasteX = 500
              const pasteY = 300
              clipboard.forEach((obj, index) => {
                const offset = index * 20
                const newObj = {
                  ...obj,
                  id: `${obj.id}-copy-${Date.now()}-${index}`,
                  transform: { ...obj.transform, x: pasteX + offset, y: pasteY + offset }
                }
                addObject(newObj)
              })
            }
            break
          case 'd':
            e.preventDefault()
            if (selectedIds.length > 0) {
              duplicate(selectedIds)
            }
            break
          case 'a':
            e.preventDefault()
            setSelectedIds(objects.map(obj => obj.id))
            break
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case 'y':
            e.preventDefault()
            redo()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, objects, clipboard, setClipboard, setSelectedIds, addObject, duplicate, undo, redo, setActiveTool])
}
