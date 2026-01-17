// components/tools/EraserTool.ts - Complete rewrite: Eraser Tool (E)
// Implements whole object erase and partial path erase modes

import type { ToolHandler, ToolContext } from '@/lib/toolRegistry'
import type { Point, CanvasObject, PathData } from '@/lib/types'
import { useHaloboardStore } from '@/lib/store'
import { getEditorRuntime } from '@/lib/editorRuntime'

interface EraserState {
    isErasing: boolean
    points: Point[]
}

const state: EraserState = {
    isErasing: false,
    points: []
}

export const EraserTool: ToolHandler = {
    name: 'eraser',
    cursor: 'crosshair',

    onActivate: (ctx: ToolContext) => {
        state.isErasing = false
        state.points = []
    },

    onDeactivate: (ctx: ToolContext) => {
        state.isErasing = false
        state.points = []
    },

    onMouseDown: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        state.isErasing = true
        state.points = [point]
        performErase(point, ctx)
    },

    onMouseMove: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        if (!state.isErasing) return

        const store = useHaloboardStore.getState()
        const lastPoint = state.points[state.points.length - 1]

        if (lastPoint) {
            const distance = Math.sqrt(
                (point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2
            )

            const minDistance = Math.max(0.5, store.brushSettings.size / ctx.zoom * 0.25)

            if (distance >= minDistance) {
                state.points.push(point)
                performErase(point, ctx)
            }
        }
    },

    onMouseUp: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        state.isErasing = false
        state.points = []
    },

    getCursor: (point: Point, ctx: ToolContext) => {
        return 'crosshair'
    },

    renderOverlay: (ctx: CanvasRenderingContext2D, toolCtx: ToolContext) => {
        // Render erase preview circle
        if (state.isErasing && state.points.length > 0) {
            const store = useHaloboardStore.getState()
            const { brushSettings } = store
            const lastPoint = state.points[state.points.length - 1]

            ctx.save()
            ctx.strokeStyle = '#FF0000'
            ctx.lineWidth = 1 / toolCtx.zoom
            ctx.setLineDash([3, 3])
            ctx.beginPath()
            ctx.arc(lastPoint.x, lastPoint.y, brushSettings.size / 2, 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
        }
    }
}

function performErase(point: Point, ctx: ToolContext) {
    const store = useHaloboardStore.getState()
    const { brushSettings, objects, layers, updateObject } = store
    const runtime = getEditorRuntime()

    if (brushSettings.eraserMode === 'whole' || brushSettings.eraserMode === 'object') {
        // Whole object erase: delete entire objects
        const eraserRadius = brushSettings.size / 2
        const objectsToErase = objects.filter(obj => {
            const layer = layers.find(l => l.id === obj.layerId)
            if (!layer?.visible || layer.locked) return false

            // Check if point is within object bounds
            return isPointInObject(point, obj, eraserRadius)
        })

        objectsToErase.forEach(obj => {
            store.deleteObject(obj.id)
        })
    } else {
        // Partial erase: add erase paths to path objects
        const eraserRadius = brushSettings.size / 2
        const pathObjects = objects.filter(obj => {
            if (obj.type !== 'path') return false
            const layer = layers.find(l => l.id === obj.layerId)
            if (!layer?.visible || layer.locked) return false

            // Quick bounding box check
            return isPointNearPath(point, obj, eraserRadius)
        })

        // Apply partial erase to each affected path
        pathObjects.forEach(obj => {
            const data = obj.data as PathData
            const localPoint = worldToLocal(point, obj)

            const newErasePaths = data.erasePaths ? [...data.erasePaths] : []
            newErasePaths.push({
                points: [localPoint],
                width: brushSettings.size
            })

            updateObject(obj.id, {
                data: { ...data, erasePaths: newErasePaths }
            })
        })
    }
}

function isPointInObject(point: Point, obj: CanvasObject, radius: number): boolean {
    const bounds = getObjectBounds(obj)
    return point.x >= bounds.left - radius && point.x <= bounds.right + radius &&
           point.y >= bounds.top - radius && point.y <= bounds.bottom + radius
}

function isPointNearPath(point: Point, obj: CanvasObject, radius: number): boolean {
    const data = obj.data as PathData
    if (!data.points || data.points.length === 0) return false

    // Transform point to object local space
    const localPoint = worldToLocal(point, obj)

    // Check if point is near any path segment
    for (let i = 0; i < data.points.length - 1; i++) {
        const p1 = data.points[i]
        const p2 = data.points[i + 1]
        const dist = distanceToLineSegment(localPoint, p1, p2)
        if (dist <= radius) return true
    }

    return false
}

function distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) param = dot / lenSq

    let xx, yy

    if (param < 0) {
        xx = lineStart.x
        yy = lineStart.y
    } else if (param > 1) {
        xx = lineEnd.x
        yy = lineEnd.y
    } else {
        xx = lineStart.x + param * C
        yy = lineStart.y + param * D
    }

    const dx = point.x - xx
    const dy = point.y - yy
    return Math.sqrt(dx * dx + dy * dy)
}

function worldToLocal(worldPoint: Point, obj: CanvasObject): Point {
    const t = obj.transform

    // Translate to origin
    let x = worldPoint.x - t.x
    let y = worldPoint.y - t.y

    // Apply inverse rotation
    if (t.rotation !== 0) {
        const rad = -(t.rotation * Math.PI / 180)
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const rotX = x * cos - y * sin
        const rotY = x * sin + y * cos
        x = rotX
        y = rotY
    }

    // Apply inverse scale
    x /= t.scaleX
    y /= t.scaleY

    return { x, y }
}

function getObjectBounds(obj: CanvasObject): { left: number; top: number; right: number; bottom: number } {
    let width = 0, height = 0

    switch (obj.type) {
        case 'path':
            const pathData = obj.data as PathData
            if (pathData.points && pathData.points.length > 0) {
                const xs = pathData.points.map(p => p.x)
                const ys = pathData.points.map(p => p.y)
                width = Math.max(...xs) - Math.min(...xs)
                height = Math.max(...ys) - Math.min(...ys)
            }
            break
        case 'shape':
        case 'text':
        case 'note':
        case 'image':
            const data = obj.data as any
            width = data.width || 0
            height = data.height || 0
            break
    }

    return {
        left: obj.transform.x,
        top: obj.transform.y,
        right: obj.transform.x + width * obj.transform.scaleX,
        bottom: obj.transform.y + height * obj.transform.scaleY
    }
}

export default EraserTool
