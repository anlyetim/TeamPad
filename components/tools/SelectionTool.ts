// components/tools/SelectionTool.ts - Complete rewrite: Selection Tool (V)
// Implements single/multi-selection, marquee, transform handles

import type { ToolHandler, ToolContext } from '@/lib/toolRegistry'
import type { Point, CanvasObject, TransformHandle } from '@/lib/types'
import { useHaloboardStore } from '@/lib/store'
import { getEditorRuntime } from '@/lib/editorRuntime'

interface SelectionState {
    isDragging: boolean
    dragStart: Point | null
    dragEnd: Point | null
    isTransforming: boolean
    activeHandle: TransformHandle | null
    initialTransforms: Map<string, any>
    transformPivot: Point | null
    marqueeRect: { start: Point; end: Point } | null
}

const state: SelectionState = {
    isDragging: false,
    dragStart: null,
    dragEnd: null,
    isTransforming: false,
    activeHandle: null,
    initialTransforms: new Map(),
    transformPivot: null,
    marqueeRect: null
}

export const SelectionTool: ToolHandler = {
    name: 'select',
    cursor: 'default',

    onActivate: (ctx: ToolContext) => {
        state.isDragging = false
        state.dragStart = null
        state.dragEnd = null
        state.isTransforming = false
        state.activeHandle = null
        state.initialTransforms.clear()
        state.transformPivot = null
        state.marqueeRect = null
    },

    onDeactivate: (ctx: ToolContext) => {
        // Commit any pending transform
        if (state.isTransforming) {
            state.isTransforming = false
            state.initialTransforms.clear()
        }
        state.isDragging = false
        state.dragStart = null
        state.dragEnd = null
        state.activeHandle = null
        state.marqueeRect = null
    },

    onMouseDown: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        const store = useHaloboardStore.getState()
        const { selectedIds, objects } = store

        // Check for transform handle hit
        const handle = getHandleAtPoint(point, ctx)
        if (handle) {
            state.isTransforming = true
            state.activeHandle = handle.handle
            state.dragStart = point
            state.transformPivot = e.altKey ? getSelectionCenter(ctx) : null

            // Store initial transforms
            state.initialTransforms.clear()
            selectedIds.forEach(id => {
                const obj = objects.find(o => o.id === id)
                if (obj) {
                    state.initialTransforms.set(id, { ...obj.transform })
                }
            })
            return
        }

        // Check for object hit
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject) {
            let newSelection: string[]
            if (e.shiftKey) {
                // Toggle selection
                if (selectedIds.includes(clickedObject.id)) {
                    newSelection = selectedIds.filter(id => id !== clickedObject.id)
                } else {
                    newSelection = [...selectedIds, clickedObject.id]
                }
            } else {
                // Single selection
                newSelection = [clickedObject.id]
            }

            ctx.setSelectedIds(newSelection)

            // Start transform if clicking selected object
            if (newSelection.includes(clickedObject.id)) {
                state.isTransforming = true
                state.activeHandle = 'body'
                state.dragStart = point
                state.transformPivot = e.altKey ? getSelectionCenter(ctx) : null

                // Store initial transforms
                state.initialTransforms.clear()
                newSelection.forEach(id => {
                    const obj = objects.find(o => o.id === id)
                    if (obj) {
                        state.initialTransforms.set(id, { ...obj.transform })
                    }
                })
            }
            return
        }

        // Click empty space - start marquee or clear selection
        if (!e.shiftKey) {
            ctx.setSelectedIds([])
        }

        state.isDragging = true
        state.dragStart = point
        state.dragEnd = point
        state.marqueeRect = { start: point, end: point }
    },

    onMouseMove: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        if (state.isTransforming && state.dragStart && state.activeHandle) {
            applyTransform(point, e, ctx)
        } else if (state.isDragging && state.dragStart) {
            state.dragEnd = point
            state.marqueeRect = state.dragStart ? { start: state.dragStart, end: point } : null
        }
    },

    onMouseUp: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        // Commit transform
        if (state.isTransforming) {
            state.isTransforming = false
            state.activeHandle = null
            state.initialTransforms.clear()
            state.transformPivot = null
        }

        // Complete marquee selection
        if (state.isDragging && state.marqueeRect && state.dragStart) {
            const store = useHaloboardStore.getState()
            const { objects, layers, selectedIds } = store

            const rect = {
                left: Math.min(state.marqueeRect.start.x, state.marqueeRect.end.x),
                right: Math.max(state.marqueeRect.start.x, state.marqueeRect.end.x),
                top: Math.min(state.marqueeRect.start.y, state.marqueeRect.end.y),
                bottom: Math.max(state.marqueeRect.start.y, state.marqueeRect.end.y)
            }

            const selected: string[] = []
            objects.forEach(obj => {
                const layer = layers.find(l => l.id === obj.layerId)
                if (!layer?.visible || layer.locked) return

                const bounds = getObjectBounds(obj)
                if (bounds.left < rect.right && bounds.right > rect.left &&
                    bounds.top < rect.bottom && bounds.bottom > rect.top) {
                    selected.push(obj.id)
                }
            })

            if (e.shiftKey) {
                ctx.setSelectedIds([...selectedIds, ...selected.filter(id => !selectedIds.includes(id))])
            } else {
                ctx.setSelectedIds(selected)
            }
        }

        state.isDragging = false
        state.dragStart = null
        state.dragEnd = null
        state.marqueeRect = null
    },

    onDoubleClick: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        // Double-click text or note to edit
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject) {
            if (clickedObject.type === 'text' || clickedObject.type === 'note') {
                ctx.openModal(clickedObject.type, clickedObject.id, point)
            }
        }
    },

    getCursor: (point: Point, ctx: ToolContext) => {
        const handle = getHandleAtPoint(point, ctx)
        if (handle) {
            switch (handle.handle) {
                case 'rotate': return 'grab'
                case 'nw': case 'se': return 'nw-resize'
                case 'ne': case 'sw': return 'ne-resize'
                case 'n': case 's': return 'ns-resize'
                case 'e': case 'w': return 'ew-resize'
                case 'body': return 'move'
            }
        }
        return 'default'
    },

    renderOverlay: (ctx: CanvasRenderingContext2D, toolCtx: ToolContext) => {
        const store = useHaloboardStore.getState()
        const { selectedIds, objects, showTransformHandles, highlightColor } = store

        // Render transform handles for selected objects
        selectedIds.forEach(id => {
            const obj = objects.find(o => o.id === id)
            if (obj && showTransformHandles) {
                renderTransformHandles(ctx, obj, toolCtx, highlightColor)
            }
        })

        // Render marquee rectangle
        if (state.marqueeRect) {
            const { start, end } = state.marqueeRect
            const x = Math.min(start.x, end.x)
            const y = Math.min(start.y, end.y)
            const w = Math.abs(end.x - start.x)
            const h = Math.abs(end.y - start.y)

            ctx.save()
            ctx.strokeStyle = highlightColor
            ctx.fillStyle = `${highlightColor}20`
            ctx.lineWidth = 1 / toolCtx.zoom
            ctx.setLineDash([5, 5])
            ctx.fillRect(x, y, w, h)
            ctx.strokeRect(x, y, w, h)
            ctx.restore()
        }
    }
}

function getHandleAtPoint(point: Point, ctx: ToolContext): { handle: TransformHandle; object: CanvasObject } | null {
    const store = useHaloboardStore.getState()
    const { selectedIds, objects, showTransformHandles } = store

    if (!showTransformHandles) return null

    // Check selected objects in reverse order (top to bottom)
    for (const id of [...selectedIds].reverse()) {
        const obj = objects.find(o => o.id === id)
        if (!obj) continue

        const handle = getObjectHandleAtPoint(point, obj, ctx)
        if (handle) {
            return { handle, object: obj }
        }
    }

    return null
}

function getObjectHandleAtPoint(point: Point, obj: CanvasObject, ctx: ToolContext): TransformHandle | null {
    const { width, height } = getObjectDimensions(obj)
    const anchor = getAnchorOffset(obj, width, height)
    const handleSize = 8 / ctx.zoom

    // Transform point to object local space
    const localPoint = worldToLocal(point, obj, width, height, anchor)

    // Check rotation handle first (outside top center)
    const rotHandleY = -30 / Math.abs(obj.transform.scaleY) / ctx.zoom
    const rotHandleRadius = handleSize * 1.5
    const distToRotHandle = Math.sqrt(
        Math.pow(localPoint.x - width / 2, 2) + Math.pow(localPoint.y - rotHandleY, 2)
    )
    if (distToRotHandle <= rotHandleRadius) {
        return 'rotate'
    }

    // Check if on rotation handle stem
    if (Math.abs(localPoint.x - width / 2) <= handleSize && localPoint.y >= rotHandleY && localPoint.y <= 0) {
        return 'rotate'
    }

    // Check resize handles
    const hSizeX = handleSize / Math.abs(obj.transform.scaleX)
    const hSizeY = handleSize / Math.abs(obj.transform.scaleY)

    const handles: Array<{ x: number; y: number; handle: TransformHandle }> = [
        { x: 0, y: 0, handle: 'nw' },
        { x: width / 2, y: 0, handle: 'n' },
        { x: width, y: 0, handle: 'ne' },
        { x: width, y: height / 2, handle: 'e' },
        { x: width, y: height, handle: 'se' },
        { x: width / 2, y: height, handle: 's' },
        { x: 0, y: height, handle: 'sw' },
        { x: 0, y: height / 2, handle: 'w' }
    ]

    for (const { x, y, handle } of handles) {
        if (Math.abs(localPoint.x - x) <= hSizeX && Math.abs(localPoint.y - y) <= hSizeY) {
            return handle
        }
    }

    // Check body
    if (localPoint.x >= 0 && localPoint.x <= width && localPoint.y >= 0 && localPoint.y <= height) {
        return 'body'
    }

    return null
}

function worldToLocal(worldPoint: Point, obj: CanvasObject, width: number, height: number, anchor: Point): Point {
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

    // Adjust for anchor
    x += anchor.x
    y += anchor.y

    return { x, y }
}

function applyTransform(point: Point, e: React.MouseEvent, ctx: ToolContext) {
    if (!state.dragStart || !state.activeHandle) return

    const store = useHaloboardStore.getState()
    const runtime = getEditorRuntime()
    const deltaX = point.x - state.dragStart.x
    const deltaY = point.y - state.dragStart.y

    state.initialTransforms.forEach((initialTransform, id) => {
        const obj = store.objects.find(o => o.id === id)
        if (!obj) return

        let newTransform = { ...initialTransform }

        switch (state.activeHandle) {
            case 'body':
                // Move
                newTransform.x = initialTransform.x + deltaX
                newTransform.y = initialTransform.y + deltaY
                break

            case 'rotate':
                // Rotate around pivot or center
                const pivot = state.transformPivot || getObjectCenter(obj, ctx)
                const angle = Math.atan2(point.y - pivot.y, point.x - pivot.x) * (180 / Math.PI) + 90
                newTransform.rotation = angle
                break

            default:
                // Scale
                const { width, height } = getObjectDimensions(obj)
                const anchor = getAnchorOffset(obj, width, height)
                let scaleX = initialTransform.scaleX
                let scaleY = initialTransform.scaleY

                const localStart = worldToLocal(state.dragStart, obj, width, height, anchor)
                const localPoint = worldToLocal(point, obj, width, height, anchor)

                if (state.activeHandle.includes('e')) scaleX = Math.max(0.1, localPoint.x / width)
                if (state.activeHandle.includes('w')) scaleX = Math.max(0.1, (width - localPoint.x) / width)
                if (state.activeHandle.includes('s')) scaleY = Math.max(0.1, localPoint.y / height)
                if (state.activeHandle.includes('n')) scaleY = Math.max(0.1, (height - localPoint.y) / height)

                // Shift: preserve aspect ratio
                if (e.shiftKey) {
                    const aspect = width / height
                    const avgScale = (scaleX + scaleY) / 2
                    scaleX = avgScale
                    scaleY = avgScale
                }

                // Alt: scale from center
                if (e.altKey) {
                    const centerX = width / 2
                    const centerY = height / 2
                    const moveX = (scaleX - initialTransform.scaleX) * centerX
                    const moveY = (scaleY - initialTransform.scaleY) * centerY
                    newTransform.x = initialTransform.x - moveX
                    newTransform.y = initialTransform.y - moveY
                }

                newTransform.scaleX = scaleX
                newTransform.scaleY = scaleY
                break
        }

        store.updateObject(id, { transform: newTransform })
    })
}

function renderTransformHandles(ctx: CanvasRenderingContext2D, obj: CanvasObject, toolCtx: ToolContext, color: string) {
    const { width, height } = getObjectDimensions(obj)
    const anchor = getAnchorOffset(obj, width, height)
    const handleSize = 8 / toolCtx.zoom

    ctx.save()
    ctx.translate(obj.transform.x + anchor.x * obj.transform.scaleX, obj.transform.y + anchor.y * obj.transform.scaleY)
    ctx.rotate((obj.transform.rotation * Math.PI) / 180)
    ctx.scale(obj.transform.scaleX, obj.transform.scaleY)
    ctx.translate(-anchor.x, -anchor.y)

    // Bounding box
    ctx.strokeStyle = color
    ctx.lineWidth = 2 / toolCtx.zoom
    ctx.strokeRect(0, 0, width, height)

    // Handles
    const hSizeX = handleSize / Math.abs(obj.transform.scaleX)
    const hSizeY = handleSize / Math.abs(obj.transform.scaleY)

    ctx.fillStyle = '#FFFFFF'
    ctx.strokeStyle = color
    ctx.lineWidth = 1 / toolCtx.zoom

    const drawHandle = (x: number, y: number) => {
        ctx.fillRect(x - hSizeX / 2, y - hSizeY / 2, hSizeX, hSizeY)
        ctx.strokeRect(x - hSizeX / 2, y - hSizeY / 2, hSizeX, hSizeY)
    }

    drawHandle(0, 0)
    drawHandle(width / 2, 0)
    drawHandle(width, 0)
    drawHandle(width, height / 2)
    drawHandle(width, height)
    drawHandle(width / 2, height)
    drawHandle(0, height)
    drawHandle(0, height / 2)

    // Rotation handle
    const rotHandleY = -30 / Math.abs(obj.transform.scaleY) / toolCtx.zoom
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, rotHandleY)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(width / 2, rotHandleY, Math.abs(hSizeX * 1.5), 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.restore()
}

function getObjectBounds(obj: CanvasObject): { left: number; top: number; right: number; bottom: number } {
    const { width, height } = getObjectDimensions(obj)
    return {
        left: obj.transform.x,
        top: obj.transform.y,
        right: obj.transform.x + width * obj.transform.scaleX,
        bottom: obj.transform.y + height * obj.transform.scaleY
    }
}

function getObjectDimensions(obj: CanvasObject): { width: number; height: number } {
    switch (obj.type) {
        case 'path':
            const pathData = obj.data as any
            if (!pathData.points || pathData.points.length < 2) return { width: 0, height: 0 }
            const xs = pathData.points.map((p: Point) => p.x)
            const ys = pathData.points.map((p: Point) => p.y)
            return {
                width: Math.max(...xs) - Math.min(...xs),
                height: Math.max(...ys) - Math.min(...ys)
            }
        case 'shape':
        case 'text':
        case 'note':
        case 'image':
            const data = obj.data as any
            return { width: data.width || 0, height: data.height || 0 }
        default:
            return { width: 0, height: 0 }
    }
}

function getAnchorOffset(obj: CanvasObject, width: number, height: number): Point {
    const anchor = obj.transform.anchor || 'top-left'
    let x = 0, y = 0
    if (anchor.includes('center')) x = width / 2
    if (anchor.includes('right')) x = width
    if (anchor.includes('bottom')) y = height
    if (anchor === 'center') { x = width / 2; y = height / 2 }
    return { x, y }
}

function getObjectCenter(obj: CanvasObject, ctx: ToolContext): Point {
    const { width, height } = getObjectDimensions(obj)
    const anchor = getAnchorOffset(obj, width, height)
    return {
        x: obj.transform.x + anchor.x * obj.transform.scaleX,
        y: obj.transform.y + anchor.y * obj.transform.scaleY
    }
}

function getSelectionCenter(ctx: ToolContext): Point {
    const store = useHaloboardStore.getState()
    const { selectedIds, objects } = store

    if (selectedIds.length === 0) return { x: 0, y: 0 }

    let sumX = 0, sumY = 0
    selectedIds.forEach(id => {
        const obj = objects.find(o => o.id === id)
        if (obj) {
            const center = getObjectCenter(obj, ctx)
            sumX += center.x
            sumY += center.y
        }
    })

    return {
        x: sumX / selectedIds.length,
        y: sumY / selectedIds.length
    }
}

export default SelectionTool
