// components/tools/TextTool.ts - Complete rewrite: Text Tool (T)
// Implements point text and area text with modal editing

import type { ToolHandler, ToolContext } from '@/lib/toolRegistry'
import type { Point, CanvasObject, TextData } from '@/lib/types'
import { useHaloboardStore } from '@/lib/store'

interface TextToolState {
    isDragging: boolean
    dragStart: Point | null
    dragEnd: Point | null
}

const state: TextToolState = {
    isDragging: false,
    dragStart: null,
    dragEnd: null
}

export const TextTool: ToolHandler = {
    name: 'text',
    cursor: 'text',

    onActivate: (ctx: ToolContext) => {
        state.isDragging = false
        state.dragStart = null
        state.dragEnd = null
    },

    onDeactivate: (ctx: ToolContext) => {
        state.isDragging = false
        state.dragStart = null
        state.dragEnd = null
    },

    onMouseDown: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        // Check if clicking existing text object
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject && clickedObject.type === 'text') {
            ctx.setSelectedIds([clickedObject.id])
            return
        }

        // Start area text drag (click + drag for area, click only for point)
        state.isDragging = true
        state.dragStart = point
        state.dragEnd = point
    },

    onMouseMove: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        if (state.isDragging && state.dragStart) {
            state.dragEnd = point
        }
    },

    onMouseUp: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        if (!state.isDragging || !state.dragStart) return

        const store = useHaloboardStore.getState()
        const { textProperties, activeLayerId, addObject, setSelectedIds, setActiveTool } = store

        const width = state.dragEnd ? Math.abs(state.dragEnd.x - state.dragStart.x) : 0
        const height = state.dragEnd ? Math.abs(state.dragEnd.y - state.dragStart.y) : 0

        // Determine if area text (drag > 20px) or point text (click only)
        const isAreaText = width > 20 && height > 20

        const x = isAreaText ? Math.min(state.dragStart.x, state.dragEnd?.x || state.dragStart.x) : state.dragStart.x
        const y = isAreaText ? Math.min(state.dragStart.y, state.dragEnd?.y || state.dragStart.y) : state.dragStart.y

        // Create text object with initial content "Text"
        const textData: TextData = {
            content: 'Text',
            fontFamily: textProperties.fontFamily || 'Arial',
            fontSize: textProperties.fontSize || 16,
            color: textProperties.color || '#000000',
            align: textProperties.alignment || 'left',
            width: isAreaText ? Math.max(width, 50) : 200,
            height: isAreaText ? Math.max(height, 50) : 50
        }

        const textObj: CanvasObject = {
            id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Text',
            type: 'text',
            layerId: activeLayerId,
            transform: {
                x,
                y,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                anchor: 'top-left'
            },
            data: textData
        }

        addObject(textObj)
        setSelectedIds([textObj.id])

        // Open modal for editing
        ctx.openModal('text', textObj.id, { x, y })

        // Switch to selection tool
        setActiveTool('select')

        state.isDragging = false
        state.dragStart = null
        state.dragEnd = null
    },

    onDoubleClick: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        // Double-click text object to edit (when selection tool is active)
        // This is handled in canvas.tsx for selection tool
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject && clickedObject.type === 'text') {
            ctx.openModal('text', clickedObject.id, point)
        }
    },

    getCursor: (point: Point, ctx: ToolContext) => {
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject && clickedObject.type === 'text') {
            return 'pointer'
        }
        return 'text'
    },

    renderOverlay: (ctx: CanvasRenderingContext2D, toolCtx: ToolContext) => {
        // Draw area text preview rectangle
        if (state.isDragging && state.dragStart && state.dragEnd) {
            const x = Math.min(state.dragStart.x, state.dragEnd.x)
            const y = Math.min(state.dragStart.y, state.dragEnd.y)
            const w = Math.abs(state.dragEnd.x - state.dragStart.x)
            const h = Math.abs(state.dragEnd.y - state.dragStart.y)

            if (w > 20 && h > 20) {
                const store = useHaloboardStore.getState()
                ctx.save()
                ctx.strokeStyle = store.highlightColor || '#0A84FF'
                ctx.lineWidth = 1 / toolCtx.zoom
                ctx.setLineDash([5, 5])
                ctx.strokeRect(x, y, w, h)
                ctx.restore()
            }
        }
    }
}

export default TextTool
