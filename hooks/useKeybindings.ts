// hooks/useKeybindings.ts - Keybindings system with localStorage persistence
// Handles tool shortcuts, clipboard operations, and user customization

import { useEffect, useCallback } from 'react'
import { useHaloboardStore } from '@/lib/store'
import { getToolRegistry } from '@/lib/toolRegistry'
import type { ToolType } from '@/lib/types'

export interface KeyBinding {
    key: string
    modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[]
    action: string
    description: string
}

const DEFAULT_KEYBINDINGS: KeyBinding[] = [
    // Tool shortcuts
    { key: 'v', action: 'tool:select', description: 'Selection Tool' },
    { key: 'b', action: 'tool:brush', description: 'Brush Tool' },
    { key: 'e', action: 'tool:eraser', description: 'Eraser Tool' },
    { key: 't', action: 'tool:text', description: 'Text Tool' },
    { key: 'n', action: 'tool:note', description: 'Note Tool' },
    { key: 's', action: 'tool:shape', description: 'Shape Tool' },
    { key: 'i', action: 'tool:image', description: 'Image Tool' },

    // Clipboard & Edit
    { key: 'c', modifiers: ['ctrl'], action: 'edit:copy', description: 'Copy' },
    { key: 'v', modifiers: ['ctrl'], action: 'edit:paste', description: 'Paste' },
    { key: 'd', modifiers: ['ctrl'], action: 'edit:duplicate', description: 'Duplicate' },
    { key: 'a', modifiers: ['ctrl'], action: 'edit:selectAll', description: 'Select All' },
    { key: 'z', modifiers: ['ctrl'], action: 'edit:undo', description: 'Undo' },
    { key: 'y', modifiers: ['ctrl'], action: 'edit:redo', description: 'Redo' },
    { key: 'z', modifiers: ['ctrl', 'shift'], action: 'edit:redo', description: 'Redo (Alt)' },

    // Delete
    { key: 'Delete', action: 'edit:delete', description: 'Delete Selected' },
    { key: 'Backspace', action: 'edit:delete', description: 'Delete Selected' },

    // View
    { key: '0', modifiers: ['ctrl'], action: 'view:resetZoom', description: 'Reset Zoom' },
    { key: '=', modifiers: ['ctrl'], action: 'view:zoomIn', description: 'Zoom In' },
    { key: '-', modifiers: ['ctrl'], action: 'view:zoomOut', description: 'Zoom Out' },

    // Transform
    { key: 'Escape', action: 'transform:cancel', description: 'Cancel Transform' },
    { key: 'Enter', action: 'transform:commit', description: 'Commit Transform' },
]

const STORAGE_KEY = 'teampad-keybindings'

export function loadKeybindings(): KeyBinding[] {
    if (typeof window === 'undefined') return DEFAULT_KEYBINDINGS

    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (e) {
        console.warn('Failed to load keybindings:', e)
    }
    return DEFAULT_KEYBINDINGS
}

export function saveKeybindings(bindings: KeyBinding[]): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
    } catch (e) {
        console.warn('Failed to save keybindings:', e)
    }
}

export function resetKeybindings(): KeyBinding[] {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
    }
    return DEFAULT_KEYBINDINGS
}

export function getDefaultKeybindings(): KeyBinding[] {
    return [...DEFAULT_KEYBINDINGS]
}

function matchesBinding(e: KeyboardEvent, binding: KeyBinding): boolean {
    const key = e.key.toLowerCase()
    const bindingKey = binding.key.toLowerCase()

    if (key !== bindingKey && e.key !== binding.key) return false

    const modifiers = binding.modifiers || []

    const ctrlRequired = modifiers.includes('ctrl') || modifiers.includes('meta')
    const shiftRequired = modifiers.includes('shift')
    const altRequired = modifiers.includes('alt')

    const ctrlPressed = e.ctrlKey || e.metaKey
    const shiftPressed = e.shiftKey
    const altPressed = e.altKey

    if (ctrlRequired !== ctrlPressed) return false
    if (shiftRequired !== shiftPressed) return false
    if (altRequired !== altPressed) return false

    return true
}

export function useKeybindings() {
    const store = useHaloboardStore()
    const {
        setActiveTool,
        selectedIds,
        setSelectedIds,
        objects,
        copy,
        paste,
        duplicate,
        deleteObject,
        undo,
        redo,
        setZoom,
        zoom
    } = store

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't handle if typing in input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return
        }

        const bindings = loadKeybindings()

        for (const binding of bindings) {
            if (matchesBinding(e, binding)) {
                e.preventDefault()

                const [category, action] = binding.action.split(':')

                switch (category) {
                    case 'tool':
                        const toolMap: Record<string, ToolType> = {
                            select: 'select',
                            brush: 'brush',
                            eraser: 'eraser',
                            text: 'text',
                            note: 'note',
                            shape: 'shape',
                            image: 'image'
                        }
                        if (toolMap[action]) {
                            setActiveTool(toolMap[action])
                            getToolRegistry().switchTool(toolMap[action])
                        }
                        break

                    case 'edit':
                        switch (action) {
                            case 'copy':
                                copy()
                                break
                            case 'paste':
                                paste()
                                break
                            case 'duplicate':
                                duplicate()
                                break
                            case 'selectAll':
                                setSelectedIds(objects.map(o => o.id))
                                break
                            case 'delete':
                                selectedIds.forEach(id => deleteObject(id))
                                setSelectedIds([])
                                break
                            case 'undo':
                                undo()
                                break
                            case 'redo':
                                redo()
                                break
                        }
                        break

                    case 'view':
                        switch (action) {
                            case 'resetZoom':
                                setZoom(1)
                                break
                            case 'zoomIn':
                                setZoom(zoom * 1.2)
                                break
                            case 'zoomOut':
                                setZoom(zoom / 1.2)
                                break
                        }
                        break

                    case 'transform':
                        // Delegate to tool registry
                        getToolRegistry().handleKeyDown(e)
                        break
                }

                return
            }
        }

        // Pass through to active tool
        getToolRegistry().handleKeyDown(e)
    }, [setActiveTool, copy, paste, duplicate, deleteObject, selectedIds, setSelectedIds, objects, undo, redo, setZoom, zoom])

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        getToolRegistry().handleKeyUp(e)
    }, [])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [handleKeyDown, handleKeyUp])
}

export default useKeybindings
