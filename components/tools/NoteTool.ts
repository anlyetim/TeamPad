// components/tools/NoteTool.ts - Complete rewrite: Note Tool (N)
// Implements sticky notes with modal editing and animation

import type { ToolHandler, ToolContext } from '@/lib/toolRegistry'
import type { Point, CanvasObject, NoteData } from '@/lib/types'
import { useHaloboardStore } from '@/lib/store'

// Theme-consistent pastel colors for notes
const NOTE_COLORS = [
    '#FFF2CC', // Yellow
    '#FFE6CC', // Orange
    '#FCE4EC', // Pink
    '#E8F5E9', // Green
    '#E3F2FD', // Blue
    '#F3E5F5', // Purple
    '#ECEFF1', // Gray
    '#FFF8E1', // Cream
]

function getRandomNoteColor(): string {
    return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]
}

export const NoteTool: ToolHandler = {
    name: 'note',
    cursor: 'crosshair',

    onActivate: (ctx: ToolContext) => {
        // Nothing to initialize
    },

    onDeactivate: (ctx: ToolContext) => {
        // Nothing to clean up
    },

    onMouseDown: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        // Check if clicking existing note
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject && clickedObject.type === 'note') {
            ctx.setSelectedIds([clickedObject.id])
            return
        }

        // Create new note
        const store = useHaloboardStore.getState()
        const { noteProperties, activeLayerId, addObject, setSelectedIds, setActiveTool } = store

        const noteData: NoteData = {
            content: '',
            backgroundColor: noteProperties?.backgroundColor || getRandomNoteColor(),
            backgroundType: noteProperties?.backgroundType || 'plain',
            cornerRadius: noteProperties?.cornerRadius || 12,
            fontFamily: noteProperties?.fontFamily || 'Inter',
            fontSize: noteProperties?.fontSize || 14,
            width: 200,
            height: 150
        }

        const noteObj: CanvasObject = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Sticky Note',
            type: 'note',
            layerId: activeLayerId,
            transform: {
                x: point.x,
                y: point.y,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                anchor: 'top-left'
            },
            data: noteData
        }

        addObject(noteObj)
        setSelectedIds([noteObj.id])

        // Open modal for editing (with animation handled in modal)
        ctx.openModal('note', noteObj.id, point)

        // Switch to selection tool
        setActiveTool('select')
    },

    onDoubleClick: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        // Double-click note to edit (when selection tool is active)
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject && clickedObject.type === 'note') {
            ctx.openModal('note', clickedObject.id, point)
        }
    },

    getCursor: (point: Point, ctx: ToolContext) => {
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject && clickedObject.type === 'note') {
            return 'pointer'
        }
        return 'crosshair'
    },

    renderOverlay: (ctx: CanvasRenderingContext2D, toolCtx: ToolContext) => {
        // No overlay needed for note tool
    }
}

export default NoteTool
