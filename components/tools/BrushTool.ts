// components/tools/BrushTool.ts - Complete rewrite: Brush Tool (B)
// Implements smooth stroke rendering with Bezier interpolation

import type { ToolHandler, ToolContext } from '@/lib/toolRegistry'
import type { Point, CanvasObject, PathData } from '@/lib/types'
import { useHaloboardStore } from '@/lib/store'

interface BrushState {
    isDrawing: boolean
    points: Point[]
    currentStroke: PathData | null
}

const state: BrushState = {
    isDrawing: false,
    points: [],
    currentStroke: null
}

export const BrushTool: ToolHandler = {
    name: 'brush',
    cursor: 'crosshair',

    onActivate: (ctx: ToolContext) => {
        state.isDrawing = false
        state.points = []
        state.currentStroke = null
    },

    onDeactivate: (ctx: ToolContext) => {
        // Commit pending stroke
        if (state.isDrawing && state.points.length > 1) {
            commitStroke(ctx)
        }
        state.isDrawing = false
        state.points = []
        state.currentStroke = null
    },

    onMouseDown: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        state.isDrawing = true
        state.points = [point]
    },

    onMouseMove: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        if (!state.isDrawing) return

        const store = useHaloboardStore.getState()
        const lastPoint = state.points[state.points.length - 1]

        if (lastPoint) {
            const distance = Math.sqrt(
                (point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2
            )

            // Dynamic spacing based on brush size
            const minDistance = Math.max(0.5, store.brushSettings.size / ctx.zoom * 0.25)

            if (distance >= minDistance) {
                state.points.push(point)
            }
        }
    },

    onMouseUp: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        if (state.isDrawing) {
            // Add final point
            if (state.points.length > 0) {
                const lastPoint = state.points[state.points.length - 1]
                const distance = Math.sqrt(
                    (point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2
                )
                if (distance > 0.5) {
                    state.points.push(point)
                } else if (state.points.length === 1) {
                    // Single click: create dot
                    state.points.push(point)
                }
            }

            if (state.points.length > 1) {
                commitStroke(ctx)
            }
        }

        state.isDrawing = false
        state.points = []
        state.currentStroke = null
    },

    getCursor: (point: Point, ctx: ToolContext) => {
        return 'crosshair'
    },

    renderOverlay: (ctx: CanvasRenderingContext2D, toolCtx: ToolContext) => {
        // Render live stroke while drawing
        if (state.isDrawing && state.points.length > 1) {
            const store = useHaloboardStore.getState()
            const { brushSettings } = store

            ctx.save()
            ctx.globalAlpha = brushSettings.opacity
            ctx.strokeStyle = brushSettings.color
            ctx.lineWidth = brushSettings.size
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.setLineDash([])

            // Render smooth stroke with Bezier interpolation
            renderSmoothStroke(ctx, state.points, brushSettings.hardness)

            ctx.restore()
        }
    }
}

function commitStroke(ctx: ToolContext) {
    if (state.points.length < 2) return

    const store = useHaloboardStore.getState()
    const { brushSettings, activeLayerId, addObject } = store

    // Normalize points to bounding box
    const xs = state.points.map(p => p.x)
    const ys = state.points.map(p => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)

    // Normalize points relative to bounding box
    const normalizedPoints = state.points.map(p => ({
        x: p.x - minX,
        y: p.y - minY
    }))

    const pathData: PathData = {
        points: normalizedPoints,
        strokeColor: brushSettings.color,
        strokeWidth: brushSettings.size,
        opacity: brushSettings.opacity
    }

    const pathObj: CanvasObject = {
        id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Brush Stroke',
        type: 'path',
        layerId: activeLayerId,
        transform: {
            x: minX,
            y: minY,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            anchor: 'top-left'
        },
        data: pathData
    }

    addObject(pathObj)
}

function renderSmoothStroke(ctx: CanvasRenderingContext2D, points: Point[], hardness: number) {
    if (points.length < 2) return

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    // Use quadratic Bezier curves for smooth interpolation
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const next = points[i + 1]

        if (next) {
            // Use middle point as control point for smooth curve
            const controlX = curr.x
            const controlY = curr.y
            const endX = (curr.x + next.x) / 2
            const endY = (curr.y + next.y) / 2
            ctx.quadraticCurveTo(controlX, controlY, endX, endY)
        } else {
            // Last point: line to it
            ctx.lineTo(curr.x, curr.y)
        }
    }

    ctx.stroke()
}

export default BrushTool
