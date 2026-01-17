// components/tools/ShapeTool.ts - Complete rewrite: Shape Tool (S)
// Implements shape drawing with flyout menu for shape type selection

import type { ToolHandler, ToolContext } from '@/lib/toolRegistry'
import type { Point, CanvasObject, ShapeData, ShapeType } from '@/lib/types'
import { useHaloboardStore } from '@/lib/store'

interface ShapeToolState {
    isDrawing: boolean
    startPoint: Point | null
    currentPoint: Point | null
    selectedShapeType: ShapeType | null
}

const state: ShapeToolState = {
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    selectedShapeType: null
}

const SHAPE_TYPES: Array<{ type: ShapeType; label: string }> = [
    { type: 'rectangle', label: 'Rectangle' },
    { type: 'rounded_rectangle', label: 'Rounded Rect' },
    { type: 'ellipse', label: 'Ellipse' },
    { type: 'polygon', label: 'Polygon' },
    { type: 'star', label: 'Star' },
    { type: 'arrow', label: 'Arrow' }
]

export const ShapeTool: ToolHandler = {
    name: 'shape',
    cursor: 'crosshair',

    onActivate: (ctx: ToolContext) => {
        const store = useHaloboardStore.getState()
        // Use shape type from store settings or default to rectangle
        state.selectedShapeType = store.shapeSettings?.shapeType || 'rectangle'
        state.isDrawing = false
        state.startPoint = null
        state.currentPoint = null

        // TODO: Open flyout menu to select shape type
        // For now, use the shape type from store settings
    },

    onDeactivate: (ctx: ToolContext) => {
        state.isDrawing = false
        state.startPoint = null
        state.currentPoint = null
        state.selectedShapeType = null
    },

    onMouseDown: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        const store = useHaloboardStore.getState()
        // Ensure shape type is selected
        if (!state.selectedShapeType) {
            state.selectedShapeType = store.shapeSettings?.shapeType || 'rectangle'
        }

        state.isDrawing = true
        state.startPoint = point
        state.currentPoint = point
    },

    onMouseMove: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        if (!state.isDrawing) return
        state.currentPoint = point
    },

    onMouseUp: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        if (!state.isDrawing || !state.startPoint || !state.selectedShapeType) return

        const store = useHaloboardStore.getState()
        const { shapeSettings, activeLayerId, addObject, setSelectedIds, setActiveTool } = store

        // Calculate shape bounds
        const bounds = calculateShapeBounds(state.startPoint, point, e.shiftKey, e.altKey)

        // Minimum size check
        if (bounds.width < 10 || bounds.height < 10) {
            state.isDrawing = false
            state.startPoint = null
            state.currentPoint = null
            return
        }

        const shapeData: ShapeData = {
            shapeType: state.selectedShapeType,
            width: bounds.width,
            height: bounds.height,
            fillColor: shapeSettings?.fillColor || '#E0E0E0',
            strokeColor: shapeSettings?.strokeColor || '#000000',
            strokeWidth: shapeSettings?.strokeWidth || 2,
            borderType: shapeSettings?.borderType || 'solid',
            opacity: shapeSettings?.opacity || 1
        }

        const shapeObj: CanvasObject = {
            id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: state.selectedShapeType.charAt(0).toUpperCase() + state.selectedShapeType.slice(1),
            type: 'shape',
            layerId: activeLayerId,
            transform: {
                x: bounds.x,
                y: bounds.y,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                anchor: 'top-left'
            },
            data: shapeData
        }

        addObject(shapeObj)
        setSelectedIds([shapeObj.id])
        setActiveTool('select')

        state.isDrawing = false
        state.startPoint = null
        state.currentPoint = null
    },

    getCursor: (point: Point, ctx: ToolContext) => {
        return 'crosshair'
    },

    renderOverlay: (ctx: CanvasRenderingContext2D, toolCtx: ToolContext) => {
        if (!state.isDrawing || !state.startPoint || !state.currentPoint || !state.selectedShapeType) return

        const store = useHaloboardStore.getState()
        const { shapeSettings, highlightColor } = store

        // Calculate bounds
        const bounds = calculateShapeBounds(state.startPoint, state.currentPoint, false, false)

        ctx.save()
        ctx.strokeStyle = highlightColor || '#0A84FF'
        ctx.fillStyle = shapeSettings?.fillColor ? shapeSettings.fillColor + '40' : 'rgba(10, 132, 255, 0.2)'
        ctx.lineWidth = 1 / toolCtx.zoom
        ctx.setLineDash([5, 5])

        // Render preview based on shape type
        renderShapePreview(ctx, bounds, state.selectedShapeType)

        ctx.restore()
    }
}

function calculateShapeBounds(start: Point, end: Point, constrain: boolean, fromCenter: boolean): { x: number; y: number; width: number; height: number } {
    let width = Math.abs(end.x - start.x)
    let height = Math.abs(end.y - start.y)

    // Shift: constrain to square
    if (constrain) {
        const maxDim = Math.max(width, height)
        width = maxDim
        height = maxDim
    }

    // Calculate position
    let x = Math.min(start.x, end.x)
    let y = Math.min(start.y, end.y)

    // Alt: draw from center
    if (fromCenter) {
        x = start.x - width / 2
        y = start.y - height / 2
    }

    return { x, y, width, height }
}

function renderShapePreview(ctx: CanvasRenderingContext2D, bounds: { x: number; y: number; width: number; height: number }, shapeType: ShapeType) {
    switch (shapeType) {
        case 'ellipse':
        case 'circle':
            ctx.beginPath()
            const rx = bounds.width / 2
            const ry = shapeType === 'circle' ? rx : bounds.height / 2
            ctx.ellipse(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, rx, ry, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
            break

        case 'rounded_rectangle':
            const radius = Math.min(bounds.width, bounds.height) * 0.2
            ctx.beginPath()
            ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, radius)
            ctx.fill()
            ctx.stroke()
            break

        default:
            // Rectangle and other shapes
            ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
            ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
}

export default ShapeTool
